import '../estilo.css';
import { montarCabecalho } from '../componentes/cabecalho.js';
import { api } from '../api/api.js';
import { formatarPreco, escapar } from '../utils.js';
import { limparCarrinho } from '../carrinho.js';

montarCabecalho();

if (!localStorage.getItem('token')) {
    window.location.href = '/login.html?voltar=/conta.html';
}

const elMensagem = document.getElementById('mensagem');

function sair() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    limparCarrinho();
    window.location.href = '/';
}

document.getElementById('btn-sair').addEventListener('click', sair);

// Mensagem de sucesso vinda do checkout (?pedido=5)
const pedidoNovo = new URLSearchParams(window.location.search).get('pedido');
if (pedidoNovo) {
    document.getElementById('sucesso').textContent =
        `Pedido #${Number(pedidoNovo)} realizado com sucesso!`;
}

async function iniciar() {
    if (!localStorage.getItem('token')) return;

    try {
        const [usuario, enderecos, pedidos] = await Promise.all([
            api('/auth/eu'),
            api('/enderecos'),
            api('/pedidos'),
        ]);

        document.getElementById('dados').innerHTML = `
            <p><strong>${escapar(usuario.nome)}</strong><br>
               ${escapar(usuario.email)}<br>
               Cliente desde ${new Date(usuario.data_cadastro).toLocaleDateString('pt-BR')}</p>`;

        document.getElementById('enderecos').innerHTML = enderecos.length === 0
            ? '<p>Nenhum endereço cadastrado.</p>'
            : '<ul>' + enderecos.map((e) =>
                `<li>${escapar(e.rua)}, ${escapar(e.numero)} — ${escapar(e.cidade)}/${escapar(e.estado)}
                     — CEP ${escapar(e.cep)}</li>`).join('') + '</ul>';

        document.getElementById('pedidos').innerHTML = pedidos.length === 0
            ? '<p>Você ainda não fez pedidos.</p>'
            : pedidos.map((p) => `
                <div class="linha-carrinho">
                    <div class="info">
                        <strong>Pedido #${p.id}</strong>
                        <span>${new Date(p.data).toLocaleString('pt-BR')} — ${escapar(p.status)}</span>
                    </div>
                    <span class="subtotal">${formatarPreco(p.total)}</span>
                </div>`).join('');
    } catch (erro) {
        // Token inválido ou expirado: volta ao login
        if (erro.message.includes('Token') || erro.message.includes('Login')) {
            sair();
            return;
        }
        elMensagem.textContent = `Erro: ${erro.message}`;
    }
}

iniciar();