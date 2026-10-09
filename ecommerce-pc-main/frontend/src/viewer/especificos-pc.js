import * as THREE from 'three';
import {
    material, caixa, caixaArredondada, instancias, parte, COR,
    texturaCanvas, mapearCaixa, poligono, retanguloArredondado, extrudar, desenharColmeia, texturaArcoIris,
} from './util3d.js';
import { ancorasPlacaMae, ancorasGabinete } from './modelos-pc.js';
import { MEDIDAS_B650_GAMING_PLUS } from './parametros.js';

/*
 * MODELOS FIÉIS (peças do PC)
 * Cada função reproduz UM produto do catálogo, modelado a partir das fotos
 * dele: proporções, cores, recortes e detalhes. Logos e nomes de marca
 * ficam de fora de propósito (só a forma e as cores da peça).
 *
 * Seguem as mesmas convenções dos modelos genéricos (milímetros, mesmos
 * eixos e "partes" para a vista explodida), então funcionam na página do
 * produto e na bancada do "Monte seu PC" sem nada especial.
 */


// =====================================================
// Ajudantes
// =====================================================

// Hélice de pás curvas, com passo (as pás são inclinadas como num ventilador de verdade).
// Fica de frente para +Z; o grupo devolvido é o que gira.
function helice(raio, nPas, matPas, { raioCubo = 14, varredura = 0.55, passo = 0.38, espessura = 0.9 } = {}) {
    const rotor = new THREE.Group();
    const r0 = raioCubo - 1, r1 = raio;
    const p = (r, a) => [r * Math.cos(a), r * Math.sin(a)];
    const largura = (Math.PI * 2) / nPas * 0.82;          // quanto do círculo cada pá ocupa
    const forma = new THREE.Shape();
    forma.moveTo(...p(r0, -largura * 0.35));
    forma.quadraticCurveTo(...p((r0 + r1) / 2, -largura * 0.2 + varredura * 0.45), ...p(r1, varredura - largura * 0.5));
    forma.absarc(0, 0, r1, varredura - largura * 0.5, varredura + largura * 0.5, false);
    forma.quadraticCurveTo(...p((r0 + r1) / 2, largura * 0.45 + varredura * 0.55), ...p(r0, largura * 0.35));
    forma.absarc(0, 0, r0, largura * 0.35, -largura * 0.35, true);
    const geo = new THREE.ExtrudeGeometry(forma, { depth: espessura, bevelEnabled: false, curveSegments: 10 });
    geo.translate(0, 0, -espessura / 2);
    for (let i = 0; i < nPas; i++) {
        const pivo = new THREE.Group();
        pivo.rotation.z = (i / nPas) * Math.PI * 2;
        const pa = new THREE.Mesh(geo, typeof matPas === 'function' ? matPas(i) : matPas);
        pa.rotation.x = passo;                              // inclinação da pá
        pivo.add(pa);
        rotor.add(pivo);
    }
    return rotor;
}

// Peça vista de cima da placa-mãe: pontos em mm medidos na foto (a partir do
// canto de cima à esquerda) → extrudada para cima, já no lugar.
function pecaDeCima(pontos, altura, mats, { y0 = 1.6, W = 244, D = 305, chanfro = 0 } = {}) {
    const forma = poligono(pontos.map(([x, z]) => [x - W / 2, D / 2 - z]));
    const geo = new THREE.ExtrudeGeometry(forma, {
        depth: altura, bevelEnabled: chanfro > 0, bevelThickness: chanfro, bevelSize: chanfro, bevelSegments: 2,
    });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, y0, 0);
    return new THREE.Mesh(geo, mats);
}

// Faixas diagonais "de alumínio escovado" (dissipadores da placa-mãe e outros)
function texturaListrada(largura, altura, { fundo = ['#8f949b', '#6c7178'], faixas = '#2a2c31', angulo = -0.95, passo = 46, espessura = 13, pontos = true, raio = false } = {}) {
    return texturaCanvas(Math.round(largura * 4), Math.round(altura * 4), (g, w, h) => {
        const grad = g.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, fundo[0]);
        grad.addColorStop(1, fundo[1]);
        g.fillStyle = grad;
        g.fillRect(0, 0, w, h);
        // riscos finos de escovado
        g.globalAlpha = 0.08;
        g.strokeStyle = '#ffffff';
        for (let y = 0; y < h; y += 3) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + 2); g.stroke(); }
        g.globalAlpha = 1;
        // faixas escuras inclinadas
        g.save();
        g.translate(w / 2, h / 2);
        g.rotate(angulo);
        g.fillStyle = faixas;
        const n = Math.ceil((w + h) / passo);
        for (let i = -n; i <= n; i += 3) {
            g.fillRect(i * passo, -w - h, espessura, (w + h) * 2);
            g.fillRect(i * passo + espessura + 6, -w - h, espessura * 0.35, (w + h) * 2);
        }
        g.restore();
        // pontinhos e "raio" claro (só desenho, sem nome de marca)
        if (pontos) {
            g.fillStyle = 'rgba(235,238,242,0.55)';
            for (let y = 10; y < h * 0.45; y += 10) for (let x = w * 0.55; x < w - 8; x += 10) g.fillRect(x, y, 2.4, 2.4);
        }
        if (raio) {
            g.strokeStyle = 'rgba(245,247,250,0.9)';
            g.lineWidth = 3;
            g.beginPath();
            g.moveTo(w * 0.08, h * 0.85); g.lineTo(w * 0.35, h * 0.6); g.lineTo(w * 0.3, h * 0.55); g.lineTo(w * 0.55, h * 0.3);
            g.stroke();
        }
    });
}


// =====================================================
// PLACA DE VÍDEO: ASRock Radeon RX 7600 Challenger 8GB
// Eixos como no genérico: X = comprimento (suporte em -X),
// Y = altura (PCIe embaixo), Z = espessura (ventoinhas em +Z).
// =====================================================

const RX7600 = { comprimento: 269, altura: 120, dedosPcie: 84 };   // as mesmas medidas de parametros.js

