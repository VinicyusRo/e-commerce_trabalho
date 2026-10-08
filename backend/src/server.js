import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import categoriasRouter from './routes/categorias.js';
import produtosRouter from './routes/produtos.js';
import enderecosRouter from './routes/enderecos.js';
import pedidosRouter from './routes/pedidos.js';

const app = express();
// O Render (hospedagem) informa a porta pela variável PORT; no seu computador usa 3000
const PORTA = process.env.PORT ?? 3000;

// Middlewares: funções que rodam em toda requisição, antes das rotas
app.use(cors());          // permite que o frontend (outra porta) chame a API
app.use(express.json());  // converte o corpo JSON das requisições em objeto JS
app.use('/api/produtos', produtosRouter);
app.use('/api/categorias', categoriasRouter);
app.use('/api/auth', authRouter);
app.use('/api/enderecos', enderecosRouter);
app.use('/api/pedidos', pedidosRouter);

// Rota de teste
app.get('/api/saude', (req, res) => {
    res.json({ status: 'funcionando', hora: new Date().toISOString() });
});

// Rota /api inexistente
app.use('/api', (req, res) => {
    res.status(404).json({ erro: 'Rota não encontrada' });
});

// Tratamento de erros: o Express 5 envia para cá qualquer erro lançado
// numa rota async (ex.: banco fora do ar). Precisa ter 4 parâmetros.
// Sem isto, o Express responde uma página HTML e o frontend não
// consegue ler a mensagem { erro }.
app.use((erro, req, res, next) => {
    console.error(erro);
    res.status(500).json({ erro: 'Erro interno no servidor' });
});

app.listen(PORTA, () => {
    console.log(`Servidor rodando em http://localhost:${PORTA}`);
});