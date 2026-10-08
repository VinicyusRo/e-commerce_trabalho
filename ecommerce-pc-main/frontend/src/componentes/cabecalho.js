import { totalDeItens } from '../carrinho.js';

// Monta o cabeçalho em qualquer página que tenha <header id="cabecalho">
export function montarCabecalho() {
    const alvo = document.getElementById('cabecalho');
    if (!alvo) return;

    const logado = localStorage.getItem('token') !== null;

    alvo.innerHTML = `
        <a class="logo" href="/">PC Store</a>

        <form class="busca" action="/" method="get">
            <input type="search" name="busca" placeholder="Buscar produtos...">
            <button type="submit">Buscar</button>
        </form>

        <nav>
            <a href="/carrinho.html">Carrinho (${totalDeItens()})</a>
            ${logado
                ? '<a href="/conta.html">Minha conta</a>'
                : '<a href="/login.html">Entrar</a>'}
        </nav>
    `;

    // Usamos .value (e não innerHTML) de propósito: o texto vem da URL
    // e não deve virar HTML (evita XSS).
    const termo = new URLSearchParams(window.location.search).get('busca');
    if (termo) alvo.querySelector('input').value = termo;
}