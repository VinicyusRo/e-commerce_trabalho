import '../estilo.css';
import { montarCabecalho } from '../componentes/cabecalho.js';
import { api } from '../api/api.js';
import { formatarPreco, escapar } from '../utils.js';
import { lerCarrinho, adicionarAoCarrinho } from '../carrinho.js';
import { iconeDaCategoria, ICONES } from '../componentes/icones.js';
import { fotoHTML } from '../componentes/foto.js';
import { confirmar } from '../componentes/confirmar.js';

/*
 * MONTE SEU PC
 * Um "formulário" em passos: cada passo é uma categoria. As opções de
 * cada passo são filtradas pelos dados técnicos (tabela produto_tecnico
 * e cooler_soquete), para mostrar só as peças que combinam:
 *   placa-mãe  → mesmo soquete do processador
 *   memória    → mesmo tipo (DDR4/DDR5) da placa-mãe
 *   cooler     → serve no soquete do processador
 *   fonte      → potência >= recomendada (processador + placa de vídeo)
 *   gabinete   → cabe uma placa-mãe do tamanho escolhido
 * No fim, tudo vai para o carrinho de uma vez.
 */

montarCabecalho();

// Tamanhos de placa-mãe, do menor para o maior
const TAMANHOS = { 'ITX': 1, 'M-ATX': 2, 'ATX': 3, 'E-ATX': 4 };

const ETAPAS = [
    {
        id: 'cpu', categoria: 'Processadores', titulo: 'Processador', obrigatoria: false,
        texto: 'É o cérebro do computador. Ele define o soquete, e o soquete define quais placas-mãe servem.',
    },
    {
        id: 'mae', categoria: 'Placas-mãe', titulo: 'Placa-mãe', obrigatoria: false,
        texto: 'Liga todas as peças. Mostramos só as placas com o mesmo soquete do processador.',
        precisa: 'cpu',
        combina: (p, s) => p.tecnico?.soquete === s.cpu.produto.tecnico?.soquete,
        motivo: (s) => `não são soquete ${s.cpu.produto.tecnico?.soquete}`,
    },
    {
        id: 'ram', categoria: 'Memórias RAM', titulo: 'Memória RAM', obrigatoria: false, maxQtd: 4,
        texto: 'Guarda o que está aberto agora. A placa-mãe aceita um tipo só de memória.',
        precisa: 'mae',
        combina: (p, s) => p.tecnico?.memoria === s.mae.produto.tecnico?.memoria,
        motivo: (s) => `não são ${s.mae.produto.tecnico?.memoria}, o tipo da sua placa-mãe`,
    },
    {
        id: 'gpu', categoria: 'Placas de vídeo', titulo: 'Placa de vídeo',
        obrigatoria: false,
        texto: 'Desenha a imagem na tela. Para jogos e programas 3D, faz toda a diferença.',
    },
    {
        id: 'arm', categoria: 'Armazenamento', titulo: 'Armazenamento', obrigatoria: false, maxQtd: 3,
        texto: 'Onde ficam o sistema, os jogos e os arquivos. SSD NVMe é o mais rápido.',
    },
    {
        id: 'cooler', categoria: 'Coolers', titulo: 'Cooler', obrigatoria: false,
        texto: 'Tira o calor do processador. Alguns processadores já vêm com um cooler simples na caixa.',
        precisa: 'cpu',
        combina: (p, s) => p.tecnico?.soquetes_cooler?.includes(s.cpu.produto.tecnico?.soquete),
        motivo: (s) => `não servem no soquete ${s.cpu.produto.tecnico?.soquete}`,
    },
    {
        id: 'fonte', categoria: 'Fontes', titulo: 'Fonte', obrigatoria: false,
        texto: 'Alimenta tudo. Calculamos a potência pelo consumo do processador e da placa de vídeo.',
        precisa: 'cpu',
        combina: (p, s) => p.tecnico?.potencia_w >= potenciaRecomendada(s),
        motivo: (s) => `têm menos de ${potenciaRecomendada(s)} W`,
    },
    {
        id: 'gab', categoria: 'Gabinetes', titulo: 'Gabinete', obrigatoria: false,
        texto: 'A caixa do PC. Precisa caber a placa-mãe que você escolheu.',
        precisa: 'mae',
        combina: (p, s) => TAMANHOS[p.tecnico?.formato] >= TAMANHOS[s.mae.produto.tecnico?.formato],
        motivo: (s) => `não cabem uma placa ${s.mae.produto.tecnico?.formato}`,
    },
    {
        id: 'fan', categoria: 'Ventoinhas', titulo: 'Ventoinhas', obrigatoria: false, maxQtd: 6,
        texto: 'Melhoram a circulação de ar dentro do gabinete. Opcional.',
    },
    // Periféricos (todos opcionais)
    { id: 'monitor', categoria: 'Monitores', titulo: 'Monitor', obrigatoria: false, maxQtd: 3,
      texto: 'Onde a imagem aparece. Mais Hz deixam o movimento mais suave nos jogos.' },
    { id: 'teclado', categoria: 'Teclados', titulo: 'Teclado', obrigatoria: false,
      texto: 'Mecânico (mais preciso e durável) ou membrana (mais barato e silencioso).' },
    { id: 'mouse', categoria: 'Mouses', titulo: 'Mouse', obrigatoria: false,
      texto: 'Para jogos, mouses leves e com DPI alto respondem mais rápido.' },
    { id: 'headset', categoria: 'Headsets e fones', titulo: 'Headset ou fone', obrigatoria: false,
      texto: 'Headset tem microfone para conversar nos jogos; fones são só para ouvir.' },
    { id: 'controle', categoria: 'Controles', titulo: 'Controle', obrigatoria: false, maxQtd: 2,
      texto: 'Para jogos de corrida, luta e esporte, muita gente prefere o controle.' },
    { id: 'cadeira', categoria: 'Cadeiras', titulo: 'Cadeira', obrigatoria: false,
      texto: 'Para passar horas no PC com a coluna apoiada.' },
    { id: 'revisao', titulo: 'Revisão' },
];

