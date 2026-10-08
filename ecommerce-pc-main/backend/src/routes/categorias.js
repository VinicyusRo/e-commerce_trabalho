import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// GET /api/categorias → lista categorias com a quantidade de produtos de cada uma
router.get('/', async (req, res) => {
    const resultado = await pool.query(`
        SELECT c.id,
               c.nome,
               c.descricao,
               COUNT(p.id)::int AS total_produtos
        FROM categoria c
        LEFT JOIN produto p ON p.categoria_id = c.id
        GROUP BY c.id
        ORDER BY c.nome
    `);
    res.json(resultado.rows);
});

export default router;