/*
 * MODELAGEM PARAMÉTRICA
 * Lê o nome e os dados técnicos de um produto e devolve os parâmetros
 * que o gerador 3D usa (quantas ventoinhas, cor, tamanho...).
 * Assim cada produto ganha um modelo parecido com ele, sem arquivo 3D.
 *
 * São funções "puras" (só calculam), fáceis de testar.
 */

const limitar = (v, min, max) => Math.min(max, Math.max(min, v));

/**
 * Placa de vídeo. Exemplo de saída:
 * { ventoinhas: 2, comprimento: 228, altura: 112, slots: 2, cor: 'branco',
 *   perfilBaixo: false, energia: '8pin', backplate: true, led: false, destaque: 0x76b900 }
 */
export function parametrosPlacaDeVideo(produto = {}) {
    const nome = produto.nome ?? '';
    // Sem dados: consumo médio (placa intermediária de 2 ventoinhas)
    const consumo = produto.tecnico?.consumo_w ?? 180;

    // Ventoinhas: primeiro pelo nome do modelo, senão pelo consumo
    let ventoinhas;
    if (/\b(triple|trio|3x|x3)\b|infinity 3/i.test(nome)) ventoinhas = 3;
    else if (/\b(twin|dual|2x|x2)\b/i.test(nome)) ventoinhas = 2;
    else if (consumo <= 35) ventoinhas = 0;            // placas bem simples: só dissipador
    else if (consumo <= 80) ventoinhas = 1;
    else if (consumo <= 230) ventoinhas = 2;
    else ventoinhas = 3;

    const perfilBaixo = /low profile|\bLP\b/i.test(nome);

    // Comprimento (mm): cresce com o consumo, dentro do que cabe as ventoinhas
    const faixa = [[150, 175], [165, 195], [200, 250], [275, 345]][ventoinhas];
    const comprimento = Math.round(limitar(140 + consumo * 0.42, faixa[0], faixa[1]));

    const altura = perfilBaixo ? 69 : Math.round(limitar(100 + consumo * 0.06, 104, 140));

    // Espessura em slots (cada slot ~ 20 mm)
    let slots = 2;
    if (consumo <= 80 && ventoinhas <= 1) slots = 1;
    else if (consumo > 450) slots = 3.5;
    else if (consumo > 300) slots = 3;
    else if (consumo > 200) slots = 2.5;

    // Energia extra: até 75 W o slot PCIe dá conta
    let energia = 'nenhum';
    if (consumo > 225 && /geforce|rtx/i.test(nome)) energia = '16pin';   // conector 12V-2x6
    else if (consumo > 225) energia = '2x8pin';
    else if (consumo > 75) energia = '8pin';

    const cor = /white|branc|\bice\b/i.test(nome) ? 'branco' : 'preto';

    // Cor de destaque pela fabricante do chip (só um friso, não o desenho da marca)
    let destaque = 0x29c4ff;
    if (/geforce|rtx|gtx|\bgt ?\d/i.test(nome)) destaque = 0x76b900;
    else if (/radeon|\brx\b/i.test(nome)) destaque = 0xe8353b;
    else if (/\barc\b/i.test(nome)) destaque = 0x3d7bff;

    return {
        ventoinhas,
        comprimento,
        altura,
        slots,
        cor,
        perfilBaixo,
        energia,
        backplate: consumo >= 100,
        led: consumo >= 250 || /argb|rgb/i.test(nome),
        destaque,
    };
}

// Texto completo do produto (nome + descrição), para procurar características
const textoDe = (p) => `${p.nome ?? ''} ${p.descricao ?? ''}`;

// Cor da peça a partir do texto ("branco", "white", "ICE"...)
function corDe(texto) {
    if (/\b(branc[oa]s?|white|ice)\b/i.test(texto.replace(/80 plus white/i, ''))) return 'branco';
    if (/\bmarrom\b/i.test(texto)) return 'marrom';
    if (/\bcinza\b/i.test(texto)) return 'cinza';
    return 'preto';
}

// Tem RGB? ("sem iluminação RGB" não conta)
function temRGB(texto) {
    if (/sem (ilumina[çc][ãa]o|rgb|led)/i.test(texto)) return false;
    return /\b(a-?rgb|rgb)\b/i.test(texto);
}

