import '../estilo.css';
import { montarCabecalho } from '../componentes/cabecalho.js';
import { api } from '../api/api.js';
import { formatarPreco, escapar } from '../utils.js';
import { adicionarAoCarrinho, lerCarrinho } from '../carrinho.js';
import { criarVisualizador } from '../viewer/viewer.js';
import { exibirModeloDoProduto, textoSeloModelo, elementoCreditos } from '../viewer/modelo-produto.js';
import { montarCarrossel } from '../componentes/carrossel.js';
import { ativarBotoesAdicionar } from '../componentes/cartao-produto.js';

montarCabecalho();

const id = new URLSearchParams(window.location.search).get('id');
const elMensagem = document.getElementById('mensagem');
const elProduto = document.getElementById('produto');
const elPagina = document.getElementById('pagina-produto');

function desenharProduto(p) {
    document.title = `${p.nome} - PC Store`;

    const disponivel = p.estoque > 0;

    elProduto.innerHTML = `
        <h1>${escapar(p.nome)}</h1>
        <p class="categoria">${escapar(p.categoria)}</p>
        <p class="descricao">${escapar(p.descricao)}</p>
        <p class="preco-grande">${formatarPreco(p.preco)}</p>
        <p class="${disponivel ? 'em-estoque' : 'sem-estoque'}">
            ${disponivel ? `Em estoque: ${p.estoque} unidades` : 'Indisponível'}
        </p>
        <div class="acoes">
            <button class="botao primario" id="btn-comprar" ${disponivel ? '' : 'disabled'}>
                Comprar agora
            </button>
            <button class="botao" id="btn-carrinho" ${disponivel ? '' : 'disabled'}>
                Adicionar ao carrinho
            </button>
        </div>
        <p id="aviso-carrinho"></p>
    `;

    // Aviso de modelo genérico e créditos (a licença dos modelos exige)
    if (p.modelo_3d?.origem === 'categoria') {
        const aviso = document.createElement('p');
        aviso.className = 'aviso-generico';
        aviso.textContent = `A prévia 3D é um modelo genérico da categoria ${p.categoria}. ` +
            'A aparência real da peça pode ser diferente.';
        elProduto.append(aviso);
    }
    if (p.modelo_3d?.creditos) {
        elProduto.append(elementoCreditos(p.modelo_3d.creditos));
    }

    // Adiciona 1 unidade respeitando o estoque. Devolve true se adicionou.
    function adicionar() {
        const aviso = document.getElementById('aviso-carrinho');
        const noCarrinho = lerCarrinho()
            .find((i) => i.produto_id === p.id)?.quantidade ?? 0;

        if (noCarrinho >= p.estoque) {
            aviso.textContent =
                `Você já tem o máximo disponível no carrinho (${p.estoque}).`;
            return false;
        }

        adicionarAoCarrinho(p.id);
        montarCabecalho();   // atualiza o contador do carrinho no topo
        return true;
    }

    document.getElementById('btn-carrinho').addEventListener('click', () => {
        if (adicionar()) {
            document.getElementById('aviso-carrinho').innerHTML =
                'Adicionado! <a href="/carrinho.html">Ver carrinho</a>';
        }
    });

    // "Comprar agora": coloca no carrinho (se ainda não estiver) e vai direto para ele
    document.getElementById('btn-comprar').addEventListener('click', () => {
        const jaNoCarrinho = lerCarrinho().some((i) => i.produto_id === p.id);
        if (!jaNoCarrinho) adicionar();
        window.location.href = '/carrinho.html';
    });
}

function desenharModelo3D(p) {
    const selo = textoSeloModelo(p.modelo_3d);
    const elSelo = document.getElementById('selo-modelo');
    elSelo.hidden = !selo;
    elSelo.textContent = selo ?? '';
    elSelo.classList.toggle('generico', p.modelo_3d?.origem === 'categoria');

    const btnTelaCheia = document.getElementById('btn-tela-cheia');
    btnTelaCheia.href = `/visualizador.html?id=${p.id}`;
    btnTelaCheia.hidden = !p.modelo_3d;

    const visualizador = criarVisualizador(document.getElementById('visualizador'), {
        corFundo: 0x131720,
        autoRotacao: true,     // gira sozinho até o usuário mexer
    });

    document
        .getElementById('btn-reset')
        .addEventListener('click', () => visualizador.resetarCamera());

    exibirModeloDoProduto(visualizador, p.modelo_3d);
}

// Dois carrosséis embaixo: mesma categoria e o resto da loja
async function carregarCarrosseis(atual) {
    const todos = await api('/produtos');
    const mapa = new Map(todos.map((p) => [p.id, p]));

    const mesmaCategoria = todos.filter((p) => p.categoria_id === atual.categoria_id && p.id !== atual.id);
    const outros = todos.filter((p) => p.categoria_id !== atual.categoria_id);

    const secaoCategoria = document.getElementById('carrossel-categoria');
    const secaoOutros = document.getElementById('carrossel-outros');

    montarCarrossel(secaoCategoria, { titulo: `Mais em ${atual.categoria}`, produtos: mesmaCategoria });
    montarCarrossel(secaoOutros, { titulo: 'Outros produtos da loja', produtos: outros });

    ativarBotoesAdicionar(secaoCategoria, mapa);
    ativarBotoesAdicionar(secaoOutros, mapa);
}

async function iniciar() {
    if (!id) {
        elMensagem.textContent = 'Produto não informado.';
        return;
    }

    elMensagem.textContent = 'Carregando...';

    try {
        const produto = await api(`/produtos/${encodeURIComponent(id)}`);
        elMensagem.textContent = '';
        desenharProduto(produto);
        elPagina.hidden = false;      // mostra antes de criar o visualizador (precisa de tamanho)
        desenharModelo3D(produto);
        carregarCarrosseis(produto).catch((erro) => console.error('Carrosséis:', erro));
    } catch (erro) {
        elMensagem.textContent = erro.message;
    }
}

iniciar();