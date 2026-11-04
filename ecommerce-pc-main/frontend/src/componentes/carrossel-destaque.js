// Carrossel gigante da página inicial (index.html, #carrossel).
// Cada slide tem um vídeo gravado do próprio 3D do site. Passa sozinho a cada
// 8 segundos; as setas e o dedo (celular) trocam o slide. Não tem pausa:
// os tracinhos embaixo só mostram quanto falta para o próximo.

const TEMPO = 8000;

export function montarCarrossel(elCarrossel, { estaVisivel = () => true } = {}) {
    if (!elCarrossel) return;
    const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const trilho = elCarrossel.querySelector('.carrossel-trilho');
    const slides = [...trilho.children];
    const marcas = elCarrossel.querySelector('.carrossel-marcas');
    let atual = 0;
    let temporizador = null;

    marcas.innerHTML = slides.map(() => '<span><i></i></span>').join('');
    marcas.style.setProperty('--tempo', `${TEMPO}ms`);

    function ir(i) {
        atual = (i + slides.length) % slides.length;
        trilho.style.transform = `translateX(${-100 * atual}%)`;
        slides.forEach((slide, k) => {
            const ativo = k === atual;
            const video = slide.querySelector('video');
            slide.classList.toggle('atual', ativo);
            slide.setAttribute('aria-hidden', String(!ativo));
            slide.querySelectorAll('a').forEach((a) => { a.tabIndex = ativo ? 0 : -1; });
            if (ativo && estaVisivel()) {
                video.currentTime = 0;
                if (!reduzir) video.play().catch(() => {});
            } else {
                video.pause();
            }
        });
        // as setas e os tracinhos mudam de cor conforme o fundo do slide
        elCarrossel.dataset.tom = slides[atual].classList.contains('claro') ? 'claro' : 'escuro';
        [...marcas.children].forEach((m, k) => {
            m.classList.remove('ligada');
            void m.offsetWidth;            // reinicia a barrinha
            if (k === atual) m.classList.add('ligada');
        });
        clearTimeout(temporizador);
        if (!reduzir) temporizador = setTimeout(() => ir(atual + 1), TEMPO);
    }

    elCarrossel.querySelector('.carrossel-seta.ant').addEventListener('click', () => ir(atual - 1));
    elCarrossel.querySelector('.carrossel-seta.prox').addEventListener('click', () => ir(atual + 1));

    // Deslizar com o dedo
    let inicioX = null;
    elCarrossel.addEventListener('touchstart', (e) => { inicioX = e.touches[0].clientX; }, { passive: true });
    elCarrossel.addEventListener('touchend', (e) => {
        if (inicioX === null) return;
        const dx = e.changedTouches[0].clientX - inicioX;
        if (Math.abs(dx) > 50) ir(atual + (dx < 0 ? 1 : -1));
        inicioX = null;
    });

    // Aba escondida: para de contar; ao voltar, recomeça o slide atual
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) clearTimeout(temporizador);
        else ir(atual);
    });

    ir(0);
    return { atualizar: () => ir(atual) };
}

/** Vídeos soltos na página: tocam só enquanto aparecem na tela. */
export function tocarQuandoVisivel(video) {
    if (!video || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    new IntersectionObserver((entradas) => {
        for (const e of entradas) {
            if (e.isIntersecting) video.play().catch(() => {});
            else video.pause();
        }
    }, { threshold: 0.35 }).observe(video);
}
