import '../estilo.css';
import { montarCabecalho } from '../componentes/cabecalho.js';
import { api } from '../api/api.js';
import { formatarPreco, escapar } from '../utils.js';
import { lerCarrinho, limparCarrinho } from '../carrinho.js';
import { CAMPOS_ENDERECO_HTML, ativarBuscaCep, enderecoHTML } from '../componentes/endereco.js';

montarCabecalho();

// Sem login, vai para a tela de login e volta para cá depois
if (!localStorage.getItem('token')) {
    window.location.href = '/login.html?voltar=/checkout.html';
}

const elMensagem = document.getElementById('mensagem');
const elResumo = document.getElementById('resumo');
const elLista = document.getElementById('lista-enderecos');
const elErroPedido = document.getElementById('erro-pedido');
const elBotao = document.getElementById('btn-finalizar');
const formEndereco = document.getElementById('form-endereco');
const elErroEndereco = document.getElementById('erro-endereco');

// Campos do endereço (CEP, rua, número, complemento, bairro, cidade, UF)
document.getElementById('campos-endereco').outerHTML = CAMPOS_ENDERECO_HTML;
const buscaCep = ativarBuscaCep(formEndereco);

async function desenharResumo() {
    const carrinho = lerCarrinho();

    if (carrinho.length === 0) {
        elMensagem.innerHTML = 'Seu carrinho está vazio. <a href="/">Ver produtos</a>';
        document.getElementById('enderecos').hidden = true;
        elBotao.hidden = true;
        return false;
    }

    const produtos = await Promise.all(
        carrinho.map((i) => api(`/produtos/${i.produto_id}`).catch(() => null))
    );

    let total = 0;
    const linhas = carrinho.map((item, i) => {
        const p = produtos[i];
        if (!p) return `<li>Produto ${item.produto_id} indisponível</li>`;
        total += p.preco * item.quantidade;
        return `<li>${item.quantidade} × ${escapar(p.nome)}
                    — ${formatarPreco(p.preco * item.quantidade)}</li>`;
    });

    elResumo.innerHTML = `<ul>${linhas.join('')}</ul>
        <p class="preco-grande">Total: ${formatarPreco(total)}</p>`;
    return true;
}

async function desenharEnderecos() {
    const enderecos = await api('/enderecos');

    if (enderecos.length === 0) {
        elLista.innerHTML = '<p>Nenhum endereço cadastrado. Cadastre um abaixo.</p>';
        document.getElementById('novo-endereco').open = true;
        return;
    }

    elLista.innerHTML = enderecos.map((e, i) => `
        <label class="opcao-endereco">
            <input type="radio" name="endereco" value="${e.id}" ${i === 0 ? 'checked' : ''}>
            <span class="endereco-texto">${enderecoHTML(e)}</span>
        </label>
    `).join('');
}

formEndereco.addEventListener('submit', async (e) => {
    e.preventDefault();
    elErroEndereco.textContent = '';
    try {
        await api('/enderecos', {
            method: 'POST',
            body: JSON.stringify(Object.fromEntries(new FormData(formEndereco))),
        });
        formEndereco.reset();
        buscaCep.limpar();
        document.getElementById('novo-endereco').open = false;
        await desenharEnderecos();
    } catch (erro) {
        elErroEndereco.textContent = erro.message;
    }
});

elBotao.addEventListener('click', async () => {
    elErroPedido.textContent = '';

    const escolhido = document.querySelector('input[name="endereco"]:checked');
    if (!escolhido) {
        elErroPedido.textContent = 'Escolha ou cadastre um endereço.';
        return;
    }

    elBotao.disabled = true;

    try {
        const pedido = await api('/pedidos', {
            method: 'POST',
            body: JSON.stringify({
                endereco_id: Number(escolhido.value),
                // Só ids e quantidades: o preço o backend busca no banco
                itens: lerCarrinho(),
            }),
        });

        limparCarrinho();
        window.location.href = `/conta.html?pedido=${pedido.id}`;
    } catch (erro) {
        // Ex.: "Estoque insuficiente para ..." (409 com ROLLBACK no backend)
        elErroPedido.textContent = erro.message;
        elBotao.disabled = false;
    }
});

async function iniciar() {
    if (!localStorage.getItem('token')) return;
    try {
        if (await desenharResumo()) await desenharEnderecos();
    } catch (erro) {
        // Token expirado: limpa e manda para o login
        if (erro.message.includes('Token') || erro.message.includes('Login')) {
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
            window.location.href = '/login.html?voltar=/checkout.html';
            return;
        }
        elMensagem.textContent = `Erro: ${erro.message}`;
    }
}

iniciar();