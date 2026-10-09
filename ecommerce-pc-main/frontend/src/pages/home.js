import '../estilo.css';
import { montarCabecalho } from '../componentes/cabecalho.js';
import { api } from '../api/api.js';
import { escapar, formatarPreco } from '../utils.js';
import { cartaoProduto } from '../componentes/cartao-produto.js';
import { fotoHTML } from '../componentes/foto.js';
import { iconeDaCategoria, ICONES } from '../componentes/icones.js';
import { textoSeloModelo } from '../viewer/modelo-produto.js';

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
    elProdutos.innerHTML = produtos.map((p) => cartaoProduto(p)).join('');
}

// =====================================================
// Vitrine do banner: até 10 produtos com foto passando sozinhos.
// A lista já vem na ordem do catálogo (personalizados primeiro).
// =====================================================
function montarVitrine(produtos) {
    const elVitrine = document.getElementById('vitrine');
    const trilho = document.getElementById('vitrine-trilho');
    const pontos = document.getElementById('vitrine-pontos');
    const lista = produtos.filter((p) => p.imagem).slice(0, 10);
    if (categoriaAtual || busca || lista.length === 0) return;

    trilho.innerHTML = lista.map((p, i) => {
        const selo = textoSeloModelo(p.modelo_3d, p);
        return `<a class="vitrine-slide" href="/produto.html?id=${p.id}" aria-label="${escapar(p.nome)}" ${i ? 'tabindex="-1"' : ''}>
            <div class="vitrine-foto tem-foto">
                ${selo ? `<span class="selo-3d">${ICONES.cubo}${selo}</span>` : ''}
                ${iconeDaCategoria(p.categoria)}${fotoHTML(p)}
            </div>
            <div class="vitrine-info">
                <span class="categoria">${escapar(p.categoria)}</span>
                <strong>${escapar(p.nome)}</strong>
                <span class="preco">${formatarPreco(p.preco)}</span>
            </div>
        </a>`;
    }).join('');
    pontos.innerHTML = lista.map((p, i) =>
        `<button type="button" role="tab" aria-label="Produto ${i + 1} de ${lista.length}" aria-selected="${i === 0}"></button>`).join('');
    elVitrine.hidden = false;

    let atual = 0;
    const slides = trilho.children, botoes = pontos.children;
    function ir(i) {
        atual = (i + lista.length) % lista.length;
        trilho.style.transform = `translateX(-${atual * 100}%)`;
        [...botoes].forEach((b, k) => b.setAttribute('aria-selected', String(k === atual)));
        [...slides].forEach((s, k) => s.tabIndex = k === atual ? 0 : -1);
    }
    [...botoes].forEach((b, k) => b.addEventListener('click', () => ir(k)));

    // Passa sozinho a cada 4 s; para enquanto o mouse está em cima ou o foco está dentro
    let parado = false;
    elVitrine.addEventListener('mouseenter', () => { parado = true; });
    elVitrine.addEventListener('mouseleave', () => { parado = false; });
    elVitrine.addEventListener('focusin', () => { parado = true; });
    elVitrine.addEventListener('focusout', () => { parado = false; });
    const timer = setInterval(() => {
        if (!document.contains(trilho)) { clearInterval(timer); return; }   // saiu da página
        if (!parado && !document.hidden) ir(atual + 1);
    }, 4000);

    // Arrastar com o dedo (celular)
    let inicioX = null, arrastou = false;
    trilho.addEventListener('pointerdown', (e) => { inicioX = e.clientX; arrastou = false; });
    trilho.addEventListener('pointerup', (e) => {
        if (inicioX === null) return;
        const dx = e.clientX - inicioX;
        inicioX = null;
        if (Math.abs(dx) > 40) { arrastou = true; ir(atual + (dx < 0 ? 1 : -1)); }
    });
    // um arrasto não deve abrir o produto (só um toque abre)
    trilho.addEventListener('click', (e) => { if (arrastou) { e.preventDefault(); arrastou = false; } }, true);
    trilho.addEventListener('dragstart', (e) => e.preventDefault());
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
        montarVitrine(produtos);
    } catch (erro) {
        clearTimeout(avisoLento);
        elMensagem.textContent = `Erro ao carregar: ${erro.message}`;
    }
}

iniciar();