// ---------- Estado ----------
let produtos = [];
let atual = 0;            // índice da etapa na tela
let alcancada = 0;        // até onde a pessoa já chegou (libera os passos do topo)
let sel = {};             // { cpu: { produto, qtd }, ... } ; null = pulou
let ordem = 'menor';
let aviso = '';

const CHAVE = 'montagem';
const elPassos = document.getElementById('passos');
const elEtapa = document.getElementById('etapa');
const elResumo = document.getElementById('resumo-montagem');
const elMensagem = document.getElementById('mensagem');

function salvar() {
    const dados = { atual, alcancada, sel: {} };
    for (const [id, item] of Object.entries(sel)) {
        dados.sel[id] = item ? { id: item.produto.id, qtd: item.qtd } : null;
    }
    try { localStorage.setItem(CHAVE, JSON.stringify(dados)); } catch { /* sem armazenamento */ }
}

function restaurar() {
    try {
        const dados = JSON.parse(localStorage.getItem(CHAVE));
        if (!dados) return;
        for (const [id, item] of Object.entries(dados.sel ?? {})) {
            if (item === null) { sel[id] = null; continue; }
            const produto = produtos.find((p) => p.id === item.id);
            if (produto) sel[id] = { produto, qtd: item.qtd };
        }
        alcancada = Math.min(dados.alcancada ?? 0, ETAPAS.length - 1);
        atual = Math.min(dados.atual ?? 0, alcancada);
        revalidar(0);
    } catch { /* começa do zero */ }
}

// ---------- Regras ----------
function consumoEstimado(s = sel) {
    return (s.cpu?.produto.tecnico?.consumo_w ?? 0) + (s.gpu?.produto.tecnico?.consumo_w ?? 0) + 100;
}

// Consumo + 30% de folga, arredondado para cima de 50 em 50 W
function potenciaRecomendada(s = sel) {
    return Math.ceil((consumoEstimado(s) * 1.3) / 50) * 50;
}

function obrigatoria(etapa) {
    return typeof etapa.obrigatoria === 'function' ? etapa.obrigatoria(sel) : etapa.obrigatoria;
}

// Uma etapa com filtro precisa das escolhas anteriores (ex.: memória precisa da placa-mãe)
function combina(etapa, p) {
    if (!etapa.combina) return true;
    if (etapa.precisa && !sel[etapa.precisa]) return true;   // ainda não escolheu a peça anterior: mostra todas
    try { return Boolean(etapa.combina(p, sel)); } catch { return false; }
}

