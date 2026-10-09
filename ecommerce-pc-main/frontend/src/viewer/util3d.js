import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/*
 * Peças de montar usadas por todos os geradores procedurais
 * (materiais, caixas, textos, instâncias, partes e a ventoinha).
 * Tudo em milímetros.
 */

// =====================================================
// Utilitários
// =====================================================

export function material(cor, metalness = 0, roughness = 0.5, extras = {}) {
    return new THREE.MeshStandardMaterial({ color: cor, metalness, roughness, ...extras });
}

// Cria uma caixa já posicionada
export function caixa(largura, altura, profundidade, mat, x = 0, y = 0, z = 0) {
    const malha = new THREE.Mesh(new THREE.BoxGeometry(largura, altura, profundidade), mat);
    malha.position.set(x, y, z);
    return malha;
}

export function caixaArredondada(largura, altura, profundidade, raio, mat, x = 0, y = 0, z = 0) {
    const geometria = new RoundedBoxGeometry(largura, altura, profundidade, 3, raio);
    const malha = new THREE.Mesh(geometria, mat);
    malha.position.set(x, y, z);
    return malha;
}

/**
 * Desenha texto num <canvas> e transforma em textura.
 * Usado para "serigrafias" e etiquetas.
 */
export function texturaTexto(linhas, { largura = 512, altura = 128, fundo = null, cor = '#fff' } = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext('2d');

    if (fundo) {
        ctx.fillStyle = fundo;
        ctx.fillRect(0, 0, largura, altura);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = cor;

    // linhas = [{ texto, tamanho, y (0 a 1), peso }]
    for (const linha of linhas) {
        ctx.font = `${linha.peso ?? 700} ${linha.tamanho}px "Segoe UI", Arial, sans-serif`;
        ctx.fillStyle = linha.cor ?? cor;
        ctx.fillText(linha.texto, largura / 2, altura * linha.y);
    }

    const textura = new THREE.CanvasTexture(canvas);
    textura.colorSpace = THREE.SRGBColorSpace;
    textura.anisotropy = 8;
    return textura;
}

/**
 * InstancedMesh: desenha N cópias da mesma geometria numa única
 * chamada de desenho (draw call). Ideal para pinos e contatos.
 * @param posicoes lista de [x, y, z]
 */
export function instancias(geometria, mat, posicoes) {
    const malha = new THREE.InstancedMesh(geometria, mat, posicoes.length);
    const matriz = new THREE.Matrix4();
    posicoes.forEach(([x, y, z], i) => {
        matriz.makeTranslation(x, y, z);
        malha.setMatrixAt(i, matriz);
    });
    malha.instanceMatrix.needsUpdate = true;
    return malha;
}

/**
 * Cria uma "parte" nomeada dentro do modelo (um sub-grupo).
 * As partes servem para a vista explodida (cada parte se afasta
 * pelo seu deslocamento, em mm) e para explicar a parte tocada.
 */
export function parte(raiz, nome, descricao, deslocamento) {
    const grupo = new THREE.Group();
    grupo.name = nome;
    grupo.userData.parte = { nome, descricao };
    grupo.userData.deslocamento = new THREE.Vector3(...deslocamento);
    raiz.add(grupo);
    (raiz.userData.partes ??= []).push(grupo);
    return grupo;
}

// Paleta compartilhada
export const COR = {
    ouro:      0xd4a93c,
    aluminio:  0xb9bec5,
    cobre:     0xb8733d,
    chip:      0x16171a,
    pcbVerde:  0x1e5a36,
    pcbPreto:  0x15171b,
    destaque:  0x29c4ff,
};



export function criarVentoinha(raio, matPas, matCubo, matAro) {
    const ventoinha = new THREE.Group();

    // Fundo escuro (dá a impressão de buraco no shroud)
    const fundo = new THREE.Mesh(
        new THREE.CylinderGeometry(raio + 1, raio + 1, 1, 48),
        material(0x060607, 0.1, 0.95)
    );
    fundo.rotation.x = Math.PI / 2;
    ventoinha.add(fundo);

    // Aro
    const aro = new THREE.Mesh(new THREE.TorusGeometry(raio + 1.5, 1.2, 12, 64), matAro);
    aro.position.z = 0.8;
    ventoinha.add(aro);

    // Rotor: cubo + pás (este grupo é o que gira)
    const rotor = new THREE.Group();
    rotor.position.z = 1;

    const cubo = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, 4, 40), matCubo);
    cubo.rotation.x = Math.PI / 2;
    cubo.position.z = 1.5;
    rotor.add(cubo);

    // Pá: forma curva extrudada (arco interno → arco externo deslocado)
    const forma = new THREE.Shape();
    const rInterno = 11, rExterno = raio - 1;
    forma.moveTo(rInterno * Math.cos(0), rInterno * Math.sin(0));
    forma.absarc(0, 0, rInterno, 0, 0.35, false);
    forma.lineTo(rExterno * Math.cos(0.85), rExterno * Math.sin(0.85));
    forma.absarc(0, 0, rExterno, 0.85, 0.4, true);
    forma.closePath();
    const geometriaPa = new THREE.ExtrudeGeometry(forma, { depth: 0.8, bevelEnabled: false });

    const NUM_PAS = 9;
    for (let i = 0; i < NUM_PAS; i++) {
        const pa = new THREE.Mesh(geometriaPa, matPas);
        pa.rotation.z = (i / NUM_PAS) * Math.PI * 2;
        rotor.add(pa);
    }

    ventoinha.add(rotor);
    ventoinha.userData.rotor = rotor;
    return ventoinha;
}



