import '../estilo.css';
import { montarCabecalho } from '../componentes/cabecalho.js';
import { api } from '../api/api.js';
import { escapar, formatarPreco } from '../utils.js';
import { cartaoProduto } from '../componentes/cartao-produto.js';
import { fotoHTML } from '../componentes/foto.js';
import { iconeDaCategoria, ICONES } from '../componentes/icones.js';
import { textoSeloModelo } from '../viewer/modelo-produto.js';
import { GRUPOS, grupoDaCategoria, marcaDoProduto } from '../grupos.js';

montarCabecalho();

// =====================================================
// Estado da página
// - grupo, categoria e busca vêm da URL (dá para compartilhar o link)
// - os outros filtros ficam só na memória da página
// =====================================================
const POR_PAGINA = 24;
const FAIXAS_PRECO = [[0, 200], [200, 500], [500, 1000], [1000, 2500], [2500, null]];

// Nomes das características (coluna especificacoes, migração 06)
const ROTULOS = {
    polegadas: 'Tamanho', resolucao: 'Resolução', hz: 'Taxa de atualização', painel: 'Painel', curvo: 'Tela curva',
    cor: 'Cor', formato: 'Formato', mecanico: 'Mecânico', rgb: 'RGB', sem_fio: 'Sem fio', furado: 'Corpo vazado',
    tipo: 'Tipo', estilo: 'Estilo', cor_principal: 'Cor', reclinavel: 'Reclinável', apoio_pes: 'Apoio para os pés',
};
// Características que não viram filtro (quase todos iguais ou valores demais)
const SEM_FILTRO = new Set(['dpi', 'proporcao', 'cor_detalhe']);

const estado = {
    grupo: null, categoria: null, busca: '',
    min: null, max: null, marcas: new Set(), especificacoes: {},
    soEstoque: false, so3d: false, soFoto: false,
    ordem: 'relevancia', limite: POR_PAGINA,
    todasMarcas: false, buscaMarca: '',
};

let produtos = [];     // todos os produtos que vieram da API
let categorias = [];   // [{ id, nome, total_produtos }]

const $ = (id) => document.getElementById(id);

function lerUrl() {
    const p = new URLSearchParams(location.search);
    estado.grupo = GRUPOS[p.get('grupo')] ? p.get('grupo') : null;
    estado.categoria = p.get('categoria');
    estado.busca = (p.get('busca') ?? '').trim();
}

function ehInicio() {
    return !estado.grupo && !estado.categoria && !estado.busca;
}

// =====================================================
// Filtragem
// "ignorar" deixa de fora um filtro: serve para contar quantos
// produtos cada opção daquele filtro teria.
// =====================================================
function passa(p, ignorar) {
    if (estado.grupo && !GRUPOS[estado.grupo].contem(p)) return false;
    if (ignorar !== 'categoria' && estado.categoria && String(p.categoria_id) !== estado.categoria) return false;
    if (ignorar !== 'preco') {
        if (estado.min !== null && p.preco < estado.min) return false;
        if (estado.max !== null && p.preco > estado.max) return false;
    }
    if (ignorar !== 'marca' && estado.marcas.size && !estado.marcas.has(p.marca)) return false;
    if (estado.soEstoque && p.estoque <= 0) return false;
    if (estado.so3d && !p.destaque) return false;
    if (estado.soFoto && !p.imagem) return false;
    for (const [chave, valores] of Object.entries(estado.especificacoes)) {
        if (ignorar === `esp:${chave}` || valores.size === 0) continue;
        if (!valores.has(String(p.especificacoes?.[chave]))) return false;
    }
    return true;
}

function listaFiltrada() {
    const lista = produtos.filter((p) => passa(p));
    if (estado.ordem === 'menor') lista.sort((a, b) => a.preco - b.preco);
    else if (estado.ordem === 'maior') lista.sort((a, b) => b.preco - a.preco);
    else if (estado.ordem === 'nome') lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    // "relevantes" = a ordem que a API já manda (destaques e produtos com foto primeiro)
    return lista;
}