function criarRX7600Challenger() {
    const gpu = new THREE.Group();
    const L = RX7600.comprimento, H = RX7600.altura;
    const esq = -L / 2;
    const zPCB = -15, zF = 21;                     // circuito atrás, frente da capa
    const fimPCB = esq + 199;                      // o circuito é mais curto que a capa (área vazada no fim)
    const centros = [-57.5, 67.5], rHelice = 44;

    const matCapa = material(0x141517, 0.2, 0.6);
    const matBrilho = material(0x0a0b0d, 0.7, 0.1);
    const matAletas = material(0xaab0b8, 1, 0.36);
    const matCobre = material(COR.cobre, 1, 0.28);
    const matPCB = material(COR.pcbPreto, 0.2, 0.6);
    const matOuro = material(COR.ouro, 1, 0.3);
    const matPreto = material(0x0d0e10, 0.1, 0.7);
    const matPas = new THREE.MeshStandardMaterial({ color: 0x24272c, roughness: 0.25, metalness: 0.05, transparent: true, opacity: 0.86, side: THREE.DoubleSide });
    const matCubo = material(0xa9aeb5, 1, 0.3);

    const capa = parte(gpu, 'Capa e ventoinhas', 'Capa preta facetada com duas ventoinhas de pás translúcidas. Elas sopram o ar no dissipador que fica atrás.', [0, 0, 55]);
    const dissipador = parte(gpu, 'Dissipador', 'Aletas de alumínio e heatpipes de cobre. No fim da placa o dissipador passa do circuito: o ar atravessa a placa (flow-through).', [0, 0, 28]);
    const pcb = parte(gpu, 'Placa de circuito (PCB)', 'O circuito é mais curto que a capa. Nele ficam o chip Navi 33 e os 8 GB de memória GDDR6.', [0, 0, -8]);
    const pcie = parte(gpu, 'Conector PCIe', 'Encaixa no slot PCIe x16 da placa-mãe (a RX 7600 usa 8 das 16 linhas).', [0, -32, -8]);
    const energia = parte(gpu, 'Conector de energia (8 pinos)', 'A placa gasta até ~165 W: 75 W vêm do slot e o resto por este cabo de 8 pinos da fonte.', [0, 34, -8]);
    const backplate = parte(gpu, 'Backplate', 'Placa traseira preta com faixas claras. Cobre só o circuito; depois dela dá para ver as aletas.', [0, 0, -40]);
    const suporte = parte(gpu, 'Suporte e saídas de vídeo', 'Suporte prateado com recortes de ventilação: 3 DisplayPort e 1 HDMI.', [-42, 0, 0]);

    // ---------- Capa: forma facetada com dois furos (as ventoinhas) ----------
    const contorno = [[-124, 60], [128, 60], [134.5, 46], [134.5, -44], [125, -59], [-66, -59], [-128.5, -46], [-128.5, 46]];
    const forma = poligono(contorno);
    for (const cx of centros) {
        const furo = new THREE.Path();
        furo.absarc(cx, 0, rHelice + 2, 0, Math.PI * 2, true);
        forma.holes.push(furo);
    }
    // Desenho da frente da capa (facetas, tela e bordas), em mm → 4 px/mm
    const X0 = -128.5, X1 = 134.5, Y0 = -59, Y1 = 60, K = 4;
    const texCapa = texturaCanvas((X1 - X0) * K, (Y1 - Y0) * K, (g) => {
        const P = (x, y) => [(x - X0) * K, (Y1 - y) * K];
        const pol = (pts, cor) => { g.fillStyle = cor; g.beginPath(); pts.forEach((p) => g.lineTo(...P(...p))); g.closePath(); g.fill(); };
        g.fillStyle = '#0f1012';
        g.fillRect(0, 0, g.canvas.width, g.canvas.height);
        // textura de tela (mesh) nas áreas internas
        g.strokeStyle = '#1d1f23';
        g.lineWidth = 1.2;
        for (let i = -g.canvas.height; i < g.canvas.width; i += 7) {
            g.beginPath(); g.moveTo(i, 0); g.lineTo(i + g.canvas.height, g.canvas.height); g.stroke();
            g.beginPath(); g.moveTo(i + g.canvas.height, 0); g.lineTo(i, g.canvas.height); g.stroke();
        }
        // facetas lisas (mais claras) nas pontas e no alto
        pol([[-128.5, 46], [-124, 60], [-92, 60], [-108, 28], [-128.5, 18]], '#202226');
        pol([[-128.5, -46], [-66, -59], [-84, -44], [-128.5, -24]], '#17181b');
        pol([[134.5, 46], [128, 60], [98, 60], [116, 30], [134.5, 26]], '#202226');
        pol([[134.5, -44], [125, -59], [96, -59], [120, -34]], '#17181b');
        pol([[-92, 60], [-60, 60], [-62, 48], [-100, 40]], '#232529');
        pol([[54, 60], [98, 60], [104, 44], [70, 46]], '#232529');
        // aros escuros em volta das ventoinhas, com um friso claro
        for (const cx of centros) {
            const [px, py] = P(cx, 0);
            g.fillStyle = '#0d0e10';
            g.beginPath(); g.arc(px, py, (rHelice + 7) * K, 0, Math.PI * 2); g.fill();
            g.strokeStyle = '#4a4e55';
            g.lineWidth = 3;
            g.beginPath(); g.arc(px, py, (rHelice + 7) * K, Math.PI * 0.95, Math.PI * 1.55); g.stroke();
        }
        // linhas das facetas centrais (o "X" entre as ventoinhas)
        g.strokeStyle = '#43474e';
        g.lineWidth = 3;
        for (const linha of [[[-16, 59], [2, -6], [-12, -58]], [[22, 59], [8, 4], [26, -58]]]) {
            g.beginPath(); linha.forEach((p) => g.lineTo(...P(...p))); g.stroke();
        }
    });
    mapearCaixa(texCapa, X0, Y0, X1, Y1);
    const faceCapa = extrudar(forma, 7, [new THREE.MeshStandardMaterial({ map: texCapa, metalness: 0.15, roughness: 0.62 }), matCapa], { z0: zF - 7, chanfro: 0.8 });
    capa.add(faceCapa);
    // Peças em relevo: triângulo brilhante em cima, cunha brilhante embaixo e a barra do meio
    capa.add(extrudar(poligono([[-60, 59.5], [54, 59.5], [6, 37]]), 1.6, matBrilho, { z0: zF + 0.6, chanfro: 0.4 }));
    capa.add(extrudar(poligono([[-64, -58.5], [58, -58.5], [50, -50], [-38, -47]]), 1.6, matBrilho, { z0: zF + 0.6, chanfro: 0.4 }));
    capa.add(extrudar(poligono([[-15, 57], [21, 57], [8, 5], [25, -56], [-11, -56], [2, -6]]), 2.2, material(0x1a1b1e, 0.25, 0.55), { z0: zF + 0.4, chanfro: 0.5 }));
    // Aba de cima (a borda superior da capa é fechada)
    capa.add(caixa(L - 18, 3, 16, matCapa, 2, H / 2 - 1.5, zF - 9));
    // Ventoinhas: 11 pás translúcidas + tampa prateada
    const rotores = [];
    for (const cx of centros) {
        const v = new THREE.Group();
        v.position.set(cx, 0, zF - 6);
        const rotor = helice(rHelice - 1, 11, matPas, { raioCubo: 15, varredura: 0.6, passo: 0.42 });
        v.add(rotor);
        const cubo = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 5, 40).rotateX(Math.PI / 2).translate(0, 0, 2.5), matCubo);
        rotor.add(cubo);
        // anel escuro na tampa (no lugar do logo)
        rotor.add(new THREE.Mesh(new THREE.RingGeometry(9, 13.5, 40), material(0x1b1c1f, 0.5, 0.4)).translateZ(5.05));
        v.add(new THREE.Mesh(new THREE.TorusGeometry(rHelice + 0.5, 1, 8, 64), matPreto).translateZ(-1));
        capa.add(v);
        rotores.push(rotor);
    }

    // ---------- Dissipador: aletas + heatpipes de cobre ----------
    const aletas = [];
    for (let x = esq + 6; x <= L / 2 - 4; x += 2.2) aletas.push([x, -2, -0.5]);
    dissipador.add(instancias(new THREE.BoxGeometry(0.5, H - 18, 24), matAletas, aletas));
    // tubos: correm pela borda de baixo e sobem no fim (aparecem na área vazada)
    const tubo = (pts, z) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, z)), false, 'catmullrom', 0.2), 64, 3, 12), matCobre);
    dissipador.add(tubo([[esq + 45, -50], [esq + 120, -55], [esq + 196, -55], [esq + 205, -42], [esq + 206, 48]], -6));
    dissipador.add(tubo([[esq + 60, -52], [esq + 150, -57], [esq + 228, -56], [esq + 237, -42], [esq + 238, 48]], 2));
    dissipador.add(tubo([[esq + 82, -20], [esq + 92, 48], [esq + 133, 57], [esq + 174, 48], [esq + 184, -20]], -10));
    dissipador.add(tubo([[esq + 40, -44], [esq + 90, -54], [esq + 170, -54], [esq + 185, -30]], 8));
    // base de contato (sobre o chip)
    dissipador.add(caixa(46, 46, 4, material(0x9ea4ab, 1, 0.3), esq + 96, -6, zPCB + 3));

    // ---------- Circuito, contatos PCIe e conector de energia ----------
    pcb.add(caixa(fimPCB - esq - 2, 106, 1.6, matPCB, (esq + 2 + fimPCB) / 2, -3, zPCB));
    const xP = esq + RX7600.dedosPcie;
    pcie.add(caixa(85, 9, 1.6, matPCB, xP, -H / 2 - 3.5, zPCB));
    const contatos = [];
    for (let i = 0; i < 82; i++) {
        if (i >= 11 && i <= 12) continue;
        const x = xP - 41.5 + i;
        contatos.push([x, -H / 2 - 5, zPCB + 0.9], [x, -H / 2 - 5, zPCB - 0.9]);
    }
    pcie.add(instancias(new THREE.BoxGeometry(0.7, 6, 0.2), matOuro, contatos));
    energia.add(caixa(21, 9, 10, matPreto, fimPCB - 18, 50 + 4, zPCB + 7));
    energia.add(instancias(new THREE.BoxGeometry(3.2, 0.6, 3.2), material(0x2a2b2f, 0.1, 0.8),
        [0, 1, 2, 3].flatMap((i) => [[fimPCB - 26 + i * 5, 58.8, zPCB + 4.5], [fimPCB - 26 + i * 5, 58.8, zPCB + 9.5]])));

    // ---------- Backplate (só sobre o circuito) ----------
    backplate.add(caixa(fimPCB - esq - 2, 108, 1.4, material(0x111214, 0.6, 0.45), (esq + 2 + fimPCB) / 2, -2, zPCB - 1.6));
    const BX0 = esq + 2, BX1 = fimPCB, BY0 = -56, BY1 = 52;
    const texBack = texturaCanvas((BX1 - BX0) * 4, (BY1 - BY0) * 4, (g, w, h) => {
        g.fillStyle = '#121315';
        g.fillRect(0, 0, w, h);
        // faixas claras com "dobras" (u e v de 0 a 1, v = 0 embaixo)
        const faixa = (pts, larg, cor) => {
            g.strokeStyle = cor; g.lineWidth = larg; g.lineJoin = 'miter';
            g.beginPath(); pts.forEach(([u, v]) => g.lineTo(u * w, (1 - v) * h)); g.stroke();
        };
        faixa([[0, 0.66], [0.5, 0.66], [0.6, 0.75], [1, 0.75]], 9, '#dfe2e6');
        faixa([[0, 0.7], [0.45, 0.7]], 2, '#8d9299');
        faixa([[0, 0.36], [0.33, 0.36], [0.42, 0.25], [1, 0.25]], 14, '#dfe2e6');
        faixa([[0.05, 0.3], [0.3, 0.3], [0.36, 0.22]], 2, '#8d9299');
        faixa([[0.15, 0.14], [0.55, 0.14], [0.62, 0.06], [1, 0.06]], 5, '#a9aeb5');
        faixa([[0.56, 0.86], [1, 0.86]], 3, '#8d9299');
        // parafusos
        for (const [u, v] of [[0.2, 0.04], [0.5, 0.04], [0.83, 0.1], [0.33, 0.15], [0.62, 0.15], [0.05, 0.96], [0.34, 0.95], [0.83, 0.93], [0.33, 0.72], [0.62, 0.72]]) {
            g.fillStyle = '#3a3d42'; g.beginPath(); g.arc(u * w, (1 - v) * h, 9, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#1b1c1f'; g.beginPath(); g.arc(u * w, (1 - v) * h, 5, 0, Math.PI * 2); g.fill();
        }
    });
    mapearCaixa(texBack, BX0, BY0, BX1, BY1);
    const decalque = new THREE.Mesh(new THREE.ShapeGeometry(poligono([[BX0, BY0], [BX1, BY0], [BX1, BY1], [BX0, BY1]])),
        new THREE.MeshStandardMaterial({ map: texBack, metalness: 0.55, roughness: 0.45, side: THREE.BackSide }));
    decalque.position.z = zPCB - 2.35;
    backplate.add(decalque);
    // moldura preta da área vazada (atrás das aletas)
    backplate.add(caixa(L / 2 - fimPCB, 4, 2, matCapa, (L / 2 + fimPCB) / 2, H / 2 - 2, zPCB - 1));
    backplate.add(caixa(L / 2 - fimPCB, 4, 2, matCapa, (L / 2 + fimPCB) / 2, -H / 2 + 2, zPCB - 1));
    backplate.add(caixa(3, H, 2, matCapa, L / 2 - 1.5, 0, zPCB - 1));

    // ---------- Suporte prateado com recortes e as 4 saídas ----------
    const altSup = 120, largSup = 40;
    const ySup = altSup / 2 - H / 2 - 8, zSup = zPCB + largSup / 2 - 6;
    const texSup = texturaCanvas(largSup * 6, altSup * 6, (g, w, h) => {
        const grad = g.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, '#c7cbd0'); grad.addColorStop(0.5, '#e6e8eb'); grad.addColorStop(1, '#b8bdc3');
        g.fillStyle = grad;
        g.fillRect(0, 0, w, h);
        // recortes angulares de ventilação (lado das ventoinhas = metade direita do desenho)
        g.fillStyle = '#0b0c0e';
        for (let i = 0; i < 9; i++) {
            const y = 60 + i * 72;
            g.beginPath();
            g.moveTo(w * 0.55, y); g.lineTo(w * 0.92, y + 10); g.lineTo(w * 0.92, y + 38); g.lineTo(w * 0.55, y + 48); g.lineTo(w * 0.6, y + 24);
            g.closePath(); g.fill();
        }
    });
    const placaSup = new THREE.Mesh(new THREE.PlaneGeometry(largSup, altSup), new THREE.MeshStandardMaterial({ map: texSup, metalness: 0.9, roughness: 0.3, side: THREE.DoubleSide }));
    placaSup.rotation.y = -Math.PI / 2;
    placaSup.position.set(esq - 4, ySup, zSup);
    suporte.add(placaSup);
    suporte.add(caixa(10, 1, largSup, material(0xc8ccd1, 1, 0.3), esq - 9, ySup + altSup / 2, zSup));
    // saídas (de baixo para cima): DP, HDMI, DP, DP
    for (const [y, tipo] of [[-40, 'DP'], [-18, 'HDMI'], [4, 'DP'], [26, 'DP']]) {
        const larg = tipo === 'HDMI' ? 15 : 16, alt = tipo === 'HDMI' ? 5.5 : 6.2;
        const f = tipo === 'HDMI'
            ? poligono([[-larg / 2, alt / 2], [larg / 2, alt / 2], [larg / 2, -alt / 2 + 1.5], [larg / 2 - 1.5, -alt / 2], [-larg / 2 + 1.5, -alt / 2], [-larg / 2, -alt / 2 + 1.5]])
            : poligono([[-larg / 2, alt / 2], [larg / 2, alt / 2], [larg / 2, -alt / 2], [-larg / 2 + 2, -alt / 2], [-larg / 2, -alt / 2 + 2]]);
        const porta = extrudar(f, 9, matPreto);
        // forma: x → altura da placa (Y), y → espessura (Z); a extrusão entra na placa (+X)
        porta.geometry.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)));
        porta.position.set(esq - 4.5, y, zPCB + 6);
        suporte.add(porta);
        suporte.add(caixa(0.6, larg - 5, 1.6, material(0x9da3aa, 1, 0.3), esq - 4.6, y, zPCB + 6));
    }

    gpu.userData.atualizar = (dt) => { for (const r of rotores) r.rotation.z -= dt * 5; };
    return gpu;
}


