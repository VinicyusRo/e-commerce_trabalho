const CHAVE = 'carrinho';

// Lê o carrinho: lista de { produto_id, quantidade }
export function lerCarrinho() {
    try {
        const itens = JSON.parse(localStorage.getItem(CHAVE));
        return Array.isArray(itens) ? itens : [];
    } catch {
        return [];
    }
}

function salvar(itens) {
    localStorage.setItem(CHAVE, JSON.stringify(itens));
}

export function adicionarAoCarrinho(produtoId, quantidade = 1) {
    const itens = lerCarrinho();
    const existente = itens.find((i) => i.produto_id === produtoId);

    if (existente) existente.quantidade += quantidade;
    else itens.push({ produto_id: produtoId, quantidade });

    salvar(itens);
}

export function alterarQuantidade(produtoId, quantidade) {
    const itens = lerCarrinho()
        .map((i) => (i.produto_id === produtoId ? { ...i, quantidade } : i))
        .filter((i) => i.quantidade > 0);   // quantidade 0 remove o item
    salvar(itens);
}

export function removerDoCarrinho(produtoId) {
    salvar(lerCarrinho().filter((i) => i.produto_id !== produtoId));
}

export function limparCarrinho() {
    localStorage.removeItem(CHAVE);
}

export function totalDeItens() {
    return lerCarrinho().reduce((soma, i) => soma + i.quantidade, 0);
}