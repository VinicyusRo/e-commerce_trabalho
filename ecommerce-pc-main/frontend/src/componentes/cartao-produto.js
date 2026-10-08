import { formatarPreco, escapar } from '../utils.js';
import { textoSeloModelo } from '../viewer/modelo-produto.js';
import { iconeDaCategoria, ICONES } from './icones.js';
import { lerCarrinho, adicionarAoCarrinho } from '../carrinho.js';
import { montarCabecalho } from './cabecalho.js';

/**
 * HTML do card de um produto (usado na página inicial e no carrinho).
 * comBotao = true → card com botão "Adicionar" embaixo (data-adicionar="id").
 */
export function cartaoProduto(p, { comBotao = false } = {}) {
    const selo = textoSeloModelo(p.modelo_3d);
    const generico = p.modelo_3d?.origem === 'categoria';
    const estoque = p.estoque > 0
        ? `<span class="em-estoque">${p.estoque} em estoque</span>`
        : '<span class="sem-estoque">Esgotado</span>';

    const imagem = `
        <div class="cartao-imagem">
            ${iconeDaCategoria(p.categoria)}
            ${selo ? `<span class="selo-3d ${generico ? 'generico' : ''}">${ICONES.cubo}${selo}</span>` : ''}
        </div>`;

    // Card inteiro clicável (página inicial)
    if (!comBotao) {
        return `
        <a class="cartao" href="/produto.html?id=${p.id}">
            ${imagem}
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
    }

    // Card com botão: o link fica só na imagem e no nome
    // (um <button> dentro de um <a> não é permitido no HTML)
    return `
        <article class="cartao">
            <a class="cartao-link" href="/produto.html?id=${p.id}" aria-label="${escapar(p.nome)}">${imagem}</a>
            <div class="cartao-corpo">
                <p class="categoria">${escapar(p.categoria)}</p>
                <h3><a href="/produto.html?id=${p.id}">${escapar(p.nome)}</a></h3>
                <p class="preco">${formatarPreco(p.preco)}</p>
                <button class="botao pequeno-cheio" type="button" data-adicionar="${p.id}"
                        ${p.estoque > 0 ? '' : 'disabled'}>
                    ${ICONES.carrinho} ${p.estoque > 0 ? 'Adicionar' : 'Esgotado'}
                </button>
            </div>
        </article>`;
}

/**
 * Faz os botões "Adicionar" (data-adicionar) de um container funcionarem.
 * produtos: Map id → produto (para saber o estoque).
 * depois(): chamado depois de adicionar (ex.: redesenhar a página).
 */
export function ativarBotoesAdicionar(container, produtos, depois = () => {}) {
    container.addEventListener('click', (e) => {
        const botao = e.target.closest('button[data-adicionar]');
        if (!botao || botao.dataset.ocupado) return;   // ignora cliques durante o aviso
        botao.dataset.ocupado = '1';

        const id = Number(botao.dataset.adicionar);
        const p = produtos.get(id);
        const noCarrinho = lerCarrinho().find((i) => i.produto_id === id)?.quantidade ?? 0;
        const original = botao.innerHTML;

        if (!p || noCarrinho >= p.estoque) {
            botao.textContent = 'Limite do estoque';
        } else {
            adicionarAoCarrinho(id);
            montarCabecalho();          // atualiza o contador do topo
            botao.textContent = 'Adicionado ✓';
            botao.classList.add('adicionado');
            depois();
        }

        // Volta ao texto normal depois de um tempinho
        setTimeout(() => {
            botao.innerHTML = original;
            botao.classList.remove('adicionado');
            delete botao.dataset.ocupado;
        }, 1500);
    });
}
