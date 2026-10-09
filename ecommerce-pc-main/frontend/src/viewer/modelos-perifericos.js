import * as THREE from 'three';
import { material, caixa, caixaArredondada, parte } from './util3d.js';

/*
 * Geradores dos periféricos: monitor, teclado, mouse, headset/fone,
 * controle e cadeira. Recebem as opções de parametros.js (que vêm
 * da coluna JSONB "especificacoes" do produto). Tudo em milímetros.
 */


// =====================================================
// Ajudantes
// =====================================================

// Cores por nome (vêm do banco em português)
const CORES = {
    preto: 0x1b1d22, branco: 0xeceef1, cinza: 0x8a9099, grafite: 0x3b3f46, vermelho: 0xc8282e,
    azul: 0x2a5bd7, 'navy blue': 0x1f2c4f, amarelo: 0xf2c230, roxo: 0x6a3fb5, rosa: 0xf08cb4,
    verde: 0x2f9e57, laranja: 0xf07a28, dourado: 0xc9a54a, magenta: 0xc2207a,
    'light gray fabric': 0xb9bcc1, 'cinza espacial': 0x55595f, 'midnight black': 0x16171c,
};

/** Converte "branco e vermelho" em [corPrincipal, corDetalhe] (números hex). */
function cores(texto, padrao = 'preto') {
    const partes = String(texto ?? padrao).toLowerCase().split(/\s+e\s+/);
    const achar = (t) => CORES[t?.trim()] ?? CORES[Object.keys(CORES).find((k) => t?.includes(k))] ?? CORES[padrao];
    return [achar(partes[0]), partes[1] ? achar(partes[1]) : null];
}

// Material que anda pelo arco-íris (RGB)
function luzRGB(intensidade = 1.3) {
    const mat = material(0x15161a, 0, 0.4, { emissive: 0xff0000, emissiveIntensity: intensidade });
    let t = Math.random() * 10;
    return { mat, atualizar(dt) { t += dt; mat.emissive.setHSL((t * 0.12) % 1, 1, 0.5); } };
}

// Faixa com degradê de arco-íris que "corre" (textura deslizando)
function texturaArcoIris() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 4;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 256, 0);
    ['#ff004c', '#ff9900', '#ffee00', '#22ff66', '#00c8ff', '#6a3cff', '#ff004c'].forEach((cor, i, a) => grad.addColorStop(i / (a.length - 1), cor));
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 4);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    return t;
}

// Cabo (tubo curvo) por uma lista de pontos
function cabo(pontos, raio, mat) {
    const curva = new THREE.CatmullRomCurve3(pontos.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    return new THREE.Mesh(new THREE.TubeGeometry(curva, 64, raio, 8), mat);
}

// Muitas caixas de tamanhos diferentes numa InstancedMesh (escala por instância)
function caixasEscaladas(lista, mat) {
    const malha = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, lista.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion();
    lista.forEach(([x, y, z, w, h, d], i) => {
        m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(w, h, d));
        malha.setMatrixAt(i, m);
    });
    malha.instanceMatrix.needsUpdate = true;
    return malha;
}


// =====================================================
// MONITOR
// Tela virada para +Z. Tamanho real pela diagonal e proporção.
// =====================================================

