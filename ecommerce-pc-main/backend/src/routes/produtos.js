import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

const SELECT_PRODUTO = `
    SELECT p.id,
           p.nome,
           p.descricao,
           p.preco::float8 AS preco,
           p.estoque,
           p.imagem,
           c.id   AS categoria_id,
           c.nome AS categoria,
           m.arquivo AS modelo_3d
    FROM produto p
    JOIN categoria c ON c.id = p.categoria_id
    LEFT JOIN modelo_3d m ON m.produto_id = p.id
`;

// GET /api/produtos            → todos
// GET /api/produtos?categoria=1 → filtra por categoria
// GET /api/produtos?busca=rtx   → busca no nome e na descrição
router.get('/', async (req, res) => {
    const { categoria, busca } = req.query;

    const condicoes = [];
    const valores = [];

    if (categoria !== undefined) {
        const idCategoria = Number(categoria);
        if (!Number.isInteger(idCategoria)) {
            return res.status(400).json({ erro: 'Categoria inválida' });
        }
        valores.push(idCategoria);
        condicoes.push(`p.categoria_id = $${valores.length}`);
    }

    if (typeof busca === 'string' && busca.trim() !== '') {
        valores.push(`%${busca.trim()}%`);
        condicoes.push(
            `(p.nome ILIKE $${valores.length} OR p.descricao ILIKE $${valores.length})`
        );
    }

    const where = condicoes.length > 0 ? `WHERE ${condicoes.join(' AND ')}` : '';

    const resultado = await pool.query(
        `${SELECT_PRODUTO} ${where} ORDER BY p.id`,
        valores
    );
    res.json(resultado.rows);
});

// GET /api/produtos/:id  → um produto
router.get('/:id', async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
        return res.status(400).json({ erro: 'ID inválido' });
    }

    const resultado = await pool.query(`${SELECT_PRODUTO} WHERE p.id = $1`, [id]);

    if (resultado.rows.length === 0) {
        return res.status(404).json({ erro: 'Produto não encontrado' });
    }

    res.json(resultado.rows[0]);
});

export default router;