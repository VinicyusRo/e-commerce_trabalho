import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/*
 * Modelos 3D genéricos gerados por código (sem arquivo .glb).
 * São usados como "prévia da categoria" quando o produto não tem
 * modelo próprio no banco (tabela modelo_3d, formato = 'procedural').
 *
 * Convenções:
 *  - Tudo é modelado em MILÍMETROS e no final o grupo é escalado
 *    por 0.001 → metros, a mesma unidade dos arquivos glTF.
 *  - Cada gerador devolve um THREE.Group.
 *  - Se o grupo tiver userData.atualizar(dt), o visualizador chama
 *    essa função a cada quadro (usado para girar as ventoinhas).
 */


// =====================================================
// Utilitários
// =====================================================

function material(cor, metalness = 0, roughness = 0.5, extras = {}) {
    return new THREE.MeshStandardMaterial({ color: cor, metalness, roughness, ...extras });
}

// Cria uma caixa já posicionada
function caixa(largura, altura, profundidade, mat, x = 0, y = 0, z = 0) {
    const malha = new THREE.Mesh(new THREE.BoxGeometry(largura, altura, profundidade), mat);
    malha.position.set(x, y, z);
    return malha;
}

function caixaArredondada(largura, altura, profundidade, raio, mat, x = 0, y = 0, z = 0) {
    const geometria = new RoundedBoxGeometry(largura, altura, profundidade, 3, raio);
    const malha = new THREE.Mesh(geometria, mat);
    malha.position.set(x, y, z);
    return malha;
}

/**
 * Desenha texto num <canvas> e transforma em textura.
 * Usado para "serigrafias" e etiquetas.
 */
function texturaTexto(linhas, { largura = 512, altura = 128, fundo = null, cor = '#fff' } = {}) {
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
function instancias(geometria, mat, posicoes) {
    const malha = new THREE.InstancedMesh(geometria, mat, posicoes.length);
    const matriz = new THREE.Matrix4();
    posicoes.forEach(([x, y, z], i) => {
        matriz.makeTranslation(x, y, z);
        malha.setMatrixAt(i, matriz);
    });
    malha.instanceMatrix.needsUpdate = true;
    return malha;
}

// Paleta compartilhada
const COR = {
    ouro:      0xd4a93c,
    aluminio:  0xb9bec5,
    cobre:     0xb8733d,
    chip:      0x16171a,
    pcbVerde:  0x1e5a36,
    pcbPreto:  0x15171b,
    destaque:  0x29c4ff,
};


// =====================================================
// PLACA DE VÍDEO (3 ventoinhas)
// Eixos: X = comprimento, Y = altura, Z = espessura
// =====================================================

function criarVentoinha(raio, matPas, matCubo, matAro) {
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

function criarPlacaDeVideo() {
    const gpu = new THREE.Group();

    const matShroud   = material(0x2a2d33, 0.6, 0.42);
    const matBackplate = material(0x1a1b1f, 0.7, 0.4);
    const matAletas   = material(COR.aluminio, 1, 0.35);
    const matSuporte  = material(0xc8ccd1, 1, 0.3);
    const matAro      = material(0x5d636c, 0.9, 0.35);
    const matOuro     = material(COR.ouro, 1, 0.3);
    const matPreto    = material(0x0e0f11, 0.1, 0.7);
    const matDestaque = material(COR.destaque, 0, 0.4, { emissive: COR.destaque, emissiveIntensity: 1.2 });

    // Shroud (capa frontal)
    gpu.add(caixaArredondada(260, 108, 18, 4, matShroud, 3.5, 0, 12));

    // Ventoinhas sobre a face frontal (z = 21)
    const ventoinhas = [-81.5, 3.5, 88.5].map((x) => {
        const v = criarVentoinha(39, material(0x4a4f57, 0.3, 0.5), matShroud, matAro);
        v.position.set(x, 0, 21);
        gpu.add(v);
        return v;
    });

    // Faixa luminosa na borda superior
    gpu.add(caixa(150, 2, 0.6, matDestaque, 3.5, 50, 21.3));

    // Dissipador: aletas finas repetidas (InstancedMesh)
    const posicoesAletas = [];
    for (let x = -120; x <= 128; x += 3) posicoesAletas.push([x, 0, -5.5]);
    gpu.add(instancias(new THREE.BoxGeometry(0.6, 100, 17), matAletas, posicoesAletas));

    // Heatpipes de cobre passando por cima das aletas
    const matCobre = material(COR.cobre, 1, 0.3);
    for (const z of [-10, -5, 0]) {
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 236, 16), matCobre);
        pipe.rotation.z = Math.PI / 2;
        pipe.position.set(4, 49, z);
        gpu.add(pipe);
    }

    // PCB e backplate
    gpu.add(caixa(250, 106, 1.6, material(COR.pcbPreto, 0.2, 0.6), -2, 0, -15));
    gpu.add(caixa(255, 110, 1.5, matBackplate, 0, 0, -16.6));

    // Conector PCIe: aba da PCB + contatos dourados nos dois lados
    gpu.add(caixa(85, 9, 1.6, material(COR.pcbPreto, 0.2, 0.6), -75.5, -57.5, -15));
    const contatos = [];
    for (let i = 0; i < 82; i++) {
        if (i >= 11 && i <= 12) continue; // chanfro (notch) do PCIe
        const x = -117 + i * 1.0;
        contatos.push([x, -59, -14.1], [x, -59, -15.9]);
    }
    gpu.add(instancias(new THREE.BoxGeometry(0.7, 6, 0.2), matOuro, contatos));

    // Conector de energia em cima
    gpu.add(caixa(22, 7, 10, matPreto, 70, 55.5, -6));

    // Suporte metálico (bracket) com as saídas de vídeo
    gpu.add(caixa(1, 122, 40, matSuporte, -134, -3, 0));
    gpu.add(caixa(10, 1, 40, matSuporte, -139, 57.5, 0));
    for (const [y, z, altura] of [[-38, -10, 11], [-38, 5, 11], [-20, -10, 11], [-20, 5, 14]]) {
        gpu.add(caixa(1.6, 5, altura, matPreto, -134.8, y, z));
    }
    // Ventilação do bracket (fendas)
    for (let i = 0; i < 6; i++) {
        gpu.add(caixa(1.4, 22, 2.2, matPreto, -134.8, 20, -12 + i * 4.8));
    }

    // Animação: gira as ventoinhas
    gpu.userData.atualizar = (dt) => {
        for (const v of ventoinhas) v.userData.rotor.rotation.z -= dt * 5;
    };

    return gpu;
}


