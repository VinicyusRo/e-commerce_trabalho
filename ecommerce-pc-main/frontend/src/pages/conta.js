import '../estilo.css';
import { montarCabecalho } from '../componentes/cabecalho.js';
import { ativarBotaoVoltar } from '../componentes/voltar.js';
import { api } from '../api/api.js';
import { formatarPreco, escapar } from '../utils.js';
import { limparCarrinho } from '../carrinho.js';
import { confirmar } from '../componentes/confirmar.js';
import { enderecoHTML, abrirJanelaEndereco } from '../componentes/endereco.js';

montarCabecalho();
ativarBotaoVoltar();

if (!localStorage.getItem('token')) {
    window.location.href = '/login.html?voltar=/conta.html';
}

const elMensagem = document.getElementById('mensagem');
const elPerfil = document.getElementById('perfil');
const elPedidos = document.getElementById('conta-pedidos');
const elEnderecos = document.getElementById('conta-enderecos');

let enderecos = [];   // guardados para editar sem buscar de novo

function sair() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    limparCarrinho();
    window.location.href = '/';
}

// Token expirado ou inválido: volta ao login
function tratarErro(erro) {
    if (erro.message.includes('Token') || erro.message.includes('Login')) {
        sair();
        return;
    }
    elMensagem.textContent = `Erro: ${erro.message}`;
}

// Mensagem de sucesso vinda do checkout (?pedido=5)
const pedidoNovo = new URLSearchParams(window.location.search).get('pedido');
if (pedidoNovo) {
    document.getElementById('sucesso').textContent =
        `Pedido #${Number(pedidoNovo)} realizado com sucesso!`;
}

// =====================================================
// Perfil
// =====================================================
function desenharPerfil(usuario) {
    // data_cadastro é só uma data (sem hora): mostra em UTC para não "voltar um dia"
    const desde = new Date(usuario.data_cadastro)
        .toLocaleDateString('pt-BR', { timeZone: 'UTC', month: 'long', year: 'numeric' });

    elPerfil.innerHTML = `
        <div class="avatar avatar-grande" aria-hidden="true">${escapar(usuario.nome.trim().charAt(0).toUpperCase())}</div>
        <div class="perfil-dados">
            <h1>Olá, ${escapar(usuario.nome.trim().split(/\s+/)[0])}!</h1>
            <p>${escapar(usuario.email)} · cliente desde ${desde}</p>
        </div>
        <button id="btn-sair" class="botao" type="button">Sair</button>
    `;
    elPerfil.hidden = false;
    document.getElementById('btn-sair').addEventListener('click', sair);
}

// =====================================================
// Pedidos
// =====================================================
const STATUS = {
    pendente:  { texto: 'Pendente',  cancelavel: true },
    pago:      { texto: 'Pago',      cancelavel: true },
    enviado:   { texto: 'Enviado',   cancelavel: false },
    entregue:  { texto: 'Entregue',  cancelavel: false },
    cancelado: { texto: 'Cancelado', cancelavel: false },
};

function desenharPedidos(pedidos) {
    if (pedidos.length === 0) {
        elPedidos.innerHTML = `<p class="vazio-conta">Você ainda não fez pedidos. <a href="/">Ver produtos</a></p>`;
        return;
    }

    elPedidos.innerHTML = pedidos.map((p) => {
        const status = STATUS[p.status] ?? { texto: p.status, cancelavel: false };
        const data = new Date(p.data);
        const quando = `${data.toLocaleDateString('pt-BR')} às ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

        const itens = (p.itens ?? []).map((i) => `
            <li>
                <a href="/produto.html?id=${i.produto_id}"><b>${i.quantidade}×</b> ${escapar(i.nome)}</a>
                <span>${formatarPreco(i.preco_unitario * i.quantidade)}</span>
            </li>`).join('');

        return `
        <article class="pedido-card ${p.status === 'cancelado' ? 'pedido-cancelado' : ''}">
            <header class="pedido-topo">
                <div>
                    <strong>Pedido #${p.id}</strong>
                    <span>${quando}</span>
                </div>
                <span class="status status-${escapar(p.status)}">${escapar(status.texto)}</span>
            </header>

            <ul class="pedido-itens">${itens}</ul>

            <footer class="pedido-rodape">
                ${p.endereco ? `<div class="pedido-entrega"><span class="rotulo">Entrega</span>${enderecoHTML(p.endereco)}</div>` : ''}
                <div class="pedido-acoes">
                    <div class="pedido-total"><span>Total</span><strong>${formatarPreco(p.total)}</strong></div>
                    ${status.cancelavel
                        ? `<button class="botao botao-cancelar" type="button" data-cancelar="${p.id}">Cancelar pedido</button>`
                        : ''}
                </div>
            </footer>
        </article>`;
    }).join('');
}

elPedidos.addEventListener('click', async (e) => {
    const botao = e.target.closest('[data-cancelar]');
    if (!botao) return;
    const id = Number(botao.dataset.cancelar);

    const ok = await confirmar({
        titulo: `Cancelar o pedido #${id}?`,
        mensagem: 'Os produtos voltam para o estoque da loja. Essa ação não pode ser desfeita.',
        textoConfirmar: 'Cancelar pedido',
        textoCancelar: 'Voltar',
        perigo: true,
    });
    if (!ok) return;

    botao.disabled = true;
    try {
        await api(`/pedidos/${id}/cancelar`, { method: 'POST' });
        desenharPedidos(await api('/pedidos'));
    } catch (erro) {
        botao.disabled = false;
        tratarErro(erro);
    }
});

