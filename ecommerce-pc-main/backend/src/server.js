import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import categoriasRouter from './routes/categorias.js';
import produtosRouter from './routes/produtos.js';
import enderecosRouter from './routes/enderecos.js';
import pedidosRouter from './routes/pedidos.js';

const app = express();
const PORTA = 3000;

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

app.listen(PORTA, () => {
    console.log(`Servidor rodando em http://localhost:${PORTA}`);
});