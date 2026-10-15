// =====================================================
// Departamentos da loja: juntam várias categorias.
// Periféricos tem a lista fixa; Hardware é todo o resto,
// assim uma categoria nova criada no painel cai em Hardware.
// =====================================================

const PERIFERICOS = ['Monitores', 'Teclados', 'Mouses', 'Headsets e fones', 'Controles', 'Cadeiras'];

export const GRUPOS = {
    hardware:    { nome: 'Hardware',             contem: (p) => !PERIFERICOS.includes(p.categoria) },
    perifericos: { nome: 'Periféricos',          contem: (p) => PERIFERICOS.includes(p.categoria) },
    '3d':        { nome: 'Peças com 3D próprio', contem: (p) => p.destaque === true },
};

/** Departamento de uma categoria (pelo nome): 'perifericos' ou 'hardware'. */
export function grupoDaCategoria(nomeCategoria) {
    return PERIFERICOS.includes(nomeCategoria) ? 'perifericos' : 'hardware';
}

// O banco não tem coluna de marca: ela sai do começo do nome do produto.
// Palavras que vêm antes da marca ("SSD Kingston...", "Memória Corsair...")
const ANTES_DA_MARCA = new Set(['SSD', 'HD', 'Memória']);
const MARCAS_COMPOSTAS = ['Cooler Master', 'Rise Mode', 'Team Group', 'Lian Li', 'Force One', 'Direct Tech'];
const APELIDOS = { DualSense: 'Sony', DT3: 'Direct Tech', AsRock: 'ASRock', PCYES: 'PCYes', NVMe: 'Kingston' };

/** "SSD Kingston NV3, 1TB" → "Kingston" */
export function marcaDoProduto(nome = '') {
    const composta = MARCAS_COMPOSTAS.find((m) => nome.startsWith(m));
    if (composta) return composta;
    const palavras = nome.replace(/,/g, '').split(/\s+/);
    const marca = ANTES_DA_MARCA.has(palavras[0]) ? palavras[1] : palavras[0];
    if (!marca) return 'Outras';
    return APELIDOS[marca] ?? marca;
}
