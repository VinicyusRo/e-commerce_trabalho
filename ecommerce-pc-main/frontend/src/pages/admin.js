import '../estilo.css';
import { montarCabecalho } from '../componentes/cabecalho.js';
import { ativarBotaoVoltar } from '../componentes/voltar.js';
import { api } from '../api/api.js';
import { formatarPreco, escapar } from '../utils.js';
import { confirmar } from '../componentes/confirmar.js';
import { enderecoHTML } from '../componentes/endereco.js';

montarCabecalho();
ativarBotaoVoltar();

if (!localStorage.getItem('token')) {
    window.location.href = '/login.html?voltar=/admin.html';
}

const elMensagem = document.getElementById('mensagem');
const elPainel = document.getElementById('painel');
const elResumo = document.getElementById('admin-resumo');
const elPedidos = document.getElementById('admin-pedidos');
const elProdutos = document.getElementById('admin-produtos');
const elCategorias = document.getElementById('admin-categorias');
const elFiltroStatus = document.getElementById('filtro-status');
const elBuscaProduto = document.getElementById('busca-produto');
const elFiltroCategoria = document.getElementById('filtro-categoria');
const elContagem = document.getElementById('contagem-produtos');

// Guardados para editar e filtrar sem buscar de novo no backend
let produtos = [];
let categorias = [];

function tratarErro(erro) {
    // Token expirado: volta ao login
    if (erro.message.includes('Token') || erro.message.includes('Login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.href = '/login.html?voltar=/admin.html';
        return;
    }
    elMensagem.className = 'sem-estoque';
    elMensagem.textContent = `Erro: ${erro.message}`;
}

function limparMensagem() {
    elMensagem.className = '';
    elMensagem.textContent = '';
}

// =====================================================
// Janela com formulário (produto e categoria usam a mesma)
// =====================================================
/**
 * Abre um <dialog> com os campos passados em HTML.
 * preencher(form) coloca os valores atuais; salvar(form) chama a API.
 * Devolve uma Promise: true se salvou, false se cancelou.
 */
function abrirJanela({ titulo, campos, preencher, salvar }) {
    return new Promise((resolve) => {
        const janela = document.createElement('dialog');
        janela.className = 'janela-confirmacao janela-endereco';
        janela.innerHTML = `
            <h2></h2>
            <form class="formulario" novalidate>
                ${campos}
                <p class="sem-estoque erro-janela"></p>
                <div class="janela-acoes">
                    <button type="button" class="botao" data-cancelar>Cancelar</button>
                    <button type="submit" class="botao primario">Salvar</button>
                </div>
            </form>`;
        janela.querySelector('h2').textContent = titulo;
        document.body.append(janela);

        const form = janela.querySelector('form');
        const elErro = janela.querySelector('.erro-janela');
        preencher?.(form);

        function fechar(salvou) {
            janela.close();
            janela.remove();
            resolve(salvou);
        }

        janela.querySelector('[data-cancelar]').addEventListener('click', () => fechar(false));
        janela.addEventListener('cancel', (e) => { e.preventDefault(); fechar(false); });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            const botao = form.querySelector('[type=submit]');
            botao.disabled = true;
            elErro.textContent = '';
            try {
                await salvar(form);
                fechar(true);
            } catch (erro) {
                elErro.textContent = erro.message;
                botao.disabled = false;
            }
        });

        janela.showModal();
        form.querySelector('input, select, textarea')?.focus();
    });
}

// =====================================================
// Resumo
// =====================================================
async function carregarResumo() {
    const r = await api('/admin/resumo');
    const cartao = (rotulo, valor, classe = '') =>
        `<div class="admin-numero ${classe}"><span>${rotulo}</span><strong>${valor}</strong></div>`;

    elResumo.innerHTML = [
        cartao('Pendentes', r.pedidos.pendente, 'status-pendente'),
        cartao('Pagos', r.pedidos.pago, 'status-pago'),
        cartao('Enviados', r.pedidos.enviado, 'status-enviado'),
        cartao('Entregues', r.pedidos.entregue, 'status-entregue'),
        cartao('Faturamento', formatarPreco(r.faturamento)),
        cartao('Sem estoque', `${r.produtos.sem_estoque} de ${r.produtos.total}`, r.produtos.sem_estoque > 0 ? 'status-cancelado' : ''),
    ].join('');
}

// =====================================================
// Pedidos
// =====================================================
const STATUS = {
    pendente:  'Pendente',
    pago:      'Pago',
    enviado:   'Enviado',
    entregue:  'Entregue',
    cancelado: 'Cancelado',
};

// Texto do botão que leva o pedido para cada status
const ACAO_STATUS = {
    pago:      'Confirmar pagamento',
    enviado:   'Marcar como enviado',
    entregue:  'Marcar como entregue',
    cancelado: 'Cancelar',
};

