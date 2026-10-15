import { totalDeItens } from '../carrinho.js';
import { ICONES } from './icones.js';
import { escapar } from '../utils.js';
import { api } from '../api/api.js';
import { GRUPOS, grupoDaCategoria } from '../grupos.js';

// Atalhos da barra de departamentos (só aparecem se a categoria existir no banco)
const ATALHOS = ['Placas de vídeo', 'Processadores', 'Monitores', 'Teclados', 'Mouses'];

// Primeiro nome do usuário logado (salvo no login), ex.: "Vinicyus"
function primeiroNome() {
    try {
        const usuario = JSON.parse(localStorage.getItem('usuario'));
        return usuario?.nome?.trim().split(/\s+/)[0] || 'Minha conta';
    } catch {
        return 'Minha conta';
    }
}

// O link do painel só aparece para administradores. É só aparência:
// quem protege de verdade é o backend (middleware exigirAdmin).
function ehAdmin() {
    try {
        return JSON.parse(localStorage.getItem('usuario'))?.admin === true;
    } catch {
        return false;
    }
}

// Monta o cabeçalho em qualquer página que tenha <header id="cabecalho">
export function montarCabecalho() {
    const alvo = document.getElementById('cabecalho');
    if (!alvo) return;

    const logado = localStorage.getItem('token') !== null;
    const itens = totalDeItens();

    alvo.innerHTML = `
      <div class="cabecalho-linha">
        <a class="logo" href="/">
            <span class="logo-icone" aria-hidden="true"></span>
            <span>PC<span class="logo-destaque">Store</span></span>
        </a>

        <form class="busca" action="/" method="get" role="search">
            <span class="busca-icone" aria-hidden="true">${ICONES.busca}</span>
            <input type="search" name="busca" placeholder="Buscar placas de vídeo, processadores..."
                   aria-label="Buscar produtos">
            <button type="submit">Buscar</button>
        </form>

        <nav>
            ${logado && ehAdmin()
                ? `<a class="nav-link nav-admin" href="/admin.html">${ICONES.painel}<span>Painel</span></a>`
                : ''}
            <a class="nav-link nav-montar" href="/monte-seu-pc.html">
                ${ICONES.montar}
                <span>Monte seu PC</span>
            </a>
            <a class="nav-link" href="/carrinho.html">
                ${ICONES.carrinho}
                <span>Carrinho</span>
                ${itens > 0 ? `<span class="contador-carrinho">${itens}</span>` : ''}
            </a>
            ${logado
                ? `<a class="nav-link nav-usuario" href="/conta.html" title="Minha conta">
                       <span class="avatar" aria-hidden="true">${escapar(primeiroNome().charAt(0).toUpperCase())}</span>
                       <span>${escapar(primeiroNome())}</span>
                   </a>`
                : `<a class="nav-link" href="/login.html">${ICONES.usuario}<span>Entrar</span></a>`}
        </nav>
      </div>
      <div class="deptos-linha">
        <nav class="deptos" aria-label="Departamentos">
            <button class="deptos-botao" type="button" aria-expanded="false" aria-controls="menu-deptos">☰ Departamentos</button>
            <a href="/" data-inicio>⌂ Início</a>
            <a href="/?grupo=hardware" data-grupo="hardware">Hardware</a>
            <a href="/?grupo=perifericos" data-grupo="perifericos">Periféricos</a>
            <span class="deptos-atalhos"></span>
            <a class="deptos-monte" href="/monte-seu-pc.html">Monte seu PC completo ›</a>
        </nav>
        <div class="menu-deptos" id="menu-deptos" hidden></div>
      </div>
    `;

    // Usamos .value (e não innerHTML) de propósito: o texto vem da URL
    // e não deve virar HTML (evita XSS).
    const termo = new URLSearchParams(window.location.search).get('busca');
    if (termo) alvo.querySelector('input').value = termo;

    montarDepartamentos(alvo);

    // Altura do cabeçalho numa variável do CSS (usada pelos elementos "grudados" abaixo dele)
    const medir = () => document.documentElement.style.setProperty('--altura-topo', `${alvo.offsetHeight}px`);
    medir();
    window.addEventListener('resize', medir);
}

// Marca o link da página atual na barra de departamentos
function marcarAtivo(alvo) {
    const ehHome = location.pathname === '/' || location.pathname.endsWith('/index.html');
    const busca = new URLSearchParams(location.search);
    const categoria = busca.get('categoria');
    const grupo = busca.get('grupo');
    alvo.querySelectorAll('.deptos a').forEach((a) => {
        const ativo = ehHome && (
            categoria ? a.dataset.categoria === categoria
            : grupo ? a.dataset.grupo === grupo
            : a.hasAttribute('data-inicio') && !busca.get('busca'));
        a.classList.toggle('ativo', Boolean(ativo));
    });
}

function montarDepartamentos(alvo) {
    const botao = alvo.querySelector('.deptos-botao');
    const menu = alvo.querySelector('#menu-deptos');
    marcarAtivo(alvo);

    const abrirMenu = (abrir) => {
        menu.hidden = !abrir;
        botao.setAttribute('aria-expanded', String(abrir));
    };
    botao.addEventListener('click', () => abrirMenu(menu.hidden));
    document.addEventListener('click', (e) => { if (!e.target.closest('.deptos-botao, #menu-deptos')) abrirMenu(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') abrirMenu(false); });

    menu.innerHTML = '<p class="menu-carregando">Carregando categorias...</p>';

    // As categorias vêm do banco (o admin pode criar novas)
    api('/categorias').then((categorias) => {
        const colunas = ['hardware', 'perifericos'].map((g) => {
            const daColuna = categorias.filter((c) => grupoDaCategoria(c.nome) === g);
            const total = daColuna.reduce((soma, c) => soma + c.total_produtos, 0);
            return `<div>
                <h4>${GRUPOS[g].nome}</h4>
                <a class="menu-todos" href="/?grupo=${g}">Ver todos <span>${total}</span></a>
                ${daColuna.map((c) => `<a href="/?grupo=${g}&categoria=${c.id}">${escapar(c.nome)} <span>${c.total_produtos}</span></a>`).join('')}
            </div>`;
        });
        menu.innerHTML = colunas.join('');

        alvo.querySelector('.deptos-atalhos').innerHTML = ATALHOS
            .map((nome) => categorias.find((c) => c.nome === nome))
            .filter(Boolean)
            .map((c) => `<a href="/?grupo=${grupoDaCategoria(c.nome)}&categoria=${c.id}" data-categoria="${c.id}">${escapar(c.nome)}</a>`)
            .join('');
        marcarAtivo(alvo);
    }).catch(() => {
        menu.innerHTML = '<p class="menu-carregando">Não foi possível carregar as categorias.</p>';
    });
}