/** Processador: soquete, marca e o nome para escrever na tampa. */
export function parametrosProcessador(p = {}) {
    const nome = p.nome ?? '';
    const soquete = p.tecnico?.soquete ?? (/intel/i.test(nome) ? 'LGA1700' : 'AM4');
    const modelo = nome.split(',')[0].replace(/^(AMD|Intel)\s+/i, '');
    // "Ryzen 7 9800X3D" → ["RYZEN 7", "9800X3D"]; "Core i5-14400F" → ["CORE I5", "14400F"]
    const m = modelo.match(/^(.*?)[\s-](\w+(?: plus)?)$/i);
    const linhas = m ? [m[1].toUpperCase(), m[2].toUpperCase()] : [modelo.toUpperCase(), ''];
    return { soquete, linhas };
}

/** Memória RAM: tipo, RGB, cor do dissipador e quantos pentes vêm no kit. */
export function parametrosMemoria(p = {}) {
    const texto = textoDe(p);
    const kit = texto.match(/\((\d)x(\d+)GB\)/i);
    const memoria = p.tecnico?.memoria ?? (/ddr5/i.test(texto) ? 'DDR5' : 'DDR4');
    const capacidade = texto.match(/(\d+)GB/i)?.[0] ?? '';
    return {
        memoria,
        rgb: temRGB(texto),
        cor: corDe(texto),
        pentes: kit ? Number(kit[1]) : 1,
        linhas: [`${memoria}  ·  ${capacidade.toUpperCase()}`, (texto.match(/\d{4}\s?(MHz|MT\/s)/i)?.[0] ?? 'DESKTOP').toUpperCase()],
    };
}

/** Armazenamento: NVMe (M.2), SSD SATA ou HD, com a capacidade. */
export function parametrosArmazenamento(p = {}) {
    const nome = p.nome ?? '';
    const tipo = /^HD\b/i.test(nome) ? 'HD' : /sata/i.test(nome) ? 'SATA SSD' : 'NVMe';
    return {
        tipo,
        capacidade: nome.match(/\b\d+(GB|TB)\b/i)?.[0].toUpperCase() ?? '',
        rpm: nome.match(/\d+\s?RPM/i)?.[0].replace(/\s/, ' ') ?? '',
    };
}

/** Placa-mãe: tamanho, soquete, memória, nível (pelo chipset), cor e Wi-Fi. */
export function parametrosPlacaMae(p = {}) {
    const texto = textoDe(p);
    const chipset = (p.nome ?? '').match(/\b([ABHXZ]\d{3}E?)/i)?.[1].toUpperCase() ?? 'B650';
    let nivel = 'medio';
    if (/^(X\d|Z\d)/.test(chipset) || /aorus (pro|xtreme|master)|ai top/i.test(texto)) nivel = 'alto';
    if (/^(A\d|H\d)/.test(chipset)) nivel = 'baixo';
    return {
        formato: p.tecnico?.formato ?? 'ATX',
        soquete: p.tecnico?.soquete ?? 'AM5',
        memoria: p.tecnico?.memoria ?? 'DDR5',
        chipset,
        nivel,
        cor: corDe(p.nome ?? ''),
        wifi: /wi-?fi/i.test(p.nome ?? ''),
    };
}

/** Gabinete: tamanho da torre, frente, quantas ventoinhas vêm e se têm RGB. */
export function parametrosGabinete(p = {}) {
    const texto = textoDe(p);
    let torre = 'mid';
    if (/mini[- ]?tower/i.test(texto)) torre = 'mini';
    else if (/micro[- ]?tower/i.test(texto)) torre = 'micro';
    else if (p.tecnico?.formato === 'E-ATX') torre = 'grande';
    let ventoinhas = 0;
    const n = texto.match(/(?<!até )\b(\d+)\s*fans?\b/i);
    if (n && !/sem (fans?|ventoinhas)/i.test(texto)) ventoinhas = Number(n[1]);
    return {
        torre,
        ventoinhas: Math.min(ventoinhas, 9),
        argb: temRGB(texto),
        cor: corDe(texto.replace(/dissipador preto/i, '')),
        frente: /aqu[áa]rio/i.test(texto) ? 'vidro' : 'mesh',
    };
}