// Texto de um valor de característica: true → "Sim", 144 (hz) → "144 Hz"...
function textoValor(chave, valor) {
    if (valor === true || valor === 'true') return 'Sim';
    if (valor === false || valor === 'false') return 'Não';
    if (chave === 'hz') return `${valor} Hz`;
    if (chave === 'polegadas') return `${String(valor).replace('.', ',')}"`;
    if (chave === 'formato') return { tkl: 'TKL', full: 'Full Size' }[valor] ?? (/^\d+$/.test(valor) ? `${valor}%` : valor);
    const texto = String(valor);
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function nomeDaCategoria(id) {
    return categorias.find((c) => String(c.id) === String(id))?.nome ?? 'Categoria';
}

// =====================================================
// Lateral de filtros
// =====================================================
function desenharCategorias() {
    const base = produtos.filter((p) => passa(p, 'categoria'));
    const contagem = {};
    base.forEach((p) => { contagem[p.categoria_id] = (contagem[p.categoria_id] ?? 0) + 1; });

    const titulo = estado.grupo ? `Todos em ${GRUPOS[estado.grupo].nome}` : 'Todas';
    const linhas = [`<button type="button" class="opcao-categoria ${!estado.categoria ? 'ativa' : ''}" data-categoria="">
        ${escapar(titulo)}<span>${base.length}</span></button>`];
    for (const c of categorias) {
        if (!contagem[c.id]) continue;
        const ativa = String(c.id) === estado.categoria ? 'ativa' : '';
        linhas.push(`<button type="button" class="opcao-categoria ${ativa}" data-categoria="${c.id}">
            ${escapar(c.nome)}<span>${contagem[c.id]}</span></button>`);
    }
    $('f-categorias').innerHTML = linhas.join('');
}

// Filtros próprios da categoria escolhida (ex.: Hz e painel em Monitores)
function desenharEspecificos() {
    const daCategoria = estado.categoria
        ? produtos.filter((p) => String(p.categoria_id) === estado.categoria && p.especificacoes)
        : [];
    const chaves = [...new Set(daCategoria.flatMap((p) => Object.keys(p.especificacoes)))]
        .filter((k) => !SEM_FILTRO.has(k));

    $('f-especificos').innerHTML = chaves.map((chave) => {
        const valores = [...new Set(daCategoria.map((p) => p.especificacoes[chave]).filter((v) => v !== null && v !== undefined))]
            .sort((a, b) => (typeof a === 'number' ? a - b : typeof a === 'boolean' ? b - a : String(a).localeCompare(String(b))));
        if (valores.length < 2) return '';
        const base = produtos.filter((p) => passa(p, `esp:${chave}`));
        const marcados = estado.especificacoes[chave] ?? new Set();
        return `<details open class="filtro-especifico"><summary>${escapar(ROTULOS[chave] ?? chave)}</summary><div class="grupo-filtro">
            ${valores.map((v) => {
                const n = base.filter((p) => String(p.especificacoes?.[chave]) === String(v)).length;
                const marcado = marcados.has(String(v));
                return `<label class="opcao-filtro ${marcado ? 'ativa' : ''}">
                    <input type="checkbox" data-especificacao="${escapar(chave)}" value="${escapar(String(v))}" ${marcado ? 'checked' : ''}>
                    ${escapar(textoValor(chave, v))}<span>${n}</span></label>`;
            }).join('')}
        </div></details>`;
    }).join('');
}

function desenharMarcas() {
    const contagem = {};
    produtos.filter((p) => passa(p, 'marca')).forEach((p) => { contagem[p.marca] = (contagem[p.marca] ?? 0) + 1; });
    estado.marcas.forEach((m) => { contagem[m] ??= 0; });

    let marcas = Object.keys(contagem).sort((a, b) => contagem[b] - contagem[a] || a.localeCompare(b));
    if (estado.buscaMarca) marcas = marcas.filter((m) => m.toLowerCase().includes(estado.buscaMarca));
    const total = marcas.length;
    if (!estado.todasMarcas) marcas = marcas.slice(0, 8);

    $('f-marcas').innerHTML = marcas.map((m) => {
        const marcada = estado.marcas.has(m);
        return `<label class="opcao-filtro ${marcada ? 'ativa' : ''}">
            <input type="checkbox" data-marca="${escapar(m)}" ${marcada ? 'checked' : ''}>
            ${escapar(m)}<span>${contagem[m]}</span></label>`;
    }).join('') || '<p class="filtro-vazio">Nenhuma marca encontrada.</p>';

    $('ver-marcas').hidden = total <= 8;
    $('ver-marcas').textContent = estado.todasMarcas ? 'Ver menos' : `Ver todas (${total})`;
}

function textoFaixa([de, ate]) {
    if (ate === null) return `Acima de R$ ${de}`;
    if (de === 0) return `Até R$ ${ate}`;
    return `R$ ${de} a ${ate}`;
}

function desenharFaixas() {
    $('faixas').innerHTML = FAIXAS_PRECO.map(([de, ate], i) => {
        const ativa = estado.min === (de || null) && estado.max === ate;
        return `<button type="button" data-faixa="${i}" class="${ativa ? 'ativa' : ''}">${textoFaixa([de, ate])}</button>`;
    }).join('');
}

// Filtros ligados, cada um com um "x" para tirar
function desenharChips() {
    const chips = [];
    if (estado.categoria) chips.push(['categoria', nomeDaCategoria(estado.categoria)]);
    if (estado.min !== null || estado.max !== null) {
        chips.push(['preco', estado.max === null ? `Acima de ${formatarPreco(estado.min)}`
            : `${formatarPreco(estado.min ?? 0)} a ${formatarPreco(estado.max)}`]);
    }
    estado.marcas.forEach((m) => chips.push([`marca:${m}`, m]));
    for (const [chave, valores] of Object.entries(estado.especificacoes)) {
        valores.forEach((v) => chips.push([`esp:${chave}:${v}`, `${ROTULOS[chave] ?? chave}: ${textoValor(chave, v)}`]));
    }
    if (estado.soEstoque) chips.push(['soEstoque', 'Em estoque']);
    if (estado.so3d) chips.push(['so3d', '3D próprio']);
    if (estado.soFoto) chips.push(['soFoto', 'Com foto']);

    $('chips').innerHTML = chips.map(([chave, texto]) =>
        `<button type="button" class="chip" data-chip="${escapar(chave)}" aria-label="Tirar filtro ${escapar(texto)}">
            ${escapar(texto)}<b aria-hidden="true">×</b></button>`).join('');
}

function desenharTrilha() {
    const partes = ['<a href="/">Início</a>'];
    if (estado.grupo) {
        partes.push(estado.categoria
            ? `<a href="/?grupo=${estado.grupo}">${GRUPOS[estado.grupo].nome}</a>`
            : `<span>${GRUPOS[estado.grupo].nome}</span>`);
    }
    if (estado.busca) partes.push(`<span>Busca: "${escapar(estado.busca)}"</span>`);
    if (estado.categoria) partes.push(`<span>${escapar(nomeDaCategoria(estado.categoria))}</span>`);
    $('trilha').innerHTML = partes.join(' <span aria-hidden="true">›</span> ');
}

// Atalhos de categoria (só na página inicial)
function desenharAtalhos() {
    $('categorias').innerHTML = categorias.filter((c) => c.total_produtos > 0).map((c) =>
        `<a href="/?grupo=${grupoDaCategoria(c.nome)}&categoria=${c.id}">
            ${escapar(c.nome)} <span class="qtd">${c.total_produtos}</span></a>`).join('');
}

// =====================================================
// Desenho geral
// =====================================================
function desenhar() {
    const inicio = ehInicio();
    $('so-inicio').hidden = !inicio;
    $('area-compra').classList.toggle('inicio', inicio);
    if (!inicio) abrirFiltros(false);

    const titulo = estado.categoria ? nomeDaCategoria(estado.categoria)
        : estado.busca ? `Resultados para "${estado.busca}"`
        : estado.grupo ? GRUPOS[estado.grupo].nome
        : 'Destaques para você';
    $('titulo-lista').firstChild.textContent = `${titulo} `;
    document.title = inicio ? 'PC Store' : `${titulo} - PC Store`;

    if (!inicio) {
        desenharTrilha();
        desenharCategorias();
        desenharEspecificos();
        desenharMarcas();
        desenharFaixas();
        desenharChips();
    }

    const lista = listaFiltrada();
    $('contagem').textContent = `${lista.length} ${lista.length === 1 ? 'produto' : 'produtos'}`;
    $('mensagem').textContent = lista.length ? ''
        : estado.busca && produtos.length === 0 ? 'Nenhum produto encontrado para essa busca.'
        : 'Nenhum produto com esses filtros. Tire algum filtro para ver mais.';
    $('produtos').innerHTML = lista.slice(0, estado.limite).map((p) => cartaoProduto(p)).join('');
    $('carregar-mais').hidden = lista.length <= estado.limite;
    $('carregar-mais').textContent = `Carregar mais (${lista.length - estado.limite} restantes)`;
}

function limparFiltros() {
    Object.assign(estado, { min: null, max: null, especificacoes: {}, soEstoque: false, so3d: false, soFoto: false, limite: POR_PAGINA });
    estado.marcas.clear();
    $('preco-min').value = '';
    $('preco-max').value = '';
    $('so-estoque').checked = false;
    $('so-3d').checked = false;
    $('so-foto').checked = false;
}

// Troca de categoria sem recarregar a página (a URL acompanha)
function escolherCategoria(id) {
    limparFiltros();
    estado.categoria = id || null;
    const url = new URLSearchParams(location.search);
    if (estado.categoria) url.set('categoria', estado.categoria);
    else url.delete('categoria');
    history.pushState(null, '', `/?${url}`);
    desenhar();
    window.scrollTo({ top: 0 });
}

window.addEventListener('popstate', () => {
    lerUrl();
    limparFiltros();
    desenhar();
});

// =====================================================
// Eventos dos filtros
// =====================================================
const elFiltros = $('filtros');

elFiltros.addEventListener('click', (e) => {
    const categoria = e.target.closest('[data-categoria]');
    if (categoria) { escolherCategoria(categoria.dataset.categoria); return; }

    const faixa = e.target.closest('[data-faixa]');
    if (faixa) {
        const [de, ate] = FAIXAS_PRECO[faixa.dataset.faixa];
        const jaAtiva = faixa.classList.contains('ativa');
        estado.min = jaAtiva ? null : (de || null);
        estado.max = jaAtiva ? null : ate;
        $('preco-min').value = estado.min ?? '';
        $('preco-max').value = estado.max ?? '';
        estado.limite = POR_PAGINA;
        desenhar();
    }
});

elFiltros.addEventListener('change', (e) => {
    const alvo = e.target;
    if (alvo.dataset.marca) {
        if (alvo.checked) estado.marcas.add(alvo.dataset.marca);
        else estado.marcas.delete(alvo.dataset.marca);
    } else if (alvo.dataset.especificacao) {
        const valores = (estado.especificacoes[alvo.dataset.especificacao] ??= new Set());
        if (alvo.checked) valores.add(alvo.value);
        else valores.delete(alvo.value);
    } else if (alvo.id === 'so-estoque') estado.soEstoque = alvo.checked;
    else if (alvo.id === 'so-3d') estado.so3d = alvo.checked;
    else if (alvo.id === 'so-foto') estado.soFoto = alvo.checked;
    else return;
    estado.limite = POR_PAGINA;
    desenhar();
});

function lerPrecos() {
    const numero = (texto) => {
        const valor = parseFloat(texto.replace(/\./g, '').replace(',', '.'));
        return Number.isFinite(valor) ? valor : null;
    };
    estado.min = numero($('preco-min').value);
    estado.max = numero($('preco-max').value);
    estado.limite = POR_PAGINA;
    desenhar();
}
$('preco-min').addEventListener('change', lerPrecos);
$('preco-max').addEventListener('change', lerPrecos);

$('busca-marca').addEventListener('input', (e) => {
    estado.buscaMarca = e.target.value.trim().toLowerCase();
    desenharMarcas();
});
$('ver-marcas').addEventListener('click', () => {
    estado.todasMarcas = !estado.todasMarcas;
    desenharMarcas();
});
$('ordem').addEventListener('change', (e) => {
    estado.ordem = e.target.value;
    desenhar();
});
$('carregar-mais').addEventListener('click', () => {
    estado.limite += POR_PAGINA;
    desenhar();
});
$('limpar-filtros').addEventListener('click', () => {
    limparFiltros();
    desenhar();
});

$('chips').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-chip]');
    if (!chip) return;
    const chave = chip.dataset.chip;
    if (chave === 'categoria') { escolherCategoria(null); return; }
    if (chave === 'preco') {
        estado.min = estado.max = null;
        $('preco-min').value = $('preco-max').value = '';
    } else if (chave.startsWith('marca:')) {
        estado.marcas.delete(chave.slice('marca:'.length));
    } else if (chave.startsWith('esp:')) {
        const [, especificacao, ...valor] = chave.split(':');
        estado.especificacoes[especificacao]?.delete(valor.join(':'));
    } else {
        estado[chave] = false;
        $({ soEstoque: 'so-estoque', so3d: 'so-3d', soFoto: 'so-foto' }[chave]).checked = false;
    }
    desenhar();
});

