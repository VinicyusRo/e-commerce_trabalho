import '../estilo.css';
import { montarCabecalho } from '../componentes/cabecalho.js';
import { ativarBotaoVoltar } from '../componentes/voltar.js';
import { api } from '../api/api.js';
import { formatarPreco, escapar } from '../utils.js';
import { adicionarAoCarrinho, lerCarrinho } from '../carrinho.js';
import { criarVisualizador } from '../viewer/viewer.js';
import { exibirModeloDoProduto, textoSeloModelo, temModeloFiel, elementoCreditos } from '../viewer/modelo-produto.js';
import { encontrarParte, destacarParte } from '../viewer/modelos-procedurais.js';
import { montarCarrossel } from '../componentes/carrossel.js';
import { ICONES } from '../componentes/icones.js';
import { voarAteCarrinho, mostrarAviso } from '../componentes/animacoes.js';
import { urlImagem, fonteDaImagem } from '../componentes/foto.js';

montarCabecalho();
ativarBotaoVoltar();

const id = new URLSearchParams(window.location.search).get('id');
const elMensagem = document.getElementById('mensagem');
const elProduto = document.getElementById('produto');
const elPagina = document.getElementById('pagina-produto');
const elEsqueleto = document.getElementById('esqueleto-produto');

// Dica embaixo do 3D: em tela de toque não existe "rolar" para aproximar
const DICA_GIRAR = window.matchMedia('(hover: none)').matches
    ? 'Arraste para girar · afaste dois dedos para aproximar'
    : 'Arraste para girar · role para aproximar';