// =====================================================
// Endereços
// =====================================================
function desenharEnderecos() {
    if (enderecos.length === 0) {
        elEnderecos.innerHTML = `<p class="vazio-conta">Nenhum endereço cadastrado.</p>`;
        return;
    }

    elEnderecos.innerHTML = enderecos.map((e) => `
        <article class="endereco-card">
            <div class="endereco-texto">${enderecoHTML(e)}</div>
            <div class="endereco-acoes">
                <button class="botao pequeno" type="button" data-editar="${e.id}">Editar</button>
                <button class="botao pequeno botao-excluir" type="button" data-excluir="${e.id}">Excluir</button>
            </div>
        </article>`).join('');
}

async function recarregarEnderecos() {
    enderecos = await api('/enderecos');
    desenharEnderecos();
}

document.getElementById('btn-novo-endereco').addEventListener('click', async () => {
    const salvo = await abrirJanelaEndereco({
        titulo: 'Novo endereço',
        salvar: (dados) => api('/enderecos', { method: 'POST', body: JSON.stringify(dados) }),
    });
    if (salvo) recarregarEnderecos().catch(tratarErro);
});

elEnderecos.addEventListener('click', async (e) => {
    const editar = e.target.closest('[data-editar]');
    const excluir = e.target.closest('[data-excluir]');

    if (editar) {
        const id = Number(editar.dataset.editar);
        const salvo = await abrirJanelaEndereco({
            titulo: 'Editar endereço',
            endereco: enderecos.find((x) => x.id === id),
            salvar: (dados) => api(`/enderecos/${id}`, { method: 'PUT', body: JSON.stringify(dados) }),
        });
        if (salvo) recarregarEnderecos().catch(tratarErro);
    }

    if (excluir) {
        const id = Number(excluir.dataset.excluir);
        const endereco = enderecos.find((x) => x.id === id);
        const ok = await confirmar({
            titulo: 'Excluir endereço?',
            mensagem: `${endereco.rua}, ${endereco.numero} será removido da sua lista. Pedidos antigos continuam com o endereço registrado.`,
            textoConfirmar: 'Excluir',
            textoCancelar: 'Manter',
            perigo: true,
        });
        if (!ok) return;
        try {
            await api(`/enderecos/${id}`, { method: 'DELETE' });
            await recarregarEnderecos();
        } catch (erro) {
            tratarErro(erro);
        }
    }
});

// =====================================================
// Início
// =====================================================
async function iniciar() {
    if (!localStorage.getItem('token')) return;
    elMensagem.textContent = 'Carregando...';

    try {
        const [usuario, listaEnderecos, pedidos] = await Promise.all([
            api('/auth/eu'),
            api('/enderecos'),
            api('/pedidos'),
        ]);
        elMensagem.textContent = '';

        // Mantém o nome do cabeçalho atualizado
        localStorage.setItem('usuario', JSON.stringify({ id: usuario.id, nome: usuario.nome, email: usuario.email }));
        montarCabecalho();

        desenharPerfil(usuario);
        desenharPedidos(pedidos);
        enderecos = listaEnderecos;
        desenharEnderecos();
    } catch (erro) {
        tratarErro(erro);
    }
}

iniciar();