// =====================================================
// PROCESSADOR
// Fica deitado no plano XZ (Y para cima), pinos para baixo
// =====================================================

function criarProcessador() {
    const cpu = new THREE.Group();

    const matSubstrato = material(COR.pcbVerde, 0.1, 0.55);
    const matIHS       = material(0xcfd3d8, 1, 0.26);
    const matOuro      = material(COR.ouro, 1, 0.3);

    // Substrato (a "plaquinha" verde)
    cpu.add(caixa(40, 1.2, 40, matSubstrato, 0, 0, 0));

    // IHS (tampa metálica) em dois níveis
    cpu.add(caixaArredondada(35, 1.6, 35, 0.6, matIHS, 0, 1.3, 0));
    cpu.add(caixaArredondada(31, 1.6, 31, 0.6, matIHS, 0, 2.6, 0));

    // "Serigrafia" no topo do IHS
    const textura = texturaTexto([
        { texto: 'PROCESSADOR', tamanho: 64, y: 0.30 },
        { texto: 'DESKTOP  ·  64-BIT', tamanho: 36, y: 0.55, peso: 500 },
        { texto: 'X86-64  2026', tamanho: 30, y: 0.75, peso: 400 },
    ], { largura: 512, altura: 512, cor: 'rgba(40,44,50,0.75)' });
    const etiqueta = new THREE.Mesh(
        new THREE.PlaneGeometry(28, 28),
        new THREE.MeshStandardMaterial({ map: textura, transparent: true, metalness: 0.6, roughness: 0.4 })
    );
    etiqueta.rotation.x = -Math.PI / 2;
    etiqueta.position.y = 3.42;
    cpu.add(etiqueta);

    // Triângulo dourado indicando o pino 1
    const tri = new THREE.Shape();
    tri.moveTo(0, 0); tri.lineTo(3, 0); tri.lineTo(0, 3); tri.closePath();
    const marcador = new THREE.Mesh(new THREE.ShapeGeometry(tri), matOuro);
    marcador.rotation.x = -Math.PI / 2;
    marcador.position.set(-19.3, 0.62, 19.3);
    cpu.add(marcador);

    // Capacitores SMD na borda
    const matCap = material(0x8a6a3a, 0.4, 0.5);
    for (let i = 0; i < 8; i++) {
        cpu.add(caixa(1.2, 0.5, 0.6, matCap, -12 + i * 3.4, 0.85, -18.6));
    }

    // Pinos (grade 32x32 sem o centro) — ~960 cópias numa só InstancedMesh
    const pinos = [];
    const PASSO = 1.2, N = 32;
    for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
            const centro = i > 11 && i < 20 && j > 11 && j < 20;
            if (centro) continue;
            pinos.push([(i - (N - 1) / 2) * PASSO, -1.4, (j - (N - 1) / 2) * PASSO]);
        }
    }
    cpu.add(instancias(new THREE.CylinderGeometry(0.15, 0.15, 1.6, 6), matOuro, pinos));

    return cpu;
}


