import '../estilo.css';
import { montarCabecalho } from '../componentes/cabecalho.js';
import { api } from '../api/api.js';
import { formatarPreco, escapar } from '../utils.js';
import {
    lerCarrinho, alterarQuantidade, removerDoCarrinho, adicionarAoCarrinho,
} from '../carrinho.js';
import { confirmar } from '../componentes/confirmar.js';
import { cartaoProduto } from '../componentes/cartao-produto.js';
import { iconeDaCategoria, ICONES } from '../componentes/icones.js';

const elMensagem = document.getElementById('mensagem');
const elItens = document.getElementById('itens');
const elResumo = document.getElementById('resumo');
const elSecaoRecomendados = document.getElementById('secao-recomendados');
const elRecomendados = document.getElementById('recomendados');

// Todos os produtos da loja, buscados uma vez só (id → produto)
let catalogo = new Map();

// ---------- Itens do carrinho ----------
function desenharItens(carrinho) {
    elItens.innerHTML = carrinho.map((item) => {
        const p = catalogo.get(item.produto_id);

        if (!p) {
            return `<div class="linha-carrinho indisponivel">
                <div class="info">
                    <strong>Produto ${item.produto_id}</strong>
                    <span class="sem-estoque">Não está mais disponível</span>
                </div>
                <button class="btn-remover" data-remover="${item.produto_id}"
                        aria-label="Remover" title="Remover">${ICONES.lixeira}</button>
            </div>`;
        }

        return `<div class="linha-carrinho">
            <a class="linha-icone" href="/produto.html?id=${p.id}" aria-hidden="true" tabindex="-1">
                ${iconeDaCategoria(p.categoria)}
            </a>
            <div class="info">
                <a class="nome" href="/produto.html?id=${p.id}">${escapar(p.nome)}</a>
                <span>${escapar(p.categoria)} · ${formatarPreco(p.preco)} cada</span>
            </div>
            <div class="quantidade" role="group" aria-label="Quantidade">
                <button type="button" data-menos="${p.id}" aria-label="Diminuir">−</button>
                <input type="number" min="1" max="${p.estoque}" value="${item.quantidade}"
                       data-quantidade="${p.id}" aria-label="Quantidade">
                <button type="button" data-mais="${p.id}" aria-label="Aumentar"
                        ${item.quantidade >= p.estoque ? 'disabled' : ''}>+</button>
            </div>
            <span class="subtotal">${formatarPreco(p.preco * item.quantidade)}</span>
            <button class="btn-remover" data-remover="${p.id}"
                    aria-label="Remover ${escapar(p.nome)}" title="Remover">${ICONES.lixeira}</button>
        </div>`;
    }).join('');
}

// ---------- "Notinha" à direita ----------
function desenharResumo(carrinho) {
    let total = 0;
    let unidades = 0;

    const linhas = carrinho.map((item) => {
        const p = catalogo.get(item.produto_id);
        if (!p) return '';
        const subtotal = p.preco * item.quantidade;
        total += subtotal;
        unidades += item.quantidade;
        return `<li>
            <span class="nota-produto"><b>${item.quantidade}×</b> ${escapar(p.nome)}</span>
            <span>${formatarPreco(subtotal)}</span>
        </li>`;
    }).join('');

    elResumo.innerHTML = `
        <h2>Resumo do pedido</h2>
        <ul class="nota-itens">${linhas}</ul>
        <div class="nota-linha">
            <span>Subtotal (${unidades} ${unidades === 1 ? 'item' : 'itens'})</span>
            <span>${formatarPreco(total)}</span>
        </div>
        <div class="nota-total">
            <span>Total</span>
            <strong>${formatarPreco(total)}</strong>
        </div>
        <a class="botao primario botao-largo" href="/checkout.html">Finalizar compra</a>
        <a class="continuar" href="/">← Continuar comprando</a>
    `;
}