/** Fonte: potência, selo 80 Plus, modular ou não, cor e tamanho da ventoinha. */
export function parametrosFonte(p = {}) {
    const texto = textoDe(p);
    return {
        potencia: p.tecnico?.potencia_w ?? Number(texto.match(/(\d{3,4})\s?W\b/)?.[1] ?? 650),
        certificacao: texto.match(/(?:80 plus|cybenetics)\s+(White|Bronze|Silver|Gold|Platinum|Titanium)/i)?.[1] ?? 'White',
        modular: /full[- ]?modular|semi[- ]?modular/i.test(texto) && !/n[ãa]o modular/i.test(texto),
        cor: corDe(p.nome ?? ''),
        ventoinha: Number(texto.match(/ventoinha (?:FDB )?de (\d{3}) ?mm/i)?.[1] ?? 120),
    };
}

/** Cooler: a ar (torre simples, dupla ou baixo) ou water cooler (240/360 mm). */
export function parametrosCooler(p = {}) {
    const texto = textoDe(p);
    const water = /water cooler|aio/i.test(texto);
    return {
        tipo: water ? 'Water' : 'Air',
        radiador: Number(texto.match(/(240|280|360|420)\s?mm/)?.[1] ?? 240),
        torres: /dual tower|2x120mm/i.test(texto) ? 2 : 1,
        ventoinhas: /push-pull|duas ventoinhas/i.test(texto) ? 2 : 1,
        lowProfile: /low profile/i.test(texto),
        tela: /\b(tela|lcd)\b/i.test(texto),
        argb: temRGB(texto),
        cor: corDe(texto),
    };
}

/** Ventoinha avulsa ou kit: tamanho, quantidade, ARGB e cor. */
export function parametrosVentoinha(p = {}) {
    const nome = p.nome ?? '';
    const kit = nome.match(/(\d)x(120|140)mm/i);
    return {
        quantidade: kit ? Number(kit[1]) : 1,
        tamanho: Number(kit?.[2] ?? nome.match(/(120|140)mm/)?.[1] ?? 120),
        argb: temRGB(textoDe(p)),
        cor: corDe(textoDe(p)),
    };
}

// Periféricos: as características vêm prontas da coluna JSONB "especificacoes"
const esp = (p) => p.especificacoes ?? {};

export function parametrosMonitor(p = {}) {
    const e = esp(p);
    return { polegadas: e.polegadas ?? 24, proporcao: e.proporcao ?? '16:9', curvo: Boolean(e.curvo), cor: e.cor ?? 'preto', painel: e.painel ?? 'IPS', hz: e.hz ?? 60, resolucao: e.resolucao ?? '' };
}

export function parametrosTeclado(p = {}) {
    const e = esp(p);
    return { formato: e.formato ?? 'full', mecanico: e.mecanico ?? true, rgb: e.rgb ?? false, sem_fio: e.sem_fio ?? false, cor: e.cor ?? 'preto' };
}

export function parametrosMouse(p = {}) {
    const e = esp(p);
    return { rgb: e.rgb ?? false, sem_fio: e.sem_fio ?? false, cor: e.cor ?? 'preto', furado: e.furado ?? false, ergonomico: /mx master/i.test(p.nome ?? '') };
}

export function parametrosHeadset(p = {}) {
    const e = esp(p);
    return { tipo: e.tipo ?? 'headset', rgb: e.rgb ?? false, sem_fio: e.sem_fio ?? false, cor: (e.cor ?? 'preto').replace(/\s*\(.*\)/, '') };
}

export function parametrosControle(p = {}) {
    const e = esp(p);
    return { estilo: e.estilo ?? 'xbox', sem_fio: e.sem_fio ?? true, cor: (e.cor ?? 'preto').replace(/\s*\(.*\)/, '') };
}

export function parametrosCadeira(p = {}) {
    const e = esp(p);
    return { tipo: e.tipo ?? 'gamer', cor_principal: e.cor_principal ?? 'preto', cor_detalhe: e.cor_detalhe ?? null, reclinavel: e.reclinavel ?? true, apoio_pes: e.apoio_pes ?? false };
}

