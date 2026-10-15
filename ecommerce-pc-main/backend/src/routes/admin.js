import { Router } from 'express';
import { pool } from '../db.js';
import { exigirAdmin } from '../middleware/auth.js';

// Rotas do painel de administrador (frontend: admin.html)
const router = Router();

// Todas as rotas deste arquivo exigem login de administrador
router.use(exigirAdmin);

function lerId(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        res.status(400).json({ erro: 'ID inválido' });
        return null;
    }
    return id;
}

const texto = (v) => (typeof v === 'string' ? v.trim() : '');

const STATUS_PEDIDO = ['pendente', 'pago', 'enviado', 'entregue', 'cancelado'];

// Para qual status cada um pode ir. Cancelar só antes de sair para entrega
// (mesma regra do cliente em routes/pedidos.js).
const PROXIMOS_STATUS = {
    pendente:  ['pago', 'cancelado'],
    pago:      ['enviado', 'cancelado'],
    enviado:   ['entregue'],
    entregue:  [],
    cancelado: [],
};

// =====================================================
// Resumo (números do topo do painel)
// =====================================================

// GET /api/admin/resumo
router.get('/resumo', async (req, res) => {
    const [porStatus, faturamento, produtos] = await Promise.all([
        pool.query(`SELECT status, COUNT(*)::int AS total FROM pedido GROUP BY status`),
        // Faturamento = soma dos pedidos que não foram cancelados
        pool.query(`
            SELECT COALESCE(SUM(i.quantidade * i.preco_unitario), 0)::float8 AS total
            FROM pedido p
            JOIN item_pedido i ON i.pedido_id = p.id
            WHERE p.status <> 'cancelado'`),
        pool.query(`
            SELECT COUNT(*)::int                                AS total,
                   COUNT(*) FILTER (WHERE estoque = 0)::int     AS sem_estoque,
                   COUNT(*) FILTER (WHERE destaque)::int        AS em_destaque
            FROM produto`),
    ]);

    // { pendente: 3, pago: 1, ... } com zero nos status sem pedidos
    const pedidos = Object.fromEntries(STATUS_PEDIDO.map((s) => [s, 0]));
    for (const linha of porStatus.rows) pedidos[linha.status] = linha.total;

    res.json({
        pedidos,
        faturamento: faturamento.rows[0].total,
        produtos: produtos.rows[0],
    });
});

// =====================================================
// Pedidos
// =====================================================

// GET /api/admin/pedidos            → todos os pedidos, mais recentes primeiro
// GET /api/admin/pedidos?status=pago → só os de um status
router.get('/pedidos', async (req, res) => {
    const { status } = req.query;
    const valores = [];
    let where = '';

    if (status !== undefined) {
        if (!STATUS_PEDIDO.includes(status)) {
            return res.status(400).json({ erro: 'Status inválido' });
        }
        valores.push(status);
        where = 'WHERE p.status = $1';
    }

    const resultado = await pool.query(
        `SELECT p.id, p.data, p.status,
                SUM(i.quantidade * i.preco_unitario)::float8 AS total,
                json_build_object('id', u.id, 'nome', u.nome, 'email', u.email) AS cliente,
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
         JOIN usuario u     ON u.id = p.usuario_id
         JOIN item_pedido i ON i.pedido_id = p.id
         JOIN produto pr    ON pr.id = i.produto_id
         JOIN endereco e    ON e.id = p.endereco_id
         ${where}
         GROUP BY p.id, u.id, e.id
         ORDER BY p.data DESC`,
        valores
    );

    res.json(resultado.rows.map((p) => ({ ...p, proximos_status: PROXIMOS_STATUS[p.status] ?? [] })));
});