function desenharPedidos(pedidos) {
    if (pedidos.length === 0) {
        elPedidos.innerHTML = `<p class="vazio-conta">Nenhum pedido ${elFiltroStatus.value ? 'com esse status' : 'ainda'}.</p>`;
        return;
    }

    elPedidos.innerHTML = pedidos.map((p) => {
        const data = new Date(p.data);
        const quando = `${data.toLocaleDateString('pt-BR')} às ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

        const itens = p.itens.map((i) => `
            <li>
                <a href="/produto.html?id=${i.produto_id}"><b>${i.quantidade}×</b> ${escapar(i.nome)}</a>
                <span>${formatarPreco(i.preco_unitario * i.quantidade)}</span>
            </li>`).join('');

        const botoes = p.proximos_status.map((s) => `
            <button class="botao pequeno ${s === 'cancelado' ? 'botao-cancelar' : 'botao-avancar'}" type="button"
                    data-pedido="${p.id}" data-status="${s}">${ACAO_STATUS[s]}</button>`).join('');

        return `
        <article class="pedido-card ${p.status === 'cancelado' ? 'pedido-cancelado' : ''}">
            <header class="pedido-topo">
                <div>
                    <strong>Pedido #${p.id} · ${escapar(p.cliente.nome)}</strong>
                    <span>${quando} · ${escapar(p.cliente.email)}</span>
                </div>
                <span class="status status-${escapar(p.status)}">${escapar(STATUS[p.status] ?? p.status)}</span>
            </header>

            <ul class="pedido-itens">${itens}</ul>

            <footer class="pedido-rodape">
                <div class="pedido-entrega"><span class="rotulo">Entrega</span>${enderecoHTML(p.endereco)}</div>
                <div class="pedido-acoes">
                    <div class="pedido-total"><span>Total</span><strong>${formatarPreco(p.total)}</strong></div>
                    ${botoes ? `<div class="admin-botoes">${botoes}</div>` : ''}
                </div>
            </footer>
        </article>`;
    }).join('');
}

async function carregarPedidos() {
    const status = elFiltroStatus.value;
    desenharPedidos(await api(`/admin/pedidos${status ? `?status=${status}` : ''}`));
}

elFiltroStatus.addEventListener('change', () => carregarPedidos().catch(tratarErro));

elPedidos.addEventListener('click', async (e) => {
    const botao = e.target.closest('[data-status]');
    if (!botao) return;
    const id = Number(botao.dataset.pedido);
    const status = botao.dataset.status;

    if (status === 'cancelado') {
        const ok = await confirmar({
            titulo: `Cancelar o pedido #${id}?`,
            mensagem: 'Os produtos voltam para o estoque. Essa ação não pode ser desfeita.',
            textoConfirmar: 'Cancelar pedido',
            textoCancelar: 'Voltar',
            perigo: true,
        });
        if (!ok) return;
    }

    botao.disabled = true;
    try {
        await api(`/admin/pedidos/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
        limparMensagem();
        await Promise.all([carregarPedidos(), carregarResumo()]);
        // Cancelar devolve estoque: a lista de produtos muda também
        if (status === 'cancelado') await carregarProdutos();
    } catch (erro) {
        botao.disabled = false;
        tratarErro(erro);
    }
});

// =====================================================
// Produtos
// =====================================================
function desenharProdutos() {
    const termo = elBuscaProduto.value.trim().toLowerCase();
    const categoria = Number(elFiltroCategoria.value);

    const visiveis = produtos.filter((p) =>
        (!termo || p.nome.toLowerCase().includes(termo)) &&
        (!categoria || p.categoria_id === categoria));

    elContagem.textContent = `${visiveis.length} de ${produtos.length} produtos`;

    elProdutos.innerHTML = visiveis.map((p) => `
        <tr>
            <td><a href="/produto.html?id=${p.id}">${escapar(p.nome)}</a></td>
            <td>${escapar(p.categoria)}</td>
            <td class="num">${formatarPreco(p.preco)}</td>
            <td class="num ${p.estoque === 0 ? 'sem-estoque' : ''}">${p.estoque}</td>
            <td>
                <label class="interruptor">
                    <input type="checkbox" data-destaque="${p.id}" ${p.destaque ? 'checked' : ''}
                           aria-label="Destaque: ${escapar(p.nome)}">
                    <span aria-hidden="true"></span>
                </label>
            </td>
            <td class="acoes-linha">
                <button class="botao pequeno" type="button" data-editar-produto="${p.id}">Editar</button>
                <button class="botao pequeno botao-excluir" type="button" data-excluir-produto="${p.id}"
                        ${p.vendido ? 'disabled title="Já foi vendido: zere o estoque para tirar de venda"' : ''}>Excluir</button>
            </td>
        </tr>`).join('') || `<tr><td colspan="6" class="vazio-tabela">Nenhum produto encontrado.</td></tr>`;
}

async function carregarProdutos() {
    produtos = await api('/admin/produtos');
    desenharProdutos();
}

elBuscaProduto.addEventListener('input', desenharProdutos);
elFiltroCategoria.addEventListener('change', desenharProdutos);

function camposProduto() {
    const opcoes = categorias
        .map((c) => `<option value="${c.id}">${escapar(c.nome)}</option>`).join('');
    return `
        <label>Nome <input name="nome" required maxlength="150"></label>
        <label>Categoria <select name="categoria_id" required>${opcoes}</select></label>
        <div class="linha-campos">
            <label>Preço (R$) <input name="preco" type="number" required min="0" step="0.01"></label>
            <label>Estoque <input name="estoque" type="number" required min="0" step="1"></label>
        </div>
        <label><span>Foto <span class="opcional">(opcional)</span></span>
            <input name="imagem" maxlength="255" placeholder="imagens/produtos/arquivo.jpg ou https://...">
        </label>
        <label><span>Descrição <span class="opcional">(opcional)</span></span>
            <textarea name="descricao" rows="4"></textarea>
        </label>
        <label class="linha-check"><input name="destaque" type="checkbox"> Produto em destaque</label>`;
}

// Lê o formulário no formato que o backend espera
function dadosProduto(form) {
    return {
        nome: form.elements.nome.value,
        categoria_id: Number(form.elements.categoria_id.value),
        preco: Number(form.elements.preco.value),
        estoque: Number(form.elements.estoque.value),
        imagem: form.elements.imagem.value,
        descricao: form.elements.descricao.value,
        destaque: form.elements.destaque.checked,
    };
}

async function abrirProduto(produto = null) {
    const salvou = await abrirJanela({
        titulo: produto ? 'Editar produto' : 'Novo produto',
        campos: camposProduto(),
        preencher(form) {
            if (!produto) return;
            for (const campo of ['nome', 'categoria_id', 'preco', 'estoque', 'imagem', 'descricao']) {
                form.elements[campo].value = produto[campo] ?? '';
            }
            form.elements.destaque.checked = produto.destaque;
        },
        salvar: (form) => api(produto ? `/admin/produtos/${produto.id}` : '/admin/produtos', {
            method: produto ? 'PUT' : 'POST',
            body: JSON.stringify(dadosProduto(form)),
        }),
    });
    if (salvou) {
        limparMensagem();
        await Promise.all([carregarProdutos(), carregarCategorias(), carregarResumo()]).catch(tratarErro);
    }
}

document.getElementById('btn-novo-produto').addEventListener('click', () => abrirProduto());

elProdutos.addEventListener('click', async (e) => {
    const editar = e.target.closest('[data-editar-produto]');
    const excluir = e.target.closest('[data-excluir-produto]');

    if (editar) {
        abrirProduto(produtos.find((p) => p.id === Number(editar.dataset.editarProduto)));
    }

    if (excluir) {
        const produto = produtos.find((p) => p.id === Number(excluir.dataset.excluirProduto));
        const ok = await confirmar({
            titulo: 'Excluir produto?',
            mensagem: `"${produto.nome}" será apagado da loja. Essa ação não pode ser desfeita.`,
            textoConfirmar: 'Excluir',
            textoCancelar: 'Manter',
            perigo: true,
        });
        if (!ok) return;
        try {
            await api(`/admin/produtos/${produto.id}`, { method: 'DELETE' });
            limparMensagem();
            await Promise.all([carregarProdutos(), carregarCategorias(), carregarResumo()]);
        } catch (erro) {
            tratarErro(erro);
        }
    }
});

// Interruptor de destaque: salva na hora
elProdutos.addEventListener('change', async (e) => {
    const caixa = e.target.closest('[data-destaque]');
    if (!caixa) return;
    const id = Number(caixa.dataset.destaque);

    caixa.disabled = true;
    try {
        const atualizado = await api(`/admin/produtos/${id}/destaque`, {
            method: 'PATCH',
            body: JSON.stringify({ destaque: caixa.checked }),
        });
        produtos.find((p) => p.id === id).destaque = atualizado.destaque;
        limparMensagem();
        carregarResumo().catch(tratarErro);
    } catch (erro) {
        caixa.checked = !caixa.checked;   // desfaz a mudança na tela
        tratarErro(erro);
    } finally {
        caixa.disabled = false;
    }
});

// =====================================================
// Categorias
// =====================================================
function desenharCategorias() {
    elCategorias.innerHTML = categorias.map((c) => `
        <tr>
            <td><a href="/?categoria=${c.id}">${escapar(c.nome)}</a></td>
            <td class="texto-secundario">${escapar(c.descricao ?? '')}</td>
            <td class="num">${c.total_produtos}</td>
            <td class="acoes-linha">
                <button class="botao pequeno" type="button" data-editar-categoria="${c.id}">Editar</button>
                <button class="botao pequeno botao-excluir" type="button" data-excluir-categoria="${c.id}"
                        ${c.total_produtos > 0 ? 'disabled title="Só dá para excluir categorias sem produtos"' : ''}>Excluir</button>
            </td>
        </tr>`).join('');

    // Filtro de categoria da aba Produtos
    const escolhida = elFiltroCategoria.value;
    elFiltroCategoria.innerHTML = `<option value="">Todas as categorias</option>` +
        categorias.map((c) => `<option value="${c.id}">${escapar(c.nome)}</option>`).join('');
    elFiltroCategoria.value = escolhida;
}

async function carregarCategorias() {
    categorias = await api('/categorias');
    desenharCategorias();
}

async function abrirCategoria(categoria = null) {
    const salvou = await abrirJanela({
        titulo: categoria ? 'Editar categoria' : 'Nova categoria',
        campos: `
            <label>Nome <input name="nome" required maxlength="60"></label>
            <label><span>Descrição <span class="opcional">(opcional)</span></span>
                <textarea name="descricao" rows="3"></textarea>
            </label>`,
        preencher(form) {
            form.elements.nome.value = categoria?.nome ?? '';
            form.elements.descricao.value = categoria?.descricao ?? '';
        },
        salvar: (form) => api(categoria ? `/admin/categorias/${categoria.id}` : '/admin/categorias', {
            method: categoria ? 'PUT' : 'POST',
            body: JSON.stringify({ nome: form.elements.nome.value, descricao: form.elements.descricao.value }),
        }),
    });
    if (salvou) {
        limparMensagem();
        // O nome da categoria aparece também na tabela de produtos
        await Promise.all([carregarCategorias(), carregarProdutos()]).catch(tratarErro);
    }
}

document.getElementById('btn-nova-categoria').addEventListener('click', () => abrirCategoria());

elCategorias.addEventListener('click', async (e) => {
    const editar = e.target.closest('[data-editar-categoria]');
    const excluir = e.target.closest('[data-excluir-categoria]');

    if (editar) {
        abrirCategoria(categorias.find((c) => c.id === Number(editar.dataset.editarCategoria)));
    }

    if (excluir) {
        const categoria = categorias.find((c) => c.id === Number(excluir.dataset.excluirCategoria));
        const ok = await confirmar({
            titulo: 'Excluir categoria?',
            mensagem: `A categoria "${categoria.nome}" será apagada.`,
            textoConfirmar: 'Excluir',
            textoCancelar: 'Manter',
            perigo: true,
        });
        if (!ok) return;
        try {
            await api(`/admin/categorias/${categoria.id}`, { method: 'DELETE' });
            limparMensagem();
            await carregarCategorias();
        } catch (erro) {
            tratarErro(erro);
        }
    }
});

// =====================================================
// Abas
// =====================================================
const botoesAba = document.querySelectorAll('[data-aba]');

function abrirAba(nome) {
    for (const botao of botoesAba) {
        const ativa = botao.dataset.aba === nome;
        botao.setAttribute('aria-selected', String(ativa));
        document.getElementById(`aba-${botao.dataset.aba}`).hidden = !ativa;
    }
    history.replaceState(null, '', `#${nome}`);
}

for (const botao of botoesAba) {
    botao.addEventListener('click', () => abrirAba(botao.dataset.aba));
}

// =====================================================
// Início
// =====================================================
async function iniciar() {
    if (!localStorage.getItem('token')) return;
    elMensagem.textContent = 'Carregando...';

    try {
        // /auth/eu primeiro: quem não é admin vê um aviso, e não um monte de erros
        const usuario = await api('/auth/eu');
        // Atualiza o que o cabeçalho sabe (o link "Painel" depende de admin)
        localStorage.setItem('usuario', JSON.stringify({ id: usuario.id, nome: usuario.nome, email: usuario.email, admin: usuario.admin }));
        montarCabecalho();

        if (!usuario.admin) {
            elMensagem.innerHTML = 'Esta página é só para administradores. <a href="/">Voltar para a loja</a>';
            return;
        }

        await Promise.all([carregarResumo(), carregarPedidos(), carregarCategorias()]);
        await carregarProdutos();
        limparMensagem();
        elPainel.hidden = false;

        const aba = window.location.hash.slice(1);
        if (['pedidos', 'produtos', 'categorias'].includes(aba)) abrirAba(aba);
    } catch (erro) {
        tratarErro(erro);
    }
}

iniciar();
