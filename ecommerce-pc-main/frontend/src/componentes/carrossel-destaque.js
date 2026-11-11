// Carrossel gigante da página inicial (index.html, #carrossel).
// Cada slide tem um vídeo gravado do próprio 3D do site. Passa sozinho a cada
// 8 segundos; as setas e o dedo (celular) trocam o slide. Os tracinhos
// embaixo só mostram quanto falta para o próximo. Fora da tela ele espera.

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

    // Deslizar com o dedo: vale um arrasto longo (50px) ou um "peteleco"
    // curto e rápido, que é como a maioria das pessoas passa foto no celular
    let inicioX = null;
    let inicioT = 0;
    elCarrossel.addEventListener('touchstart', (e) => {
        inicioX = e.touches[0].clientX;
        inicioT = e.timeStamp;
    }, { passive: true });
    elCarrossel.addEventListener('touchend', (e) => {
        if (inicioX === null) return;
        const dx = e.changedTouches[0].clientX - inicioX;
        const velocidade = Math.abs(dx) / Math.max(e.timeStamp - inicioT, 1);   // px por ms
        if (Math.abs(dx) > 50 || (Math.abs(dx) > 16 && velocidade > 0.4)) ir(atual + (dx < 0 ? 1 : -1));
        inicioX = null;
    });

    // Aba escondida ou carrossel fora da tela: para o vídeo e a contagem;
    // ao voltar, recomeça o slide atual
    let naTela = true;
    function parar() {
        clearTimeout(temporizador);
        slides[atual].querySelector('video').pause();
    }
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) parar();
        else if (naTela) ir(atual);
    });
    new IntersectionObserver(([e]) => {
        if (e.isIntersecting === naTela) return;
        naTela = e.isIntersecting;
        if (naTela) ir(atual);
        else parar();
    }, { threshold: 0.05 }).observe(elCarrossel);

    ir(0);
    return { atualizar: () => ir(atual) };
}

const ICONE_PAUSAR = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/></svg>';
const ICONE_TOCAR = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8.5 5.6v12.8a1 1 0 0 0 1.52.86l10.3-6.4a1 1 0 0 0 0-1.72l-10.3-6.4a1 1 0 0 0-1.52.86z"/></svg>';

/**
 * Vídeos soltos na página: tocam só enquanto aparecem na tela e ganham um
 * botão de pausar no canto. Quem pausou no botão decide: o vídeo não volta
 * a tocar sozinho. Com "reduzir movimento" ligado ele começa parado, e o
 * mesmo botão serve para tocar.
 */
export function tocarQuandoVisivel(video) {
    if (!video) return;
    const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let pausadoPelaPessoa = reduzir;
    let naTela = false;

    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'video-controle';
    const desenhar = () => {
        botao.innerHTML = video.paused ? ICONE_TOCAR : ICONE_PAUSAR;
        botao.setAttribute('aria-label', video.paused ? 'Tocar o vídeo' : 'Pausar o vídeo');
    };
    botao.addEventListener('click', () => {
        pausadoPelaPessoa = !video.paused;
        if (video.paused) video.play().catch(() => {});
        else video.pause();
    });
    video.addEventListener('play', desenhar);
    video.addEventListener('pause', desenhar);
    desenhar();
    video.parentElement.classList.add('video-caixa');
    video.after(botao);

    new IntersectionObserver(([e]) => {
        naTela = e.isIntersecting;
        if (naTela && !pausadoPelaPessoa) video.play().catch(() => {});
        else if (!naTela) video.pause();
    }, { threshold: 0.35 }).observe(video);
}
