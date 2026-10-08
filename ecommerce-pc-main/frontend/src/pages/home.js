import '../estilo.css';
import { montarCabecalho } from '../componentes/cabecalho.js';
import { api } from '../api/api.js';
import { formatarPreco, escapar } from '../utils.js';
import { textoSeloModelo } from '../viewer/modelo-produto.js';
import { iconeDaCategoria, ICONES } from '../componentes/icones.js';

montarCabecalho();

const parametros = new URLSearchParams(window.location.search);
const categoriaAtual = parametros.get('categoria');
const busca = parametros.get('busca');

const elCategorias = document.getElementById('categorias');
const elTitulo = document.getElementById('titulo-lista');
const elMensagem = document.getElementById('mensagem');
const elProdutos = document.getElementById('produtos');

// O banner de destaque só aparece na página inicial "pura" (sem busca/filtro)
if (categoriaAtual || busca) document.getElementById('destaque').hidden = true;

function desenharCategorias(categorias) {
    const links = categorias.map((c) => {
        const ativa = String(c.id) === categoriaAtual ? 'ativa' : '';
        return `<a class="${ativa}" href="/?categoria=${c.id}">
                    ${escapar(c.nome)} <span class="qtd">${c.total_produtos}</span>
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
    elProdutos.innerHTML = produtos.map((p) => {
        const selo = textoSeloModelo(p.modelo_3d);
        const generico = p.modelo_3d?.origem === 'categoria';
        const estoque = p.estoque > 0
            ? `<span class="em-estoque">${p.estoque} em estoque</span>`
            : '<span class="sem-estoque">Esgotado</span>';

        return `
        <a class="cartao" href="/produto.html?id=${p.id}">
            <div class="cartao-imagem">
                ${iconeDaCategoria(p.categoria)}
                ${selo ? `<span class="selo-3d ${generico ? 'generico' : ''}">${ICONES.cubo}${selo}</span>` : ''}
            </div>
            <div class="cartao-corpo">
                <p class="categoria">${escapar(p.categoria)}</p>
                <h3>${escapar(p.nome)}</h3>
                <p class="preco">${formatarPreco(p.preco)}</p>
                <div class="cartao-rodape">
                    ${estoque}
                    <span class="ver-3d">Ver em 3D →</span>
                </div>
            </div>
        </a>`;
    }).join('');
}

async function iniciar() {
    elMensagem.textContent = 'Carregando produtos...';

    // O backend grátis "dorme" quando ninguém usa; avisa se demorar
    const avisoLento = setTimeout(() => {
        elMensagem.textContent =
            'Carregando produtos... o servidor estava em repouso e pode levar até 1 minuto para acordar.';
    }, 4000);

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

        clearTimeout(avisoLento);
        desenharCategorias(categorias);
        desenharProdutos(produtos);
    } catch (erro) {
        clearTimeout(avisoLento);
        elMensagem.textContent = `Erro ao carregar: ${erro.message}`;
    }
}

iniciar();