// =====================================================
// PLACA-MÃE: MSI B650 Gaming Plus WiFi (ATX, AM5, DDR5)
// Deitada como a genérica (Y para cima, topo em -Z, painel traseiro em -X).
// Medidas em mm tiradas da foto, a partir do canto de cima à esquerda.
// =====================================================

function criarB650GamingPlus(opcoes = {}) {
    const o = { formato: 'ATX', soquete: 'AM5', memoria: 'DDR5', nivel: 'medio', wifi: true, ...opcoes, medidas: MEDIDAS_B650_GAMING_PLUS };
    const mae = new THREE.Group();
    const W = 244, D = 305, y0 = 1.6;
    const X = (x) => x - W / 2, Z = (z) => z - D / 2;     // mm da foto → coordenadas
    const anc = ancorasPlacaMae(o);
    mae.userData.ancoras = anc;

    const matSlot = material(0x111215, 0.1, 0.6);
    const matMetal = material(0xaeb3ba, 1, 0.35);
    const matPreto = material(0x16171a, 0.2, 0.6);
    const matCinzaLado = material(0x5d6168, 0.85, 0.35);

    const pcb = parte(mae, 'Placa (PCB)', 'Placa ATX de 244 × 305 mm, preta, com 6 camadas de trilhas de cobre.', [0, -20, 0]);
    const soquete = parte(mae, 'Soquete AM5', 'Soquete LGA 1718: os pinos ficam aqui e a moldura prateada prende o processador Ryzen 7000/8000/9000.', [0, 32, 0]);
    const vrm = parte(mae, 'Dissipadores do VRM', 'Dissipadores cinza com faixas diagonais sobre os reguladores de tensão, em "L" em volta do soquete.', [0, 46, 0]);
    const slotsRam = parte(mae, 'Slots DDR5', '4 slots DDR5 pretos (até 192 GB).', [0, 26, 0]);
    const slotsPcie = parte(mae, 'Slots PCIe', 'O x16 de cima é reforçado com metal (para a placa de vídeo); embaixo há um x1 e outro x16 (elétrico x4).', [0, 26, 0]);
    const m2 = parte(mae, 'M.2 com dissipador', 'Dois M.2: o de cima fica sob a chapa com o raio; o de baixo é aberto.', [0, 40, 0]);
    const chipset = parte(mae, 'Chipset B650', 'Dissipador quadrado de cantos cortados sobre o chipset B650.', [0, 36, 0]);
    const painel = parte(mae, 'Painel traseiro e Wi-Fi', 'Capa cinza sobre as portas: USB, HDMI, DisplayPort, rede 2,5G, Wi-Fi 6E (os dois conectores dourados) e áudio.', [-34, 0, 0]);

    // ---------- PCB com o desenho de trilhas e componentes ----------
    const texPCB = texturaCanvas(W * 4, D * 4, (g, w, h) => {
        g.fillStyle = '#121316';
        g.fillRect(0, 0, w, h);
        // trilhas e serigrafia discreta
        g.strokeStyle = '#1d2024';
        g.lineWidth = 2;
        for (let i = 0; i < 70; i++) {
            const x = (i * 137) % w, y = (i * 263) % h;
            g.beginPath(); g.moveTo(x, y); g.lineTo(x + 60, y); g.lineTo(x + 90, y + 30); g.stroke();
        }
        g.strokeStyle = '#a07a3c';         // filete dourado na borda esquerda (como na foto)
        g.lineWidth = 2;
        g.beginPath(); g.moveTo(108, 1590); g.lineTo(108, 1180); g.lineTo(140, 1150); g.lineTo(140, 760); g.stroke();
        // componentes pequenos (SMD) espalhados
        for (let i = 0; i < 520; i++) {
            const x = (i * 97.3) % w, y = (i * 211.7) % h;
            g.fillStyle = i % 11 === 0 ? '#7a6a4c' : i % 3 ? '#26292d' : '#3a3e44';
            g.fillRect(x, y, 6 + (i % 3) * 3, 4 + (i % 2) * 3);
        }
        // contornos brancos da serigrafia (sem texto)
        g.strokeStyle = 'rgba(220,224,230,0.55)';
        g.lineWidth = 2;
        for (const [x, y, a, b] of [[400, 1180, 60, 40], [700, 1270, 70, 30], [520, 905, 100, 30], [880, 650, 40, 60], [180, 1250, 120, 28]]) g.strokeRect(x, y, a, b);
    });
    mapearCaixa(texPCB, -W / 2, -D / 2, W / 2, D / 2);
    const placa = extrudar(retanguloArredondado(W, D, 1.5), 1.6, [new THREE.MeshStandardMaterial({ map: texPCB, metalness: 0.25, roughness: 0.6 }), material(0x0e0f11, 0.2, 0.7)]);
    placa.rotation.x = -Math.PI / 2;
    pcb.add(placa);
    const furos = [[6.5, 10], [W - 6.5, 10], [6.5, 160], [W - 6.5, 160], [110, 10], [110, 160], [6.5, D - 6.5], [W - 6.5, D - 6.5], [110, D - 6.5]];
    pcb.add(instancias(new THREE.CylinderGeometry(3.2, 3.2, 0.25, 16), matMetal, furos.map(([x, z]) => [X(x), y0 + 0.1, Z(z)])));

    // ---------- Soquete AM5 ----------
    const [sx, sz] = [anc.sx, anc.sz];
    const moldura = (lx, lz, borda) => {
        const f = retanguloArredondado(lx, lz, 3);
        const furo = new THREE.Path();
        retanguloArredondado(lx - borda * 2, lz - borda * 2, 2, furo);
        f.holes.push(furo);
        return f;
    };
    const base = extrudar(moldura(70, 92, 9), 4, matPreto);
    base.rotation.x = -Math.PI / 2;
    base.position.set(sx, y0, sz);
    soquete.add(base);
    soquete.add(caixa(52, 2.4, 52, material(0x1b1c20, 0.5, 0.4), sx, y0 + 1.2, sz));
    const placaPressao = extrudar(moldura(56, 58, 7), 1.2, matMetal);
    placaPressao.rotation.x = -Math.PI / 2;
    placaPressao.position.set(sx, y0 + 2.6, sz);
    soquete.add(placaPressao);
    soquete.add(caixaArredondada(40, 1.2, 40, 0.5, material(0x0c0d0f, 0.3, 0.5), sx, y0 + 3.4, sz));   // capa de proteção preta
    const alavanca = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
        new THREE.Vector3(sx + 31, y0 + 3, sz - 30), new THREE.Vector3(sx + 31, y0 + 3, sz + 24), new THREE.Vector3(sx + 27, y0 + 3, sz + 38),
    ]), 24, 1, 8), matMetal);
    soquete.add(alavanca);
    // capacitores em volta do soquete
    const caps = [];
    for (let i = 0; i < 6; i++) caps.push([X(80), y0 + 3.5, Z(58 + i * 10)]);
    for (let i = 0; i < 6; i++) caps.push([X(100 + i * 11), y0 + 3.5, Z(150)]);
    soquete.add(instancias(new THREE.CylinderGeometry(3, 3, 7, 16), material(0x1d1e22, 0.6, 0.35), caps));

    // ---------- VRM: capa do painel + dissipador de cima ----------
    const texPainel = texturaListrada(80, 160, { raio: true });
    mapearCaixa(texPainel, X(-3), D / 2 - 160, X(77), D / 2 - 8);
    painel.add(pecaDeCima([[-3, 8], [55, 8], [77, 30], [77, 150], [62, 160], [-3, 160]], 36, [new THREE.MeshStandardMaterial({ map: texPainel, metalness: 0.75, roughness: 0.38 }), matCinzaLado], { chanfro: 1 }));
    const texVrm = texturaListrada(80, 32, { pontos: false, angulo: -0.7 });
    mapearCaixa(texVrm, X(78), D / 2 - 32, X(158), D / 2);
    vrm.add(pecaDeCima([[78, 2], [158, 2], [158, 22], [148, 32], [88, 32], [78, 22]], 26, [new THREE.MeshStandardMaterial({ map: texVrm, metalness: 0.75, roughness: 0.38 }), matCinzaLado], { chanfro: 1 }));
    // indutores (chokes) e conectores de 8 pinos do processador
    vrm.add(instancias(new THREE.BoxGeometry(7, 6, 7), material(0x2a2b2e, 0.3, 0.6), [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [X(88 + i * 8.5), y0 + 3, Z(38)])));
    pcb.add(caixa(16, 12, 9, matSlot, X(20), y0 + 6, Z(8)));
    pcb.add(caixa(16, 12, 9, matSlot, X(38), y0 + 6, Z(8)));

    // ---------- Painel traseiro: portas em -X ----------
    const portas = [
        [18, 6, 12, 0x1b1c1f], [32, 14, 7, 0x111214], [44, 15, 5.5, 0x111214],                       // botão, DisplayPort, HDMI
        [60, 16, 14, 0x2a2b2e], [76, 13, 5, 0xc8282e], [84, 13, 5, 0xc8282e], [96, 9, 3.5, 0x111214],  // rede, USB vermelhas, USB-C
        [108, 13, 5, 0x2a5bd7], [116, 13, 5, 0x2a5bd7], [126, 13, 5, 0x2a5bd7], [134, 13, 5, 0x2a5bd7],
    ];
    for (const [z, larg, alt, cor] of portas) painel.add(caixa(3, alt, larg, material(cor, 0.2, 0.5), X(-4.5), y0 + 9 + alt / 2, Z(z)));
    // antenas Wi-Fi (douradas) e áudio colorido
    for (const z of [100, 113]) painel.add(new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 10, 16).rotateZ(Math.PI / 2).translate(X(-9), y0 + 28, Z(z)), material(COR.ouro, 1, 0.28)));
    [0x2a5bd7, 0x3ddc5a, 0xf08cb4, 0xf07a28, 0x111214, 0x8a9099].forEach((cor, i) => {
        painel.add(new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 4, 16).rotateZ(Math.PI / 2).translate(X(-4.5), y0 + (i % 2 ? 22 : 12), Z(140 + Math.floor(i / 2) * 7)), material(cor, 0.2, 0.5)));
    });

    // ---------- Slots de memória e conector de 24 pinos ----------
    for (const x of anc.ram.xs) {
        slotsRam.add(caixa(6, 8, 140, matSlot, x, y0 + 4, anc.ram.z));
        slotsRam.add(caixa(6, 10, 6, matSlot, x, y0 + 5, anc.ram.z - 73));
        slotsRam.add(caixa(6, 10, 6, matSlot, x, y0 + 5, anc.ram.z + 73));
    }
    pcb.add(caixa(9, 12, 52, matSlot, X(239.5), y0 + 6, Z(101)));
    pcb.add(instancias(new THREE.BoxGeometry(9, 8, 7), matSlot, [0, 1, 2, 3].map((i) => [X(239.5), y0 + 4, Z(203 + i * 8)])));   // SATA
    pcb.add(instancias(new THREE.BoxGeometry(14, 7, 5), matSlot, [70, 105, 140, 175, 210].map((x) => [X(x), y0 + 3.5, Z(298)])));   // conectores do painel frontal
    pcb.add(new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 3, 32).translate(X(193), y0 + 1.5, Z(273)), material(0xc9cdd2, 1, 0.25)));  // bateria
    pcb.add(caixa(8, 1.4, 8, material(0x2a2c30, 0.4, 0.5), X(115), y0 + 0.7, Z(221)));

    // ---------- Slots PCIe ----------
    slotsPcie.add(caixa(89, 11, 8, matMetal, anc.pcie.x, y0 + 5.5, anc.pcie.z));              // x16 reforçado
    slotsPcie.add(caixa(7, 12, 8, matSlot, anc.pcie.x + 50, y0 + 6, anc.pcie.z));
    slotsPcie.add(caixa(32, 11, 7.5, matSlot, X(60), y0 + 5.5, Z(262)));                        // x1
    slotsPcie.add(caixa(89, 11, 7.5, matSlot, anc.pcie.x, y0 + 5.5, Z(281)));                  // x16 de baixo
    slotsPcie.add(caixa(7, 12, 8, matSlot, anc.pcie.x + 50, y0 + 6, Z(281)));

    // ---------- M.2: chapa de cima e o slot aberto de baixo ----------
    const texM2 = texturaListrada(120, 28, { pontos: false, angulo: -1.1, raio: true });
    mapearCaixa(texM2, X(40), D / 2 - 194, X(160), D / 2 - 166);
    m2.add(pecaDeCima([[48, 166], [160, 166], [152, 194], [40, 194]], 6, [new THREE.MeshStandardMaterial({ map: texM2, metalness: 0.75, roughness: 0.38 }), matCinzaLado], { chanfro: 0.8 }));
    m2.add(caixa(4, 4, 22, matSlot, anc.m2.x - 41, y0 + 2, anc.m2.z));          // conector M.2
    m2.add(new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 4, 12).translate(anc.m2.x + 40, y0 + 2, anc.m2.z), matMetal));   // suporte do parafuso

    // ---------- Chipset ----------
    const c = 30, k = 9;
    const texChip = texturaListrada(60, 60, { pontos: false, angulo: -0.78, raio: false });
    mapearCaixa(texChip, X(166), D / 2 - 249, X(226), D / 2 - 189);
    chipset.add(pecaDeCima([[196 - c + k, 219 - c], [196 + c - k, 219 - c], [196 + c, 219 - c + k], [196 + c, 219 + c - k], [196 + c - k, 219 + c], [196 - c + k, 219 + c], [196 - c, 219 + c - k], [196 - c, 219 - c + k]],
        10, [new THREE.MeshStandardMaterial({ map: texChip, metalness: 0.75, roughness: 0.38 }), matCinzaLado], { chanfro: 1 }));

    return mae;
}


