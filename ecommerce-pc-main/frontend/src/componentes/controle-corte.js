// Controles do plano de corte do visualizador 3D (página do produto e tela cheia).
//
// No HTML:  <button id="btn-corte">Corte</button>   e   <div id="painel-corte" hidden></div>
// O botão liga e desliga o corte; o painel tem o eixo do plano, a posição
// (controle deslizante), o botão que troca o lado que fica visível e o que
// separa as duas metades (a peça "serrada ao meio").

const EIXOS = [
    { eixo: 'x', nome: 'X', dica: 'Plano de corte em pé, cortando da esquerda para a direita' },
    { eixo: 'y', nome: 'Y', dica: 'Plano de corte deitado, cortando de cima para baixo' },
    { eixo: 'z', nome: 'Z', dica: 'Plano de corte em pé, cortando da frente para trás' },
];

/**
 * @param {object} opcoes
 * @param {HTMLButtonElement} opcoes.botao   - liga/desliga o corte
 * @param {HTMLElement}       opcoes.painel  - onde os controles são desenhados
 * @param {object}            opcoes.visualizador - o retorno de criarVisualizador()
 * @param {function}          [opcoes.aoMudar]    - chamada com true/false ao ligar/desligar
 */
export function montarControleCorte({ botao, painel, visualizador, aoMudar = null }) {
    painel.classList.add('painel-corte');
    painel.innerHTML = `
        <span class="painel-corte-titulo">Plano de corte</span>
        <div class="painel-corte-eixos" role="group" aria-label="Eixo do corte">
            ${EIXOS.map((e) => `<button type="button" data-eixo="${e.eixo}" title="${e.dica}">${e.nome}</button>`).join('')}
        </div>
        <label class="painel-corte-posicao">
            <span>Posição</span>
            <input type="range" min="0" max="100" value="50" aria-label="Posição do plano de corte">
        </label>
        <button type="button" class="painel-corte-inverter" title="Mostra o outro lado do corte">Inverter lado</button>
        <button type="button" class="painel-corte-separar" aria-pressed="false" title="Mostra as duas metades afastadas, como a peça cortada ao meio">Separar metades</button>
    `;

    const deslizante = painel.querySelector('input[type="range"]');
    let ligado = false;

    function marcarEixo(eixo) {
        for (const b of painel.querySelectorAll('[data-eixo]')) {
            b.setAttribute('aria-pressed', String(b.dataset.eixo === eixo));
        }
    }
    marcarEixo('x');

    botao.addEventListener('click', () => {
        ligado = !ligado;
        visualizador.definirCorte({ ligado });
        botao.classList.toggle('ligado', ligado);
        botao.setAttribute('aria-pressed', String(ligado));
        painel.hidden = !ligado;
        // Girando sozinho fica difícil observar o corte
        if (ligado) visualizador.controles.autoRotate = false;
        aoMudar?.(ligado);
    });

    painel.addEventListener('click', (e) => {
        const eixo = e.target.closest('[data-eixo]')?.dataset.eixo;
        if (eixo) {
            visualizador.definirCorte({ eixo });
            marcarEixo(eixo);
        }
    });

    // "input" dispara enquanto a pessoa arrasta, então o corte anda junto
    deslizante.addEventListener('input', () => {
        visualizador.definirCorte({ posicao: deslizante.value / 100 });
    });

    let invertido = false;
    painel.querySelector('.painel-corte-inverter').addEventListener('click', (e) => {
        invertido = !invertido;
        visualizador.definirCorte({ inverter: invertido });
        e.currentTarget.classList.toggle('ligado', invertido);
    });

    let separado = false;
    painel.querySelector('.painel-corte-separar').addEventListener('click', (e) => {
        separado = !separado;
        visualizador.definirCorte({ separar: separado });
        e.currentTarget.setAttribute('aria-pressed', String(separado));
    });
}