// PATCH /api/admin/pedidos/:id/status
// Corpo: { "status": "enviado" }
// Se o novo status for "cancelado", devolve as unidades ao estoque (na mesma transação).
router.patch('/pedidos/:id/status', async (req, res) => {
    const id = lerId(req, res);
    if (id === null) return;

    const novo = req.body?.status;
    if (!STATUS_PEDIDO.includes(novo)) {
        return res.status(400).json({ erro: 'Status inválido' });
    }

    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');

        // FOR UPDATE: o cliente pode estar cancelando o mesmo pedido agora
        const pedido = await cliente.query(
            'SELECT status FROM pedido WHERE id = $1 FOR UPDATE',
            [id]
        );
        if (pedido.rows.length === 0) {
            await cliente.query('ROLLBACK');
            return res.status(404).json({ erro: 'Pedido não encontrado' });
        }

        const atual = pedido.rows[0].status;
        if (!PROXIMOS_STATUS[atual]?.includes(novo)) {
            await cliente.query('ROLLBACK');
            return res.status(409).json({
                erro: `Um pedido "${atual}" não pode passar para "${novo}"`,
            });
        }

        await cliente.query('UPDATE pedido SET status = $1 WHERE id = $2', [novo, id]);

        if (novo === 'cancelado') {
            await cliente.query(
                `UPDATE produto pr
                 SET estoque = pr.estoque + i.quantidade
                 FROM item_pedido i
                 WHERE i.pedido_id = $1 AND pr.id = i.produto_id`,
                [id]
            );
        }

        await cliente.query('COMMIT');
        res.json({ id, status: novo, proximos_status: PROXIMOS_STATUS[novo] });
    } catch (erro) {
        await cliente.query('ROLLBACK');
        throw erro;
    } finally {
        cliente.release();
    }
});

// =====================================================
// Produtos
// =====================================================

const COLUNAS_PRODUTO = `id, nome, descricao, preco::float8 AS preco, estoque, imagem, categoria_id, destaque`;

// Valida o corpo do formulário de produto.
// Devolve { erro } ou { dados: [nome, descricao, preco, estoque, imagem, categoria_id, destaque] }
function validarProduto(corpo) {
    const { nome, descricao, preco, estoque, imagem, categoria_id, destaque } = corpo ?? {};

    if (!texto(nome) || texto(nome).length > 150) {
        return { erro: 'Informe o nome (até 150 caracteres)' };
    }
    if (typeof preco !== 'number' || !Number.isFinite(preco) || preco < 0 || preco >= 1e8) {
        return { erro: 'Preço inválido' };
    }
    if (!Number.isInteger(estoque) || estoque < 0) {
        return { erro: 'O estoque precisa ser um número inteiro, zero ou mais' };
    }
    if (!Number.isInteger(categoria_id)) {
        return { erro: 'Escolha uma categoria' };
    }
    if (texto(imagem).length > 255) {
        return { erro: 'O caminho da imagem está grande demais' };
    }

    return {
        dados: [
            texto(nome),
            texto(descricao) || null,
            Math.round(preco * 100) / 100,
            estoque,
            texto(imagem) || null,
            categoria_id,
            destaque === true,
        ],
    };
}

// Erros do PostgreSQL que viram mensagem para o painel
function erroProduto(erro, res) {
    // 23503 = chave estrangeira: categoria não existe (INSERT/UPDATE)
    // ou produto já usado em pedidos (DELETE)
    if (erro.code === '23503') {
        return res.status(409).json({
            erro: erro.table === 'item_pedido'
                ? 'Este produto já foi vendido e não pode ser excluído. Zere o estoque para tirá-lo de venda.'
                : 'Categoria não encontrada',
        });
    }
    throw erro;
}

// GET /api/admin/produtos → todos, com o nome da categoria e se já foi vendido
router.get('/produtos', async (req, res) => {
    const resultado = await pool.query(`
        SELECT p.id, p.nome, p.descricao, p.preco::float8 AS preco, p.estoque, p.imagem,
               p.categoria_id, c.nome AS categoria, p.destaque,
               EXISTS (SELECT 1 FROM item_pedido i WHERE i.produto_id = p.id) AS vendido
        FROM produto p
        JOIN categoria c ON c.id = p.categoria_id
        ORDER BY p.destaque DESC, c.nome, p.nome
    `);
    res.json(resultado.rows);
});

// POST /api/admin/produtos → cadastra um produto
router.post('/produtos', async (req, res) => {
    const { erro, dados } = validarProduto(req.body);
    if (erro) return res.status(400).json({ erro });

    try {
        const resultado = await pool.query(
            `INSERT INTO produto (nome, descricao, preco, estoque, imagem, categoria_id, destaque)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING ${COLUNAS_PRODUTO}`,
            dados
        );
        res.status(201).json(resultado.rows[0]);
    } catch (erroBanco) {
        erroProduto(erroBanco, res);
    }
});

