import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
    material, caixa, caixaArredondada, instancias, parte,
    texturaCanvas, mapearCaixa, poligono, retanguloArredondado, extrudar, desenharColmeia, texturaArcoIris,
} from './util3d.js';

/*
 * MODELOS FIÉIS (periféricos)
 * Monitor, teclado, mouse, headset, cadeira e controle reproduzidos a
 * partir das fotos de cada produto. Logos e marcas ficam de fora.
 * Mesmas convenções dos genéricos de modelos-perifericos.js (mm, Y para cima).
 */


// Cabo (tubo curvo) passando pelos pontos
function cabo(pontos, raio, mat, segmentos = 64) {
    const curva = new THREE.CatmullRomCurve3(pontos.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    return new THREE.Mesh(new THREE.TubeGeometry(curva, segmentos, raio, 8), mat);
}

// Interpolação linear numa tabela [[t, valor], ...] (t crescente)
function tabela(pontos, t) {
    if (t <= pontos[0][0]) return pontos[0][1];
    for (let i = 1; i < pontos.length; i++) {
        const [t1, v1] = pontos[i];
        if (t <= t1) {
            const [t0, v0] = pontos[i - 1];
            const k = (t - t0) / (t1 - t0);
            const suave = k * k * (3 - 2 * k);        // suaviza a passagem entre os pontos
            return v0 + (v1 - v0) * suave;
        }
    }
    return pontos[pontos.length - 1][1];
}


// =====================================================
// MONITOR: LG UltraFine 32" 4K (32UR500K)
// Tela plana 16:9 virada para +Z, base em arco, coluna inclinada.
// A tela fica escura e neutra (sem imagem), só com reflexo.
// =====================================================

function criarLG32UR500() {
    const monitor = new THREE.Group();
    const L = 697.3, A = 392.2;                  // área da imagem de 31,5"
    const bl = 7, bt = 7, bb = 16;               // bordas: lados, topo e "queixo"
    const LW = L + bl * 2, AH = A + bt + bb;
    const yInf = 52;                             // a borda de baixo fica ~5 cm acima da base
    const yc = yInf + AH / 2;
    const yImg = yc + (bb - bt) / 2;

    const matCorpo = material(0x3d3f43, 0.25, 0.55);
    const matPreto = material(0x0d0e10, 0.2, 0.6);
    const tela = parte(monitor, 'Tela 4K', 'Painel VA de 31,5" com resolução 3840 × 2160 (4K UHD), 60 Hz e HDR10. As bordas são finas nos lados e em cima.', [0, 0, 45]);
    const carcaca = parte(monitor, 'Carcaça', 'Traseira grafite lisa, mais grossa embaixo, onde ficam a fonte e as entradas (2 HDMI e 1 DisplayPort).', [0, 0, -35]);
    const suporte = parte(monitor, 'Coluna e base em arco', 'Coluna preta inclinada e base fina em arco, que abre para a frente.', [0, -70, -40]);

    // Perfil lateral da carcaça: (profundidade para trás, altura relativa ao centro)
    const perfil = [[0, AH / 2], [9, AH / 2], [13, AH / 2 - 30], [22, AH * 0.2], [36, -AH * 0.1], [41, -AH * 0.28], [36, -AH * 0.42], [17, -AH / 2], [0, -AH / 2]];
    const prof = (yRel) => {
        // profundidade da traseira na altura yRel (interpolando o perfil)
        const costas = perfil.slice(1, -1);
        for (let i = 1; i < costas.length; i++) {
            const [d0, y0] = costas[i - 1], [d1, y1] = costas[i];
            if (yRel <= y0 && yRel >= y1) return d0 + (d1 - d0) * ((yRel - y0) / (y1 - y0));
        }
        return 10;
    };
    const geoCasca = new THREE.ExtrudeGeometry(poligono(perfil), { depth: LW - 4, bevelEnabled: true, bevelThickness: 2, bevelSize: 1.5, bevelSegments: 3 });
    // forma: x → para trás (-Z), y → altura; extrusão → largura (X)
    geoCasca.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0)));
    geoCasca.translate(-(LW - 4) / 2, yc, 0);
    carcaca.add(new THREE.Mesh(geoCasca, matCorpo));

    // Frente: moldura preta + tela escura que reflete o ambiente
    tela.add(caixaArredondada(LW, AH, 2, 1, matPreto, 0, yc, 1));
    const vidro = new THREE.Mesh(new THREE.PlaneGeometry(L, A), new THREE.MeshPhysicalMaterial({
        color: 0x05070a, roughness: 0.25, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.25, emissive: 0x070a0f,
    }));
    vidro.position.set(0, yImg, 2.05);
    tela.add(vidro);
    tela.add(caixaArredondada(12, 3, 6, 1.2, matPreto, 0, yInf - 1, -6));       // botão (joystick) embaixo do queixo

    // Traseira: placa quadrada do suporte e o nicho das entradas
    const yPlaca = -25;
    const dPlaca = prof(yPlaca);
    carcaca.add(caixaArredondada(110, 118, 4, 3, material(0x37393d, 0.3, 0.5), 0, yc + yPlaca, -dPlaca - 1.5));
    const dPortas = prof(yPlaca - 10);
    carcaca.add(caixa(46, 112, 3, matPreto, 88, yc + yPlaca - 10, -dPortas - 0.6));
    for (const [y, larg] of [[30, 14], [8, 14], [-14, 16], [-36, 7]]) carcaca.add(caixa(larg, 5, 1, material(0x5d6168, 0.6, 0.4), 82, yc + yPlaca - 10 + y, -dPortas - 2.4));

    // Coluna: da base (atrás) até a junta, inclinada para a frente
    const zTopo = -(dPlaca + 46), yTopo = yc + yPlaca - 8;
    const zPe = zTopo - 46, yPe = 8;
    const comp = Math.hypot(yTopo - yPe, zTopo - zPe);
    const coluna = caixaArredondada(54, comp, 34, 5, matPreto, 0, (yTopo + yPe) / 2, (zTopo + zPe) / 2);
    coluna.rotation.x = Math.atan2(zTopo - zPe, yTopo - yPe);
    suporte.add(coluna);
    // junta entre a coluna e a placa da traseira
    suporte.add(caixaArredondada(58, 46, 53, 5, matPreto, 0, yTopo + 6, (zTopo - 10 - dPlaca - 3) / 2));

    // Base em arco (meia-lua aberta para a frente)
    const R = 250, alfa = 1.2, faixa = 15;
    const zc = zPe + R;
    const a0 = -Math.PI / 2 - alfa, a1 = -Math.PI / 2 + alfa;
    const f = new THREE.Shape();
    f.absarc(0, zc, R + faixa, a0, a1, false);
    f.absarc(R * Math.cos(a1), zc + R * Math.sin(a1), faixa, a1, a1 + Math.PI, false);
    f.absarc(0, zc, R - faixa, a1, a0, true);
    f.absarc(R * Math.cos(a0), zc + R * Math.sin(a0), faixa, a0 + Math.PI, a0 + Math.PI * 2, false);
    const geoBase = new THREE.ExtrudeGeometry(f, { depth: 6, bevelEnabled: true, bevelThickness: 1.5, bevelSize: 2, bevelSegments: 2, curveSegments: 48 });
    geoBase.rotateX(Math.PI / 2);
    geoBase.translate(0, 7.5, 0);
    suporte.add(new THREE.Mesh(geoBase, matPreto));
    suporte.add(caixaArredondada(70, 10, 60, 4, matPreto, 0, 7, zPe));           // pé da coluna

    return monitor;
}


