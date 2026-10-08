// Chama a API. Exemplo: api('/produtos/1') faz GET /api/produtos/1
// Se houver token salvo (login), envia no cabeçalho Authorization.
export async function api(caminho, opcoes = {}) {
    const token = localStorage.getItem('token');

    const resposta = await fetch(`/api${caminho}`, {
        ...opcoes,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...opcoes.headers,
        },
    });

    const dados = await resposta.json().catch(() => null);

    if (!resposta.ok) {
        // O backend sempre responde { erro: "mensagem" }
        throw new Error(dados?.erro ?? `Erro ${resposta.status}`);
    }

    return dados;
}