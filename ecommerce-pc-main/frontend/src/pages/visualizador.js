import { criarVisualizador } from '../viewer/viewer.js';
import { api } from '../api/api.js';

const container = document.getElementById('visualizador');
const elTitulo = document.getElementById('titulo-produto');
const elVoltar = document.getElementById('btn-voltar');
const elErro = document.getElementById('erro-pagina');

const id = new URLSearchParams(window.location.search).get('id');

function mostrarErro(texto) {
    elErro.textContent = texto;
    elErro.style.display = 'flex';
}

async function iniciar() {
    if (!id) {
        mostrarErro('Produto não informado.');
        return;
    }

    // Botão "Voltar" leva de volta à página do produto
    elVoltar.href = `/produto.html?id=${encodeURIComponent(id)}`;

    let produto;
    try {
        produto = await api(`/produtos/${encodeURIComponent(id)}`);
    } catch (erro) {
        mostrarErro(erro.message);
        return;
    }

    // textContent (e não innerHTML): o nome vem do banco
    elTitulo.textContent = produto.nome;

    if (!produto.modelo_3d) {
        mostrarErro('Este produto não possui modelo 3D.');
        return;
    }

    const visualizador = criarVisualizador(container);

    document
        .getElementById('btn-reset')
        .addEventListener('click', () => visualizador.resetarCamera());

    // O caminho do banco é relativo ("modelos/..."), então prefixamos com "/"
    visualizador
        .carregarModelo(`/${produto.modelo_3d}`)
        .catch((erro) => console.error('Erro ao carregar o modelo:', erro));
}

iniciar();