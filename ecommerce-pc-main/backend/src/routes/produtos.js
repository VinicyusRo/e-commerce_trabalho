import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// A view vw_produto_catalogo (database/schema.sql) já resolve qual
// modelo 3D usar: o do produto ou, se não houver, o da categoria.
// preco::float8 converte NUMERIC para número (o driver pg devolveria texto).
const SELECT_PRODUTO = `
    SELECT p.id,
           p.nome,
           p.descricao,
           p.preco::float8 AS preco,
           p.estoque,
           p.imagem,
           p.categoria_id,
           p.categoria,
           p.modelo_arquivo,
           p.modelo_formato,
           p.modelo_creditos,
           p.modelo_origem,
           p.soquete,
           p.memoria,
           p.formato_placa,
           p.consumo_w,
           p.potencia_w,
           p.video_integrado,
           p.soquetes_cooler,
           p.especificacoes
    FROM vw_produto_catalogo p
`;

// Junta as colunas modelo_* num objeto só (ou null se não houver modelo)
// e os dados técnicos em "tecnico" (usado no Monte seu PC)
function formatarProduto(linha) {
    const {
        modelo_arquivo, modelo_formato, modelo_creditos, modelo_origem,
        soquete, memoria, formato_placa, consumo_w, potencia_w, video_integrado, soquetes_cooler,
        ...produto
    } = linha;

    const tecnico = { soquete, memoria, formato: formato_placa, consumo_w, potencia_w, video_integrado, soquetes_cooler };
    // Só manda os campos preenchidos; produto sem nenhum fica com tecnico = null
    for (const chave of Object.keys(tecnico)) if (tecnico[chave] === null) delete tecnico[chave];
    produto.tecnico = Object.keys(tecnico).length > 0 ? tecnico : null;

    produto.modelo_3d = modelo_arquivo
        ? {
              arquivo:  modelo_arquivo,   // caminho do .glb ou nome do gerador procedural
              formato:  modelo_formato,   // 'glb', 'gltf' ou 'procedural'
              creditos: modelo_creditos,
              origem:   modelo_origem,    // 'produto' ou 'categoria'
          }
        : null;

    return produto;
}

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
    res.json(resultado.rows.map(formatarProduto));
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

    res.json(formatarProduto(resultado.rows[0]));
});

export default router;