function criarMonitor(opcoes = {}) {
    const o = { polegadas: 27, proporcao: '16:9', curvo: false, cor: 'preto', painel: 'IPS', hz: 144, resolucao: '', ...opcoes };
    const monitor = new THREE.Group();
    const [rw, rh] = o.proporcao === '21:9' ? [21, 9] : [16, 9];
    const diag = o.polegadas * 25.4;
    const L = diag * rw / Math.hypot(rw, rh);           // largura da imagem
    const A = diag * rh / Math.hypot(rw, rh);           // altura da imagem
    const [corCorpo] = cores(o.cor);
    const matCorpo = material(corCorpo, 0.3, 0.45);
    const oled = /oled/i.test(o.painel);
    const yTela = A / 2 + 130;                           // altura do centro da tela

    const tela = parte(monitor, 'Tela', `Painel ${o.painel} de ${o.polegadas}" (${o.proporcao})${o.resolucao ? `, ${o.resolucao}` : ''}, até ${o.hz} Hz: quantas vezes por segundo a imagem é redesenhada.`, [0, 0, 40]);
    const carcaca = parte(monitor, 'Carcaça', oled ? 'Painéis OLED não precisam de luz de fundo, por isso o monitor é bem fino.' : 'Guarda a luz de fundo (LED) e a eletrônica. As entradas HDMI e DisplayPort ficam atrás.', [0, 0, -30]);
    const suporte = parte(monitor, 'Suporte e base', 'Segura a tela; muitos permitem ajustar a altura e a inclinação.', [0, -60, -20]);

    // Imagem da tela: um "papel de parede" desenhado num canvas
    const c = document.createElement('canvas');
    c.width = 1024; c.height = Math.round(1024 * rh / rw);
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, c.width, c.height);
    grad.addColorStop(0, '#0b1d3a'); grad.addColorStop(0.55, '#1d4f8f'); grad.addColorStop(1, '#6b3fa0');
    g.fillStyle = grad; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.font = '700 64px sans-serif'; g.textAlign = 'center';
    g.fillText(`${o.polegadas}"  ·  ${o.hz} Hz`, c.width / 2, c.height / 2);
    g.font = '500 32px sans-serif'; g.fillStyle = 'rgba(255,255,255,0.7)';
    g.fillText(`${o.painel}${o.resolucao ? '  ·  ' + o.resolucao : ''}`, c.width / 2, c.height / 2 + 50);
    const textura = new THREE.CanvasTexture(c);
    textura.colorSpace = THREE.SRGBColorSpace;
    const matImagem = new THREE.MeshStandardMaterial({ map: textura, emissive: 0xffffff, emissiveMap: textura, emissiveIntensity: 0.9, roughness: 0.25 });

    const esp = oled ? 6 : 10;
    if (o.curvo) {
        // Tela curva: pedaço de cilindro (raio de 1800 mm, o "1800R")
        const R = 1800, ang = L / R;
        const geo = new THREE.CylinderGeometry(R, R, A, 96, 1, true, Math.PI - ang / 2, ang);
        geo.translate(0, yTela, R);       // a curva abraça quem olha
        // Vista de dentro do cilindro: desenha o lado de dentro e espelha a imagem
        const matCurva = matImagem.clone();
        matCurva.side = THREE.BackSide;
        const tex = textura.clone();
        tex.wrapS = THREE.RepeatWrapping;
        tex.repeat.x = -1;
        tex.needsUpdate = true;
        matCurva.map = tex;
        matCurva.emissiveMap = tex;
        tela.add(new THREE.Mesh(geo, matCurva));
        const moldura = new THREE.CylinderGeometry(R + esp, R + esp, A + 14, 96, 1, true, Math.PI - (ang + 0.008) / 2, ang + 0.008);
        moldura.translate(0, yTela, R);
        carcaca.add(new THREE.Mesh(moldura, new THREE.MeshStandardMaterial({ color: corCorpo, metalness: 0.3, roughness: 0.45, side: THREE.DoubleSide })));
        carcaca.add(caixaArredondada(L * 0.4, A * 0.5, 40, 10, matCorpo, 0, yTela - A * 0.05, -esp - 30));
    } else {
        const imagem = new THREE.Mesh(new THREE.PlaneGeometry(L, A), matImagem);
        imagem.position.set(0, yTela, esp / 2 + 0.2);
        tela.add(imagem);
        carcaca.add(caixaArredondada(L + 12, A + 16, esp, 3, matCorpo, 0, yTela - 2, 0));
        // traseira mais grossa no meio (onde fica a eletrônica)
        carcaca.add(caixaArredondada(L * 0.55, A * 0.6, oled ? 18 : 30, 8, matCorpo, 0, yTela - A * 0.05, -esp / 2 - (oled ? 9 : 15)));
    }
    // "Queixo" com o LED de ligado
    carcaca.add(caixa(5, 1.5, 1, material(0x29c4ff, 0, 0.4, { emissive: 0x29c4ff, emissiveIntensity: 1 }), L / 2 - 20, yTela - A / 2 - 5, esp / 2 + 0.6));

    // Suporte: haste + base em V (gamer) ou retangular
    const zSuporte = o.curvo ? -70 : -esp / 2 - 45;
    suporte.add(caixaArredondada(60, 200, 18, 6, matCorpo, 0, 110, zSuporte));
    const base = new THREE.Shape();
    base.moveTo(-L * 0.18, 70); base.lineTo(L * 0.18, 70); base.lineTo(40, -60); base.lineTo(-40, -60); base.closePath();
    const geoBase = new THREE.ExtrudeGeometry(base, { depth: 8, bevelEnabled: true, bevelThickness: 2, bevelSize: 2, bevelSegments: 2 });
    geoBase.rotateX(Math.PI / 2);
    geoBase.translate(0, 10, zSuporte);
    suporte.add(new THREE.Mesh(geoBase, matCorpo));

    return monitor;
}


// =====================================================
// TECLADO
// Deitado (Y para cima), teclas em grade de unidades (1u = 19,05 mm)
// =====================================================

const U = 19.05;

// Linhas do bloco principal (larguras em "u"); a última tem a barra de espaço
const BLOCO_PRINCIPAL = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
    [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5],
    [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25],
    [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.75],
    [1.25, 1.25, 1.25, 6.25, 1.25, 1.25, 1.25, 1.25],
];