// No celular os filtros abrem numa gaveta
function abrirFiltros(abrir) {
    elFiltros.classList.toggle('aberto', abrir);
    $('veu-filtros').classList.toggle('visivel', abrir);
    document.body.classList.toggle('sem-rolagem', abrir);
}
$('abrir-filtros').addEventListener('click', () => abrirFiltros(true));
$('fechar-filtros').addEventListener('click', () => abrirFiltros(false));
$('veu-filtros').addEventListener('click', () => abrirFiltros(false));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') abrirFiltros(false); });

// =====================================================
// Página inicial: prateleiras por departamento
// =====================================================
function miniatura(p) {
    return `<a class="prateleira-foto" href="/produto.html?id=${p.id}" title="${escapar(p.nome)}">
        ${iconeDaCategoria(p.categoria)}${fotoHTML(p)}</a>`;
}

// Até 4 produtos com foto, de categorias diferentes quando der
function escolherMiniaturas(lista) {
    const comFoto = lista.filter((p) => p.imagem);
    const escolhidos = [];
    const vistas = new Set();
    for (const p of comFoto) {
        if (escolhidos.length === 4) break;
        if (!vistas.has(p.categoria)) { escolhidos.push(p); vistas.add(p.categoria); }
    }
    for (const p of comFoto) {
        if (escolhidos.length === 4) break;
        if (!escolhidos.includes(p)) escolhidos.push(p);
    }
    return escolhidos;
}

