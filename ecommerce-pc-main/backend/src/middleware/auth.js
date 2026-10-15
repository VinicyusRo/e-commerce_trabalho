import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

// Protege rotas: exige um token válido no cabeçalho Authorization.
// Formato esperado:  Authorization: Bearer <token>
export function exigirLogin(req, res, next) {
    const cabecalho = req.headers.authorization ?? '';
    const [tipo, token] = cabecalho.split(' ');

    if (tipo !== 'Bearer' || !token) {
        return res.status(401).json({ erro: 'Login necessário' });
    }

    try {
        const dados = jwt.verify(token, process.env.JWT_SECRET);
        req.usuarioId = dados.id;   // fica disponível para as rotas seguintes
        next();                      // continua para a rota
    } catch {
        res.status(401).json({ erro: 'Token inválido ou expirado' });
    }
}

// Protege as rotas do painel: além do login, o usuário precisa ter
// admin = TRUE no banco (migração 10). Consultamos o banco a cada
// requisição (e não o token) para que tirar o admin de alguém valha na hora.
export function exigirAdmin(req, res, next) {
    exigirLogin(req, res, async () => {
        try {
            const resultado = await pool.query(
                'SELECT admin FROM usuario WHERE id = $1',
                [req.usuarioId]
            );
            if (!resultado.rows[0]?.admin) {
                return res.status(403).json({ erro: 'Acesso restrito a administradores' });
            }
            next();
        } catch (erro) {
            next(erro);
        }
    });
}