// =====================================================
// PROCESSADOR: AMD Ryzen 5 5500 (AM4, pinos embaixo)
// Tampa cinza-quente com cantos bem arredondados, em degrau,
// sobre o substrato escuro. Sem a gravação da marca.
// =====================================================

function criarRyzen5500() {
    const cpu = new THREE.Group();
    const ihs = parte(cpu, 'Tampa metálica (IHS)', 'Tampa de cobre niquelado que espalha o calor dos 6 núcleos para o cooler.', [0, 16, 0]);
    const substrato = parte(cpu, 'Substrato', 'Placa de 40 × 40 mm que liga o chip (escondido sob a tampa) aos 1331 pinos.', [0, 0, 0]);
    const pinos = parte(cpu, 'Pinos (PGA)', 'Os 1331 pinos dourados entram nos furinhos do soquete AM4. O triângulo marca o lado certo.', [0, -14, 0]);

    const matSub = material(0x1c231f, 0.3, 0.5);
    const matOuro = material(COR.ouro, 1, 0.3);
    // tampa com riscos de usinagem sutis
    const tex = texturaCanvas(512, 512, (g, w, h) => {
        const grad = g.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#b3aca6'); grad.addColorStop(0.5, '#9d9690'); grad.addColorStop(1, '#8a837e');
        g.fillStyle = grad;
        g.fillRect(0, 0, w, h);
        g.globalAlpha = 0.07;
        for (let i = 0; i < 400; i++) {
            g.strokeStyle = i % 2 ? '#ffffff' : '#000000';
            g.beginPath(); g.arc(w * 0.3, h * 1.4, 200 + i * 2.2, 0, Math.PI * 2); g.stroke();
        }
    });
    mapearCaixa(tex, -17.5, -17.5, 17.5, 17.5);
    const matIHS = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.85, roughness: 0.42 });
    const matIHSLado = material(0x8f8883, 0.9, 0.38);

    substrato.add(caixa(40, 1.2, 40, matSub, 0, 0.6, 0));
    // filete dourado na borda do substrato
    const borda = retanguloArredondado(40, 40, 0.5);
    const furoBorda = new THREE.Path();
    retanguloArredondado(39.2, 39.2, 0.5, furoBorda);
    borda.holes.push(furoBorda);
    const filete = extrudar(borda, 0.05, material(0x9c7a3a, 1, 0.4));
    filete.rotation.x = -Math.PI / 2;
    filete.position.y = 1.2;
    substrato.add(filete);

    const degrau = extrudar(retanguloArredondado(37, 37, 6), 1.1, matIHSLado);
    degrau.rotation.x = -Math.PI / 2;
    degrau.position.y = 1.2;
    ihs.add(degrau);
    const topo = extrudar(retanguloArredondado(34, 34, 5), 1.6, [matIHS, matIHSLado], { chanfro: 0.5 });
    topo.rotation.x = -Math.PI / 2;
    topo.position.y = 2.3;
    ihs.add(topo);

    const tri = new THREE.Mesh(new THREE.ShapeGeometry(poligono([[0, 0], [3, 0], [0, 3]])), matOuro);
    tri.rotation.x = -Math.PI / 2;
    tri.position.set(-19.3, 1.22, 19.3);
    substrato.add(tri);

    const lista = [];
    const passo = 1.0, n = 37;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const x = (i - (n - 1) / 2) * passo, z = (j - (n - 1) / 2) * passo;
        if (Math.abs(x) < 6 && Math.abs(z) < 6) continue;
        if (i === 0 && j === n - 1) continue;           // canto do triângulo
        lista.push([x, -0.8, z]);
    }
    pinos.add(instancias(new THREE.CylinderGeometry(0.13, 0.13, 1.6, 6), matOuro, lista));
    return cpu;
}