// =====================================================
// TECLADO: Redragon Kumara K552RGB-1 (TKL, ABNT2, switch marrom)
// Teclas "flutuando" sobre a base baixa, legendas com RGB em onda.
// =====================================================

const U = 19.05;

// [x em u, linha (z em u), largura em u, legenda]
function teclasABNT2() {
    const t = [];
    const linha = (z, x0, lista) => { let x = x0; for (const item of lista) { const [w, rot] = Array.isArray(item) ? item : [1, item]; if (rot !== null) t.push([x, z, w, rot]); x += w; } };
    // linha de função
    t.push([0, 0, 1, 'Esc']);
    ['F1', 'F2', 'F3', 'F4'].forEach((r, i) => t.push([2 + i, 0, 1, r]));
    ['F5', 'F6', 'F7', 'F8'].forEach((r, i) => t.push([6.5 + i, 0, 1, r]));
    ['F9', 'F10', 'F11', 'F12'].forEach((r, i) => t.push([11 + i, 0, 1, r]));
    ['PrtSc', 'ScrLk', 'Pause'].forEach((r, i) => t.push([15.25 + i, 0, 1, r]));
    // bloco principal (ABNT2)
    linha(1.25, 0, ['\' "', '1 !', '2 @', '3 #', '4 $', '5 %', '6 ¨', '7 &', '8 *', '9 (', '0 )', '- _', '= +', [2, '←']]);
    linha(2.25, 0, [[1.5, 'Tab'], 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '´ `', '[ {']);
    linha(3.25, 0, [[1.75, 'CapsLk'], 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ç', '~ ^', '] }']);
    linha(4.25, 0, [[1.25, 'Shift'], '\\ |', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ', <', '. >', '; :', '/ ?', [1.75, 'Shift']]);
    linha(5.25, 0, [[1.25, 'Ctrl'], [1.25, 'Win'], [1.25, 'Alt'], [6.25, ''], [1.25, 'Alt'], [1.25, 'Fn'], [1.25, '≡'], [1.25, 'Ctrl']]);
    // navegação e setas
    [['Ins', 'Home', 'PgUp'], ['Del', 'End', 'PgDn']].forEach((r, i) => r.forEach((rot, j) => t.push([15.25 + j, 1.25 + i, 1, rot])));
    t.push([16.25, 4.25, 1, '↑']);
    ['←', '↓', '→'].forEach((r, j) => t.push([15.25 + j, 5.25, 1, r]));
    return t;
}

