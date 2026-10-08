import { Router } from 'express';
import { pool } from '../db.js';
import { exigirLogin } from '../middleware/auth.js';

const router = Router();
router.use(exigirLogin);

// POST /api/pedidos
// Corpo: { "endereco_id": 1, "itens": [ { "produto_id": 1, "quantidade": 2 } ] }
router.post('/', async (req, res) => {
    const { endereco_id, itens } = req.body ?? {};

    // ---------- Validação básica ----------
    if (!Number.isInteger(endereco_id) || !Array.isArray(itens) || itens.length === 0) {
        return res.status(400).json({ erro: 'Informe endereco_id e ao menos um item' });
    }

    // Junta itens repetidos do mesmo produto (a PK de item_pedido é composta)
    const quantidades = new Map();
    for (const item of itens) {
        if (!Number.isInteger(item?.produto_id) ||
            !Number.isInteger(item?.quantidade) || item.quantidade < 1) {
            return res.status(400).json({ erro: 'Item inválido' });
        }
        quantidades.set(
            item.produto_id,
            (quantidades.get(item.produto_id) ?? 0) + item.quantidade
        );
    }

    // ---------- Transação ----------
    // A transação precisa de UMA conexão só, por isso pool.connect()
    const cliente = await pool.connect();

    try {
        await cliente.query('BEGIN');

        // O endereço precisa ser do usuário logado
        const endereco = await cliente.query(
            'SELECT id FROM endereco WHERE id = $1 AND usuario_id = $2 AND ativo',
            [endereco_id, req.usuarioId]
        );
        if (endereco.rows.length === 0) {
            await cliente.query('ROLLBACK');
            return res.status(400).json({ erro: 'Endereço inválido' });
        }

        const pedido = await cliente.query(
            `INSERT INTO pedido (usuario_id, endereco_id)
             VALUES ($1, $2)
             RETURNING id, data, status`,
            [req.usuarioId, endereco_id]
        );
        const pedidoId = pedido.rows[0].id;

        let total = 0;

        // Ordena por id para travar sempre na mesma ordem (evita deadlock)
        const produtoIds = [...quantidades.keys()].sort((a, b) => a - b);

        for (const produtoId of produtoIds) {
            const quantidade = quantidades.get(produtoId);

            // FOR UPDATE trava a linha: outro pedido simultâneo espera aqui
            const produto = await cliente.query(
                'SELECT nome, preco::float8 AS preco, estoque FROM produto WHERE id = $1 FOR UPDATE',
                [produtoId]
            );

            if (produto.rows.length === 0) {
                await cliente.query('ROLLBACK');
                return res.status(400).json({ erro: `Produto ${produtoId} não existe` });
            }

            const { nome, preco, estoque } = produto.rows[0];

            if (estoque < quantidade) {
                await cliente.query('ROLLBACK');
                return res.status(409).json({
                    erro: `Estoque insuficiente para "${nome}" (disponível: ${estoque})`,
                });
            }

            await cliente.query(
                'UPDATE produto SET estoque = estoque - $1 WHERE id = $2',
                [quantidade, produtoId]
            );

            // preco_unitario recebe o preço de AGORA (histórico da compra)
            await cliente.query(
                `INSERT INTO item_pedido (pedido_id, produto_id, quantidade, preco_unitario)
                 VALUES ($1, $2, $3, $4)`,
                [pedidoId, produtoId, quantidade, preco]
            );

            total += preco * quantidade;
        }

        await cliente.query('COMMIT');

        res.status(201).json({
            ...pedido.rows[0],
            total: Math.round(total * 100) / 100,
        });

    } catch (erro) {
        await cliente.query('ROLLBACK');
        throw erro;
    } finally {
        cliente.release(); // devolve a conexão ao pool, sempre
    }
});

// GET /api/pedidos → pedidos do usuário logado, com itens, endereço e total
// json_agg junta os itens de cada pedido numa lista dentro da própria linha.
router.get('/', async (req, res) => {
    const resultado = await pool.query(
        `SELECT p.id, p.data, p.status,
                SUM(i.quantidade * i.preco_unitario)::float8 AS total,
                json_agg(
                    json_build_object(
                        'produto_id',     i.produto_id,
                        'nome',           pr.nome,
                        'quantidade',     i.quantidade,
                        'preco_unitario', i.preco_unitario::float8
                    ) ORDER BY pr.nome
                ) AS itens,
                json_build_object(
                    'rua', e.rua, 'numero', e.numero, 'complemento', e.complemento,
                    'bairro', e.bairro, 'cidade', e.cidade, 'estado', e.estado, 'cep', e.cep
                ) AS endereco
         FROM pedido p
         JOIN item_pedido i ON i.pedido_id = p.id
         JOIN produto pr    ON pr.id = i.produto_id
         JOIN endereco e    ON e.id = p.endereco_id
         WHERE p.usuario_id = $1
         GROUP BY p.id, e.id
         ORDER BY p.data DESC`,
        [req.usuarioId]
    );
    res.json(resultado.rows);
});

// Só dá para cancelar enquanto o pedido não saiu para entrega
const STATUS_CANCELAVEIS = ['pendente', 'pago'];

// POST /api/pedidos/:id/cancelar
// Numa transação: muda o status para 'cancelado' e devolve as unidades ao estoque.
router.post('/:id/cancelar', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ erro: 'ID inválido' });
    }

    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');

        // FOR UPDATE: trava o pedido para não ser cancelado duas vezes ao mesmo tempo
        const pedido = await cliente.query(
            'SELECT status FROM pedido WHERE id = $1 AND usuario_id = $2 FOR UPDATE',
            [id, req.usuarioId]
        );

        if (pedido.rows.length === 0) {
            await cliente.query('ROLLBACK');
            return res.status(404).json({ erro: 'Pedido não encontrado' });
        }

        const { status } = pedido.rows[0];
        if (!STATUS_CANCELAVEIS.includes(status)) {
            await cliente.query('ROLLBACK');
            return res.status(409).json({
                erro: status === 'cancelado'
                    ? 'Este pedido já foi cancelado'
                    : `Pedidos com status "${status}" não podem mais ser cancelados`,
            });
        }

        await cliente.query(
            "UPDATE pedido SET status = 'cancelado' WHERE id = $1",
            [id]
        );

        // Devolve ao estoque a quantidade de cada item (UPDATE com FROM = UPDATE com JOIN)
        await cliente.query(
            `UPDATE produto pr
             SET estoque = pr.estoque + i.quantidade
             FROM item_pedido i
             WHERE i.pedido_id = $1 AND pr.id = i.produto_id`,
            [id]
        );

        await cliente.query('COMMIT');
        res.json({ id, status: 'cancelado' });
    } catch (erro) {
        await cliente.query('ROLLBACK');
        throw erro;
    } finally {
        cliente.release();
    }
});

export default router;