function criarTeclado(opcoes = {}) {
    const o = { formato: 'full', mecanico: true, rgb: true, sem_fio: false, cor: 'preto', ...opcoes };
    const teclado = new THREE.Group();
    const [corCorpo] = cores(o.cor === 'multicolor' ? 'cinza' : o.cor);
    const claro = o.cor === 'branco';
    const luzes = [];

    const teclasParte = parte(teclado, 'Teclas', o.formato === 'full' ? 'Teclado completo, com teclado numérico à direita.'
        : `Formato ${o.formato === 'tkl' ? 'TKL (sem o teclado numérico)' : o.formato + '%'}: menor, sobra mais espaço para o mouse.`, [0, 25, 0]);
    const mecanismo = parte(teclado, o.mecanico ? 'Switches mecânicos' : 'Membrana', o.mecanico
        ? 'Cada tecla tem um interruptor (switch) com mola próprio: dá mais precisão e dura mais.'
        : 'Uma folha de borracha com "bolhas" embaixo das teclas: mais barato e silencioso.', [0, 12, 0]);
    const carcaca = parte(teclado, 'Carcaça', o.sem_fio ? 'Caixa do teclado. Este é sem fio (bateria e receptor/Bluetooth).' : 'Caixa do teclado com o cabo USB.', [0, -15, 0]);

    // Monta a lista de teclas: [x, z, largura em u]
    const teclas = [];
    const temLinhaF = ['full', 'tkl', '75'].includes(o.formato);
    let z = 0;
    if (temLinhaF) {
        teclas.push([0, z, 1]);
        for (let i = 0; i < 12; i++) teclas.push([2 + i + Math.floor(i / 4) * 0.5, z, 1]);
        z += o.formato === '75' ? 1 : 1.5;
    }
    const z0 = z;
    BLOCO_PRINCIPAL.forEach((linha, i) => {
        let x = 0;
        for (const w of linha) { teclas.push([x, z0 + i, w]); x += w; }
    });
    let largura = 15;
    if (o.formato === '75' || o.formato === '65') {
        for (let i = 0; i < 4; i++) teclas.push([15, z0 + i, 1]);    // coluna extra
        teclas.push([14, z0 + 4 - 0.0, 1]);                          // seta pra cima (aprox.)
        largura = 16;
    }
    if (o.formato === 'tkl' || o.formato === 'full') {
        for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) teclas.push([15.25 + c, z0 + r, 1]);
        teclas.push([16.25, z0 + 3, 1]);
        for (let c = 0; c < 3; c++) teclas.push([15.25 + c, z0 + 4, 1]);
        if (temLinhaF) for (let c = 0; c < 3; c++) teclas.push([15.25 + c, 0, 1]);
        largura = 18.25;
    }
    if (o.formato === 'full') {
        for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) {
            if ((c === 3 && (r === 2 || r === 4)) || (r === 4 && c === 1)) continue;
            const alta = c === 3 && (r === 1 || r === 3);
            const larga = r === 4 && c === 0;
            teclas.push([18.5 + c, z0 + r + (alta ? 0.5 : 0), larga ? 2 : 1, alta ? 2 : 1]);
        }
        largura = 22.5;
    }
    const profundidade = z0 + 5;

    const altura = o.mecanico ? 9 : 6;
    const lista = teclas.map(([x, zz, w, h = 1]) => [
        (x + w / 2 - largura / 2) * U, 14 + altura / 2, (zz + h / 2 - profundidade / 2) * U, w * U - 2.6, altura, h * U - 2.6,
    ]);
    const matTecla = material(claro ? 0xf3f4f6 : o.cor === 'multicolor' ? 0x9db7c9 : 0x23252a, 0.05, 0.6);
    // Com RGB, a parte de baixo das teclas brilha (a luz "vaza" por baixo)
    const brilho = o.rgb ? luzRGB(0.9) : null;
    if (brilho) luzes.push(brilho);
    teclasParte.add(caixasEscaladas(lista, brilho?.mat ?? matTecla));
    // tampinha levemente menor por cima (dá o formato de "keycap")
    teclasParte.add(caixasEscaladas(lista.map(([x, y, zz, w, h, d]) => [x, y + (brilho ? 1.5 : h / 2 + 0.6), zz, w - (brilho ? 0.6 : 3), brilho ? h - 2 : 1.2, d - (brilho ? 0.6 : 3)]), matTecla));

    // Placa / switches sob as teclas
    const W = largura * U + 18, D = profundidade * U + 18;
    if (o.mecanico) {
        mecanismo.add(caixa(largura * U + 4, 1.5, profundidade * U + 4, material(0x6b7079, 0.9, 0.35), 0, 12.5, 0));
        mecanismo.add(caixasEscaladas(lista.map(([x, , zz]) => [x, 15, zz, 12, 4, 12]), material(0xc0392b, 0.1, 0.5)));
    } else {
        mecanismo.add(caixa(largura * U + 4, 1, profundidade * U + 4, material(0x2b2f36, 0.1, 0.8), 0, 12.5, 0));
    }

    // Carcaça: um pouco inclinada (mais alta atrás)
    const caixaTeclado = caixaArredondada(W, 14, D, 4, material(corCorpo, 0.35, 0.5), 0, 6, 0);
    carcaca.add(caixaTeclado);
    if (o.rgb) {
        // Faixa de luz em volta (degradê que corre)
        const tex = texturaArcoIris();
        const matFaixa = new THREE.MeshBasicMaterial({ map: tex });
        for (const [w, d, x, zz, rot] of [[W - 6, 2, 0, D / 2, 0], [W - 6, 2, 0, -D / 2, 0]]) {
            const faixa = caixa(w, 2.5, d, matFaixa, x, 1.5, zz);
            faixa.rotation.y = rot;
            carcaca.add(faixa);
        }
        luzes.push({ atualizar: (dt) => { tex.offset.x -= dt * 0.15; } });
    }
    teclado.rotation.x = 0.06;

    if (!o.sem_fio) {
        carcaca.add(cabo([[0, 6, -D / 2], [0, 6, -D / 2 - 40], [30, 4, -D / 2 - 90], [80, 3, -D / 2 - 120]], 2.2, material(0x15161a, 0.1, 0.8)));
    }

    teclado.userData.atualizar = (dt) => { for (const l of luzes) l.atualizar(dt); };
    return teclado;
}


