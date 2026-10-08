import { ICONES } from './icones.js';

/**
 * Coloca um botão de "olho" dentro de cada campo de senha da página,
 * para mostrar ou esconder o que foi digitado.
 */
export function ativarMostrarSenha(raiz = document) {
    for (const campo of raiz.querySelectorAll('input[type="password"]')) {
        // Envolve o input numa caixa para posicionar o botão por cima
        const caixa = document.createElement('div');
        caixa.className = 'campo-senha';
        campo.replaceWith(caixa);
        caixa.append(campo);

        const botao = document.createElement('button');
        botao.type = 'button';               // não envia o formulário
        botao.className = 'btn-olho';
        caixa.append(botao);

        function atualizar(visivel) {
            campo.type = visivel ? 'text' : 'password';
            botao.innerHTML = visivel ? ICONES.olhoFechado : ICONES.olho;
            botao.setAttribute('aria-label', visivel ? 'Esconder senha' : 'Mostrar senha');
            botao.title = visivel ? 'Esconder senha' : 'Mostrar senha';
        }

        botao.addEventListener('click', () => {
            atualizar(campo.type === 'password');
            campo.focus();
        });

        atualizar(false);
    }
}