function criarKumaraK552() {
    const teclado = new THREE.Group();
    const largura = 18.25, profundidade = 6.25;
    const W = largura * U + 10, D = profundidade * U + 10;
    const X0 = -largura * U / 2, Z0 = -profundidade * U / 2;          // canto da área das teclas
    const yPlaca = 20, yTecla = 25, hTecla = 8.5;

    const teclasParte = parte(teclado, 'Teclas ABNT2 (87 + Ç)', 'Layout ABNT2 em formato TKL (sem o teclado numérico): Enter alto, tecla Ç e Shift esquerdo curto. As legendas acendem.', [0, 30, 0]);
    const switches = parte(teclado, 'Switches marrons', 'Cada tecla tem um switch mecânico Outemu Brown: tátil (dá um "tranquinho" no meio) e sem o clique alto.', [0, 15, 0]);
    const carcaca = parte(teclado, 'Base', 'Base preta baixa com as teclas "flutuando" por cima, cabo saindo atrás e dois pés retráteis embaixo.', [0, -18, 0]);

    // ---------- Legendas (redesenhadas para a onda de cores andar) ----------
    const teclas = teclasABNT2();
    const K = 4;
    const lw = Math.round(largura * U * K), lh = Math.round(profundidade * U * K);
    const canvasCor = document.createElement('canvas'); canvasCor.width = lw; canvasCor.height = lh;
    const canvasLuz = document.createElement('canvas'); canvasLuz.width = lw; canvasLuz.height = lh;
    const canvasBrilho = document.createElement('canvas'); canvasBrilho.width = lw / 4; canvasBrilho.height = lh / 4;
    function desenharLegendas(fase) {
        const gc = canvasCor.getContext('2d'), gl = canvasLuz.getContext('2d'), gb = canvasBrilho.getContext('2d');
        gc.fillStyle = '#17181b'; gc.fillRect(0, 0, lw, lh);
        gl.fillStyle = '#000000'; gl.fillRect(0, 0, lw, lh);
        gb.fillStyle = '#000000'; gb.fillRect(0, 0, lw / 4, lh / 4);
        for (const [x, z, w, rot] of teclas) {
            const cx = (x + w / 2) * U * K, cz = (z + 0.5) * U * K;
            // onda: verde à esquerda → azul → roxo/vermelho à direita, andando com o tempo
            const cor = `hsl(${(150 + (x / largura) * 210 + fase * 60) % 360}, 100%, 60%)`;
            for (const [g, c] of [[gc, cor], [gl, cor]]) {
                g.fillStyle = c;
                g.textAlign = 'center'; g.textBaseline = 'middle';
                const duas = rot.includes(' ') && rot.length <= 3;
                if (duas) {
                    const [a, b] = rot.split(' ');
                    g.font = '700 26px Arial'; g.fillText(a, cx - 12, cz + 10); g.fillText(b, cx + 12, cz - 12);
                } else {
                    g.font = `700 ${rot.length > 3 ? 20 : rot.length > 1 ? 24 : 32}px Arial`;
                    g.fillText(rot === '' ? '—' : rot, cx, cz - (rot === '' ? 18 : 2));
                }
            }
            // brilho por baixo da tecla (LED do switch)
            const r = gb.createRadialGradient(cx / 4, cz / 4, 0, cx / 4, cz / 4, (w * U * K) / 6);
            r.addColorStop(0, cor); r.addColorStop(1, 'rgba(0,0,0,0)');
            gb.fillStyle = r;
            gb.fillRect(cx / 4 - (w * U * K) / 6, cz / 4 - 30, (w * U * K) / 3, 60);
        }
    }
    desenharLegendas(0);
    const texCor = new THREE.CanvasTexture(canvasCor), texLuz = new THREE.CanvasTexture(canvasLuz), texBrilho = new THREE.CanvasTexture(canvasBrilho);
    for (const t of [texCor, texLuz, texBrilho]) { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; }

    // ---------- Teclas: todas numa geometria só, com o topo mapeado na textura ----------
    const geos = [];
    const enter = (() => {
        // Enter ABNT2 em "L" invertido: 1,5 u em cima, 1,25 u embaixo
        const g0 = 1.2;
        const f = poligono([[0, 0], [1.5 * U - g0 * 2, 0], [1.5 * U - g0 * 2, 2 * U - g0 * 2], [0.25 * U, 2 * U - g0 * 2], [0.25 * U, U - g0], [0, U - g0]]);
        const geo = new THREE.ExtrudeGeometry(f, { depth: hTecla, bevelEnabled: false });
        geo.rotateX(Math.PI / 2);                // forma no plano XZ, altura para baixo
        geo.translate(0, hTecla, 0);
        return geo;
    })();
    for (const [x, z, w, rot] of teclas) {
        const geo = new THREE.BoxGeometry(w * U - 2.4, hTecla, U - 2.4).translate(0, hTecla / 2, 0);
        // afina o topo (formato de "keycap")
        const p = geo.attributes.position;
        for (let i = 0; i < p.count; i++) if (p.getY(i) > hTecla - 0.01) { p.setX(i, p.getX(i) - Math.sign(p.getX(i)) * 1.5); p.setZ(i, p.getZ(i) - Math.sign(p.getZ(i)) * 1.5); }
        geo.translate((x + w / 2) * U + X0, yTecla, (z + 0.5) * U + Z0);
        geos.push(geo);
    }
    const geoEnter = enter.clone();
    geoEnter.translate(13.5 * U + X0 + 1.2, yTecla, 2.25 * U + Z0 + 1.2);
    geos.push(geoEnter);
    // UV: topo → posição na textura; laterais → canto escuro da textura
    for (const geo of geos) {
        const p = geo.attributes.position, n = geo.attributes.normal;
        const uv = new THREE.BufferAttribute(new Float32Array(p.count * 2), 2);
        for (let i = 0; i < p.count; i++) {
            if (n.getY(i) > 0.5) uv.setXY(i, (p.getX(i) - X0) / (largura * U), 1 - (p.getZ(i) - Z0) / (profundidade * U));
            else uv.setXY(i, 0.001, 0.001);
        }
        geo.setAttribute('uv', uv);
    }
    const unidas = mergeGeometries(geos.map((g) => (g.index ? g.toNonIndexed() : g)));
    teclasParte.add(new THREE.Mesh(unidas, new THREE.MeshStandardMaterial({
        color: 0xffffff, map: texCor, emissive: 0xffffff, emissiveMap: texLuz, emissiveIntensity: 0.85, roughness: 0.55, metalness: 0.05,
    })));

    // ---------- Switches e placa com o brilho dos LEDs ----------
    switches.add(instancias(new THREE.BoxGeometry(14, 6, 14), material(0x101113, 0.2, 0.6),
        teclas.map(([x, z, w]) => [(x + w / 2) * U + X0, yPlaca + 3, (z + 0.5) * U + Z0]).concat([[14.25 * U + X0, yPlaca + 3, 2.75 * U + Z0]])));
    const brilho = new THREE.Mesh(new THREE.PlaneGeometry(largura * U, profundidade * U), new THREE.MeshBasicMaterial({ map: texBrilho, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    brilho.rotation.x = -Math.PI / 2;
    brilho.position.y = yPlaca + 0.2;
    switches.add(brilho);

    // ---------- Base ----------
    const matBase = material(0x141517, 0.35, 0.55);
    carcaca.add(caixaArredondada(W, yPlaca, D, 3, matBase, 0, yPlaca / 2, 0));
    // dois LEDs indicadores no espaço vazio acima das setas
    for (const dz of [0, 6]) carcaca.add(caixa(3, 0.6, 1.6, new THREE.MeshBasicMaterial({ color: 0xffffff }), 17.9 * U + X0 - 4, yPlaca + 0.35, 3.15 * U + Z0 + dz));
    // pés retráteis (fechados), borrachas e cabo
    for (const x of [-W / 2 + 40, W / 2 - 40]) carcaca.add(caixa(26, 2, 40, material(0x0c0d0f, 0.2, 0.7), x, -0.5, -D / 2 + 30));
    for (const [x, z] of [[-W / 2 + 18, D / 2 - 8], [W / 2 - 18, D / 2 - 8]]) carcaca.add(caixaArredondada(26, 2, 6, 1, material(0x0a0a0a, 0, 0.9), x, -0.6, z));
    carcaca.add(cabo([[0, 10, -D / 2], [0, 10, -D / 2 - 40], [25, 6, -D / 2 - 90], [70, 4, -D / 2 - 130]], 2.3, material(0x15161a, 0.1, 0.8)));
    teclado.rotation.x = 0.05;

    let tempo = 0, acumulado = 0;
    teclado.userData.atualizar = (dt) => {
        tempo += dt; acumulado += dt;
        if (acumulado < 0.12) return;          // redesenha ~8 vezes por segundo
        acumulado = 0;
        desenharLegendas(tempo * 0.5);
        texCor.needsUpdate = texLuz.needsUpdate = texBrilho.needsUpdate = true;
    };
    return teclado;
}


// =====================================================
// MOUSE: Redragon Cobra M711
// Corpo longo e preto fosco, frente em -Z. Superfície paramétrica:
// largura e altura mudam ao longo do comprimento (medidas da foto).
// =====================================================

function criarCobraM711() {
    const mouse = new THREE.Group();
    const C = 128, y0 = 3;
    const largura = [[0, 30], [0.12, 32], [0.3, 32.5], [0.5, 30.5], [0.72, 33], [0.86, 30], [1, 26]];
    const altura = [[0, 20], [0.2, 28], [0.45, 36], [0.62, 39], [0.8, 34], [0.93, 22], [1, 12]];
    const N = 4.2;   // expoente: corte mais "quadrado" que uma elipse
    // ponto da superfície: u = 0 (frente) → 1 (traseira); t = 0 (direita) → 1 (esquerda), por cima
    function ponto(u, t, folga = 0) {
        const z = -C / 2 + u * C;
        const fimTras = u > 0.8 ? Math.sqrt(Math.max(0, 1 - ((u - 0.8) / 0.2) ** 2)) : 1;
        const fimFrente = Math.min(1, Math.sqrt(u / 0.025 + 0.15));
        const w = tabela(largura, u) * fimTras * fimFrente + folga;
        const h = tabela(altura, u) * Math.sqrt(fimTras) + folga;
        const th = t * Math.PI, c = Math.cos(th), s = Math.sin(th);
        return new THREE.Vector3(w * Math.sign(c) * Math.abs(c) ** (2 / N), y0 + h * Math.abs(s) ** (2 / N), z);
    }
    function superficie(u0, u1, t0, t1, nu, nt, folga = 0) {
        const pos = [], uvs = [], idx = [];
        for (let i = 0; i <= nu; i++) for (let j = 0; j <= nt; j++) {
            const u = u0 + (u1 - u0) * (i / nu), t = t0 + (t1 - t0) * (j / nt);
            pos.push(...ponto(u, t, folga).toArray());
            uvs.push(u, t);
        }
        for (let i = 0; i < nu; i++) for (let j = 0; j < nt; j++) {
            const a = i * (nt + 1) + j, b = a + nt + 1;
            idx.push(a, a + 1, b, b, a + 1, b + 1);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        return geo;
    }

    const carcaca = parte(mouse, 'Carcaça', 'Corpo longo para destros, preto fosco, com pegada em colmeia nas laterais.', [0, 22, 18]);
    const botoes = parte(mouse, 'Botões e roda', 'Roda vermelha com sulcos, 3 botões no canal do meio e 2 botões laterais: 8 botões ao todo.', [0, 38, -12]);
    const luz = parte(mouse, 'Faixa RGB', 'Faixa de LED que contorna o mouse, com as cores andando (Chroma RGB).', [0, 4, 0]);
    const sensor = parte(mouse, 'Sensor', 'Sensor óptico PixArt PMW3327 de até 12400 DPI, com pés de teflon embaixo.', [0, -20, 0]);

    const matCorpo = material(0x1a1b1e, 0.1, 0.62, { side: THREE.DoubleSide });
    carcaca.add(new THREE.Mesh(superficie(0, 1, 0, 1, 90, 48), matCorpo));
    // colmeia nas laterais (um "adesivo" logo acima da superfície)
    const texGrip = texturaCanvas(512, 256, (g, w, h) => {
        g.fillStyle = '#26282c'; g.fillRect(0, 0, w, h);
        desenharColmeia(g, w, h, 5, '#0e0f11');
    });
    const matGrip = new THREE.MeshStandardMaterial({ map: texGrip, roughness: 0.85, side: THREE.DoubleSide });
    for (const [t0, t1] of [[0.02, 0.2], [0.8, 0.98]]) carcaca.add(new THREE.Mesh(superficie(0.38, 0.86, t0, t1, 30, 10, 0.35), matGrip));
    // base e pés de teflon
    const contorno = [];
    for (let i = 0; i <= 60; i++) contorno.push(ponto(i / 60, 0));
    for (let i = 60; i >= 0; i--) contorno.push(ponto(i / 60, 1));
    const forma = poligono(contorno.map((p) => [p.x, -p.z]));
    const base = extrudar(forma, y0, material(0x111214, 0.1, 0.7));
    base.rotation.x = -Math.PI / 2;
    sensor.add(base);
    sensor.add(caixaArredondada(20, 0.6, 8, 0.3, material(0xe9ebee, 0, 0.4), 0, -0.2, -55));
    sensor.add(caixaArredondada(30, 0.6, 8, 0.3, material(0xe9ebee, 0, 0.4), 0, -0.2, 55));
    sensor.add(new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 1, 24), material(0xff2a2a, 0, 0.4, { emissive: 0xff2a2a, emissiveIntensity: 1 })).translateY(-0.3).translateZ(-6));

    // Canal brilhante no meio, com a roda e os 3 botões
    const alturaEm = (u) => ponto(u, 0.5).y;
    const canal = [];
    for (let i = 0; i <= 24; i++) {
        const u = 0.01 + (0.47 * i) / 24;
        canal.push([u, alturaEm(u)]);
    }
    const geoCanal = new THREE.BufferGeometry();
    const posCanal = [], idxCanal = [];
    canal.forEach(([u, y]) => { const z = -C / 2 + u * C; posCanal.push(-8, y + 0.15, z, 8, y + 0.15, z); });
    for (let i = 0; i < canal.length - 1; i++) idxCanal.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
    geoCanal.setAttribute('position', new THREE.Float32BufferAttribute(posCanal, 3));
    geoCanal.setIndex(idxCanal);
    geoCanal.computeVertexNormals();
    botoes.add(new THREE.Mesh(geoCanal, material(0x050506, 0.6, 0.15)));
    // vão entre os dois botões principais (frente)
    for (const x of [-8.6, 8.6]) {
        const pts = canal.map(([u, y]) => new THREE.Vector3(x, y + 0.05, -C / 2 + u * C));
        botoes.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.7, 6), material(0x050506, 0.3, 0.5)));
    }
    // roda vermelha com sulcos pretos
    const uRoda = 0.13, zRoda = -C / 2 + uRoda * C, yRoda = alturaEm(uRoda) - 2;
    const roda = new THREE.Group();
    roda.position.set(0, yRoda, zRoda);
    roda.add(new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 7, 32).rotateZ(Math.PI / 2), material(0xd3262c, 0.2, 0.45)));
    roda.add(new THREE.Mesh(new THREE.CylinderGeometry(10.4, 10.4, 3.6, 32).rotateZ(Math.PI / 2), material(0x111214, 0.1, 0.8)));
    const sulcos = [];
    for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; sulcos.push([0, Math.cos(a) * 10.5, Math.sin(a) * 10.5]); }
    roda.add(instancias(new THREE.BoxGeometry(3.4, 0.8, 0.8), material(0x2a2b2e, 0.1, 0.8), sulcos));
    botoes.add(roda);
    // 3 botões quadrados atrás da roda
    for (let i = 0; i < 3; i++) {
        const u = 0.25 + i * 0.065;
        const b = caixaArredondada(8.5, 2.4, 7.6, 0.8, material(0x0c0d0f, 0.5, 0.2), 0, alturaEm(u) + 0.6, -C / 2 + u * C);
        b.rotation.x = -Math.atan2(alturaEm(u + 0.01) - alturaEm(u - 0.01), 0.02 * C);
        botoes.add(b);
    }
    // 2 botões laterais (lado esquerdo, -X)
    for (const [ua, ub] of [[0.33, 0.43], [0.43, 0.53]]) {
        const pa = ponto(ua, 0.84, 0.6), pb = ponto(ub, 0.84, 0.6);
        const meio = pa.clone().add(pb).multiplyScalar(0.5);
        const b = caixaArredondada(3, 6, pa.distanceTo(pb) - 1.5, 1.4, material(0x1f2023, 0.2, 0.5), meio.x, meio.y, meio.z);
        b.lookAt(pb.x, pb.y, pb.z);
        botoes.add(b);
    }

    // Faixa RGB: contorna a base pela esquerda, traseira e direita
    const caminho = [];
    for (let i = 0; i <= 40; i++) { const p = ponto(0.06 + (0.94 * i) / 40, 0.985, 0.5); p.y = y0 + 3.5; caminho.push(p); }
    for (let i = 40; i >= 0; i--) { const p = ponto(0.06 + (0.94 * i) / 40, 0.015, 0.5); p.y = y0 + 3.5; caminho.push(p); }
    const tex = texturaArcoIris(256);
    tex.repeat.set(2, 1);
    luz.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(caminho), 160, 1.1, 8), new THREE.MeshBasicMaterial({ map: tex })));
    // brilho do canal (as bordas acendem também)
    const brilhoCanal = new THREE.MeshBasicMaterial({ map: tex });
    for (const x of [-8.1, 8.1]) {
        const pts = canal.filter(([u]) => u > 0.2).map(([u, y]) => new THREE.Vector3(x, y - 0.6, -C / 2 + u * C));
        luz.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.5, 6), brilhoCanal));
    }

    carcaca.add(cabo([[0, 8, -C / 2], [0, 8, -C / 2 - 30], [-15, 5, -C / 2 - 80], [-55, 3, -C / 2 - 120]], 1.9, material(0x16171a, 0.1, 0.8)));
    mouse.userData.atualizar = (dt) => { tex.offset.x -= dt * 0.25; };
    return mouse;
}