function desenharProduto(p) {
    document.title = `${p.nome} - TechForAll`;

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
                ${ICONES.carrinho} Adicionar ao carrinho
            </button>
        </div>
        <p id="aviso-carrinho"></p>
    `;

    // Aviso de modelo genérico e créditos (a licença dos modelos exige)
    if (temModeloFiel(p.modelo_3d, p)) {
        const aviso = document.createElement('p');
        aviso.className = 'aviso-generico fiel';
        aviso.textContent = 'A prévia 3D foi modelada a partir das fotos deste produto (formato, cores e detalhes). ' +
            'Logos e nomes de marca não foram reproduzidos.';
        elProduto.append(aviso);
    } else if (p.modelo_3d?.origem === 'categoria') {
        const aviso = document.createElement('p');
        aviso.className = 'aviso-generico';
        aviso.textContent = p.modelo_3d.formato !== 'procedural'
            ? `A prévia 3D é um modelo ilustrativo da categoria ${p.categoria}, feito por outra pessoa (crédito abaixo). ` +
              'A peça real pode ser diferente.'
            : p.modelo_3d.arquivo === 'gpu'
            ? 'A prévia 3D é um modelo genérico ajustado a esta placa (ventoinhas, cor, tamanho e conectores). ' +
              'O desenho real da marca é diferente.'
            : `A prévia 3D é um modelo genérico da categoria ${p.categoria}. ` +
              'A aparência real da peça pode ser diferente.';
        elProduto.append(aviso);
    }
    // Produto com modelo fiel não usa o modelo baixado, então não leva o crédito dele
    if (p.modelo_3d?.creditos && !temModeloFiel(p.modelo_3d, p)) {
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
        // a foto (ou o 3D) voa até o carrinho do topo
        voarAteCarrinho(document.getElementById('visualizador'), urlImagem(p.imagem));
        return true;
    }

    document.getElementById('btn-carrinho').addEventListener('click', () => {
        if (adicionar()) {
            document.getElementById('aviso-carrinho').textContent = '';
            mostrarAviso('Adicionado ao carrinho. <a href="/carrinho.html">Ver carrinho</a>');
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
    const selo = textoSeloModelo(p.modelo_3d, p);
    const elSelo = document.getElementById('selo-modelo');
    elSelo.hidden = !selo;
    elSelo.textContent = selo ?? '';
    elSelo.classList.toggle('generico', p.modelo_3d?.origem === 'categoria' && !temModeloFiel(p.modelo_3d, p));

    const btnTelaCheia = document.getElementById('btn-tela-cheia');
    btnTelaCheia.href = `/visualizador.html?id=${p.id}`;
    btnTelaCheia.hidden = !p.modelo_3d;

    // Vista explodida: tocar numa parte mostra o nome e para que serve
    const elInfo = document.getElementById('info-parte');
    const elLista = document.getElementById('lista-partes');
    const elDica = document.querySelector('.dica-3d');
    elDica.textContent = DICA_GIRAR;
    let parteAtual = null;     // parte tocada (com brilho)
    let parteSozinha = null;   // parte isolada (as outras saíram da cena)

    function mostrarParte(grupo) {
        if (parteAtual) destacarParte(parteAtual, null);
        parteAtual = grupo;
        elInfo.hidden = !grupo;
        if (!grupo) return;
        // Sozinha na cena a peça já está em evidência: brilho só no modo com todas
        if (!parteSozinha) destacarParte(grupo, 0x2bc3ff);
        const { nome, descricao } = grupo.userData.parte;
        const botao = parteSozinha
            ? '<button type="button" class="botao pequeno" data-acao="todas">Mostrar todas as peças</button>'
            : '<button type="button" class="botao pequeno" data-acao="sozinha">Ver só esta peça</button>';
        elInfo.innerHTML = `<strong>${escapar(nome)}</strong><span>${escapar(descricao)}</span>${botao}`;
    }

    // Mostra só uma peça (ou todas, com null) e marca o botão dela na lista
    function verSozinha(grupo) {
        parteSozinha = grupo;
        visualizador.isolarParte(grupo);
        mostrarParte(grupo);
        for (const b of elLista.querySelectorAll('[data-parte]')) {
            const indice = b.dataset.parte === '' ? null : partesDoModelo()[Number(b.dataset.parte)];
            b.setAttribute('aria-pressed', String(indice === grupo));
        }
        elDica.textContent = grupo
            ? 'Só esta peça está na cena · gire para ver todos os lados'
            : 'Toque numa parte ou escolha uma peça na lista';
    }

    function partesDoModelo() {
        return visualizador.obterModelo()?.userData.partes ?? [];
    }

    // Botões da lista: "Todas" e um para cada peça do modelo
    function montarListaDePartes() {
        elLista.innerHTML = '<span class="lista-partes-titulo">Ver uma peça:</span>' +
            '<button type="button" data-parte="" aria-pressed="true">Todas</button>' +
            partesDoModelo().map((g, i) =>
                `<button type="button" data-parte="${i}" aria-pressed="false">${escapar(g.userData.parte.nome)}</button>`
            ).join('');
    }

    elLista.addEventListener('click', (e) => {
        const valor = e.target.closest('[data-parte]')?.dataset.parte;
        if (valor === undefined) return;
        verSozinha(valor === '' ? null : partesDoModelo()[Number(valor)]);
    });

    elInfo.addEventListener('click', (e) => {
        const acao = e.target.closest('[data-acao]')?.dataset.acao;
        if (acao === 'sozinha') verSozinha(parteAtual);
        if (acao === 'todas') verSozinha(null);
    });

    const visualizador = criarVisualizador(document.getElementById('visualizador'), {
        corFundo: 0x131720,
        autoRotacao: true,     // gira sozinho até o usuário mexer
        aoTocar: (objeto) => {
            if (!explodido) return;
            const grupo = objeto ? encontrarParte(objeto) : null;
            // Com uma peça sozinha, tocar no vazio não tira o nome dela da tela
            if (parteSozinha && !grupo) return;
            mostrarParte(grupo);
        },
    });

    document
        .getElementById('btn-reset')
        .addEventListener('click', () => visualizador.resetarCamera());

    exibirModeloDoProduto(visualizador, p.modelo_3d, p);

    // Botão "Ver por dentro": só para modelos com partes (os gerados por código)
    const btnExplodir = document.getElementById('btn-explodir');
    let explodido = false;
    btnExplodir.hidden = !visualizador.obterModelo()?.userData.explodir;
    btnExplodir.addEventListener('click', () => {
        explodido = !explodido;
        if (!explodido && parteSozinha) verSozinha(null);   // juntar traz todas de volta
        visualizador.obterModelo()?.userData.explodir?.(explodido);
        visualizador.controles.autoRotate = !explodido;
        btnExplodir.querySelector('span').textContent = explodido ? 'Juntar as partes' : 'Ver por dentro';
        btnExplodir.setAttribute('aria-pressed', String(explodido));
        btnExplodir.classList.toggle('ligado', explodido);
        mostrarParte(null);
        if (explodido) montarListaDePartes();
        elLista.hidden = !explodido;
        elDica.textContent = explodido
            ? 'Toque numa parte ou escolha uma peça na lista'
            : DICA_GIRAR;
    });
    ativarAbaFoto(p, visualizador);
}

// Abas "3D" e "Foto" em cima do visualizador (só aparecem se houver foto)
function ativarAbaFoto(p, visualizador) {
    const url = urlImagem(p.imagem);
    if (!url) return;

    const abas = document.getElementById('abas-midia');
    const figura = document.getElementById('foto-grande');
    const fonte = fonteDaImagem(p.imagem);

    const img = document.createElement('img');
    img.src = url;
    img.alt = p.nome;
    img.referrerPolicy = 'no-referrer';
    figura.append(img);
    if (fonte) {
        const legenda = document.createElement('figcaption');
        legenda.textContent = `Foto: ${fonte} (referência)`;
        figura.append(legenda);
    }

    // Foto quebrada: some com as abas e fica só o 3D
    img.addEventListener('error', () => {
        abas.hidden = true;
        mostrar('3d');
    });

    function mostrar(aba) {
        const foto = aba === 'foto';
        figura.hidden = !foto;
        if (foto) visualizador.pausar(); else visualizador.retomar();
        for (const botao of abas.querySelectorAll('[data-aba]')) {
            botao.setAttribute('aria-selected', String(botao.dataset.aba === aba));
        }
        // Botões que só fazem sentido no 3D
        for (const elId of ['selo-modelo', 'btn-tela-cheia', 'btn-reset', 'btn-explodir']) {
            document.getElementById(elId).classList.toggle('escondido-foto', foto);
        }
        document.querySelector('.dica-3d')?.classList.toggle('escondido-foto', foto);
        document.getElementById('lista-partes').classList.toggle('escondido-foto-lista', foto);
    }

    abas.addEventListener('click', (e) => {
        const aba = e.target.closest('[data-aba]')?.dataset.aba;
        if (aba) mostrar(aba);
    });
    abas.hidden = false;
    // Produto sem prévia 3D (ex.: placas-mãe): abre direto na foto
    if (!p.modelo_3d) mostrar('foto');
}

// Dois carrosséis embaixo: mesma categoria e o resto da loja
async function carregarCarrosseis(atual) {
    const todos = await api('/produtos');

    const mesmaCategoria = todos.filter((p) => p.categoria_id === atual.categoria_id && p.id !== atual.id);
    const outros = todos.filter((p) => p.categoria_id !== atual.categoria_id);

    const secaoCategoria = document.getElementById('carrossel-categoria');
    const secaoOutros = document.getElementById('carrossel-outros');

    montarCarrossel(secaoCategoria, { titulo: `Mais em ${atual.categoria}`, produtos: mesmaCategoria });
    montarCarrossel(secaoOutros, { titulo: 'Outros produtos da loja', produtos: outros });

}

async function iniciar() {
    if (!id) {
        elEsqueleto.remove();
        elMensagem.textContent = 'Produto não informado.';
        return;
    }

    // Enquanto carrega, quem aparece é o esqueleto do produto.html
    try {
        const produto = await api(`/produtos/${encodeURIComponent(id)}`);
        elEsqueleto.remove();
        desenharProduto(produto);
        elPagina.hidden = false;      // mostra antes de criar o visualizador (precisa de tamanho)
        desenharModelo3D(produto);
        carregarCarrosseis(produto).catch((erro) => console.error('Carrosséis:', erro));
    } catch (erro) {
        elEsqueleto.remove();
        elMensagem.textContent = erro.message;
    }
}

iniciar();