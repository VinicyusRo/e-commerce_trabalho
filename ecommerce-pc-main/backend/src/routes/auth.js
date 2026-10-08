import 'dotenv/config';
import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { exigirLogin } from '../middleware/auth.js';

const router = Router();

function gerarToken(usuarioId) {
    return jwt.sign({ id: usuarioId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRA_EM ?? '2h',
    });
}

// POST /api/auth/cadastro
router.post('/cadastro', async (req, res) => {
    const { nome, email, senha } = req.body ?? {};

    if (typeof nome !== 'string' || nome.trim() === '' ||
        typeof email !== 'string' || !email.includes('@') ||
        typeof senha !== 'string' || senha.length < 6) {
        return res.status(400).json({
            erro: 'Informe nome, e-mail válido e senha com pelo menos 6 caracteres',
        });
    }

    const emailNormalizado = email.trim().toLowerCase();

    // 10 = custo do hash: quanto maior, mais lento (e mais difícil de quebrar)
    const senhaHash = await bcrypt.hash(senha, 10);

    try {
        const resultado = await pool.query(
            `INSERT INTO usuario (nome, email, senha_hash)
             VALUES ($1, $2, $3)
             RETURNING id, nome, email`,
            [nome.trim(), emailNormalizado, senhaHash]
        );
        const usuario = resultado.rows[0];
        res.status(201).json({ usuario, token: gerarToken(usuario.id) });

    } catch (erro) {
        // 23505 = violação de UNIQUE no PostgreSQL (e-mail já cadastrado)
        if (erro.code === '23505') {
            return res.status(409).json({ erro: 'E-mail já cadastrado' });
        }
        throw erro;
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, senha } = req.body ?? {};

    if (typeof email !== 'string' || typeof senha !== 'string') {
        return res.status(400).json({ erro: 'Informe e-mail e senha' });
    }

    const resultado = await pool.query(
        'SELECT id, nome, email, senha_hash FROM usuario WHERE email = $1',
        [email.trim().toLowerCase()]
    );
    const usuario = resultado.rows[0];

    // Mesma mensagem para "e-mail não existe" e "senha errada":
    // não revela a um atacante quais e-mails estão cadastrados.
    const senhaCorreta = usuario
        ? await bcrypt.compare(senha, usuario.senha_hash)
        : false;

    if (!senhaCorreta) {
        return res.status(401).json({ erro: 'E-mail ou senha incorretos' });
    }

    res.json({
        usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
        token: gerarToken(usuario.id),
    });
});

// GET /api/auth/eu  → dados do usuário logado (rota protegida)
router.get('/eu', exigirLogin, async (req, res) => {
    const resultado = await pool.query(
        'SELECT id, nome, email, data_cadastro FROM usuario WHERE id = $1',
        [req.usuarioId]
    );

    if (resultado.rows.length === 0) {
        return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    res.json(resultado.rows[0]);
});

export default router;