import { totalDeItens } from '../carrinho.js';
import { ICONES } from './icones.js';

// Monta o cabeçalho em qualquer página que tenha <header id="cabecalho">
export function montarCabecalho() {
    const alvo = document.getElementById('cabecalho');
    if (!alvo) return;

    const logado = localStorage.getItem('token') !== null;
    const itens = totalDeItens();

    alvo.innerHTML = `
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
            <a class="nav-link" href="/carrinho.html">
                ${ICONES.carrinho}
                <span>Carrinho</span>
                ${itens > 0 ? `<span class="contador-carrinho">${itens}</span>` : ''}
            </a>
            ${logado
                ? `<a class="nav-link" href="/conta.html">${ICONES.usuario}<span>Minha conta</span></a>`
                : `<a class="nav-link" href="/login.html">${ICONES.usuario}<span>Entrar</span></a>`}
        </nav>
    `;

    // Usamos .value (e não innerHTML) de propósito: o texto vem da URL
    // e não deve virar HTML (evita XSS).
    const termo = new URLSearchParams(window.location.search).get('busca');
    if (termo) alvo.querySelector('input').value = termo;
}
