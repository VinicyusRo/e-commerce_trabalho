// Chama a API. Exemplo: api('/produtos/1') faz GET /api/produtos/1
// Se houver token salvo (login), envia no cabeçalho Authorization.
//
// Endereço do backend:
//  - no seu computador fica vazio e o Vite repassa /api para localhost:3000
//  - online (Vercel), vem da variável VITE_API_URL, ex.: https://meu-backend.onrender.com
//
// MODO OFFLINE (catálogo salvo)
// O backend grátis do Render "dorme" depois de 15 minutos sem uso e leva
// até 1 minuto para acordar. Para o site não ficar travado nesse tempo,
// as consultas do catálogo (produtos e categorias) têm um tempo limite:
// se o servidor não responder, o site usa uma cópia salva do catálogo
// (public/dados-offline/*.json) e mostra um aviso no topo. Enquanto isso,
// o servidor continua acordando e o aviso avisa quando ele voltar.
// Login, endereços e pedidos precisam do servidor de verdade.
const BASE_API = (import.meta.env?.VITE_API_URL ?? '').replace(/\/$/, '');

const TEMPO_LIMITE_CATALOGO = 6000;          // ms esperando o servidor antes de usar a cópia
const CHAVE_OFFLINE = 'modoOfflineDesde';    // sessionStorage: quando o servidor falhou
const PAUSA_OFFLINE = 45000;                 // ms usando direto a cópia antes de tentar de novo

export async function api(caminho, opcoes = {}) {
    const metodo = (opcoes.method ?? 'GET').toUpperCase();

    // Só o catálogo (leitura) tem cópia salva
    if (metodo === 'GET' && ehCatalogo(caminho)) {
        return chamarCatalogo(caminho, opcoes);
    }

    try {
        return await chamarServidor(caminho, opcoes);
    } catch (erro) {
        if (erro.name === 'TypeError') {
            // TypeError no fetch = não conseguiu nem falar com o servidor
            throw new Error('O servidor está ligando (pode levar até 1 minuto). Tente de novo daqui a pouco.');
        }
        throw erro;
    }
}

// Faz a requisição de verdade ao backend
async function chamarServidor(caminho, opcoes = {}, tempoLimite = null) {
    const token = localStorage.getItem('token');

    const resposta = await fetch(`${BASE_API}/api${caminho}`, {
        ...opcoes,
        // AbortSignal.timeout cancela a requisição se passar do tempo
        ...(tempoLimite ? { signal: AbortSignal.timeout(tempoLimite) } : {}),
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...opcoes.headers,
        },
    });

    const dados = await resposta.json().catch(() => null);

    if (!resposta.ok) {
        // O backend sempre responde { erro: "mensagem" }
        const erro = new Error(dados?.erro ?? `Erro ${resposta.status}`);
        erro.status = resposta.status;
        throw erro;
    }

    return dados;
}

// =====================================================
// Catálogo com cópia salva
// =====================================================
function ehCatalogo(caminho) {
    return caminho.startsWith('/produtos') || caminho.startsWith('/categorias');
}

async function chamarCatalogo(caminho, opcoes) {
    // Se o servidor acabou de falhar, nem tenta: usa a cópia na hora
    if (!emPausaOffline()) {
        try {
            return await chamarServidor(caminho, opcoes, TEMPO_LIMITE_CATALOGO);
        } catch (erro) {
            // Resposta normal do servidor (ex.: 404 produto não encontrado):
            // o servidor está no ar, então o erro é de verdade
            if (erro.status && erro.status < 500) throw erro;
            // Senão (sem conexão, tempo esgotado, 502/503 do Render acordando): usa a cópia
            entrarModoOffline();
        }
    } else {
        mostrarAviso();
    }
    return lerCopia(caminho);
}

function emPausaOffline() {
    try {
        const desde = Number(sessionStorage.getItem(CHAVE_OFFLINE));
        return desde > 0 && Date.now() - desde < PAUSA_OFFLINE;
    } catch {
        return false;
    }
}

function entrarModoOffline() {
    try { sessionStorage.setItem(CHAVE_OFFLINE, String(Date.now())); } catch { /* navegador sem armazenamento */ }
    mostrarAviso();
}

// Guarda os arquivos já lidos, para não baixar de novo na mesma página
const copias = {};

function baixarCopia(nome) {
    copias[nome] ??= fetch(`/dados-offline/${nome}.json`).then((r) => {
        if (!r.ok) throw new Error('Não foi possível carregar o catálogo salvo');
        return r.json();
    });
    return copias[nome];
}

// Responde igual ao backend, mas a partir da cópia salva
async function lerCopia(caminho) {
    const url = new URL(caminho, 'http://x');   // só para separar caminho e ?parâmetros
    const partes = url.pathname.split('/').filter(Boolean);   // ex.: ['produtos', '12']

    if (partes[0] === 'categorias') return baixarCopia('categorias');

    const produtos = await baixarCopia('produtos');

    // /produtos/:id
    if (partes[1] !== undefined) {
        const produto = produtos.find((p) => String(p.id) === partes[1]);
        if (!produto) throw new Error('Produto não encontrado');
        return produto;
    }

    // /produtos?categoria=1&busca=rtx (mesmos filtros do backend; a ordem já vem certa)
    const categoria = url.searchParams.get('categoria');
    const busca = (url.searchParams.get('busca') ?? '').trim().toLowerCase();

    return produtos.filter((p) =>
        (categoria === null || String(p.categoria_id) === categoria) &&
        (busca === '' ||
            p.nome.toLowerCase().includes(busca) ||
            (p.descricao ?? '').toLowerCase().includes(busca))
    );
}

// =====================================================
// Aviso no topo da página
// =====================================================
let aviso = null;
let esperandoServidor = false;

function mostrarAviso() {
    if (!aviso) {
        aviso = document.createElement('div');
        aviso.className = 'aviso-offline';
        aviso.setAttribute('role', 'status');
        aviso.textContent =
            'O servidor está acordando (leva até 1 minuto). Enquanto isso, você vê o catálogo salvo; login e pedidos voltam quando ele ligar.';
        document.body.prepend(aviso);
    }
    esperarServidor();
}

// Fica chamando a rota de teste até o servidor responder
async function esperarServidor() {
    if (esperandoServidor) return;
    esperandoServidor = true;

    while (true) {
        try {
            await chamarServidor('/saude', {}, 20000);
            break;
        } catch {
            await new Promise((r) => setTimeout(r, 5000));
        }
    }

    try { sessionStorage.removeItem(CHAVE_OFFLINE); } catch { /* sem armazenamento */ }
    aviso.classList.add('online');
    aviso.textContent = 'O servidor ligou! ';
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.textContent = 'Recarregar a página';
    botao.addEventListener('click', () => location.reload());
    aviso.append(botao);
}
