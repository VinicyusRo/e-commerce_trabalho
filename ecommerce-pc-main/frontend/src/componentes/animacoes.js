// Animações do site (revisão de novembro/2026).
// Cada uma tem um motivo: mostrar que algo deu certo, que algo está
// carregando ou onde a pessoa está. Quem ligou "reduzir movimento" no
// sistema vê o resultado final direto, sem o movimento.

const reduzirMovimento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * 1. A foto do produto "voa" até o carrinho do topo e o número dá um pulinho.
 * elOrigem: o elemento de onde a foto sai (a foto ou o visualizador).
 * Chame DEPOIS de montarCabecalho(), para o contador já estar atualizado.
 */
export function voarAteCarrinho(elOrigem, imagemUrl) {
    const destino = document.querySelector('#cabecalho a[href="/carrinho.html"]');
    if (!destino) return;
    const pular = () => pularContador();
    if (!elOrigem || reduzirMovimento()) { pular(); return; }

    const de = elOrigem.getBoundingClientRect();
    const para = destino.getBoundingClientRect();
    const voando = document.createElement('div');
    voando.className = 'peca-voando';
    voando.setAttribute('aria-hidden', 'true');
    if (imagemUrl) voando.style.backgroundImage = `url("${imagemUrl}")`;
    voando.style.left = `${de.left + de.width / 2 - 32}px`;
    voando.style.top = `${de.top + de.height / 2 - 32}px`;
    document.body.append(voando);

    const dx = para.left + 12 - (de.left + de.width / 2);
    const dy = para.top + para.height / 2 - (de.top + de.height / 2);
    // sobe um pouco no meio do caminho, como um arco
    const animacao = voando.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${dx * 0.5}px, ${dy - 80}px) scale(0.7)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.25)`, opacity: 0.4 },
    ], { duration: 600, easing: 'cubic-bezier(.45, 0, .2, 1)' });
    animacao.onfinish = () => { voando.remove(); pular(); };
}

function pularContador() {
    const contador = document.querySelector('#cabecalho .contador-carrinho');
    if (!contador || reduzirMovimento()) return;
    contador.classList.remove('pula');
    void contador.offsetWidth;          // reinicia a animação se clicar várias vezes
    contador.classList.add('pula');
}

/**
 * 2. Cartões entram em sequência, subindo um pouco.
 * Só anima os cartões a partir de "desde" (no "Carregar mais", só os novos).
 */
export function animarEntrada(container, desde = 0) {
    if (reduzirMovimento()) return;
    [...container.children].slice(desde).forEach((el, i) => {
        el.style.setProperty('--ordem', Math.min(i, 12));   // no máximo ~0,7 s de espera
        el.classList.add('entrando');
        el.addEventListener('animationend', () => el.classList.remove('entrando'), { once: true });
    });
}

/** 5. Cartões cinza no formato dos produtos, enquanto o servidor responde. */
export function esqueletoCartoes(quantidade = 8) {
    const um = `<div class="cartao esqueleto" aria-hidden="true">
        <div class="cartao-imagem"></div>
        <div class="cartao-corpo"><span class="linha-esq curta"></span><span class="linha-esq"></span><span class="linha-esq media"></span></div>
    </div>`;
    return um.repeat(quantidade);
}

/** 6. Aviso curto que sobe de baixo e some sozinho. Aceita HTML (ex.: um link). */
let elAviso;
let temporizador;
export function mostrarAviso(html, duracao = 3500) {
    if (!elAviso) {
        elAviso = document.createElement('div');
        elAviso.className = 'aviso-flutuante';
        elAviso.setAttribute('role', 'status');
        document.body.append(elAviso);
    }
    elAviso.innerHTML = `<span class="aviso-check" aria-hidden="true">✓</span> ${html}`;
    // espera um quadro para a transição acontecer
    requestAnimationFrame(() => elAviso.classList.add('mostrar'));
    clearTimeout(temporizador);
    temporizador = setTimeout(() => elAviso.classList.remove('mostrar'), duracao);
}

/**
 * Aparecer e sumir ao rolar: o elemento aparece quando entra na tela e some
 * quando sai. Assim, ao subir a página, o que fica para baixo some, e volta
 * a aparecer quando você desce de novo. Use a classe "entra" no HTML.
 */
let observadorRolagem;
export function observarAoRolar(elementos) {
    if (reduzirMovimento()) return;
    document.documentElement.classList.add('com-rolagem');
    observadorRolagem ??= new IntersectionObserver((entradas) => {
        for (const e of entradas) e.target.classList.toggle('visivel', e.isIntersecting);
    }, { threshold: 0.12 });
    for (const el of elementos) {
        el.classList.add('entra');
        observadorRolagem.observe(el);
    }
}