// =====================================================
// SSD: Husky ThunderBoost 512GB (M.2 2280 NVMe)
// Placa preta com uma etiqueta preta grande. Só textos neutros.
// =====================================================

function criarHuskyThunderBoost() {
    const ssd = new THREE.Group();
    const pcb = parte(ssd, 'Placa M.2 2280', 'Placa preta de 22 × 80 mm que encaixa direto na placa-mãe, sem cabos.', [0, 0, 0]);
    const conector = parte(ssd, 'Conector M.2 (chave M)', 'Contatos dourados ligados a 4 linhas PCIe 3.0: até 2200 MB/s de leitura.', [-14, 0, 0]);
    const etiquetaParte = parte(ssd, 'Etiqueta', 'Etiqueta preta grande que cobre o controlador e os chips de memória.', [0, 14, 0]);

    const forma = new THREE.Shape();
    forma.moveTo(-40, -11); forma.lineTo(40, -11); forma.lineTo(40, -1.75);
    forma.absarc(40, 0, 1.75, -Math.PI / 2, Math.PI / 2, true);
    forma.lineTo(40, 11); forma.lineTo(-40, 11); forma.lineTo(-40, 5.6); forma.lineTo(-36, 5.6); forma.lineTo(-36, 4.4); forma.lineTo(-40, 4.4);
    forma.closePath();
    const tex = texturaCanvas(800, 220, (g, w, h) => {
        g.fillStyle = '#111214';
        g.fillRect(0, 0, w, h);
        for (let i = 0; i < 160; i++) {
            const x = (i * 53.7) % w, y = (i * 97.1) % h;
            g.fillStyle = i % 4 === 0 ? '#b98a4a' : '#2b2e33';
            g.fillRect(x, y, 9, 5);
        }
        // vias douradas perto da meia-lua
        g.fillStyle = '#c99a4c';
        for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(w - 30 - (i % 2) * 20, 40 + Math.floor(i / 2) * 50, 7, 0, Math.PI * 2); g.fill(); }
    });
    mapearCaixa(tex, -40, -11, 40, 11);
    const placa = extrudar(forma, 0.8, [new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.2 }), material(0x0d0e10, 0.2, 0.6)]);
    placa.rotation.x = -Math.PI / 2;
    pcb.add(placa);

    const texEtiqueta = texturaCanvas(1024, 288, (g, w, h) => {
        g.fillStyle = '#1a1b1e';
        g.fillRect(0, 0, w, h);
        g.fillStyle = '#e9ebee';
        g.textBaseline = 'middle';
        g.font = '500 34px "Segoe UI", Arial, sans-serif';
        g.fillText('Leitura  2200 MB/s', 60, 120);
        g.fillText('Gravação  1600 MB/s', 60, 160);
        g.font = '600 64px "Segoe UI", Arial, sans-serif';
        g.fillText('M.2 NVMe  |  512GB', 60, 232);
        g.font = '500 20px "Segoe UI", Arial, sans-serif';
        g.fillText('PCIe 3.0 x4', 780, 238);
    });
    const etiqueta = new THREE.Mesh(new THREE.BoxGeometry(68.6, 0.12, 19.2), [
        material(0x1a1b1e), material(0x1a1b1e), new THREE.MeshStandardMaterial({ map: texEtiqueta, roughness: 0.75 }),
        material(0x1a1b1e), material(0x1a1b1e), material(0x1a1b1e),
    ]);
    etiqueta.position.set(1.6, 2.2, 0);
    etiquetaParte.add(etiqueta);
    pcb.add(caixa(66, 1.3, 17, material(COR.chip, 0.3, 0.45), 1.6, 1.45, 0));     // chips sob a etiqueta

    const contatos = [];
    for (let z = -10.25; z <= 10.25; z += 0.5) {
        if (z > 4.1 && z < 5.9) continue;
        contatos.push([-38.4, 0.83, z], [-38.4, -0.03, z]);
    }
    conector.add(instancias(new THREE.BoxGeometry(3, 0.05, 0.3), material(COR.ouro, 1, 0.3), contatos));
    return ssd;
}