// =====================================================
// HEADSET: HyperX Cloud Stinger 2 (cabo P3)
// Conchas em x = ±, frente (microfone) em +Z, arco em cima.
// =====================================================

function criarCloudStinger2() {
    const fone = new THREE.Group();
    const matPlastico = material(0x17181b, 0.25, 0.5);
    const matCouro = material(0x1b1c1f, 0, 0.88);
    const xAlmofada = 74;                    // face de dentro das almofadas (largura da cabeça / 2)

    const arco = parte(fone, 'Arco', 'Arco largo e achatado, leve, com almofada de couro sintético por baixo.', [0, 45, 0]);
    const ajuste = parte(fone, 'Ajuste de altura e volume', 'Hastes que deslizam para ajustar o tamanho. O controle de volume fica embutido na haste direita.', [0, 22, 0]);
    const conchas = parte(fone, 'Conchas giratórias', 'Conchas ovais com drivers de 50 mm. Giram 90° para deitar no pescoço.', [0, 0, 0]);
    const almofadas = parte(fone, 'Almofadas', 'Almofadas grossas de espuma com couro sintético pregueado.', [0, 0, 0]);
    const mic = parte(fone, 'Microfone', 'Microfone com haste flexível e espuma. Girando para cima, ele fica mudo.', [-25, 0, 35]);

    // ---------- Arco: faixa achatada seguindo uma curva ----------
    const pontosArco = [];
    for (let i = 0; i <= 40; i++) {
        const a = Math.PI * (i / 40);
        pontosArco.push(new THREE.Vector3(Math.cos(a) * 92, 98 + Math.sin(a) * 78, 0));
    }
    const caminho = new THREE.CatmullRomCurve3(pontosArco);
    // (na extrusão por caminho, o x da forma vai na largura e o y na espessura)
    const faixa = new THREE.ExtrudeGeometry(retanguloArredondado(44, 7, 3), { steps: 80, bevelEnabled: false, extrudePath: caminho });
    arco.add(new THREE.Mesh(faixa, matPlastico));
    const caminhoAlmofada = new THREE.CatmullRomCurve3(pontosArco.slice(9, 32).map((p) => new THREE.Vector3(p.x * 0.9, 98 + (p.y - 98) * 0.88, 0)));
    arco.add(new THREE.Mesh(new THREE.ExtrudeGeometry(retanguloArredondado(36, 11, 5), { steps: 50, bevelEnabled: false, extrudePath: caminhoAlmofada }), matCouro));

    for (const lado of [-1, 1]) {
        // ---------- Haste (mais larga em cima) e pino ----------
        const haste = extrudar(poligono([[-22, 0], [22, 0], [14, -58], [-9, -58]]), 8, matPlastico, { chanfro: 1.2, z0: -4 });
        haste.geometry.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-1, 0, 0)));
        haste.position.set(lado * 92, 104, 0);
        ajuste.add(haste);
        if (lado === 1) {
            // controle de volume deslizante
            ajuste.add(caixaArredondada(2, 9, 12, 1, material(0x050506, 0.4, 0.3), 96.2, 70, 2));
            ajuste.add(caixa(1, 2, 7, material(0x3a3c41, 0.4, 0.5), 97.3, 70, 2));
        }
        ajuste.add(new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 14, 16).translate(lado * 92, 40, 0), matPlastico));

        // ---------- Concha: oval com tampa listrada + moldura em "U" ----------
        const grupo = new THREE.Group();
        grupo.position.set(lado * xAlmofada, 0, 0);
        grupo.rotation.z = lado * 0.04;
        const texTampa = texturaCanvas(256, 320, (g, w, h) => {
            g.fillStyle = '#1b1c1f'; g.fillRect(0, 0, w, h);
            g.strokeStyle = '#25272b'; g.lineWidth = 2;
            for (let i = -h; i < w; i += 6) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); }
        });
        mapearCaixa(texTampa, -38, -48, 38, 48);
        const oval = new THREE.Shape();
        oval.absellipse(0, 0, 38, 48, 0, Math.PI * 2, false);
        const casca = extrudar(oval, 18, [new THREE.MeshStandardMaterial({ map: texTampa, roughness: 0.6, metalness: 0.2 }), matPlastico], { chanfro: 6, segmentos: 4 });
        // forma: x → Z, y → Y; extrusão → para fora (lado)
        casca.geometry.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -lado), new THREE.Vector3(0, 1, 0), new THREE.Vector3(lado, 0, 0)));
        casca.position.x = lado * 26;
        grupo.add(casca);
        // moldura que abraça a parte de cima da concha
        const moldura = new THREE.Shape();
        moldura.absellipse(0, 0, 44, 55, -0.15, Math.PI + 0.15, false);
        moldura.absellipse(0, 0, 39, 50, Math.PI + 0.15, -0.15, true);
        const mMold = extrudar(moldura, 10, matPlastico, { chanfro: 1.5 });
        mMold.geometry.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -lado), new THREE.Vector3(0, 1, 0), new THREE.Vector3(lado, 0, 0)));
        mMold.position.x = lado * 30;
        grupo.add(mMold);
        conchas.add(grupo);

        // ---------- Almofada pregueada ----------
        const anel = new THREE.Shape();
        anel.absellipse(0, 0, 38, 48, 0, Math.PI * 2, false);
        const buraco = new THREE.Path();
        buraco.absellipse(0, 0, 22, 32, 0, Math.PI * 2, true);
        anel.holes.push(buraco);
        const bump = texturaCanvas(256, 256, (g, w, h) => {
            g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
            g.strokeStyle = '#3a3a3a'; g.lineWidth = 3;
            for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2; g.beginPath(); g.moveTo(w / 2 + Math.cos(a) * 60, h / 2 + Math.sin(a) * 75); g.lineTo(w / 2 + Math.cos(a) * 125, h / 2 + Math.sin(a) * 128); g.stroke(); }
        }, { cores: false });
        mapearCaixa(bump, -40, -50, 40, 50);
        const almofada = extrudar(anel, 14, new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: 0.85, bumpMap: bump, bumpScale: 1.2 }), { chanfro: 5, segmentos: 4 });
        almofada.geometry.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -lado), new THREE.Vector3(0, 1, 0), new THREE.Vector3(lado, 0, 0)));
        almofada.position.x = lado * (xAlmofada + 5);
        almofadas.add(almofada);
        // pano do driver (dentro do buraco)
        const pano = new THREE.Mesh(new THREE.CircleGeometry(1, 32), material(0x0b0b0c, 0, 1));
        pano.scale.set(22, 32, 1);
        pano.rotation.y = lado * Math.PI / 2;
        pano.position.x = lado * (xAlmofada + 8);
        almofadas.add(pano);
    }

    // ---------- Microfone (lado esquerdo) e cabo ----------
    const xm = -(xAlmofada + 44);
    mic.add(new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 8, 24).rotateZ(Math.PI / 2).translate(xm, -24, 22), matPlastico));
    mic.add(cabo([[xm, -24, 24], [xm + 4, -40, 60], [xm + 18, -52, 100], [xm + 42, -48, 132]], 2.2, material(0x111214, 0.3, 0.5)));
    const ponta = new THREE.Mesh(new THREE.CapsuleGeometry(5.5, 16, 6, 16), material(0x0d0e10, 0, 0.95));
    ponta.position.set(xm + 50, -46, 138);
    ponta.rotation.set(0, 0.95, Math.PI / 2);
    mic.add(ponta);
    conchas.add(cabo([[xm + 6, -46, -6], [xm + 8, -90, 0], [xm + 25, -150, 20], [xm + 60, -200, 30]], 2, material(0x111214, 0.1, 0.8)));
    return fone;
}


