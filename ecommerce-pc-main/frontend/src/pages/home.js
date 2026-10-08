import '../estilo.css';
import { montarCabecalho } from '../componentes/cabecalho.js';
import { api } from '../api/api.js';
import { formatarPreco, escapar } from '../utils.js';

montarCabecalho();

const parametros = new URLSearchParams(window.location.search);
const categoriaAtual = parametros.get('categoria');
const busca = parametros.get('busca');

const elCategorias = document.getElementById('categorias');
const elTitulo = document.getElementById('titulo-lista');
const elMensagem = document.getElementById('mensagem');
const elProdutos = document.getElementById('produtos');

function desenharCategorias(categorias) {
    const links = categorias.map((c) => {
        const ativa = String(c.id) === categoriaAtual ? 'ativa' : '';
        return `<a class="${ativa}" href="/?categoria=${c.id}">
                    ${escapar(c.nome)} (${c.total_produtos})
                </a>`;
    });

    elCategorias.innerHTML =
        `<a class="${!categoriaAtual ? 'ativa' : ''}" href="/">Todos</a>` + links.join('');
}

function desenharProdutos(produtos) {
    if (produtos.length === 0) {
        elMensagem.textContent = 'Nenhum produto encontrado.';
        elProdutos.innerHTML = '';
        return;
    }

    elMensagem.textContent = '';
    elProdutos.innerHTML = produtos.map((p) => `
        <a class="cartao" href="/produto.html?id=${p.id}">
            <h3>${escapar(p.nome)}</h3>
            <p class="categoria">${escapar(p.categoria)}</p>
            <p class="preco">${formatarPreco(p.preco)}</p>
            ${p.modelo_3d ? '<span class="selo-3d">Visualização 3D</span>' : ''}
        </a>
    `).join('');
}

async function iniciar() {
    elMensagem.textContent = 'Carregando...';

    // Monta a query string só com os filtros que existem
    const filtros = new URLSearchParams();
    if (categoriaAtual) filtros.set('categoria', categoriaAtual);
    if (busca) filtros.set('busca', busca);
    const consulta = filtros.toString() ? `?${filtros}` : '';

    if (busca) elTitulo.textContent = `Resultados para "${busca}"`;

    try {
        // As duas chamadas rodam ao mesmo tempo
        const [categorias, produtos] = await Promise.all([
            api('/categorias'),
            api(`/produtos${consulta}`),
        ]);

        desenharCategorias(categorias);
        desenharProdutos(produtos);
    } catch (erro) {
        elMensagem.textContent = `Erro ao carregar: ${erro.message}`;
    }
}

iniciar();