// =====================================================
// MOUSE
// Deitado (Y para cima), frente em -Z
// =====================================================

function criarMouse(opcoes = {}) {
    const o = { rgb: false, sem_fio: false, cor: 'preto', furado: false, ergonomico: false, ...opcoes };
    const mouse = new THREE.Group();
    const [corA, corB] = cores(o.cor);
    const luzes = [];

    const carcaca = parte(mouse, 'Carcaça', o.furado ? 'Carcaça com furos (colmeia): deixa o mouse mais leve para movimentos rápidos.' : 'Formato que apoia a palma da mão.', [0, 20, 15]);
    const botoes = parte(mouse, 'Botões e roda', 'Os dois botões principais, a roda de rolagem e os botões laterais.', [0, 35, -10]);
    const sensor = parte(mouse, 'Sensor', 'Sensor óptico embaixo: tira milhares de "fotos" por segundo da mesa para saber o movimento (o DPI é a sensibilidade).', [0, -20, 0]);

    // Corpo: meia esfera esticada (elipsoide)
    const geo = new THREE.SphereGeometry(1, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    const matCorpo = material(corA, 0.15, 0.5, o.furado ? { alphaTest: 0.5, side: THREE.DoubleSide } : {});
    if (o.furado) {
        // Colmeia: furos desenhados numa textura alfa
        const c = document.createElement('canvas');
        c.width = c.height = 256;
        const g = c.getContext('2d');
        g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#000';
        for (let y = 8; y < 256; y += 16) for (let x = (y / 16) % 2 ? 8 : 0; x < 256; x += 16) {
            if (y < 60) continue;            // a parte dos botões não tem furos
            g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill();
        }
        matCorpo.alphaMap = new THREE.CanvasTexture(c);
    }
    const corpo = new THREE.Mesh(geo, matCorpo);
    corpo.scale.set(31, 38, 62);
    corpo.position.y = 4;
    carcaca.add(corpo);
    if (o.ergonomico) carcaca.add(caixaArredondada(20, 12, 70, 6, material(corB ?? corA, 0.1, 0.6), -36, 8, 10));
    // Faixa da segunda cor na traseira
    if (corB) carcaca.add(new THREE.Mesh(new THREE.SphereGeometry(1, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2).scale(31.5, 18, 63), material(corB, 0.1, 0.5)).translateY(4).translateZ(0));

    // Botões: duas "placas" curvas na frente + vão no meio + roda
    const matVao = material(0x0a0b0d, 0.1, 0.8);
    botoes.add(caixa(1.4, 6, 40, matVao, 0, 38, -32));
    const roda = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 7, 24), material(0x2a2d33, 0.3, 0.6));
    roda.rotation.z = Math.PI / 2;
    roda.position.set(0, 38, -30);
    botoes.add(roda);
    for (const z of [-18, 2]) botoes.add(caixaArredondada(4, 7, 16, 2, material(corB ?? 0x2a2d33, 0.2, 0.5), -30, 18, z));

    // Base e sensor
    sensor.add(new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 4, 48).scale(30, 1, 60), material(0x16171a, 0.2, 0.7)).translateY(2));
    sensor.add(new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 1, 24), material(0xff2a2a, 0, 0.4, { emissive: 0xff2a2a, emissiveIntensity: 1 })).translateY(-0.2).translateZ(-5));

    if (o.rgb) {
        const luz = luzRGB(1.4);
        luzes.push(luz);
        // logo na palma + faixa em volta da base
        const logo = new THREE.Mesh(new THREE.CircleGeometry(7, 32), luz.mat);
        logo.rotation.x = -Math.PI / 2 + 0.6;
        logo.position.set(0, 30, 28);
        carcaca.add(logo);
        const anel = new THREE.Mesh(new THREE.TorusGeometry(1, 0.04, 6, 64).scale(31, 61, 1), luz.mat);
        anel.rotation.x = Math.PI / 2;
        anel.position.y = 4.5;
        carcaca.add(anel);
    }
    roda.material = o.rgb ? luzes[0].mat : roda.material;

    if (!o.sem_fio) {
        carcaca.add(cabo([[0, 8, -62], [0, 6, -100], [-20, 4, -150], [-60, 3, -190]], 1.8, material(0x15161a, 0.1, 0.8)));
    }
    mouse.userData.atualizar = (dt) => { for (const l of luzes) l.atualizar(dt); };
    return mouse;
}