// ---------- Outros produtos ----------
function desenharRecomendados(carrinho) {
    const noCarrinho = new Set(carrinho.map((i) => i.produto_id));
    const categoriasNoCarrinho = new Set(
        carrinho.map((i) => catalogo.get(i.produto_id)?.categoria_id)
    );

    // Produtos que não estão no carrinho e têm estoque.
    // Primeiro os de categorias que a pessoa ainda não escolheu (peças que completam o PC).
    const sugestoes = [...catalogo.values()]
        .filter((p) => !noCarrinho.has(p.id) && p.estoque > 0)
        .sort((a, b) =>
            Number(categoriasNoCarrinho.has(a.categoria_id)) -
            Number(categoriasNoCarrinho.has(b.categoria_id)))
        .slice(0, 4);

    elSecaoRecomendados.hidden = sugestoes.length === 0;
    elRecomendados.innerHTML = sugestoes.map((p) => cartaoProduto(p, { comBotao: true })).join('');
}

// ---------- Desenha a página toda ----------
function desenhar() {
    montarCabecalho();   // atualiza o contador do cabeçalho

    // Corrige quantidades maiores que o estoque atual
    for (const item of lerCarrinho()) {
        const p = catalogo.get(item.produto_id);
        if (p && item.quantidade > p.estoque) alterarQuantidade(p.id, p.estoque);
    }

    const carrinho = lerCarrinho();
    const vazio = carrinho.length === 0;

    document.querySelector('.carrinho-layout').hidden = vazio;
    elMensagem.innerHTML = vazio
        ? `<span class="carrinho-vazio">${ICONES.carrinho}
               Seu carrinho está vazio. <a href="/">Ver produtos</a></span>`
        : '';

    if (!vazio) {
        desenharItens(carrinho);
        desenharResumo(carrinho);
    }
    desenharRecomendados(carrinho);
}

// ---------- Remover com confirmação ----------
async function pedirRemocao(produtoId) {
    const nome = catalogo.get(produtoId)?.nome ?? 'este produto';
    const ok = await confirmar({
        titulo: 'Remover do carrinho?',
        mensagem: `"${nome}" será retirado do seu carrinho.`,
        textoConfirmar: 'Remover',
        textoCancelar: 'Manter no carrinho',
        perigo: true,
    });
    if (ok) removerDoCarrinho(produtoId);
    desenhar();
}

function quantidadeAtual(produtoId) {
    return lerCarrinho().find((i) => i.produto_id === produtoId)?.quantidade ?? 0;
}

// Um único "ouvinte" para todos os botões da lista
elItens.addEventListener('click', (e) => {
    const botao = e.target.closest('button');
    if (!botao) return;
    const { remover, menos, mais } = botao.dataset;

    if (remover) {
        pedirRemocao(Number(remover));
    } else if (menos) {
        const id = Number(menos);
        // Diminuir a partir de 1 = remover → pede confirmação
        if (quantidadeAtual(id) <= 1) pedirRemocao(id);
        else { alterarQuantidade(id, quantidadeAtual(id) - 1); desenhar(); }
    } else if (mais) {
        const id = Number(mais);
        const estoque = catalogo.get(id)?.estoque ?? 0;
        if (quantidadeAtual(id) < estoque) alterarQuantidade(id, quantidadeAtual(id) + 1);
        desenhar();
    }
});

// Digitar a quantidade no campo
elItens.addEventListener('change', (e) => {
    const id = Number(e.target.dataset.quantidade);
    if (!id) return;

    let quantidade = Math.floor(Number(e.target.value)) || 0;
    const max = Number(e.target.max);
    if (max && quantidade > max) quantidade = max;   // não passa do estoque

    if (quantidade <= 0) {
        pedirRemocao(id);
    } else {
        alterarQuantidade(id, quantidade);
        desenhar();
    }
});

// Botão "Adicionar" dos produtos sugeridos
elRecomendados.addEventListener('click', (e) => {
    const botao = e.target.closest('button[data-adicionar]');
    if (!botao) return;
    const id = Number(botao.dataset.adicionar);
    const p = catalogo.get(id);
    if (p && quantidadeAtual(id) < p.estoque) adicionarAoCarrinho(id);
    desenhar();
});

// ---------- Início ----------
async function iniciar() {
    elMensagem.textContent = 'Carregando...';
    try {
        // Uma chamada só traz todos os produtos (nome, preço, estoque atuais)
        const produtos = await api('/produtos');
        catalogo = new Map(produtos.map((p) => [p.id, p]));
        desenhar();
    } catch (erro) {
        elMensagem.textContent = `Erro ao carregar: ${erro.message}`;
    }
}

iniciar();