// =====================================================
// MEMÓRIA RAM (DIMM com dissipador)
// Em pé no plano XY, contatos para baixo
// =====================================================

function criarMemoriaRAM() {
    const ram = new THREE.Group();

    const C = 133.35, A = 31.25, E = 1.2;   // comprimento, altura, espessura (mm)
    const posChave = 72;                    // posição do chanfro central

    // Contorno da PCB com chanfro inferior e entalhes laterais (Shape + Extrude)
    const forma = new THREE.Shape();
    forma.moveTo(0, 0);
    forma.lineTo(posChave - 0.8, 0);
    forma.lineTo(posChave - 0.8, 4);
    forma.lineTo(posChave + 0.8, 4);
    forma.lineTo(posChave + 0.8, 0);
    forma.lineTo(C, 0);
    forma.lineTo(C, 11);
    forma.absarc(C, 13, 2, -Math.PI / 2, Math.PI / 2, true);
    forma.lineTo(C, A);
    forma.lineTo(0, A);
    forma.lineTo(0, 15);
    forma.absarc(0, 13, 2, Math.PI / 2, -Math.PI / 2, true);
    forma.closePath();

    const geometriaPCB = new THREE.ExtrudeGeometry(forma, { depth: E, bevelEnabled: false });
    geometriaPCB.translate(-C / 2, 0, -E / 2);
    ram.add(new THREE.Mesh(geometriaPCB, material(COR.pcbVerde, 0.1, 0.55)));

    // Contatos dourados (frente e verso)
    const matOuro = material(COR.ouro, 1, 0.3);
    const contatos = [];
    for (let i = 0; i < 144; i++) {
        const x = -C / 2 + 5 + i * 0.85;
        if (Math.abs(x + C / 2 - posChave) < 1.4) continue;
        contatos.push([x, 1.8, E / 2 + 0.03], [x, 1.8, -E / 2 - 0.03]);
    }
    ram.add(instancias(new THREE.BoxGeometry(0.6, 3, 0.05), matOuro, contatos));

    // Dissipador (heatspreader) com topo recortado — um de cada lado
    const perfil = new THREE.Shape();
    perfil.moveTo(-66, 6);
    perfil.lineTo(66, 6);
    perfil.lineTo(66, 31);
    perfil.lineTo(52, 31);
    perfil.lineTo(46, 37);
    perfil.lineTo(-46, 37);
    perfil.lineTo(-52, 31);
    perfil.lineTo(-66, 31);
    perfil.closePath();
    const geometriaDissipador = new THREE.ExtrudeGeometry(perfil, {
        depth: 1.4, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.3, bevelSegments: 2,
    });
    const matDissipador = material(0x24262b, 0.75, 0.42);

    const frente = new THREE.Mesh(geometriaDissipador, matDissipador);
    frente.position.z = E / 2 + 0.3;
    ram.add(frente);

    const verso = new THREE.Mesh(geometriaDissipador, matDissipador);
    verso.position.z = -E / 2 - 0.3;
    verso.scale.z = -1;                // espelha para o outro lado
    ram.add(verso);

    // Faixa luminosa no topo (estilo RGB)
    const matDestaque = material(COR.destaque, 0, 0.4, { emissive: COR.destaque, emissiveIntensity: 1.2 });
    ram.add(caixa(90, 2.2, 3.6, matDestaque, 0, 37.6, 0));

    // Etiqueta na frente
    const textura = texturaTexto([
        { texto: 'MEMÓRIA RAM', tamanho: 54, y: 0.42 },
        { texto: 'DESKTOP DIMM', tamanho: 28, y: 0.75, peso: 500, cor: '#29c4ff' },
    ], { largura: 512, altura: 128, cor: '#e9ecef' });
    const etiqueta = new THREE.Mesh(
        new THREE.PlaneGeometry(64, 16),
        new THREE.MeshBasicMaterial({ map: textura, transparent: true })
    );
    etiqueta.position.set(0, 20, E / 2 + 2.05);
    ram.add(etiqueta);

    return ram;
}


