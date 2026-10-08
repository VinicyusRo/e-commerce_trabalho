import { Router } from 'express';
import { pool } from '../db.js';
import { exigirLogin } from '../middleware/auth.js';

const router = Router();

// Todas as rotas deste arquivo exigem login
router.use(exigirLogin);

const COLUNAS = 'id, rua, numero, complemento, bairro, cidade, estado, cep';

// Valida e limpa os dados enviados pelo formulário.
// Devolve { erro } ou { dados: [rua, numero, complemento, bairro, cidade, estado, cep] }
function validarEndereco(corpo) {
    const { rua, numero, complemento, bairro, cidade, estado, cep } = corpo ?? {};

    const texto = (v) => (typeof v === 'string' ? v.trim() : '');
    const cepLimpo = typeof cep === 'string' ? cep.replace(/\D/g, '') : '';

    if (!texto(rua) || !texto(numero) || !texto(cidade) ||
        texto(estado).length !== 2 || cepLimpo.length !== 8) {
        return { erro: 'Informe rua, número, cidade, estado (2 letras) e CEP (8 dígitos)' };
    }
    if (texto(rua).length > 150 || texto(numero).length > 10 ||
        texto(complemento).length > 60 || texto(bairro).length > 80 || texto(cidade).length > 80) {
        return { erro: 'Algum campo do endereço está grande demais' };
    }

    return {
        dados: [
            texto(rua), texto(numero),
            texto(complemento) || null,       // opcional: vazio vira NULL no banco
            texto(bairro) || null,
            texto(cidade), texto(estado).toUpperCase(), cepLimpo,
        ],
    };
}

function lerId(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        res.status(400).json({ erro: 'ID inválido' });
        return null;
    }
    return id;
}

// GET /api/enderecos → endereços ATIVOS do usuário logado
router.get('/', async (req, res) => {
    const resultado = await pool.query(
        `SELECT ${COLUNAS}
         FROM endereco
         WHERE usuario_id = $1 AND ativo
         ORDER BY id`,
        [req.usuarioId]
    );
    res.json(resultado.rows);
});

// POST /api/enderecos → cadastra um endereço
router.post('/', async (req, res) => {
    const { erro, dados } = validarEndereco(req.body);
    if (erro) return res.status(400).json({ erro });

    const resultado = await pool.query(
        `INSERT INTO endereco (usuario_id, rua, numero, complemento, bairro, cidade, estado, cep)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING ${COLUNAS}`,
        [req.usuarioId, ...dados]
    );
    res.status(201).json(resultado.rows[0]);
});

// PUT /api/enderecos/:id → edita um endereço
//
// Se o endereço já foi usado em algum pedido, NÃO alteramos a linha original
// (senão o pedido antigo "mudaria de endereço"). Em vez disso, numa transação:
// desativamos o antigo e criamos um novo com os dados editados.
router.put('/:id', async (req, res) => {
    const id = lerId(req, res);
    if (id === null) return;

    const { erro, dados } = validarEndereco(req.body);
    if (erro) return res.status(400).json({ erro });

    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');

        // O endereço precisa existir, estar ativo e ser do usuário logado
        const atual = await cliente.query(
            'SELECT id FROM endereco WHERE id = $1 AND usuario_id = $2 AND ativo FOR UPDATE',
            [id, req.usuarioId]
        );
        if (atual.rows.length === 0) {
            await cliente.query('ROLLBACK');
            return res.status(404).json({ erro: 'Endereço não encontrado' });
        }

        const usado = await cliente.query(
            'SELECT EXISTS (SELECT 1 FROM pedido WHERE endereco_id = $1) AS usado',
            [id]
        );

        let resultado;
        if (usado.rows[0].usado) {
            await cliente.query('UPDATE endereco SET ativo = FALSE WHERE id = $1', [id]);
            resultado = await cliente.query(
                `INSERT INTO endereco (usuario_id, rua, numero, complemento, bairro, cidade, estado, cep)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING ${COLUNAS}`,
                [req.usuarioId, ...dados]
            );
        } else {
            resultado = await cliente.query(
                `UPDATE endereco
                 SET rua = $2, numero = $3, complemento = $4, bairro = $5,
                     cidade = $6, estado = $7, cep = $8
                 WHERE id = $1
                 RETURNING ${COLUNAS}`,
                [id, ...dados]
            );
        }

        await cliente.query('COMMIT');
        res.json(resultado.rows[0]);
    } catch (erroBanco) {
        await cliente.query('ROLLBACK');
        throw erroBanco;
    } finally {
        cliente.release();
    }
});

// DELETE /api/enderecos/:id → exclui um endereço
// Sem pedidos: apaga de verdade. Com pedidos: só desativa (exclusão lógica).
router.delete('/:id', async (req, res) => {
    const id = lerId(req, res);
    if (id === null) return;

    const resultado = await pool.query(
        `WITH alvo AS (
             SELECT id, EXISTS (SELECT 1 FROM pedido WHERE endereco_id = endereco.id) AS usado
             FROM endereco
             WHERE id = $1 AND usuario_id = $2 AND ativo
         ),
         desativado AS (
             UPDATE endereco SET ativo = FALSE
             WHERE id IN (SELECT id FROM alvo WHERE usado)
             RETURNING id
         ),
         apagado AS (
             DELETE FROM endereco
             WHERE id IN (SELECT id FROM alvo WHERE NOT usado)
             RETURNING id
         )
         SELECT (SELECT count(*) FROM desativado) + (SELECT count(*) FROM apagado) AS total`,
        [id, req.usuarioId]
    );

    if (Number(resultado.rows[0].total) === 0) {
        return res.status(404).json({ erro: 'Endereço não encontrado' });
    }
    res.status(204).end();
});

export default router;