// Depois de trocar uma peça, tira as escolhas seguintes que não combinam mais
function revalidar(aPartirDe) {
    const removidas = [];
    for (let i = aPartirDe + 1; i < ETAPAS.length; i++) {
        const etapa = ETAPAS[i];
        const item = sel[etapa.id];
        if (item && !combina(etapa, item.produto)) {
            removidas.push(item.produto.nome);
            delete sel[etapa.id];
        }
    }
    if (removidas.length) {
        aviso = `Tiramos da montagem porque não combina mais: ${removidas.join('; ')}.`;
    }
}

function etapaCompleta(i) {
    const etapa = ETAPAS[i];
    if (etapa.id === 'revisao') return false;
    const item = sel[etapa.id];
    return item !== undefined && (item !== null || !obrigatoria(etapa));
}

// ---------- Passos (topo) ----------
function desenharPassos() {
    elPassos.innerHTML = ETAPAS.map((etapa, i) => {
        const estado = i === atual ? 'atual' : etapaCompleta(i) ? 'feito' : '';
        const liberado = true;   // tudo é opcional: dá para pular para qualquer passo
        return `<li class="passo ${estado}">
            <button type="button" data-ir="${i}" ${liberado ? '' : 'disabled'} ${i === atual ? 'aria-current="step"' : ''}>
                <span class="passo-num">${estado === 'feito' ? '✓' : i + 1}</span>
                <span>${escapar(etapa.titulo)}</span>
            </button>
        </li>`;
    }).join('');
    elPassos.querySelector('.atual')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
}

elPassos.addEventListener('click', (e) => {
    const botao = e.target.closest('[data-ir]');
    if (botao && !botao.disabled) irPara(Number(botao.dataset.ir));
});