// =====================================================
// COOLER: Rise Mode Temp 8 Black ARGB (torre dupla, 6 heatpipes)
// Como o genérico: base em y = 0, ventoinha na frente (+Z).
// =====================================================

function criarTemp8() {
    const cooler = new THREE.Group();
    const W = 126;                     // largura das aletas (X)
    const yA = 42, yT = 150;           // aletas: de baixo até a tampa
    const torres = [-34, 34], prof = 46;
    const luzes = [];

    const base = parte(cooler, 'Base e fixação', 'Base que encosta no processador, com a barra de fixação e os parafusos com mola (AM4/AM5 e Intel).', [0, -34, 0]);
    const tubos = parte(cooler, 'Heatpipes (6)', 'Seis tubos pretos que levam o calor da base até as duas torres de aletas.', [0, 0, 0]);
    const aletas = parte(cooler, 'Duas torres de aletas', 'Aletas pretas em duas torres: o ar da ventoinha passa pela primeira e depois pela segunda.', [0, 18, 0]);
    const tampa = parte(cooler, 'Tampa com display e ARGB', 'Tampa cinza-escura com LED ARGB nas bordas e um mostrador digital de temperatura.', [0, 44, 0]);
    const ventoinhaParte = parte(cooler, 'Ventoinha ARGB 120 mm', 'Ventoinha de 120 mm com as pás iluminadas (ARGB), presa na frente da primeira torre.', [0, 0, 60]);

    const matPreto = material(0x1e2023, 0.6, 0.45);
    const matAleta = material(0x26282c, 0.75, 0.4);
    const matTubo = material(0x1a1b1e, 0.85, 0.3);

    // Base, barra e molas
    base.add(caixaArredondada(40, 6, 42, 1, material(0x2a2b2e, 0.9, 0.3), 0, 3, 0));
    base.add(caixaArredondada(30, 5, 50, 1.5, matPreto, 0, 9, 0));
    base.add(caixa(96, 3, 10, matPreto, 0, 13, 0));
    for (const x of [-44, 44]) {
        base.add(new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 18, 12).translate(x, 6, 0), material(0xc9cdd2, 1, 0.3)));
        for (let i = 0; i < 5; i++) base.add(new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.5, 6, 16).rotateX(Math.PI / 2).translate(x, 1 + i * 2.2, 0), material(0xb9bec5, 1, 0.3)));
    }

    // Heatpipes em "U": da base sobem pelas duas torres
    for (let i = 0; i < 6; i++) {
        const x = (i - 2.5) * 10;
        const zIn = torres[1] + (i % 2 ? 9 : -9);
        const curva = new THREE.CatmullRomCurve3([
            new THREE.Vector3(x, yT - 6, -zIn), new THREE.Vector3(x, yA - 4, -zIn), new THREE.Vector3(x, 18, -zIn * 0.7),
            new THREE.Vector3(x, 8, -6), new THREE.Vector3(x, 8, 6), new THREE.Vector3(x, 18, zIn * 0.7),
            new THREE.Vector3(x, yA - 4, zIn), new THREE.Vector3(x, yT - 6, zIn),
        ], false, 'catmullrom', 0.3);
        tubos.add(new THREE.Mesh(new THREE.TubeGeometry(curva, 96, 3, 10), matTubo));
    }

    // Torres: aletas finas + capas pretas angulares nas laterais
    const n = Math.floor((yT - yA) / 2.2);
    for (const z of torres) {
        const pos = [];
        for (let i = 0; i < n; i++) pos.push([0, yA + i * 2.2, z]);
        aletas.add(instancias(new THREE.BoxGeometry(W, 0.45, prof), matAleta, pos));
    }
    for (const lado of [-1, 1]) {
        // capa central (entre as torres) com os recortes da foto
        const capa = extrudar(poligono([[-16, yA - 2], [16, yA - 2], [20, yA + 18], [20, yT - 14], [14, yT], [-14, yT], [-20, yT - 14], [-20, yA + 18]]), 3, matPreto, { chanfro: 0.6 });
        capa.rotation.y = lado * Math.PI / 2;
        capa.position.x = lado * (W / 2);
        aletas.add(capa);
        // frisos angulares nas faces das torres
        for (const z of torres) {
            const friso = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
                new THREE.Vector3(lado * (W / 2 + 0.6), yA + 4, z + Math.sign(z) * 18), new THREE.Vector3(lado * (W / 2 + 0.6), yA + 30, z + Math.sign(z) * 6),
                new THREE.Vector3(lado * (W / 2 + 0.6), yT - 30, z + Math.sign(z) * 6), new THREE.Vector3(lado * (W / 2 + 0.6), yT - 6, z + Math.sign(z) * 18),
            ], false, 'chordal'), 24, 0.7, 6), material(0x3a3c41, 0.6, 0.4));
            aletas.add(friso);
        }
    }

    // Tampa: cinza-escura, LEDs nas bordas laterais e o display
    tampa.add(caixaArredondada(W + 2, 7, 120, 2, material(0x37393e, 0.55, 0.42), 0, yT + 3.5, 0));
    const tex = texturaArcoIris(256);
    tex.repeat.set(1, 1);
    const matLed = new THREE.MeshBasicMaterial({ map: tex });
    for (const lado of [-1, 1]) {
        // comprida em X e depois girada: assim o degradê corre ao longo da faixa
        const faixa = caixa(112, 2, 2.2, matLed, lado * (W / 2 - 2), yT + 7.2, 0);
        faixa.rotation.y = Math.PI / 2;
        tampa.add(faixa);
    }
    luzes.push({ atualizar: (dt) => { tex.offset.x -= dt * 0.25; } });
    const texDisplay = texturaCanvas(256, 128, (g, w, h) => {
        g.fillStyle = '#000000'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#f4f6f8';
        // dígitos de 7 segmentos: "42" + "°C"
        const seg = (x, y, liga) => {
            const S = [[4, 0, 26, 5], [28, 4, 5, 26], [28, 34, 5, 26], [4, 59, 26, 5], [0, 34, 5, 26], [0, 4, 5, 26], [4, 30, 26, 5]];
            liga.forEach((on, i) => { if (on) g.fillRect(x + S[i][0], y + S[i][1], S[i][2], S[i][3]); });
        };
        seg(60, 30, [0, 1, 1, 0, 0, 1, 1]);                // 4
        seg(110, 30, [1, 1, 0, 1, 1, 0, 1]);               // 2
        g.font = '700 34px Arial'; g.fillText('°C', 160, 80);
    });
    const display = new THREE.Mesh(new THREE.PlaneGeometry(24, 12), new THREE.MeshBasicMaterial({ map: texDisplay, transparent: true, blending: THREE.AdditiveBlending }));
    display.rotation.x = -Math.PI / 2;
    display.position.set(0, yT + 7.05, -10);
    tampa.add(display);

    // Ventoinha: moldura com cantos chanfrados + pás com o arco-íris
    const zV = torres[1] + prof / 2 + 1;
    const v = new THREE.Group();
    v.position.set(0, (yA + yT) / 2 + 2, zV + 25);
    const s = 60, c = 9;
    const moldura = poligono([[-s + c, -s], [s - c, -s], [s, -s + c], [s, s - c], [s - c, s], [-s + c, s], [-s, s - c], [-s, -s + c]]);
    const furo = new THREE.Path();
    furo.absarc(0, 0, 57, 0, Math.PI * 2, true);
    moldura.holes.push(furo);
    v.add(extrudar(moldura, 25, material(0x35373c, 0.3, 0.55), { z0: -25 }));
    v.add(instancias(new THREE.CylinderGeometry(3.4, 3.4, 1, 12).rotateX(Math.PI / 2), material(0x0b0c0e), [[-s + 7.5, -s + 7.5, 0.5], [s - 7.5, -s + 7.5, 0.5], [s - 7.5, s - 7.5, 0.5], [-s + 7.5, s - 7.5, 0.5]]));
    // Pás ARGB: cada pá com uma cor do arco-íris (e as cores vão andando)
    const matsPas = Array.from({ length: 9 }, () => new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.4, transparent: true, opacity: 0.92, side: THREE.DoubleSide }));
    let tempoCor = 0;
    const pintarPas = () => matsPas.forEach((m, i) => { m.emissive.setHSL((i / 9 + tempoCor * 0.1) % 1, 1, 0.55); m.color.copy(m.emissive); });
    pintarPas();
    const rotor = helice(55, 9, (i) => matsPas[i], { raioCubo: 24, varredura: 0.5, passo: 0.35, espessura: 1.2 });
    rotor.position.z = -8;
    rotor.add(new THREE.Mesh(new THREE.CylinderGeometry(22, 22, 4, 40).rotateX(Math.PI / 2).translate(0, 0, 4), material(0x0c0d0f, 0.3, 0.4)));
    rotor.add(new THREE.Mesh(new THREE.TorusGeometry(26, 2.6, 8, 48), new THREE.MeshBasicMaterial({ color: 0xf2f2ff })).translateZ(2));
    v.add(rotor);
    ventoinhaParte.add(v);

    cooler.userData.atualizar = (dt) => {
        rotor.rotation.z -= dt * 6;
        tempoCor += dt;
        pintarPas();
        for (const l of luzes) l.atualizar(dt);
    };
    return cooler;
}


