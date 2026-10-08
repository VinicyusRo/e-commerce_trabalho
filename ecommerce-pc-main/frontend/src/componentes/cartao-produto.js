import { formatarPreco, escapar } from '../utils.js';
import { textoSeloModelo } from '../viewer/modelo-produto.js';
import { iconeDaCategoria, ICONES } from './icones.js';

/**
 * HTML do card de um produto (usado na página inicial e no carrinho).
 * comBotao = true → card com um botão "Ver produto" embaixo.
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

    // Card com botão "Ver produto" (carrinho e carrosséis): o card inteiro
    // é um link para a página do produto; o "botão" é só visual.
    return `
        <a class="cartao" href="/produto.html?id=${p.id}">
            ${imagem}
            <div class="cartao-corpo">
                <p class="categoria">${escapar(p.categoria)}</p>
                <h3>${escapar(p.nome)}</h3>
                <p class="preco">${formatarPreco(p.preco)}</p>
                <span class="botao pequeno-cheio botao-ver">Ver produto ${ICONES.seta}</span>
            </div>
        </a>`;
}