// =====================================================
// SSD M.2 2280 (NVMe)
// Deitado no plano XZ, conector à esquerda (X negativo)
// =====================================================

function criarSSD() {
    const ssd = new THREE.Group();

    // Contorno da PCB: chave M no conector + meia-lua do parafuso
    const forma = new THREE.Shape();
    forma.moveTo(-40, -11);
    forma.lineTo(40, -11);
    forma.lineTo(40, -1.75);
    forma.absarc(40, 0, 1.75, -Math.PI / 2, Math.PI / 2, true);
    forma.lineTo(40, 11);
    forma.lineTo(-40, 11);
    forma.lineTo(-40, -4.4);
    forma.lineTo(-36, -4.4);
    forma.lineTo(-36, -5.6);
    forma.lineTo(-40, -5.6);
    forma.closePath();

    const geometriaPCB = new THREE.ExtrudeGeometry(forma, { depth: 0.8, bevelEnabled: false });
    geometriaPCB.rotateX(-Math.PI / 2);   // deita a placa: espessura passa a ser o eixo Y
    ssd.add(new THREE.Mesh(geometriaPCB, material(COR.pcbPreto, 0.2, 0.55)));

    const topo = 0.8;
    const matChip = material(COR.chip, 0.3, 0.45);

    // Controlador, cache DRAM e dois chips NAND
    ssd.add(caixa(9, 1.1, 9, matChip, -25, topo + 0.55, 0));
    ssd.add(caixa(8, 1.0, 10, matChip, -13, topo + 0.5, 0));
    ssd.add(caixa(14, 1.3, 17, matChip, 4, topo + 0.65, 0));
    ssd.add(caixa(14, 1.3, 17, matChip, 22, topo + 0.65, 0));

    // Pequenos componentes SMD
    const matSMD = material(0x7a6040, 0.4, 0.5);
    for (let i = 0; i < 6; i++) {
        ssd.add(caixa(0.8, 0.4, 0.5, matSMD, -32 + (i % 3) * 1.6, topo + 0.2, i < 3 ? 6 : -7));
    }

    // Etiqueta sobre os chips NAND
    const textura = texturaTexto([
        { texto: 'NVMe', tamanho: 120, y: 0.42 },
        { texto: 'M.2 2280  ·  PCIe', tamanho: 40, y: 0.80, peso: 600 },
    ], { largura: 512, altura: 256, fundo: '#1b2a3a', cor: '#ffffff' });
    const etiqueta = new THREE.Mesh(
        new THREE.BoxGeometry(34, 0.1, 19),
        [
            material(0x1b2a3a), material(0x1b2a3a),
            new THREE.MeshStandardMaterial({ map: textura, roughness: 0.6 }), // face de cima
            material(0x1b2a3a), material(0x1b2a3a), material(0x1b2a3a),
        ]
    );
    etiqueta.position.set(13, topo + 1.35, 0);
    ssd.add(etiqueta);

    // Contatos dourados do conector (em cima e embaixo)
    const matOuro = material(COR.ouro, 1, 0.3);
    const contatos = [];
    for (let z = -10.25; z <= 10.25; z += 0.5) {
        if (z > -5.9 && z < -4.1) continue; // chave M
        contatos.push([-38.4, topo + 0.03, z], [-38.4, -0.03, z]);
    }
    ssd.add(instancias(new THREE.BoxGeometry(3, 0.05, 0.3), matOuro, contatos));

    return ssd;
}


// =====================================================
// Registro dos geradores
// O nome é o valor da coluna modelo_3d.arquivo no banco.
// =====================================================

const GERADORES = {
    gpu: criarPlacaDeVideo,
    cpu: criarProcessador,
    ram: criarMemoriaRAM,
    ssd: criarSSD,
};

export function existeModeloProcedural(nome) {
    return nome in GERADORES;
}

/**
 * Gera o modelo pelo nome (ex.: 'cpu') já convertido para metros.
 */
export function gerarModeloProcedural(nome) {
    const gerador = GERADORES[nome];
    if (!gerador) {
        throw new Error(`Modelo procedural desconhecido: "${nome}"`);
    }

    const modelo = gerador();
    modelo.scale.setScalar(0.001);   // mm → m
    modelo.name = `procedural:${nome}`;
    return modelo;
}