// =====================================================
// HEADSET / FONE
// =====================================================

function criarHeadset(opcoes = {}) {
    const o = { tipo: 'headset', rgb: false, sem_fio: false, cor: 'preto', ...opcoes };
    if (o.tipo === 'in-ear' || o.tipo === 'tws') return criarFoneIntra(o);

    const fone = new THREE.Group();
    const [corA, corB] = cores(o.cor);
    const matCorpo = material(corA, 0.35, 0.45);
    const matAlmofada = material(0x1a1b1f, 0, 0.95);
    const luzes = [];

    const arco = parte(fone, 'Arco', 'Passa por cima da cabeça e ajusta o tamanho. A espuma de baixo deixa confortável.', [0, 40, 0]);
    const conchas = parte(fone, 'Conchas e alto-falantes', 'Cada concha tem um alto-falante (driver). As almofadas isolam o som de fora.', [0, 0, 0]);

    // Arco: meio toro
    const geoArco = new THREE.TorusGeometry(88, 6, 16, 64, Math.PI);
    arco.add(new THREE.Mesh(geoArco, matCorpo).translateY(40));
    arco.add(new THREE.Mesh(new THREE.TorusGeometry(80, 7, 12, 48, Math.PI * 0.6), matAlmofada).translateY(40).rotateZ(Math.PI * 0.2));

    for (const lado of [-1, 1]) {
        const concha = new THREE.Group();
        concha.position.set(lado * 92, 0, 0);
        // garfo
        concha.add(caixa(6, 50, 8, matCorpo, 0, 30, 0));
        // concha + almofada
        const c = new THREE.Mesh(new THREE.CylinderGeometry(46, 44, 28, 48), material(corB ?? corA, 0.35, 0.45));
        c.rotation.z = Math.PI / 2;
        c.position.x = lado * 8;
        concha.add(c);
        const almofada = new THREE.Mesh(new THREE.TorusGeometry(36, 11, 16, 48), matAlmofada);
        almofada.rotation.y = Math.PI / 2;
        almofada.position.x = -lado * 8;
        concha.add(almofada);
        if (o.rgb) {
            const luz = luzRGB(1.5);
            luzes.push(luz);
            const anel = new THREE.Mesh(new THREE.TorusGeometry(30, 2.2, 8, 48), luz.mat);
            anel.rotation.y = Math.PI / 2;
            anel.position.x = lado * 22.5;
            concha.add(anel);
        }
        conchas.add(concha);
    }

    if (o.tipo === 'headset') {
        const mic = parte(fone, 'Microfone', 'Fica perto da boca para captar a voz e não o barulho em volta.', [-30, 0, 30]);
        mic.add(cabo([[-110, -5, 10], [-112, -25, 40], [-95, -45, 70], [-70, -55, 85]], 2.5, matCorpo));
        const ponta = new THREE.Mesh(new THREE.CapsuleGeometry(5, 10, 6, 12), matAlmofada);
        ponta.position.set(-68, -56, 86);
        ponta.rotation.set(0, 0.6, Math.PI / 2.4);
        mic.add(ponta);
    }
    if (!o.sem_fio) conchas.add(cabo([[-100, -40, 0], [-100, -80, 10], [-80, -140, 30], [-40, -180, 40]], 2, material(0x15161a, 0.1, 0.8)));

    fone.userData.atualizar = (dt) => { for (const l of luzes) l.atualizar(dt); };
    return fone;
}

