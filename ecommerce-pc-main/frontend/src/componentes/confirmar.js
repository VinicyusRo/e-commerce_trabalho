/**
 * Janela de confirmação personalizada (no lugar do confirm() do navegador).
 * Uso:
 *   if (await confirmar({ titulo: 'Remover?', mensagem: '...' })) { ... }
 * Devolve true se a pessoa confirmar e false se cancelar.
 */
export function confirmar({
    titulo = 'Tem certeza?',
    mensagem = '',
    textoConfirmar = 'Confirmar',
    textoCancelar = 'Cancelar',
    perigo = false,              // true = botão de confirmar em vermelho
} = {}) {
    return new Promise((resolve) => {
        // <dialog> com showModal(): o navegador já cuida do foco e da tecla Esc
        const janela = document.createElement('dialog');
        janela.className = 'janela-confirmacao';

        const h2 = document.createElement('h2');
        h2.textContent = titulo;

        const p = document.createElement('p');
        p.textContent = mensagem;          // textContent: o nome do produto vem do banco

        const acoes = document.createElement('div');
        acoes.className = 'janela-acoes';

        const btnCancelar = document.createElement('button');
        btnCancelar.type = 'button';
        btnCancelar.className = 'botao';
        btnCancelar.textContent = textoCancelar;

        const btnConfirmar = document.createElement('button');
        btnConfirmar.type = 'button';
        btnConfirmar.className = `botao ${perigo ? 'perigo' : 'primario'}`;
        btnConfirmar.textContent = textoConfirmar;

        acoes.append(btnCancelar, btnConfirmar);
        janela.append(h2, p, acoes);
        document.body.append(janela);

        function fechar(resposta) {
            janela.classList.add('saindo');
            setTimeout(() => {
                janela.close();
                janela.remove();
                resolve(resposta);
            }, 120);
        }

        btnCancelar.addEventListener('click', () => fechar(false));
        btnConfirmar.addEventListener('click', () => fechar(true));

        // Esc
        janela.addEventListener('cancel', (e) => {
            e.preventDefault();
            fechar(false);
        });

        // Clique fora da caixa (no fundo escuro)
        janela.addEventListener('click', (e) => {
            if (e.target === janela) fechar(false);
        });

        janela.showModal();
        btnCancelar.focus();   // foco no botão seguro
    });
}
