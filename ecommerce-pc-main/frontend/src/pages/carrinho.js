import '../estilo.css';
import { montarCabecalho } from '../componentes/cabecalho.js';
import { api } from '../api/api.js';
import { formatarPreco, escapar } from '../utils.js';
import { lerCarrinho, alterarQuantidade, removerDoCarrinho } from '../carrinho.js';

const elMensagem = document.getElementById('mensagem');
const elItens = document.getElementById('itens');
const elResumo = document.getElementById('resumo');

async function desenhar() {
    montarCabecalho();   // atualiza o contador do cabeçalho

    const carrinho = lerCarrinho();

    if (carrinho.length === 0) {
        elMensagem.innerHTML = 'Seu carrinho está vazio. <a href="/">Ver produtos</a>';
        elItens.innerHTML = '';
        elResumo.innerHTML = '';
        return;
    }

    elMensagem.textContent = '';

    try {
        // Busca os dados atuais (nome, preço, estoque) de cada produto na API
        const produtos = await Promise.all(
            carrinho.map((i) => api(`/produtos/${i.produto_id}`).catch(() => null))
        );

        let corrigiu = false;
        carrinho.forEach((item, indice) => {
            const p = produtos[indice];
            if (p && item.quantidade > p.estoque) {
                alterarQuantidade(item.produto_id, p.estoque);
                item.quantidade = p.estoque;
                corrigiu = true;
            }
        });
        
        if (corrigiu) montarCabecalho(); 

        let total = 0;

        elItens.innerHTML = carrinho.map((item, indice) => {
            const p = produtos[indice];
            if (!p) {
                return `<div class="linha-carrinho">
                    Produto ${item.produto_id} não está mais disponível.
                    <button class="botao" data-remover="${item.produto_id}">Remover</button>
                </div>`;
            }

            const subtotal = p.preco * item.quantidade;
            total += subtotal;

            return `<div class="linha-carrinho">
                <div class="info">
                    <strong>${escapar(p.nome)}</strong>
                    <span>${formatarPreco(p.preco)} cada</span>
                    ${item.quantidade > p.estoque
                        ? `<span class="sem-estoque">Estoque disponível: ${p.estoque}</span>` : ''}
                </div>
                <input type="number" min="1" max="${p.estoque}" value="${item.quantidade}"
                       data-quantidade="${item.produto_id}">
                <span class="subtotal">${formatarPreco(subtotal)}</span>
                <button class="botao" data-remover="${item.produto_id}">Remover</button>
            </div>`;
        }).join('');

        elResumo.innerHTML = `
            <p class="preco-grande">Total: ${formatarPreco(total)}</p>
            <a class="botao primario" href="/checkout.html">Finalizar compra</a>
        `;
    } catch (erro) {
        elMensagem.textContent = `Erro ao carregar: ${erro.message}`;
    }
}

// Um único "ouvinte" para todos os botões e campos da lista
elItens.addEventListener('click', (e) => {
    const id = e.target.dataset.remover;
    if (id) {
        removerDoCarrinho(Number(id));
        desenhar();
    }
});

elItens.addEventListener('change', (e) => {
    const id = e.target.dataset.quantidade;
    if (id) {
        let quantidade = Math.max(0, Math.floor(Number(e.target.value)) || 0);
        const max = Number(e.target.max);
        if (max && quantidade > max) quantidade = max;   // não passa do estoque
        alterarQuantidade(Number(id), quantidade);
        desenhar();
    }
});

desenhar();