// =====================================================
// MEMÓRIA: Rise Mode Z 16GB DDR4 3200MHz, branca (sem RGB)
// Em pé no plano XY, contatos para baixo (como a genérica).
// =====================================================

function criarRiseModeZ() {
    const ram = new THREE.Group();
    const C = 133.35, A = 31.25, E = 1.2, chave = 71.6;   // DDR4: chanfro a 71,6 mm

    const pcbParte = parte(ram, 'Placa e chips', 'Placa com os chips DDR4 de 16 GB, a 3200 MHz (CL19).', [0, 0, 0]);
    const contatosParte = parte(ram, 'Contatos dourados', '288 contatos. O chanfro fica numa posição diferente da DDR5: não encaixa no slot errado.', [0, -14, 0]);
    const frente = parte(ram, 'Dissipador (frente)', 'Dissipador branco com o meio facetado em "V" e recortes em forma de dentes no topo.', [0, 0, 15]);
    const verso = parte(ram, 'Dissipador (verso)', 'A mesma peça do outro lado do pente.', [0, 0, -15]);

    const forma = new THREE.Shape();
    forma.moveTo(0, 0); forma.lineTo(chave - 0.8, 0); forma.lineTo(chave - 0.8, 4); forma.lineTo(chave + 0.8, 4); forma.lineTo(chave + 0.8, 0);
    forma.lineTo(C, 0); forma.lineTo(C, 11); forma.absarc(C, 13, 2, -Math.PI / 2, Math.PI / 2, true); forma.lineTo(C, A);
    forma.lineTo(0, A); forma.lineTo(0, 15); forma.absarc(0, 13, 2, Math.PI / 2, -Math.PI / 2, true); forma.closePath();
    const geoPCB = new THREE.ExtrudeGeometry(forma, { depth: E, bevelEnabled: false });
    geoPCB.translate(-C / 2, 0, -E / 2);
    pcbParte.add(new THREE.Mesh(geoPCB, material(0x15171b, 0.2, 0.55)));
    pcbParte.add(instancias(new THREE.BoxGeometry(10, 8, 0.8), material(COR.chip, 0.3, 0.5), [-50, -35, -20, 20, 35, 50].flatMap((x) => [[x, 14, 1], [x, 14, -1]])));

    const contatos = [];
    for (let i = 0; i < 144; i++) {
        const x = -C / 2 + 5 + i * 0.85;
        if (Math.abs(x + C / 2 - chave) < 1.4) continue;
        contatos.push([x, 1.8, E / 2 + 0.03], [x, 1.8, -E / 2 - 0.03]);
    }
    contatosParte.add(instancias(new THREE.BoxGeometry(0.6, 3, 0.05), material(COR.ouro, 1, 0.3), contatos));

    // Perfil do dissipador (metade esquerda; a direita é o espelho):
    // corpo + 6 dentes com vãos inclinados + topo central mais alto
    const esquerda = [[-66.5, 5.6], [-66.5, 23], [-63, 26.5]];
    for (let i = 0; i < 6; i++) {
        const a = -58 + i * 5.5, b = a + 2.7;
        esquerda.push([a, 31.6], [b, 31.6]);
        if (i < 5) esquerda.push([b + 0.6, 22], [b + 2.6, 22]);   // vão inclinado entre dois dentes
    }
    esquerda.push([-24, 31.6]);
    const direita = esquerda.slice().reverse().map(([x, y]) => [-x, y]);
    const perfil = poligono([...esquerda, [-20.5, 34.4], [20.5, 34.4], ...direita]);
    const matBranco = material(0xeef0f2, 0.2, 0.36);
    const geoDiss = new THREE.ExtrudeGeometry(perfil, { depth: 1.6, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.35, bevelSegments: 2 });
    // facetas em relevo: o "V" largo embaixo e o bloco central
    const chevron = new THREE.ExtrudeGeometry(poligono([[-64, 19], [-38, 19], [-20, 13], [-11, 7.5], [11, 7.5], [20, 13], [38, 19], [64, 19], [64, 7], [-64, 7]]), { depth: 0.7, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.3, bevelSegments: 2 });
    const bloco = new THREE.ExtrudeGeometry(poligono([[-21, 22], [-16, 33.5], [16, 33.5], [21, 22], [12, 15], [-12, 15]]), { depth: 1.0, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.3, bevelSegments: 2 });
    for (const [grupo, lado] of [[frente, 1], [verso, -1]]) {
        const d = new THREE.Mesh(geoDiss, matBranco);
        d.position.z = lado * (E / 2 + 0.3);
        d.scale.z = lado;
        grupo.add(d);
        const zFace = lado * (E / 2 + 0.3 + 1.6 + 0.35);
        for (const g of [chevron, bloco]) {
            const m = new THREE.Mesh(g, matBranco);
            m.position.z = zFace;
            m.scale.z = lado;
            grupo.add(m);
        }
    }
    return ram;
}


// =====================================================
// GABINETE: Redragon Wideload Lite (duas câmaras, frente e lateral de vidro)
// Sem espelhamento: vidro em -X, frente em +Z, bandeja da placa em +X.
// A câmara de trás (fonte e discos) fica atrás da bandeja.
// =====================================================

