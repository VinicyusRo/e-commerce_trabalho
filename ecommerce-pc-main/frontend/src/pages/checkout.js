import '../estilo.css';
import { montarCabecalho } from '../componentes/cabecalho.js';
import { api } from '../api/api.js';
import { formatarPreco, escapar } from '../utils.js';
import { lerCarrinho, limparCarrinho } from '../carrinho.js';

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
            ${escapar(e.rua)}, ${escapar(e.numero)} — ${escapar(e.cidade)}/${escapar(e.estado)}
            — CEP ${escapar(e.cep)}
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
        ultimoCepBuscado = '';
        mostrarStatusCep('Digite o CEP para preencher o endereço automaticamente.');
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

// ---------- CEP: preenche rua, cidade e estado automaticamente ----------
// Usa o ViaCEP (https://viacep.com.br), serviço gratuito que o navegador
// chama diretamente; não precisa mudar nada no backend.
const campoCep = document.getElementById('campo-cep');
const elStatusCep = document.getElementById('status-cep');
let ultimoCepBuscado = '';

function mostrarStatusCep(texto, tipo = '') {
    elStatusCep.textContent = texto;
    elStatusCep.className = `dica-campo ${tipo}`;
}

campoCep.addEventListener('input', async () => {
    // Máscara 00000-000
    const digitos = campoCep.value.replace(/\D/g, '').slice(0, 8);
    campoCep.value = digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos;

    if (digitos.length !== 8 || digitos === ultimoCepBuscado) return;
    ultimoCepBuscado = digitos;

    mostrarStatusCep('Buscando endereço...');
    try {
        const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
        const dados = await resposta.json();

        if (dados.erro) {
            mostrarStatusCep('CEP não encontrado. Preencha o endereço manualmente.', 'sem-estoque');
            return;
        }

        // Rua com o bairro, já que a tabela endereco não tem coluna de bairro
        const rua = [dados.logradouro, dados.bairro].filter(Boolean).join(' - ');
        if (rua) formEndereco.rua.value = rua;
        formEndereco.cidade.value = dados.localidade ?? '';
        formEndereco.estado.value = dados.uf ?? '';

        mostrarStatusCep('Endereço encontrado! Agora informe o número.', 'em-estoque');
        // Se o CEP for da cidade toda (sem rua), o foco vai para a rua
        (rua ? document.getElementById('campo-numero') : formEndereco.rua).focus();
    } catch {
        mostrarStatusCep('Não foi possível consultar o CEP. Preencha manualmente.', 'sem-estoque');
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