// =====================================================
// Produtos com modelo fiel (modelado a partir das fotos do produto).
// [gerador, padrão no nome, chave do modelo, parâmetros fixos]
// Os parâmetros fixos são as medidas reais que a bancada 3D usa para
// encaixar a peça (comprimento da placa de vídeo, soquete, etc.).
// =====================================================
// Placa-mãe MSI B650 Gaming Plus WiFi: posições medidas na foto, em mm a
// partir do canto de cima à esquerda (soquete, slots de memória, PCIe, M.2)
export const MEDIDAS_B650_GAMING_PLUS = {
    soquete: [129, 89],
    ram: { xs: [184, 192, 200, 208], z: 85 },
    pcie: [85.5, 201.5],      // meio do slot x16 de cima (reforçado)
    m2: [118, 247],           // o segundo M.2 (o de cima fica sob a chapa)
};

const MODELOS_FIEIS = [
    ['gpu', /rx 7600 challenger/i, 'rx7600-challenger', { ventoinhas: 2, comprimento: 269, altura: 120, slots: 2, dedosPcie: 84, energia: '8pin' }],
    ['mae', /b650 gaming plus wi-?fi/i, 'b650-gaming-plus', { formato: 'ATX', soquete: 'AM5', memoria: 'DDR5', nivel: 'medio', wifi: true, medidas: MEDIDAS_B650_GAMING_PLUS }],
    ['cpu', /ryzen 5 5500\b/i, 'ryzen-5500', { soquete: 'AM4' }],
    ['ssd', /husky thunderboost/i, 'husky-thunderboost', { tipo: 'NVMe', capacidade: '512GB' }],
    ['cooler', /rise mode temp 8\b/i, 'temp8', { tipo: 'Air', torres: 2, ventoinhas: 1, argb: true }],
    ['ram', /rise mode z\b/i, 'rise-z', { memoria: 'DDR4', pentes: 1, rgb: false, cor: 'branco' }],
    ['gabinete', /wideload lite/i, 'wideload-lite', { torre: 'mid', ventoinhas: 0, frente: 'vidro' }],
    ['monitor', /32ur500/i, 'lg-32ur500', { polegadas: 31.5, proporcao: '16:9', curvo: false }],
    ['teclado', /k552rgb-1/i, 'kumara-k552', { formato: 'tkl', mecanico: true, rgb: true }],
    ['mouse', /cobra.*m711/i, 'cobra-m711', { rgb: true }],
    ['headset', /cloud stinger 2/i, 'cloud-stinger-2', { tipo: 'headset' }],
    ['controle', /ultimate 2c/i, '8bitdo-ultimate-2c', { estilo: 'xbox' }],
    ['cadeira', /stillus/i, 'stillus', { tipo: 'gamer', apoio_pes: true }],
];

/** Se o produto tem modelo fiel, devolve { especifico, ...medidas }; senão null. */
export function modeloFiel(gerador, produto) {
    const nome = produto?.nome ?? '';
    const achado = MODELOS_FIEIS.find(([g, padrao]) => g === gerador && padrao.test(nome));
    return achado ? { ...achado[3], especifico: achado[2] } : null;
}

const FUNCOES = {
    gpu: parametrosPlacaDeVideo,
    cpu: parametrosProcessador,
    ram: parametrosMemoria,
    ssd: parametrosArmazenamento,
    mae: parametrosPlacaMae,
    gabinete: parametrosGabinete,
    fonte: parametrosFonte,
    cooler: parametrosCooler,
    ventoinha: parametrosVentoinha,
    monitor: parametrosMonitor,
    teclado: parametrosTeclado,
    mouse: parametrosMouse,
    headset: parametrosHeadset,
    controle: parametrosControle,
    cadeira: parametrosCadeira,
};

/** Escolhe a função de parâmetros pelo gerador (nome em modelo_3d.arquivo). */
export function parametrosDoProduto(gerador, produto) {
    if (!produto || !FUNCOES[gerador]) return undefined;
    const base = FUNCOES[gerador](produto);
    const fiel = modeloFiel(gerador, produto);
    return fiel ? { ...base, ...fiel } : base;
}