function criarFoneIntra(o) {
    const fone = new THREE.Group();
    const [corA] = cores(o.cor);
    const mat = material(corA, 0.2, 0.4);
    const matPonta = material(0x2a2d33, 0, 0.9);

    const fones = parte(fone, 'Fones', 'A ponta de silicone entra no ouvido e veda o som; o alto-falante fica logo atrás.', [0, 20, 0]);

    // Um fone: corpo arredondado + haste + ponta de silicone
    const umFone = (x, lado) => {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.SphereGeometry(9, 24, 16).scale(1, 1.1, 1), mat));
        g.add(new THREE.Mesh(new THREE.CapsuleGeometry(3.4, o.tipo === 'tws' ? 18 : 10, 6, 12), mat).translateY(-14));
        g.add(new THREE.Mesh(new THREE.SphereGeometry(5.5, 16, 12).scale(1, 0.8, 1), matPonta).translateX(-lado * 8).rotateZ(Math.PI / 2));
        g.position.set(x, 30, 0);
        g.rotation.z = lado * 0.2;
        return g;
    };
    fones.add(umFone(-25, -1), umFone(25, 1));

    if (o.tipo === 'tws') {
        const estojo = parte(fone, 'Estojo carregador', 'Guarda e carrega os fones: eles se conectam por Bluetooth, sem nenhum fio.', [0, -20, 0]);
        estojo.add(new THREE.Mesh(new THREE.CapsuleGeometry(22, 30, 8, 24).rotateZ(Math.PI / 2).scale(1, 0.8, 0.6), mat).translateY(-20));
        estojo.add(caixa(66, 0.8, 24, material(0x0e0f12, 0.2, 0.7), 0, -12, 0));
        estojo.add(caixa(4, 1.5, 0.5, material(0x3ddc97, 0, 0.4, { emissive: 0x3ddc97, emissiveIntensity: 1 }), 0, -24, 13.4));
    } else {
        const fio = parte(fone, 'Cabo e plugue', 'Cabo em "Y" que junta os dois lados num plugue P2 (3,5 mm).', [0, -20, 0]);
        const matFio = material(corA, 0.1, 0.8);
        fio.add(cabo([[-25, 10, 0], [-18, -30, 5], [0, -70, 0]], 1.2, matFio));
        fio.add(cabo([[25, 10, 0], [18, -30, 5], [0, -70, 0]], 1.2, matFio));
        fio.add(cabo([[0, -70, 0], [5, -120, 10], [20, -160, 5]], 1.5, matFio));
        fio.add(new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 16, 16), mat).translateX(22).translateY(-168));
        fio.add(new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 14, 12), material(0xc9ced5, 1, 0.3)).translateX(22).translateY(-183));
    }
    return fone;
}


// =====================================================
// CONTROLE (gamepad)
// Deitado, botões para cima (+Y), frente (gatilhos) em -Z
// =====================================================

function criarControle(opcoes = {}) {
    const o = { estilo: 'xbox', cor: 'preto', sem_fio: true, ...opcoes };
    const controle = new THREE.Group();
    const [corA] = cores(o.cor);
    const claro = /branco|rosa|amarelo/.test(o.cor);
    const matCorpo = material(corA, 0.15, 0.45);
    const matDetalhe = material(claro ? 0x2a2d33 : 0x111216, 0.2, 0.6);

    const corpo = parte(controle, 'Corpo', 'Formato com duas alças para segurar com as duas mãos por muito tempo.', [0, -25, 0]);
    const analogicos = parte(controle, 'Analógicos', 'Os dois "joysticks": medem quanto e para onde você inclina (movimento suave, não só liga/desliga).', [0, 30, 0]);
    const botoes = parte(controle, 'Botões e direcional', 'Direcional (cruz) e os quatro botões de ação.', [0, 20, 0]);
    const gatilhos = parte(controle, 'Gatilhos', 'Ficam na frente para os dedos indicadores. Os gatilhos de baixo são analógicos (aceleração em jogos de corrida).', [0, 10, -25]);

    // Contorno visto de cima (Shape) extrudado com chanfro: centro + duas alças
    const s = new THREE.Shape();
    s.moveTo(-50, -38);
    s.bezierCurveTo(-20, -45, 20, -45, 50, -38);
    s.bezierCurveTo(70, -34, 78, -20, 76, 0);
    s.bezierCurveTo(74, 30, 70, 52, 60, 58);
    s.bezierCurveTo(48, 64, 38, 50, 30, 30);
    s.bezierCurveTo(15, 24, -15, 24, -30, 30);
    s.bezierCurveTo(-38, 50, -48, 64, -60, 58);
    s.bezierCurveTo(-70, 52, -74, 30, -76, 0);
    s.bezierCurveTo(-78, -20, -70, -34, -50, -38);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 22, bevelEnabled: true, bevelThickness: 8, bevelSize: 7, bevelSegments: 6, curveSegments: 32 });
    geo.rotateX(Math.PI / 2);
    geo.translate(0, 26, 0);
    corpo.add(new THREE.Mesh(geo, matCorpo));

    // Posições dependem do estilo
    const xbox = o.estilo === 'xbox';
    const pos = xbox
        ? { stickE: [-42, -12], dpad: [-22, 12], stickD: [22, 12], botoes: [42, -12] }
        : { stickE: [-22, 14], dpad: [-44, -10], stickD: [22, 14], botoes: [44, -10] };

    const stick = ([x, z]) => {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(4, 5, 8, 16), matDetalhe).translateY(4));
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(11, 10, 4, 32), matDetalhe).translateY(10));
        g.position.set(x, 34, z);
        return g;
    };
    analogicos.add(stick(pos.stickE), stick(pos.stickD));

    // Direcional em cruz
    const [dx, dz] = pos.dpad;
    botoes.add(caixa(24, 4, 8, matDetalhe, dx, 36, dz), caixa(8, 4, 24, matDetalhe, dx, 36, dz));
    // Quatro botões: coloridos no estilo Xbox, cinza no PlayStation
    const [bx, bz] = pos.botoes;
    const coresBotoes = xbox ? [0x3ddc5a, 0xe8353b, 0x2f6bff, 0xf2c230] : [0x9aa3ae, 0x9aa3ae, 0x9aa3ae, 0x9aa3ae];
    [[0, 9], [9, 0], [-9, 0], [0, -9]].forEach(([ox, oz], i) => {
        botoes.add(new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 4, 20), material(coresBotoes[i], 0.2, 0.4)).translateX(bx + ox).translateY(36).translateZ(bz + oz));
    });
    // Botões do meio (+ touchpad e barra de luz no estilo PlayStation)
    if (!xbox) {
        botoes.add(caixaArredondada(40, 3, 22, 3, matDetalhe, 0, 35.5, -14));
        botoes.add(caixa(36, 2, 2, material(0x2a6cff, 0, 0.4, { emissive: 0x2a6cff, emissiveIntensity: 1.2 }), 0, 33, -40));
    } else {
        botoes.add(new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 3, 24), material(0xdfe3e8, 0.6, 0.3, { emissive: 0xffffff, emissiveIntensity: 0.3 })).translateY(35).translateZ(-12));
    }
    // Bumpers e gatilhos na frente
    for (const lado of [-1, 1]) {
        gatilhos.add(caixaArredondada(34, 7, 9, 3, matDetalhe, lado * 50, 30, -42));
        gatilhos.add(caixaArredondada(22, 18, 12, 4, matDetalhe, lado * 50, 18, -38));
    }
    if (!o.sem_fio) corpo.add(cabo([[0, 26, -46], [0, 26, -90], [30, 22, -140], [80, 18, -170]], 2, material(0x15161a, 0.1, 0.8)));
    return controle;
}


