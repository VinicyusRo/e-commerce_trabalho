import { escapar } from '../utils.js';
import { cartaoProduto } from './cartao-produto.js';

/**
 * Monta um carrossel horizontal de produtos dentro de uma <section>.
 * Usa rolagem nativa (dá para arrastar no celular) + setas no computador.
 */
export function montarCarrossel(secao, { titulo, produtos }) {
    if (produtos.length === 0) {
        secao.hidden = true;
        return;
    }

    secao.innerHTML = `
        <div class="carrossel-topo">
            <h2>${escapar(titulo)}</h2>
            <div class="carrossel-setas">
                <button class="seta" type="button" data-direcao="-1" aria-label="Anteriores">‹</button>
                <button class="seta" type="button" data-direcao="1" aria-label="Próximos">›</button>
            </div>
        </div>
        <div class="carrossel" tabindex="0" aria-label="${escapar(titulo)}">
            ${produtos.map((p) => `<div class="carrossel-item">${cartaoProduto(p, { comBotao: true })}</div>`).join('')}
        </div>
    `;
    secao.hidden = false;

    const trilho = secao.querySelector('.carrossel');
    const [anterior, proximo] = secao.querySelectorAll('.seta');

    // Liga/desliga as setas conforme a posição da rolagem
    function atualizarSetas() {
        const fim = trilho.scrollWidth - trilho.clientWidth;
        secao.querySelector('.carrossel-setas').hidden = fim <= 1;   // tudo cabe: sem setas
        anterior.disabled = trilho.scrollLeft <= 1;
        proximo.disabled = trilho.scrollLeft >= fim - 1;
    }

    secao.querySelector('.carrossel-setas').addEventListener('click', (e) => {
        const seta = e.target.closest('[data-direcao]');
        if (!seta) return;
        // Anda quase uma "tela" do carrossel por clique
        trilho.scrollBy({ left: Number(seta.dataset.direcao) * trilho.clientWidth * 0.9, behavior: 'smooth' });
    });

    trilho.addEventListener('scroll', atualizarSetas, { passive: true });
    new ResizeObserver(atualizarSetas).observe(trilho);
    atualizarSetas();
}