function montarPrateleiras() {
    const blocos = ['hardware', 'perifericos', '3d'].map((g) => {
        const doGrupo = produtos.filter((p) => GRUPOS[g].contem(p));
        if (doGrupo.length === 0) return '';
        return `<div class="prateleira">
            <a class="prateleira-titulo" href="/?grupo=${g}">
                <h3>${GRUPOS[g].nome}</h3><span>Ver ${doGrupo.length} ›</span>
            </a>
            <div class="prateleira-fotos">${escolherMiniaturas(doGrupo).map(miniatura).join('')}</div>
        </div>`;
    });

    const maisProcurados = [...categorias].sort((a, b) => b.total_produtos - a.total_produtos).slice(0, 5);
    blocos.push(`<div class="prateleira">
        <div class="prateleira-titulo"><h3>Mais procurados</h3></div>
        <div class="prateleira-lista">${maisProcurados.map((c) =>
            `<a href="/?grupo=${grupoDaCategoria(c.nome)}&categoria=${c.id}">${escapar(c.nome)}<span>${c.total_produtos}</span></a>`).join('')}
        </div>
    </div>`);

    $('prateleiras').innerHTML = blocos.join('');
}

// =====================================================
// Vitrine do banner: até 10 produtos com foto passando sozinhos.
// A lista já vem na ordem do catálogo (personalizados primeiro).
// =====================================================
function montarVitrine(lista) {
    const elVitrine = $('vitrine');
    const trilho = $('vitrine-trilho');
    const pontos = $('vitrine-pontos');
    const comFoto = lista.filter((p) => p.imagem).slice(0, 10);
    if (comFoto.length === 0) return;

    trilho.innerHTML = comFoto.map((p, i) => {
        const selo = textoSeloModelo(p.modelo_3d, p);
        return `<a class="vitrine-slide" href="/produto.html?id=${p.id}" aria-label="${escapar(p.nome)}" ${i ? 'tabindex="-1"' : ''}>
            <div class="vitrine-foto tem-foto">
                ${selo ? `<span class="selo-3d">${ICONES.cubo}${selo}</span>` : ''}
                ${iconeDaCategoria(p.categoria)}${fotoHTML(p)}
            </div>
            <div class="vitrine-info">
                <span class="categoria">${escapar(p.categoria)}</span>
                <strong>${escapar(p.nome)}</strong>
                <span class="preco">${formatarPreco(p.preco)}</span>
            </div>
        </a>`;
    }).join('');
    pontos.innerHTML = comFoto.map((p, i) =>
        `<button type="button" role="tab" aria-label="Produto ${i + 1} de ${comFoto.length}" aria-selected="${i === 0}"></button>`).join('');
    elVitrine.hidden = false;

    let atual = 0;
    const slides = trilho.children, botoes = pontos.children;
    function ir(i) {
        atual = (i + comFoto.length) % comFoto.length;
        trilho.style.transform = `translateX(-${atual * 100}%)`;
        [...botoes].forEach((b, k) => b.setAttribute('aria-selected', String(k === atual)));
        [...slides].forEach((s, k) => s.tabIndex = k === atual ? 0 : -1);
    }
    [...botoes].forEach((b, k) => b.addEventListener('click', () => ir(k)));

    // Passa sozinho a cada 4 s; para enquanto o mouse está em cima, o foco está dentro
    // ou a vitrine não aparece (página de categoria/busca)
    let parado = false;
    elVitrine.addEventListener('mouseenter', () => { parado = true; });
    elVitrine.addEventListener('mouseleave', () => { parado = false; });
    elVitrine.addEventListener('focusin', () => { parado = true; });
    elVitrine.addEventListener('focusout', () => { parado = false; });
    setInterval(() => {
        if (!parado && !document.hidden && !$('so-inicio').hidden) ir(atual + 1);
    }, 4000);

    // Arrastar com o dedo (celular)
    let inicioX = null, arrastou = false;
    trilho.addEventListener('pointerdown', (e) => { inicioX = e.clientX; arrastou = false; });
    trilho.addEventListener('pointerup', (e) => {
        if (inicioX === null) return;
        const dx = e.clientX - inicioX;
        inicioX = null;
        if (Math.abs(dx) > 40) { arrastou = true; ir(atual + (dx < 0 ? 1 : -1)); }
    });
    // um arrasto não deve abrir o produto (só um toque abre)
    trilho.addEventListener('click', (e) => { if (arrastou) { e.preventDefault(); arrastou = false; } }, true);
    trilho.addEventListener('dragstart', (e) => e.preventDefault());
}