// =====================================================
// CADEIRA
// =====================================================

function criarCadeira(opcoes = {}) {
    const o = { tipo: 'gamer', cor_principal: 'preto', cor_detalhe: null, reclinavel: true, apoio_pes: false, ...opcoes };
    const cadeira = new THREE.Group();
    const [corA] = cores(o.cor_principal);
    const corB = o.cor_detalhe ? cores(o.cor_detalhe)[0] : corA;
    const matA = material(corA, 0.05, 0.75);
    const matB = material(corB, 0.05, 0.75);
    const matMetal = material(0x2a2d33, 0.8, 0.35);
    const gamer = o.tipo === 'gamer';

    const encosto = parte(cadeira, 'Encosto', gamer
        ? `Encosto alto com abas laterais (estilo banco de carro de corrida)${o.reclinavel ? ' e que reclina para trás' : ''}.`
        : 'Encosto de tela (mesh): o ar passa e as costas não esquentam.', [0, 40, -60]);
    const assento = parte(cadeira, 'Assento e braços', 'Assento com espuma. Os braços ajustam a altura para apoiar os cotovelos.', [0, 20, 0]);
    const base = parte(cadeira, 'Pistão e base', 'O pistão a gás sobe e desce a cadeira; a base de 5 pontas com rodinhas não deixa tombar.', [0, -60, 0]);

    // Base em estrela com rodinhas
    for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const g = new THREE.Group();
        g.add(caixaArredondada(320, 20, 34, 6, matMetal, 160, 70, 0));
        const roda = new THREE.Mesh(new THREE.TorusGeometry(22, 12, 10, 24), material(0x111216, 0.1, 0.8));
        roda.position.set(310, 34, 0);
        g.add(roda);
        g.rotation.y = a;
        base.add(g);
    }
    base.add(new THREE.Mesh(new THREE.CylinderGeometry(28, 32, 60, 24), matMetal).translateY(100));
    base.add(new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 160, 16), material(0x9aa1a9, 1, 0.3)).translateY(190));

    // Assento (com abas laterais na gamer)
    const yAssento = 300;
    assento.add(caixaArredondada(520, 90, 500, 30, matA, 0, yAssento, 20));
    if (gamer) for (const l of [-1, 1]) assento.add(caixaArredondada(70, 110, 480, 30, matB, l * 250, yAssento + 20, 20));
    // Braços
    for (const l of [-1, 1]) {
        assento.add(caixa(30, 200, 40, matMetal, l * 300, yAssento + 90, 20));
        assento.add(caixaArredondada(90, 30, 260, 12, material(0x16171a, 0.1, 0.8), l * 300, yAssento + 200, 40));
    }

    // Encosto: formato de corrida (Shape) na gamer; quadro com tela no escritório
    const yBase = yAssento + 40;
    const grupo = new THREE.Group();
    grupo.position.set(0, yBase, -220);
    grupo.rotation.x = o.reclinavel ? -0.18 : -0.08;
    encosto.add(grupo);
    if (gamer) {
        const s = new THREE.Shape();
        s.moveTo(-250, 0); s.lineTo(250, 0);
        s.bezierCurveTo(280, 250, 240, 480, 200, 560);
        s.lineTo(150, 620); s.bezierCurveTo(140, 850, 60, 880, 0, 880);
        s.bezierCurveTo(-60, 880, -140, 850, -150, 620);
        s.lineTo(-200, 560); s.bezierCurveTo(-240, 480, -280, 250, -250, 0);
        const geo = new THREE.ExtrudeGeometry(s, { depth: 90, bevelEnabled: true, bevelThickness: 20, bevelSize: 20, bevelSegments: 4, curveSegments: 24 });
        geo.translate(0, 0, -45);
        grupo.add(new THREE.Mesh(geo, matB));
        // Faixa central na cor principal (com o "x" dos detalhes nas laterais)
        const s2 = new THREE.Shape();
        s2.moveTo(-150, 30); s2.lineTo(150, 30); s2.bezierCurveTo(170, 300, 150, 520, 110, 600);
        s2.bezierCurveTo(100, 820, 40, 840, 0, 840); s2.bezierCurveTo(-40, 840, -100, 820, -110, 600);
        s2.bezierCurveTo(-150, 520, -170, 300, -150, 30);
        const geo2 = new THREE.ExtrudeGeometry(s2, { depth: 10, bevelEnabled: true, bevelThickness: 8, bevelSize: 8, bevelSegments: 3, curveSegments: 24 });
        geo2.translate(0, 0, 60);
        grupo.add(new THREE.Mesh(geo2, matA));
        // Furos dos cintos e almofadas
        for (const l of [-1, 1]) grupo.add(caixaArredondada(30, 70, 30, 12, material(0x0b0c0e, 0.1, 0.9), l * 150, 680, 70));
        grupo.add(caixaArredondada(240, 90, 60, 30, material(0x16171a, 0.05, 0.85), 0, 740, 100));      // almofada de pescoço
        grupo.add(caixaArredondada(300, 110, 70, 35, material(0x16171a, 0.05, 0.85), 0, 140, 100));     // almofada lombar
    } else {
        // Quadro + tela semitransparente
        const quadro = new THREE.Shape();
        quadro.moveTo(-230, 0); quadro.lineTo(230, 0); quadro.bezierCurveTo(260, 300, 230, 600, 0, 640); quadro.bezierCurveTo(-230, 600, -260, 300, -230, 0);
        const furo = new THREE.Path();
        furo.moveTo(-200, 30); furo.lineTo(200, 30); furo.bezierCurveTo(225, 300, 200, 570, 0, 605); furo.bezierCurveTo(-200, 570, -225, 300, -200, 30);
        quadro.holes.push(furo);
        const geoQ = new THREE.ExtrudeGeometry(quadro, { depth: 20, bevelEnabled: true, bevelThickness: 4, bevelSize: 4, bevelSegments: 2, curveSegments: 24 });
        grupo.add(new THREE.Mesh(geoQ, material(0x16171a, 0.3, 0.6)));
        const tela = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(furo.getPoints())), new THREE.MeshStandardMaterial({ color: corA, transparent: true, opacity: 0.75, side: THREE.DoubleSide, roughness: 0.9 }));
        tela.position.z = 10;
        grupo.add(tela);
        grupo.add(caixaArredondada(240, 70, 50, 20, material(0x16171a, 0.1, 0.8), 0, 160, 30));     // apoio lombar
        grupo.add(caixaArredondada(260, 120, 60, 25, matA, 0, 760, 0));   // apoio de cabeça
    }

    if (o.apoio_pes) {
        const pes = parte(cadeira, 'Apoio para os pés', 'Sai de baixo do assento para descansar as pernas.', [0, 0, 80]);
        pes.add(caixaArredondada(380, 40, 200, 15, matA, 0, yAssento - 80, 420));
        for (const l of [-1, 1]) pes.add(caixa(20, 20, 200, matMetal, l * 150, yAssento - 80, 300));
    }
    return cadeira;
}


export const GERADORES_PERIFERICOS = {
    monitor: criarMonitor,
    teclado: criarTeclado,
    mouse: criarMouse,
    headset: criarHeadset,
    controle: criarControle,
    cadeira: criarCadeira,
};