function criarWideloadLite() {
    const anc = ancorasGabinete({ especifico: 'wideload-lite' });
    const { H, W, D } = anc;
    const bandeja = anc.bandejaX + 1;
    const gab = new THREE.Group();
    const yChao = -H / 2 + 34;                 // fundo da câmara (acima da faixa preta da base)

    const matChapa = material(0x141518, 0.5, 0.5);
    const matPreto = material(0x0b0c0e, 0.2, 0.7);
    const matVidro = new THREE.MeshPhysicalMaterial({ color: 0x9fb2c4, transparent: true, opacity: 0.13, roughness: 0.03, metalness: 0.1, depthWrite: false });
    const matFaixa = material(0x060607, 0.4, 0.15);

    const estrutura = parte(gab, 'Estrutura e câmara de trás', 'Estrutura de aço com duas câmaras: na da frente fica a placa-mãe; atrás da bandeja ficam a fonte, os discos e os cabos.', [0, 0, 0]);
    const vidro = parte(gab, 'Lateral de vidro', 'Vidro temperado que encosta no vidro da frente, sem coluna no canto (estilo "aquário").', [-110, 0, 0]);
    const vidroFrente = parte(gab, 'Vidro frontal', 'Segundo vidro, na frente. Com os dois vidros dá para ver tudo por dentro.', [0, 0, 90]);
    const painel = parte(gab, 'Painel de botões e portas', 'Coluna à direita da frente: botão de ligar, reset, áudio, USB e USB 3.0 (azul).', [40, 0, 60]);
    const telas = parte(gab, 'Telas de ventilação', 'Topo, fundo e lateral com furos em colmeia: o ar entra por baixo e pela lateral e sai por cima e por trás.', [0, 0, 0]);

    // Painéis com colmeia: alphaMap (furo = preto) + alphaTest
    // (áreas e buracos em mm, medidos a partir do canto de cima à esquerda da chapa)
    function chapaFurada(largura, altura, areas, { cor = 0x131417, raio = 3.4, buracos = [] } = {}) {
        const K = 2;
        const alfa = texturaCanvas(Math.round(largura * K), Math.round(altura * K), (g, w, h) => {
            g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
            for (const [x0, y0, x1, y1] of areas) desenharColmeia(g, w, h, raio * K, '#000000', { x0: x0 * K, y0: y0 * K, x1: x1 * K, y1: y1 * K });
            g.fillStyle = '#000000';
            for (const [x0, y0, x1, y1] of buracos) g.fillRect(x0 * K, y0 * K, (x1 - x0) * K, (y1 - y0) * K);
        }, { cores: false });
        return new THREE.Mesh(new THREE.PlaneGeometry(largura, altura),
            new THREE.MeshStandardMaterial({ color: cor, metalness: 0.45, roughness: 0.55, alphaMap: alfa, alphaTest: 0.5, side: THREE.DoubleSide }));
    }

    // ---------- Base, pés e topo ----------
    estrutura.add(caixa(W, 2, D, matChapa, 0, -H / 2 + 1, 0));
    estrutura.add(caixa(W - 6, 30, 4, matChapa, 0, -H / 2 + 17, -D / 2 + 2));
    const pe = poligono([[-34, 0], [34, 0], [24, -20], [-24, -20]]);
    for (const [x, z] of [[-W / 2 + 40, D / 2 - 45], [W / 2 - 45, D / 2 - 45], [-W / 2 + 40, -D / 2 + 45], [W / 2 - 45, -D / 2 + 45]]) {
        const m = extrudar(pe, 44, matPreto, { chanfro: 1.5, z0: -22 });
        m.position.set(x, -H / 2, z);
        estrutura.add(m);
    }
    const chao = chapaFurada(bandeja + W / 2 - 4, D - 8, [[8, 8, bandeja + W / 2 - 12, D - 16]]);
    chao.rotation.x = -Math.PI / 2;
    chao.position.set((-W / 2 + bandeja) / 2, yChao, 0);
    telas.add(chao);
    estrutura.add(caixa(W / 2 - bandeja, 2, D - 4, matChapa, (W / 2 + bandeja) / 2, yChao - 1, 0));   // piso da câmara de trás
    const topo = chapaFurada(W - 8, D - 8, [[16, 20, W - 30, D - 30]]);
    topo.rotation.x = -Math.PI / 2;
    topo.position.y = H / 2 - 1;
    telas.add(topo);
    // moldura fina preta do topo e coluna traseira esquerda
    for (const [w, h, d, x, y, z] of [[W, 6, 6, 0, H / 2 - 3, -D / 2 + 3], [6, 6, D, -W / 2 + 3, H / 2 - 3, 0], [W, 6, 6, 0, H / 2 - 3, D / 2 - 3], [6, 6, D, W / 2 - 3, H / 2 - 3, 0], [8, H - 4, 8, -W / 2 + 4, 0, -D / 2 + 4]]) {
        estrutura.add(caixa(w, h, d, matChapa, x, y, z));
    }

    // ---------- Lateral direita (fechada, com duas telas) ----------
    const lateral = chapaFurada(D - 4, H - 4, [[30, 40, D * 0.5, H - 60], [D * 0.62, H * 0.62, D - 30, H - 40]], { cor: 0x141518 });
    lateral.rotation.y = Math.PI / 2;
    lateral.position.x = W / 2 - 0.5;
    estrutura.add(lateral);

    // ---------- Traseira: ventoinha, painel da placa, 6 slots, fonte ----------
    // girada 180°: o lado esquerdo do desenho é a câmara de trás (+X)
    const traseira = chapaFurada(W - 4, H - 4, [[161, 25, 281, 145], [8, 40, 90, 230]], { cor: 0x141518, buracos: [[5, 244, 91, 394]] });
    traseira.rotation.y = Math.PI;
    traseira.position.z = -D / 2 + 0.5;
    estrutura.add(traseira);
    const ySlot0 = H / 2 - 25 - 198;
    for (let i = 0; i < 6; i++) {
        estrutura.add(caixa(118, 13, 1.5, material(0x2a2c30, 0.6, 0.4), bandeja - 70, ySlot0 - i * 20.32, -D / 2 - 0.5));
    }
    estrutura.add(caixa(45, 160, 1.5, matPreto, bandeja - 25, H / 2 - 25 - 92, -D / 2 - 0.3));   // abertura do painel da placa

    // ---------- Bandeja da placa-mãe (com passagens de cabo e tela na frente) ----------
    const altB = H / 2 - yChao - 2;
    const alfaB = texturaCanvas(Math.round(D * 2), Math.round(altB * 2), (g, w, h) => {
        g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#000000';
        // passagens de cabo (retângulos) ao lado e abaixo da placa
        for (const [x, y, a, b] of [[300 * 2, 40, 22, 70], [300 * 2, 200, 22, 90], [300 * 2, 380, 22, 90], [40, 600, 80, 22], [260, 600, 90, 22]]) g.fillRect(x, y, a, b);
        // tela na parte da frente (onde vão as ventoinhas laterais)
        desenharColmeia(g, w, h, 7, '#000000', { x0: w * 0.73, y0: 40, x1: w - 20, y1: h - 40 });
    }, { cores: false });
    const placaBandeja = new THREE.Mesh(new THREE.PlaneGeometry(D - 4, altB),
        new THREE.MeshStandardMaterial({ color: 0x15161a, metalness: 0.45, roughness: 0.55, alphaMap: alfaB, alphaTest: 0.5, side: THREE.DoubleSide }));
    placaBandeja.rotation.y = -Math.PI / 2;
    placaBandeja.position.set(bandeja, (H / 2 + yChao) / 2, 0);
    estrutura.add(placaBandeja);
    // parede da frente da câmara de trás (atrás do vidro da frente)
    estrutura.add(caixa(W / 2 - 32 - bandeja, H - 40, 2, matChapa, (bandeja + W / 2 - 32) / 2, 0, D / 2 - 12));
    // silhueta de uma placa (some quando a placa de verdade entra no "Monte seu PC")
    const silhueta = caixa(1.6, 305, 244, material(0x1d2026, 0.3, 0.6), bandeja - 3, H / 2 - 25 - 152.5, -D / 2 + 30 + 122);
    estrutura.add(silhueta);

    // ---------- Vidros com as faixas pretas impressas ----------
    vidro.add(caixa(4, H - 2, D - 2, matVidro, -W / 2 + 2, 0, 0));
    vidro.add(caixa(1, 16, D - 4, matFaixa, -W / 2 + 4.5, H / 2 - 9, 0));
    vidro.add(caixa(1, 34, D - 4, matFaixa, -W / 2 + 4.5, -H / 2 + 18, 0));
    const largFrente = W - 32;
    vidroFrente.add(caixa(largFrente, H - 2, 4, matVidro, -W / 2 + largFrente / 2, 0, D / 2 - 2));
    vidroFrente.add(caixa(largFrente - 4, 16, 1, matFaixa, -W / 2 + largFrente / 2, H / 2 - 9, D / 2 - 4.5));
    vidroFrente.add(caixa(largFrente - 4, 34, 1, matFaixa, -W / 2 + largFrente / 2, -H / 2 + 18, D / 2 - 4.5));

    // ---------- Coluna da frente com botões e portas ----------
    const xc = W / 2 - 16;
    painel.add(caixaArredondada(32, H, 10, 1.5, material(0x141518, 0.45, 0.45), xc, 0, D / 2 - 5));
    const matPorta = material(0x050506, 0.2, 0.7);
    painel.add(new THREE.Mesh(new THREE.CylinderGeometry(6.5, 6.5, 3, 32).rotateX(Math.PI / 2).translate(xc, H / 2 - 30, D / 2 + 1), material(0x2a2c30, 0.8, 0.3)));
    painel.add(new THREE.Mesh(new THREE.TorusGeometry(6.5, 0.5, 6, 32).translate(xc, H / 2 - 30, D / 2 + 2.6), new THREE.MeshBasicMaterial({ color: 0x8fb4ff })));
    painel.add(new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 2, 16).rotateX(Math.PI / 2).translate(xc, H / 2 - 52, D / 2 + 0.6), material(0x2a2c30, 0.8, 0.3)));
    painel.add(new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 2, 16).rotateX(Math.PI / 2).translate(xc, H / 2 - 70, D / 2 + 0.1), matPorta));
    painel.add(caixa(6, 13, 1, matPorta, xc, H / 2 - 92, D / 2 + 0.2));
    painel.add(caixa(6, 13, 1, material(0x2a5bd7, 0.2, 0.5), xc, H / 2 - 112, D / 2 + 0.2));

    gab.userData.direcaoCamera = [-1, 0.45, 1];
    gab.userData.silhueta = silhueta;
    gab.userData.vidro = vidro;
    gab.userData.ancoras = anc;
    return gab;
}


// Registro: chave (parâmetro "especifico") → gerador
export const ESPECIFICOS_PC = {
    'rx7600-challenger': criarRX7600Challenger,
    'b650-gaming-plus': criarB650GamingPlus,
    'ryzen-5500': criarRyzen5500,
    'husky-thunderboost': criarHuskyThunderBoost,
    'temp8': criarTemp8,
    'rise-z': criarRiseModeZ,
    'wideload-lite': criarWideloadLite,
};