// =====================================================
// CADEIRA: Webshop Stillus (preta e vermelha, com apoio para os pés)
// Medidas da foto: encosto de 57 cm, braços a 21 cm do assento,
// assento de 38 a 47 cm do chão, base de 60 cm. Frente em +Z.
// =====================================================

function criarStillus() {
    const cadeira = new THREE.Group();
    const vermelho = 0xa50f16, preto = 0x141416;
    const matPreto = material(preto, 0.05, 0.75);
    const matVermelho = material(vermelho, 0.05, 0.7);
    const matPlastico = material(0x121314, 0.15, 0.6);
    const ySeat = 430;                          // topo do assento (meio da faixa de 38 a 47 cm)

    const encosto = parte(cadeira, 'Encosto', 'Encosto estilo "banco de corrida" de 57 cm, preto com laterais vermelhas e "V" vermelho no peito. Reclina para trás.', [0, 40, -80]);
    const almofadas = parte(cadeira, 'Almofadas', 'Almofada de pescoço e almofada lombar, pretas com "V" vermelho.', [0, 0, 90]);
    const assento = parte(cadeira, 'Assento e braços', 'Assento com abas vermelhas na frente. Os braços ficam 21 cm acima do assento.', [0, 25, 0]);
    const pes = parte(cadeira, 'Apoio para os pés', 'Fica guardado embaixo do assento e desliza para fora para descansar as pernas.', [0, 0, 230]);
    const base = parte(cadeira, 'Pistão e base', 'Pistão a gás (sobe de 38 a 47 cm) e base de 5 pontas de 60 cm com rodinhas.', [0, -80, 0]);

    // ---------- Base em estrela, rodinhas e pistão ----------
    for (let i = 0; i < 5; i++) {
        const braco = new THREE.Group();
        braco.rotation.y = (i / 5) * Math.PI * 2 + Math.PI / 2;
        const perna = caixaArredondada(250, 28, 46, 8, matPlastico, 150, 82, 0);
        perna.rotation.z = -0.08;
        braco.add(perna);
        braco.add(caixaArredondada(70, 4, 30, 2, matVermelho, 215, 86, 0).rotateZ(-0.08));
        braco.add(caixaArredondada(26, 30, 30, 5, matPlastico, 272, 56, 0));
        for (const dz of [-8, 8]) braco.add(new THREE.Mesh(new THREE.CylinderGeometry(24, 24, 9, 24).rotateX(Math.PI / 2).translate(285, 25, dz), material(0x0d0e10, 0.1, 0.8)));
        base.add(braco);
    }
    base.add(new THREE.Mesh(new THREE.CylinderGeometry(38, 42, 50, 32).translate(0, 90, 0), matPlastico));
    base.add(new THREE.Mesh(new THREE.CylinderGeometry(26, 26, 90, 24).translate(0, 155, 0), matPlastico));
    base.add(new THREE.Mesh(new THREE.CylinderGeometry(22, 22, 70, 24).translate(0, 230, 0), matPlastico));
    base.add(new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 80, 20).translate(0, 290, 0), material(0x9aa1a9, 1, 0.3)));
    base.add(caixa(220, 26, 220, material(0x1d1e21, 0.6, 0.45), 0, 325, 0));
    base.add(cabo([[100, 325, 40], [160, 318, 40], [200, 330, 50]], 5, matPlastico, 12));      // alavanca

    // ---------- Assento ----------
    const texAssento = texturaCanvas(600, 560, (g, w, h) => {
        g.fillStyle = '#141416'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#a50f16';
        // abas vermelhas na frente (frente = embaixo do desenho)
        g.beginPath(); g.moveTo(0, h * 0.45); g.lineTo(w * 0.24, h * 0.62); g.lineTo(w * 0.27, h); g.lineTo(0, h); g.fill();
        g.beginPath(); g.moveTo(w, h * 0.45); g.lineTo(w * 0.76, h * 0.62); g.lineTo(w * 0.73, h); g.lineTo(w, h); g.fill();
        g.strokeStyle = '#2b2b2f'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(w * 0.27, h * 0.1); g.lineTo(w * 0.27, h); g.moveTo(w * 0.73, h * 0.1); g.lineTo(w * 0.73, h); g.stroke();
    });
    mapearCaixa(texAssento, -260, -260, 260, 260);
    const fAssento = retanguloArredondado(480, 470, 60);
    const mAssento = extrudar(fAssento, 50, [new THREE.MeshStandardMaterial({ map: texAssento, roughness: 0.6, metalness: 0.05 }), matPreto], { chanfro: 26, segmentos: 5 });
    mAssento.rotation.x = -Math.PI / 2;
    mAssento.position.set(0, ySeat - 76, 20);
    assento.add(mAssento);
    // laterais elevadas (vermelhas) do assento
    for (const l of [-1, 1]) {
        const lateral = caixaArredondada(70, 46, 470, 22, matVermelho, l * 225, ySeat - 18, 20);
        lateral.rotation.x = 0.05;
        assento.add(lateral);
    }
    // braços: suporte em arco + apoio vermelho
    for (const l of [-1, 1]) {
        assento.add(cabo([[l * 270, ySeat - 60, -150], [l * 290, ySeat + 40, -170], [l * 296, ySeat + 165, -110], [l * 296, ySeat + 195, 30]], 13, matPlastico, 32));
        assento.add(cabo([[l * 270, ySeat - 60, 30], [l * 290, ySeat + 60, 60], [l * 296, ySeat + 190, 60]], 12, matPlastico, 24));
        assento.add(caixaArredondada(80, 34, 270, 15, matVermelho, l * 296, ySeat + 210, 10));
    }
    // ---------- Apoio para os pés (guardado) ----------
    pes.add(caixaArredondada(400, 60, 150, 20, matPreto, 0, ySeat - 125, 150));
    pes.add(new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 380, 16).rotateZ(Math.PI / 2).translate(0, ySeat - 165, 200), material(0xd0d4d9, 1, 0.2)));
    for (const l of [-1, 1]) pes.add(caixa(14, 14, 240, material(0xb9bec5, 1, 0.3), l * 150, ySeat - 160, 90));

    // ---------- Encosto (silhueta de banco de corrida) ----------
    const HA = 690;
    const meia = [[250, 0], [262, 0.12 * HA], [240, 0.3 * HA], [222, 0.45 * HA], [270, 0.6 * HA], [262, 0.7 * HA], [180, 0.77 * HA], [168, 0.86 * HA], [150, 0.95 * HA], [100, HA]];
    const fEnc = new THREE.Shape();
    fEnc.moveTo(-meia[0][0], 0);
    fEnc.lineTo(meia[0][0], 0);
    fEnc.splineThru(meia.slice(1).map(([x, y]) => new THREE.Vector2(x, y)));
    fEnc.lineTo(-100, HA);
    fEnc.splineThru(meia.slice(0, -1).reverse().map(([x, y]) => new THREE.Vector2(-x, y)));
    for (const x of [-78, 78]) {                // rasgos do cinto
        const p = new THREE.Path();
        p.absellipse(x, 0.84 * HA, 26, 12, 0, Math.PI * 2, true);
        fEnc.holes.push(p);
    }
    const texEnc = texturaCanvas(1200, (HA + 20) * 2, (g, w, h) => {
        const P = (x, y) => [(x + 300) * 2, (HA + 10 - y) * 2];
        g.fillStyle = '#141416'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#a50f16';
        // laterais vermelhas
        g.fillRect(...P(-300, 0.75 * HA), 160 * 2, 0.75 * HA * 2 + 20);
        g.fillRect(...P(140, 0.75 * HA), 160 * 2, 0.75 * HA * 2 + 20);
        // "V" vermelho no peito
        g.beginPath();
        [[-150, 0.71 * HA], [0, 0.6 * HA], [150, 0.71 * HA], [150, 0.77 * HA], [0, 0.67 * HA], [-150, 0.77 * HA]].forEach((p) => g.lineTo(...P(...p)));
        g.fill();
        // costuras e as duas tiras da almofada de pescoço
        g.strokeStyle = '#2e2e33'; g.lineWidth = 4;
        for (const x of [-140, 140]) { g.beginPath(); g.moveTo(...P(x, 20)); g.lineTo(...P(x, 0.75 * HA)); g.stroke(); }
        g.strokeStyle = '#08080a'; g.lineWidth = 22;
        for (const x of [-60, 60]) { g.beginPath(); g.moveTo(...P(x, 0.83 * HA)); g.lineTo(...P(x, 0.45 * HA)); g.stroke(); }
    });
    mapearCaixa(texEnc, -300, -10, 300, HA + 10);
    const grupoEnc = new THREE.Group();
    grupoEnc.position.set(0, ySeat + 8, -235);
    grupoEnc.rotation.x = -0.14;
    encosto.add(grupoEnc);
    const mEnc = extrudar(fEnc, 70, [new THREE.MeshStandardMaterial({ map: texEnc, roughness: 0.6, metalness: 0.05 }), matPreto], { chanfro: 24, segmentos: 5, curvas: 32 });
    mEnc.position.z = -35;
    grupoEnc.add(mEnc);
    // costas pretas (a textura da frente apareceria espelhada atrás)
    const costas = new THREE.Mesh(new THREE.ShapeGeometry(fEnc, 32), new THREE.MeshStandardMaterial({ color: preto, roughness: 0.7, side: THREE.BackSide }));
    costas.position.z = -35 - 24 - 0.4;
    grupoEnc.add(costas);
    // debrum vermelho na borda da frente
    const borda = fEnc.getPoints(40).map((p) => new THREE.Vector3(p.x, p.y, 57));
    grupoEnc.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(borda, true), 300, 3.5, 6), matVermelho));
    // suportes laterais (ligam o encosto ao assento)
    for (const l of [-1, 1]) assento.add(caixaArredondada(30, 150, 60, 8, matPlastico, l * 230, ySeat - 30, -215));

    // ---------- Almofadas (pescoço e lombar) com o "V" vermelho ----------
    const almofada = (larg, alt, prof, y, z, v) => {
        const g = new THREE.Group();
        g.add(caixaArredondada(larg, alt, prof, Math.min(alt, prof) / 2.2, matPreto, 0, 0, 0));
        const f = poligono([[-larg * 0.42, alt * 0.38], [-larg * 0.18, alt * 0.38], [0, -alt * 0.1 * v], [larg * 0.18, alt * 0.38], [larg * 0.42, alt * 0.38], [0, -alt * 0.45]]);
        g.add(extrudar(f, 2, matVermelho, { z0: prof / 2 - 6, chanfro: 1 }));
        g.position.set(0, y, z);
        return g;
    };
    const neck = almofada(240, 95, 64, 0.86 * HA, 95, 1);
    const lomb = almofada(300, 125, 84, 0.2 * HA, 100, 1);
    for (const a of [neck, lomb]) { const g = new THREE.Group(); g.position.copy(grupoEnc.position); g.rotation.copy(grupoEnc.rotation); g.add(a); almofadas.add(g); }

    return cadeira;
}