// =====================================================
// Início
// =====================================================
async function iniciar() {
    lerUrl();
    $('mensagem').textContent = 'Carregando produtos...';

    // O backend grátis "dorme" quando ninguém usa; avisa se demorar
    const avisoLento = setTimeout(() => {
        $('mensagem').textContent =
            'Carregando produtos... o servidor estava em repouso e pode levar até 1 minuto para acordar.';
    }, 4000);

    // A busca é feita no backend (procura também na descrição);
    // categoria e departamento são filtrados aqui, para a lateral poder contar
    const consulta = estado.busca ? `?${new URLSearchParams({ busca: estado.busca })}` : '';

    try {
        // As duas chamadas rodam ao mesmo tempo
        const [listaCategorias, listaProdutos] = await Promise.all([
            api('/categorias'),
            api(`/produtos${consulta}`),
        ]);
        clearTimeout(avisoLento);

        categorias = listaCategorias;
        produtos = listaProdutos.map((p) => ({ ...p, marca: marcaDoProduto(p.nome) }));

        desenharAtalhos();
        if (!estado.busca) {
            montarPrateleiras();
            montarVitrine(produtos);
        }
        desenhar();
    } catch (erro) {
        clearTimeout(avisoLento);
        $('mensagem').textContent = `Erro ao carregar: ${erro.message}`;
    }
}

iniciar();
