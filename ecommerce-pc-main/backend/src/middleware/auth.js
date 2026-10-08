import 'dotenv/config';
import jwt from 'jsonwebtoken';

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