function irPara(i) {
    if (i !== atual) termoBusca = '';
    atual = i;
    // No 3D, a câmera vai até onde a peça deste passo encaixa
    if (bancada && ETAPAS[i].id !== 'revisao') bancada.focar(ETAPAS[i].id, 0.1);
    alcancada = Math.max(alcancada, i);
    salvar();
    desenhar();
    document.querySelector('.montagem-topo').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------- Uma opção (card) ----------
function chipsTecnicos(p) {
    const t = p.tecnico ?? {};
    const chips = [];
    if (t.soquete) chips.push(t.soquete);
    if (t.memoria) chips.push(t.memoria);
    if (t.formato) chips.push(p.categoria === 'Gabinetes' ? `até ${t.formato}` : t.formato);
    if (t.potencia_w) chips.push(`${t.potencia_w} W`);
    if (t.consumo_w) chips.push(`~${t.consumo_w} W de consumo`);
    if (t.video_integrado === true) chips.push('Vídeo integrado');
    if (t.video_integrado === false) chips.push('Sem vídeo integrado');
    if (t.soquetes_cooler) chips.push(t.soquetes_cooler.join(' · '));
    return chips.map((c) => `<span class="chip-tec">${escapar(c)}</span>`).join('');
}

function opcaoHTML(etapa, p) {
    const escolhido = sel[etapa.id]?.produto.id === p.id;
    const esgotado = p.estoque <= 0;
    const qtd = sel[etapa.id]?.qtd ?? 1;
    const maxQtd = Math.min(etapa.maxQtd ?? 1, Math.max(p.estoque, 1));
    const seletorQtd = etapa.maxQtd && escolhido
        ? `<label class="opcao-qtd">Quantidade
               <select data-qtd>${Array.from({ length: maxQtd }, (_, k) =>
                   `<option ${k + 1 === qtd ? 'selected' : ''}>${k + 1}</option>`).join('')}</select>
           </label>`
        : '';

    const busca = `${p.nome} ${p.descricao ?? ''} ${Object.values(p.tecnico ?? {}).flat().join(' ')} ${Object.values(p.especificacoes ?? {}).join(' ')}`;
    return `<label class="opcao ${escolhido ? 'escolhida' : ''} ${esgotado ? 'esgotada' : ''}" data-busca="${escapar(busca)}">
        <input type="radio" name="opcao" value="${p.id}" ${escolhido ? 'checked' : ''} ${esgotado ? 'disabled' : ''}>
        <span class="opcao-imagem ${p.imagem ? 'tem-foto' : ''}">${iconeDaCategoria(p.categoria)}${fotoHTML(p)}</span>
        <span class="opcao-corpo">
            <span class="opcao-nome">${escapar(p.nome)}</span>
            <span class="opcao-chips">${chipsTecnicos(p)}</span>
            <span class="opcao-rodape">
                <strong class="opcao-preco">${formatarPreco(p.preco)}</strong>
                ${esgotado ? '<span class="sem-estoque">Esgotado</span>' : `<span class="em-estoque">${p.estoque} em estoque</span>`}
                <a class="opcao-detalhes" href="/produto.html?id=${p.id}">Detalhes</a>
            </span>
            ${seletorQtd}
        </span>
        <span class="opcao-marca" aria-hidden="true"></span>
    </label>`;
}

// ---------- Etapa de escolha ----------
// Tira acentos e deixa minúsculo (a busca acha "memoria" em "Memória")
const normalizar = (t = '') => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
let termoBusca = '';

function desenharEscolha(etapa) {
    const daCategoria = produtos.filter((p) => p.categoria === etapa.categoria);
    const servem = daCategoria.filter((p) => combina(etapa, p));
    const ocultas = daCategoria.length - servem.length;
    // personalizados primeiro, depois os que têm foto; dentro de cada grupo, pelo preço
    const grupo = (p) => (p.destaque ? 0 : p.imagem ? 1 : 2);
    servem.sort((a, b) => (grupo(a) - grupo(b))
        || (ordem === 'menor' ? a.preco - b.preco : b.preco - a.preco));

    let dica = '';
    if (etapa.id === 'fonte' && sel.cpu) {
        dica = `<p class="etapa-dica">Consumo estimado da montagem: <b>${consumoEstimado()} W</b>. Fonte recomendada: <b>${potenciaRecomendada()} W ou mais</b>.</p>`;
    }
    if (etapa.id === 'gpu' && sel.cpu?.produto.tecnico?.video_integrado === true) {
        dica = '<p class="etapa-dica">Seu processador tem vídeo integrado: a placa de vídeo é para quem joga ou edita.</p>';
    }
    if (etapa.id === 'gpu' && sel.cpu?.produto.tecnico?.video_integrado === false) {
        dica = '<p class="etapa-dica aviso">Seu processador não tem vídeo integrado: sem placa de vídeo o PC não mostra imagem.</p>';
    }
    if (etapa.precisa && !sel[etapa.precisa]) {
        const anterior = ETAPAS.find((e) => e.id === etapa.precisa).titulo.toLowerCase();
        dica += `<p class="etapa-dica">Você não escolheu ${anterior}, então mostramos todas as opções (sem conferir a compatibilidade).</p>`;
    }
    const escolhido = sel[etapa.id];

    elEtapa.innerHTML = `
        <div class="etapa-cabeca">
            <span class="etapa-icone">${iconeDaCategoria(etapa.categoria)}</span>
            <div>
                <p class="etapa-passo">Passo ${atual + 1} de ${ETAPAS.length - 1} · opcional</p>
                <h2>${escapar(etapa.titulo)}</h2>
                <p class="etapa-texto">${escapar(etapa.texto)}</p>
            </div>
        </div>
        ${dica}
        ${aviso ? `<p class="etapa-dica aviso">${escapar(aviso)}</p>` : ''}
        <div class="etapa-filtros">
            <label class="busca-etapa">
                <span class="sr-only">Buscar nesta etapa</span>
                ${ICONES.busca}
                <input id="busca-etapa" type="search" placeholder="Buscar ${escapar(etapa.titulo.toLowerCase())}..." value="${escapar(termoBusca)}" autocomplete="off">
            </label>
            <label>Ordenar
                <select id="ordem">
                    <option value="menor" ${ordem === 'menor' ? 'selected' : ''}>Menor preço</option>
                    <option value="maior" ${ordem === 'maior' ? 'selected' : ''}>Maior preço</option>
                </select>
            </label>
        </div>
        <p class="etapa-contagem"><span id="contagem"></span>
            ${ocultas ? `<span class="etapa-ocultas">· ${ocultas} ${ocultas === 1 ? 'oculta' : 'ocultas'} porque ${escapar(etapa.motivo(sel))}</span>` : ''}</p>
        <fieldset class="opcoes" id="opcoes">
            <legend class="sr-only">Escolha ${escapar(etapa.titulo.toLowerCase())}</legend>
            ${servem.length ? servem.map((p) => opcaoHTML(etapa, p)).join('') : '<p>Nenhuma peça desta categoria combina com a sua montagem.</p>'}
            <p class="opcoes-vazio" hidden>Nada encontrado com essa busca.</p>
        </fieldset>
        <div class="etapa-acoes">
            ${atual > 0 ? '<button type="button" class="botao" data-acao="voltar">Voltar</button>' : '<span></span>'}
            <div class="etapa-acoes-dir">
                ${escolhido ? '<button type="button" class="botao" data-acao="remover">Remover escolha</button>' : ''}
                <button type="submit" class="botao primario">${escolhido ? 'Próximo' : 'Pular'}</button>
            </div>
        </div>`;
    aviso = '';

    elEtapa.querySelector('#ordem').addEventListener('change', (e) => {
        ordem = e.target.value;
        desenhar();
    });
    const campo = elEtapa.querySelector('#busca-etapa');
    campo.addEventListener('input', () => { termoBusca = campo.value; filtrarOpcoes(); });
    filtrarOpcoes();
}

// Esconde as opções que não batem com a busca (sem redesenhar: o campo não perde o foco)
function filtrarOpcoes() {
    const termos = normalizar(termoBusca).split(/\s+/).filter(Boolean);
    let visiveis = 0;
    for (const opcao of elEtapa.querySelectorAll('.opcao')) {
        const texto = normalizar(opcao.dataset.busca);
        const mostra = termos.every((t) => texto.includes(t));
        opcao.hidden = !mostra;
        if (mostra) visiveis++;
    }
    const total = elEtapa.querySelectorAll('.opcao').length;
    elEtapa.querySelector('#contagem').textContent = termos.length
        ? `${visiveis} de ${total} ${total === 1 ? 'opção' : 'opções'}`
        : `${total} ${total === 1 ? 'opção combina' : 'opções combinam'}`;
    const vazio = elEtapa.querySelector('.opcoes-vazio');
    if (vazio) vazio.hidden = visiveis > 0 || total === 0;
}

// Escolher uma opção
elEtapa.addEventListener('change', (e) => {
    const etapa = ETAPAS[atual];
    if (e.target.name === 'opcao') {
        const produto = produtos.find((p) => p.id === Number(e.target.value));
        sel[etapa.id] = { produto, qtd: 1 };
        revalidar(atual);
        salvar();
        desenhar();
    }
    if (e.target.matches('[data-qtd]')) {
        sel[etapa.id].qtd = Number(e.target.value);
        salvar();
        desenharResumo();
    }
});

elEtapa.addEventListener('click', (e) => {
    const acao = e.target.closest('[data-acao]')?.dataset.acao;
    if (acao === 'voltar') irPara(atual - 1);
    if (acao === 'remover') {
        delete sel[ETAPAS[atual].id];
        revalidar(atual);
        salvar();
        desenhar();
    }
    if (acao === 'carrinho') colocarNoCarrinho();
});

// "Próximo" (ou "Pular", se nada foi escolhido: a etapa fica marcada como "sem esta peça")
elEtapa.addEventListener('submit', (e) => {
    e.preventDefault();
    const etapa = ETAPAS[atual];
    if (etapa.id === 'revisao') return;
    if (!sel[etapa.id]) sel[etapa.id] = null;
    irPara(atual + 1);
});

// ---------- Revisão ----------
function verificacoes() {
    const s = sel;
    const lista = [];
    const ok = (texto) => lista.push({ ok: true, texto });
    const ruim = (texto) => lista.push({ ok: false, texto });
    const atencao = (texto) => lista.push({ ok: null, texto });
    const t = (id) => s[id]?.produto.tecnico ?? {};

    if (!ETAPAS.slice(0, -1).some((e) => s[e.id])) ruim('Nenhuma peça escolhida ainda.');
    if (s.cpu && s.mae) ok(`Processador e placa-mãe usam o mesmo soquete (${t('cpu').soquete}).`);
    if (s.mae && s.ram) ok(`Memória ${t('ram').memoria}, o tipo que a placa-mãe aceita.`);
    if (s.fonte && s.cpu) {
        (t('fonte').potencia_w >= potenciaRecomendada() ? ok : atencao)(
            `Fonte de ${t('fonte').potencia_w} W para um consumo estimado de ${consumoEstimado()} W (recomendado: ${potenciaRecomendada()} W).`);
    }
    if (s.gab && s.mae) ok(`O gabinete (até ${t('gab').formato}) comporta a placa-mãe ${t('mae').formato}.`);
    if (s.cpu && !s.gpu && t('cpu').video_integrado === false) atencao('O processador não tem vídeo integrado e não há placa de vídeo: o PC não vai mostrar imagem.');
    const pecasPC = ['cpu', 'mae', 'ram', 'arm', 'fonte', 'gab'].filter((id) => !s[id]);
    if (pecasPC.length && pecasPC.length < 6) {
        atencao(`Para o PC ligar ainda faltam: ${pecasPC.map((id) => ETAPAS.find((e) => e.id === id).titulo.toLowerCase()).join(', ')}.`);
    }
    if (s.cpu && !s.cooler) lista.push({ ok: null, texto: 'Sem cooler: confira se o processador vem com cooler na caixa (os modelos K, KF e X3D geralmente não vêm).' });
    return lista;
}

function desenharRevisao() {
    const itens = ETAPAS.slice(0, -1).filter((e) => sel[e.id]);
    const total = itens.reduce((soma, e) => soma + sel[e.id].produto.preco * sel[e.id].qtd, 0);
    const checagens = verificacoes();
    const pode = itens.length > 0;

    elEtapa.innerHTML = `
        <div class="etapa-cabeca">
            <span class="etapa-icone">${ICONES.carrinho}</span>
            <div>
                <p class="etapa-passo">Último passo</p>
                <h2>Revise a sua montagem</h2>
                <p class="etapa-texto">Confira as peças e a compatibilidade. Depois é só colocar tudo no carrinho.</p>
            </div>
        </div>
        <ul class="checagens">
            ${checagens.map((c) => `<li class="${c.ok === true ? 'ok' : c.ok === false ? 'erro' : 'atencao'}">${escapar(c.texto)}</li>`).join('')}
        </ul>
        <ul class="revisao-itens">
            ${itens.map((e) => {
                const { produto: p, qtd } = sel[e.id];
                return `<li>
                    <span class="revisao-etapa">${escapar(e.titulo)}</span>
                    <span class="revisao-nome">${qtd > 1 ? `<b>${qtd}×</b> ` : ''}${escapar(p.nome)}</span>
                    <span class="revisao-preco">${formatarPreco(p.preco * qtd)}</span>
                </li>`;
            }).join('')}
        </ul>
        <div class="nota-total"><span>Total</span><strong>${formatarPreco(total)}</strong></div>
        <p id="aviso-revisao" class="etapa-dica aviso" hidden></p>
        <div class="etapa-acoes">
            <button type="button" class="botao" data-acao="voltar">Voltar</button>
            <button type="button" class="botao primario" data-acao="carrinho" ${pode ? '' : 'disabled'}>
                ${ICONES.carrinho} Adicionar tudo ao carrinho
            </button>
        </div>`;
}

function colocarNoCarrinho() {
    const noCarrinho = new Map(lerCarrinho().map((i) => [i.produto_id, i.quantidade]));
    const limitados = [];

    for (const etapa of ETAPAS.slice(0, -1)) {
        const item = sel[etapa.id];
        if (!item) continue;
        const livre = item.produto.estoque - (noCarrinho.get(item.produto.id) ?? 0);
        const qtd = Math.min(item.qtd, livre);
        if (qtd < item.qtd) limitados.push(item.produto.nome);
        if (qtd > 0) adicionarAoCarrinho(item.produto.id, qtd);
    }

    if (limitados.length) {
        try { sessionStorage.setItem('aviso-montagem', `Algumas peças já estavam no carrinho e chegaram ao limite do estoque: ${limitados.join('; ')}.`); } catch { /* ok */ }
    }
    window.location.href = '/carrinho.html';
}

// ---------- Resumo (lateral) ----------
function desenharResumo() {
    let total = 0;
    const linhas = ETAPAS.slice(0, -1).map((etapa) => {
        const item = sel[etapa.id];
        let valor = '<span class="resumo-vazio">—</span>';
        let nome = '<span class="resumo-vazio">a escolher</span>';
        if (item) {
            total += item.produto.preco * item.qtd;
            nome = `${item.qtd > 1 ? `<b>${item.qtd}×</b> ` : ''}${escapar(item.produto.nome)}`;
            valor = formatarPreco(item.produto.preco * item.qtd);
        } else if (item === null) {
            nome = '<span class="resumo-vazio">sem esta peça</span>';
        }
        return `<li class="${ETAPAS.indexOf(etapa) === atual ? 'resumo-atual' : ''}">
            <span class="resumo-etapa">${escapar(etapa.titulo)}</span>
            <span class="resumo-nome">${nome}</span>
            <span class="resumo-valor">${valor}</span>
        </li>`;
    }).join('');

    elResumo.innerHTML = `
        <h2>Sua montagem</h2>
        <ul class="resumo-lista">${linhas}</ul>
        <div class="nota-linha"><span>Consumo estimado</span><span>${sel.cpu ? `${consumoEstimado()} W` : '—'}</span></div>
        <div class="nota-total"><span>Total</span><strong>${formatarPreco(total)}</strong></div>
        ${ETAPAS[atual].id !== 'revisao'
            ? `<button type="button" class="botao botao-largo" id="ir-revisao">Ir para a revisão</button>` : ''}`;

    elResumo.querySelector('#ir-revisao')?.addEventListener('click', () => irPara(ETAPAS.length - 1));
}

// ---------- Tudo ----------
// ---------- Visualizador 3D (opcional) ----------
const CHAVE_MODO = 'montagem-modo';
let modo = null;              // '3d' ou 'lista'
let bancada = null;
const elBancada = document.getElementById('bancada');
const elLayout = document.getElementById('montagem-layout');
const btnModo = document.getElementById('btn-modo');

function lerModo() {
    try { return localStorage.getItem(CHAVE_MODO); } catch { return null; }
}

async function definirModo(novo) {
    modo = novo;
    try { localStorage.setItem(CHAVE_MODO, novo); } catch { /* ok */ }
    document.getElementById('escolha-modo').hidden = true;
    elLayout.hidden = false;
    document.getElementById('passos').hidden = false;
    btnModo.hidden = false;
    btnModo.textContent = novo === '3d' ? 'Desligar o 3D' : 'Ligar o 3D';
    elLayout.classList.toggle('com-3d', novo === '3d');
    elBancada.hidden = novo !== '3d';

    if (novo === '3d' && !bancada) {
        // Carrega o 3D só quando precisa (o modo lista fica leve)
        const { criarBancada } = await import('../viewer/bancada3d.js');
        bancada = criarBancada(elBancada);
    }
    if (novo !== '3d' && bancada) {
        bancada.destruir();
        bancada = null;
    }
    desenhar();
}

// Manda para o 3D só as peças escolhidas (sem os passos pulados)
function atualizar3D() {
    if (!bancada) return;
    const escolhidas = {};
    for (const [id, item] of Object.entries(sel)) if (item) escolhidas[id] = item;
    bancada.sincronizar(escolhidas);
    bancada.finalizar(ETAPAS[atual].id === 'revisao');
}

btnModo.addEventListener('click', () => definirModo(modo === '3d' ? 'lista' : '3d'));
for (const botao of document.querySelectorAll('[data-modo]')) {
    botao.addEventListener('click', () => definirModo(botao.dataset.modo));
}

function desenhar() {
    atualizar3D();
    desenharPassos();
    const etapa = ETAPAS[atual];
    if (etapa.id === 'revisao') desenharRevisao();
    else desenharEscolha(etapa);
    desenharResumo();
}

// Sair: apaga a montagem e volta para a loja
document.getElementById('btn-sair').addEventListener('click', async () => {
    const temAlgo = Object.values(sel).some(Boolean);
    if (temAlgo && !(await confirmar({
        titulo: 'Sair do Monte seu PC?',
        mensagem: 'A montagem será apagada. O que você já colocou no carrinho continua lá.',
        textoConfirmar: 'Sair e apagar',
        perigo: true,
    }))) return;
    sel = {};
    try { localStorage.removeItem(CHAVE); localStorage.removeItem(CHAVE_MODO); } catch { /* ok */ }
    bancada?.destruir();
    window.location.href = '/';
});

document.getElementById('btn-recomecar').addEventListener('click', () => {
    sel = {};
    atual = 0;
    alcancada = 0;
    salvar();
    desenhar();
});

async function iniciar() {
    elMensagem.textContent = 'Carregando peças...';
    try {
        produtos = await api('/produtos');
        elMensagem.textContent = '';
        restaurar();
        const salvo = lerModo();
        if (salvo === '3d' || salvo === 'lista') {
            definirModo(salvo);
        } else {
            // Primeira vez: pergunta como a pessoa quer montar
            document.getElementById('escolha-modo').hidden = false;
            elLayout.hidden = true;
            document.getElementById('passos').hidden = true;
        }
    } catch (erro) {
        elMensagem.textContent = `Erro ao carregar: ${erro.message}`;
    }
}

iniciar();
