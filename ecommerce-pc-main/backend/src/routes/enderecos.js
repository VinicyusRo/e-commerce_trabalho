import { Router } from 'express';
import { pool } from '../db.js';
import { exigirLogin } from '../middleware/auth.js';

const router = Router();

// Todas as rotas deste arquivo exigem login
router.use(exigirLogin);

// GET /api/enderecos → endereços do usuário logado
router.get('/', async (req, res) => {
    const resultado = await pool.query(
        `SELECT id, rua, numero, cidade, estado, cep
         FROM endereco
         WHERE usuario_id = $1
         ORDER BY id`,
        [req.usuarioId]
    );
    res.json(resultado.rows);
});

// POST /api/enderecos → cadastra um endereço
router.post('/', async (req, res) => {
    const { rua, numero, cidade, estado, cep } = req.body ?? {};

    const cepLimpo = typeof cep === 'string' ? cep.replace(/\D/g, '') : '';

    if ([rua, numero, cidade].some((v) => typeof v !== 'string' || v.trim() === '') ||
        typeof estado !== 'string' || estado.trim().length !== 2 ||
        cepLimpo.length !== 8) {
        return res.status(400).json({
            erro: 'Informe rua, número, cidade, estado (2 letras) e CEP (8 dígitos)',
        });
    }

    const resultado = await pool.query(
        `INSERT INTO endereco (usuario_id, rua, numero, cidade, estado, cep)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, rua, numero, cidade, estado, cep`,
        [req.usuarioId, rua.trim(), numero.trim(), cidade.trim(),
         estado.trim().toUpperCase(), cepLimpo]
    );
    res.status(201).json(resultado.rows[0]);
});

export default router;