// =====================================================
// CONTROLE: 8BitDo Ultimate 2C (verde)
// Deitado, botões para cima (+Y), gatilhos em -Z (como o genérico).
// Posições dos botões medidas na foto de frente.
// =====================================================

function criarUltimate2C() {
    const controle = new THREE.Group();
    const corCorpo = 0x86c7a5, corEscuro = 0x2c6a53;
    const matCorpo = material(corCorpo, 0.05, 0.62);
    const matEscuro = material(corEscuro, 0.1, 0.35);
    const matClaro = new THREE.MeshStandardMaterial({ color: 0xc4e8d2, roughness: 0.25, transparent: true, opacity: 0.75 });

    const corpo = parte(controle, 'Corpo', 'Corpo verde-menta fosco, com alças arredondadas e textura fina nas costas para a pegada.', [0, -28, 0]);
    const analogicos = parte(controle, 'Analógicos', 'Analógicos com tampa verde-escura texturizada e haste metálica (sensores Hall: não criam "drift").', [0, 32, 0]);
    const botoes = parte(controle, 'Botões e direcional', 'Direcional em cruz, botões A, B, X e Y (no layout do Switch) e os botões do meio.', [0, 22, 0]);
    const gatilhos = parte(controle, 'Gatilhos e botões traseiros', 'LB/RB, gatilhos LT/RT e dois botões extras (L4/R4). Entre eles: USB-C e o botão de pareamento.', [0, 10, -30]);

    // ---------- Corpo: contorno visto de cima, extrudado, com as alças caídas ----------
    const metade = [[0, -50], [40, -51], [58, -49.5], [70, -43], [76, -29], [77, -12], [76, 6], [73, 22], [68, 37], [62, 49], [53, 56], [44, 54], [38, 44], [32, 28], [24, 17], [12, 13], [0, 12]];
    const f = new THREE.Shape();
    // forma no plano (x, z): depois de girar, o y da forma vira o z do mundo
    f.moveTo(0, -50);
    f.splineThru(metade.slice(1).map(([x, z]) => new THREE.Vector2(x, z)));
    f.splineThru(metade.slice(0, -1).reverse().map(([x, z]) => new THREE.Vector2(-x, z)));
    const geo = new THREE.ExtrudeGeometry(f, { depth: 20, bevelEnabled: true, bevelThickness: 10, bevelSize: 8, bevelSegments: 8, curveSegments: 40 });
    geo.rotateX(Math.PI / 2);          // forma no plano XZ; a extrusão vai para baixo
    const p = geo.attributes.position;
    const caida = (z) => (z > 4 ? (z - 4) ** 1.25 * 0.18 : 0);
    for (let i = 0; i < p.count; i++) {
        const z = p.getZ(i);
        // as alças descem e ficam mais grossas
        p.setY(i, p.getY(i) - caida(z) + (p.getY(i) < -10 ? -caida(z) * 0.3 : 0));
    }
    geo.computeVertexNormals();
    const topo = 10;                   // o topo do corpo fica em y = 10 (antes de levantar tudo)
    const subir = 40;
    geo.translate(0, subir, 0);
    corpo.add(new THREE.Mesh(geo, matCorpo));
    const yTopo = (x, z) => topo + subir - caida(z) - 1;

    // ---------- Analógicos ----------
    const stick = (x, z) => {
        const g = new THREE.Group();
        g.position.set(x, yTopo(x, z), z);
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(13.5, 14.5, 2, 40), matClaro).translateY(0.5));
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5.2, 10, 20), material(0xd9dde2, 1, 0.15)).translateY(6));
        const tampa = new THREE.Group();
        tampa.position.y = 12;
        tampa.add(new THREE.Mesh(new THREE.CylinderGeometry(9.8, 9, 3, 40), matEscuro));
        tampa.add(new THREE.Mesh(new THREE.TorusGeometry(9.3, 1.5, 10, 40).rotateX(Math.PI / 2), material(corEscuro, 0, 0.8)).translateY(1));
        tampa.add(new THREE.Mesh(new THREE.CylinderGeometry(7.5, 7.5, 0.6, 40), material(0x356d58, 0, 0.7)).translateY(1.8));
        g.add(tampa);
        return g;
    };
    analogicos.add(stick(-47, -21), stick(23, 2));

    // ---------- Direcional em cruz sobre o disco translúcido ----------
    const [dx, dz] = [-24, 5.5];
    const disco = new THREE.Mesh(new THREE.CylinderGeometry(14.5, 15, 1.6, 40), matClaro);
    disco.position.set(dx, yTopo(dx, dz) + 0.4, dz);
    botoes.add(disco);
    const cruz = (a, b) => poligono([[-a, b], [-b, b], [-b, a], [b, a], [b, b], [a, b], [a, -b], [b, -b], [b, -a], [-b, -a], [-b, -b], [-a, -b]]);
    const contornoCruz = extrudar(cruz(14.6, 5.4), 3, material(0x0d1512, 0.2, 0.5), { chanfro: 0.4 });
    const cruzVerde = extrudar(cruz(14, 4.8), 3.6, matEscuro, { chanfro: 0.5 });
    for (const m of [contornoCruz, cruzVerde]) {
        m.rotation.x = -Math.PI / 2;
        m.position.set(dx, yTopo(dx, dz) + 1, dz);
        botoes.add(m);
    }

    // ---------- Botões A, B, X, Y com as letras ----------
    const letra = (txt) => texturaCanvas(128, 128, (g, w, h) => {
        g.fillStyle = '#2c6a53'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#f4f7f5'; g.font = '700 84px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(txt, w / 2, h / 2 + 4);
    });
    for (const [txt, x, z] of [['Y', 48, -32.8], ['X', 36.7, -21.5], ['B', 59.3, -21.5], ['A', 48, -10.2]]) {
        const tex = letra(txt);
        tex.center.set(0.5, 0.5);
        tex.rotation = Math.PI / 2;
        const b = new THREE.Mesh(new THREE.CylinderGeometry(4.3, 4.3, 4.5, 32), [matEscuro, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3 }), matEscuro]);
        b.position.set(x, yTopo(x, z) + 1.6, z);
        botoes.add(b);
    }
    // botões do meio: −, +, captura, estrela, home (translúcido) e o LED
    for (const [x, z] of [[-12.3, -32.6], [21.5, -32.6], [-12.3, -21.7], [10.6, -21.7]]) {
        botoes.add(new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 2.2, 24), material(0xb4dfc6, 0.05, 0.45)).translateX(x).translateY(yTopo(x, z) + 0.6).translateZ(z));
    }
    botoes.add(new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.2, 2.4, 32), matClaro).translateX(4.6).translateY(yTopo(4.6, -38.4) + 0.7).translateZ(-38.4));
    botoes.add(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.8, 12), material(0x1a1a1a, 0, 0.5)).translateX(-0.5).translateY(yTopo(0, -22.5) + 0.2).translateZ(-22.5));

    // ---------- Gatilhos, bumpers e botões extras (borda de trás) ----------
    for (const l of [-1, 1]) {
        const lb = caixaArredondada(32, 9, 12, 4, matCorpo, l * 47, topo + subir - 6, -57);
        lb.rotation.z = -l * 0.08;
        gatilhos.add(lb);
        const lt = caixaArredondada(24, 20, 16, 6, matCorpo, l * 50, topo + subir - 22, -55);
        lt.rotation.x = 0.35;
        gatilhos.add(lt);
        gatilhos.add(caixaArredondada(9, 7, 7, 2, matCorpo, l * 30, topo + subir - 17, -59));
    }
    gatilhos.add(caixaArredondada(9, 3.4, 2, 1.5, material(0x1c1d1f, 0.6, 0.4), 0, topo + subir - 16, -60));
    gatilhos.add(new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 1.5, 16).rotateX(Math.PI / 2), matCorpo).translateX(9).translateY(topo + subir - 16).translateZ(-60.5));
    gatilhos.add(new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 1, 8).rotateX(Math.PI / 2), material(0x1a1a1a)).translateX(-8).translateY(topo + subir - 16).translateZ(-60.5));
    return controle;
}


export const ESPECIFICOS_PERIFERICOS = {
    'lg-32ur500': criarLG32UR500,
    'kumara-k552': criarKumaraK552,
    'cobra-m711': criarCobraM711,
    'cloud-stinger-2': criarCloudStinger2,
    'stillus': criarStillus,
    '8bitdo-ultimate-2c': criarUltimate2C,
};