// PUT /api/admin/produtos/:id → edita um produto
// (especificações, dados técnicos e modelo 3D continuam como estão)
router.put('/produtos/:id', async (req, res) => {
    const id = lerId(req, res);
    if (id === null) return;

    const { erro, dados } = validarProduto(req.body);
    if (erro) return res.status(400).json({ erro });

    try {
        const resultado = await pool.query(
            `UPDATE produto
             SET nome = $2, descricao = $3, preco = $4, estoque = $5,
                 imagem = $6, categoria_id = $7, destaque = $8
             WHERE id = $1
             RETURNING ${COLUNAS_PRODUTO}`,
            [id, ...dados]
        );
        if (resultado.rows.length === 0) {
            return res.status(404).json({ erro: 'Produto não encontrado' });
        }
        res.json(resultado.rows[0]);
    } catch (erroBanco) {
        erroProduto(erroBanco, res);
    }
});

// PATCH /api/admin/produtos/:id/destaque
// Corpo: { "destaque": true }  → liga/desliga o destaque sem abrir o formulário
router.patch('/produtos/:id/destaque', async (req, res) => {
    const id = lerId(req, res);
    if (id === null) return;

    if (typeof req.body?.destaque !== 'boolean') {
        return res.status(400).json({ erro: 'Informe destaque: true ou false' });
    }

    const resultado = await pool.query(
        `UPDATE produto SET destaque = $2 WHERE id = $1 RETURNING ${COLUNAS_PRODUTO}`,
        [id, req.body.destaque]
    );
    if (resultado.rows.length === 0) {
        return res.status(404).json({ erro: 'Produto não encontrado' });
    }
    res.json(resultado.rows[0]);
});

// DELETE /api/admin/produtos/:id
// Só apaga produto que nunca foi vendido (item_pedido tem ON DELETE RESTRICT).
// Dados técnicos e soquetes do cooler são apagados junto (ON DELETE CASCADE).
router.delete('/produtos/:id', async (req, res) => {
    const id = lerId(req, res);
    if (id === null) return;

    try {
        const resultado = await pool.query('DELETE FROM produto WHERE id = $1', [id]);
        if (resultado.rowCount === 0) {
            return res.status(404).json({ erro: 'Produto não encontrado' });
        }
        res.status(204).end();
    } catch (erroBanco) {
        erroProduto(erroBanco, res);
    }
});

// =====================================================
// Categorias
// =====================================================

function validarCategoria(corpo) {
    const { nome, descricao } = corpo ?? {};
    if (!texto(nome) || texto(nome).length > 60) {
        return { erro: 'Informe o nome (até 60 caracteres)' };
    }
    return { dados: [texto(nome), texto(descricao) || null] };
}

function erroCategoria(erro, res) {
    // 23505 = UNIQUE (nome repetido); 23503 = ainda tem produtos (ON DELETE RESTRICT)
    if (erro.code === '23505') {
        return res.status(409).json({ erro: 'Já existe uma categoria com esse nome' });
    }
    if (erro.code === '23503') {
        return res.status(409).json({ erro: 'A categoria ainda tem produtos. Mova ou exclua os produtos antes.' });
    }
    throw erro;
}

// POST /api/admin/categorias
router.post('/categorias', async (req, res) => {
    const { erro, dados } = validarCategoria(req.body);
    if (erro) return res.status(400).json({ erro });

    try {
        const resultado = await pool.query(
            'INSERT INTO categoria (nome, descricao) VALUES ($1, $2) RETURNING id, nome, descricao',
            dados
        );
        res.status(201).json(resultado.rows[0]);
    } catch (erroBanco) {
        erroCategoria(erroBanco, res);
    }
});

// PUT /api/admin/categorias/:id
router.put('/categorias/:id', async (req, res) => {
    const id = lerId(req, res);
    if (id === null) return;

    const { erro, dados } = validarCategoria(req.body);
    if (erro) return res.status(400).json({ erro });

    try {
        const resultado = await pool.query(
            'UPDATE categoria SET nome = $2, descricao = $3 WHERE id = $1 RETURNING id, nome, descricao',
            [id, ...dados]
        );
        if (resultado.rows.length === 0) {
            return res.status(404).json({ erro: 'Categoria não encontrada' });
        }
        res.json(resultado.rows[0]);
    } catch (erroBanco) {
        erroCategoria(erroBanco, res);
    }
});

// DELETE /api/admin/categorias/:id → só se não tiver produtos
router.delete('/categorias/:id', async (req, res) => {
    const id = lerId(req, res);
    if (id === null) return;

    try {
        const resultado = await pool.query('DELETE FROM categoria WHERE id = $1', [id]);
        if (resultado.rowCount === 0) {
            return res.status(404).json({ erro: 'Categoria não encontrada' });
        }
        res.status(204).end();
    } catch (erroBanco) {
        erroCategoria(erroBanco, res);
    }
});

export default router;
