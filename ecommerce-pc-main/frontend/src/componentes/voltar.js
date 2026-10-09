// Botão "Voltar" das páginas internas (produto, carrinho, conta, checkout).
//
// No HTML:  <a class="botao-voltar" href="/" data-voltar>Voltar</a>
// - Se a pessoa veio de outra página da loja, volta para ela (como o botão do navegador).
// - Se abriu o link direto (ou veio do login/checkout), vai para o endereço do href.

// Páginas para as quais não faz sentido "voltar"
// (a tela cheia 3D é uma "sub-página" do produto: voltar para ela criava um vaivém)
const NAO_VOLTAR_PARA = ['/login.html', '/checkout.html', '/visualizador.html'];

const ICONE_SETA = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>`;

function podeVoltarNoHistorico() {
    if (!document.referrer || window.history.length <= 1) return false;
    try {
        const origem = new URL(document.referrer);
        return origem.origin === window.location.origin &&
               origem.pathname !== window.location.pathname &&
               !NAO_VOLTAR_PARA.includes(origem.pathname);
    } catch {
        return false;
    }
}

export function ativarBotaoVoltar() {
    for (const botao of document.querySelectorAll('[data-voltar]')) {
        botao.insertAdjacentHTML('afterbegin', ICONE_SETA);

        botao.addEventListener('click', (e) => {
            if (podeVoltarNoHistorico()) {
                e.preventDefault();
                window.history.back();
            }
            // senão, segue o href normalmente
        });
    }
}