// =====================================================
// Ajudantes dos modelos fiéis (modelos-especificos.js)
// =====================================================

/** Desenha num <canvas> com a função dada e devolve a textura. */
export function texturaCanvas(largura, altura, desenhar, { repetir = false, cores = true } = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = largura;
    canvas.height = altura;
    desenhar(canvas.getContext('2d'), largura, altura);
    const textura = new THREE.CanvasTexture(canvas);
    if (cores) textura.colorSpace = THREE.SRGBColorSpace;
    textura.anisotropy = 8;
    if (repetir) textura.wrapS = textura.wrapT = THREE.RepeatWrapping;
    return textura;
}

/**
 * Formas extrudadas têm UV igual às coordenadas (em mm) da forma.
 * Isto ajusta a textura para cobrir exatamente o retângulo [x0,x1] × [y0,y1].
 */
export function mapearCaixa(textura, x0, y0, x1, y1) {
    textura.repeat.set(1 / (x1 - x0), 1 / (y1 - y0));
    textura.offset.set(-x0 / (x1 - x0), -y0 / (y1 - y0));
    return textura;
}

/** Shape a partir de uma lista de pontos [x, y]. */
export function poligono(pontos) {
    const forma = new THREE.Shape();
    forma.moveTo(...pontos[0]);
    for (const p of pontos.slice(1)) forma.lineTo(...p);
    forma.closePath();
    return forma;
}

/** Retângulo de cantos arredondados (centrado na origem). */
export function retanguloArredondado(largura, altura, raio, forma = new THREE.Shape()) {
    const x = -largura / 2, y = -altura / 2;
    forma.moveTo(x + raio, y);
    forma.lineTo(x + largura - raio, y);
    forma.quadraticCurveTo(x + largura, y, x + largura, y + raio);
    forma.lineTo(x + largura, y + altura - raio);
    forma.quadraticCurveTo(x + largura, y + altura, x + largura - raio, y + altura);
    forma.lineTo(x + raio, y + altura);
    forma.quadraticCurveTo(x, y + altura, x, y + altura - raio);
    forma.lineTo(x, y + raio);
    forma.quadraticCurveTo(x, y, x + raio, y);
    return forma;
}

/** Extrusão de uma forma já como malha (espessura no eixo Z, de z0 a z0 + espessura). */
export function extrudar(forma, espessura, mat, { chanfro = 0, z0 = 0, segmentos = 2, curvas = 24 } = {}) {
    const geo = new THREE.ExtrudeGeometry(forma, {
        depth: espessura, curveSegments: curvas,
        bevelEnabled: chanfro > 0, bevelThickness: chanfro, bevelSize: chanfro, bevelSegments: segmentos,
    });
    geo.translate(0, 0, z0);
    return new THREE.Mesh(geo, mat);
}

/** Desenha uma colmeia (furos sextavados) num canvas. */
export function desenharColmeia(ctx, largura, altura, raio, cor, { x0 = 0, y0 = 0, x1 = largura, y1 = altura } = {}) {
    const dx = raio * 1.85, dy = raio * 1.6;
    ctx.fillStyle = cor;
    for (let y = y0 + raio, linha = 0; y < y1 - raio * 0.5; y += dy, linha++) {
        for (let x = x0 + raio + (linha % 2) * dx / 2; x < x1 - raio * 0.5; x += dx) {
            ctx.beginPath();
            for (let k = 0; k < 6; k++) {
                const a = Math.PI / 6 + (k * Math.PI) / 3;
                ctx.lineTo(x + raio * 0.82 * Math.cos(a), y + raio * 0.82 * Math.sin(a));
            }
            ctx.fill();
        }
    }
}

/** Degradê de arco-íris (para faixas RGB que "correm"). */
export function texturaArcoIris(comprimento = 256) {
    return texturaCanvas(comprimento, 4, (g, w) => {
        const grad = g.createLinearGradient(0, 0, w, 0);
        ['#ff004c', '#ff9900', '#ffee00', '#22ff66', '#00c8ff', '#6a3cff', '#ff004c'].forEach((c, i, a) => grad.addColorStop(i / (a.length - 1), c));
        g.fillStyle = grad;
        g.fillRect(0, 0, w, 4);
    }, { repetir: true });
}
