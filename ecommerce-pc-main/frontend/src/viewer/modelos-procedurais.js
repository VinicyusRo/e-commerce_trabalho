import * as THREE from 'three';
import { material, caixa, caixaArredondada, texturaTexto, instancias, parte, criarVentoinha, COR } from './util3d.js';
import { GERADORES_PC } from './modelos-pc.js';
import { GERADORES_PERIFERICOS } from './modelos-perifericos.js';
import { ESPECIFICOS_PC } from './especificos-pc.js';
import { ESPECIFICOS_PERIFERICOS } from './especificos-perifericos.js';

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
// PLACA DE VÍDEO (3 ventoinhas)
// Eixos: X = comprimento, Y = altura, Z = espessura
// =====================================================

// Parâmetros padrão: uma placa grande de 3 ventoinhas (o modelo genérico)
const PADRAO_GPU = {
    ventoinhas: 3, comprimento: 268, altura: 112, slots: 2, cor: 'preto', perfilBaixo: false,
    energia: '8pin', backplate: true, led: true, destaque: COR.destaque,
};

function criarPlacaDeVideo(opcoes = {}) {
    const o = { ...PADRAO_GPU, ...opcoes };
    const gpu = new THREE.Group();
    const branca = o.cor === 'branco';

    const L = o.comprimento;            // comprimento total (mm)
    const H = o.altura;                 // altura da placa
    const zPCB = -15;                   // a placa de circuito fica atrás
    const zFrente = zPCB + o.slots * 18; // espessura cresce com os slots
    const esquerda = -L / 2;            // lado do suporte (saídas de vídeo)

    const matShroud    = material(branca ? 0xe9ecf0 : 0x2a2d33, branca ? 0.15 : 0.6, branca ? 0.5 : 0.42);
    const matBackplate = material(branca ? 0xdfe3e8 : 0x1a1b1f, 0.7, 0.4);
    const matAletas    = material(COR.aluminio, 1, 0.35);
    const matSuporte   = material(0xc8ccd1, 1, 0.3);
    const matAro       = material(branca ? 0xc9ced6 : 0x5d636c, 0.9, 0.35);
    const matPas       = material(branca ? 0xf4f5f7 : 0x4a4f57, 0.2, 0.5);
    const matOuro      = material(COR.ouro, 1, 0.3);
    const matPreto     = material(0x0e0f11, 0.1, 0.7);
    const matFriso     = material(o.destaque, 0.2, 0.4, o.led ? { emissive: o.destaque, emissiveIntensity: 1.1 } : {});

    // Partes (para a vista explodida e para tocar e ver o nome). Deslocamento em mm.
    const capa = o.ventoinhas > 0
        ? parte(gpu, 'Capa e ventoinhas', 'As ventoinhas puxam o ar frio e empurram para o dissipador, que fica logo atrás.', [0, 0, 40 + o.slots * 10])
        : null;
    const dissipador = parte(gpu, 'Dissipador', o.ventoinhas > 0
        ? 'Aletas de alumínio e tubos de cobre (heatpipes) levam o calor do chip para longe, onde o ar o retira.'
        : 'Placa simples: só um dissipador de alumínio, sem ventoinha. O calor sai pelas aletas.', [0, 0, 22 + o.slots * 4]);
    const pcb = parte(gpu, 'Placa de circuito (PCB)', 'Onde ficam o chip gráfico (GPU) e a memória de vídeo, ligados por trilhas de cobre.', [0, 0, -6]);
    const pcie = parte(gpu, 'Conector PCIe', 'Encaixa no slot PCIe x16 da placa-mãe. Por ele passam os dados entre a placa e o computador.', [0, -30, -6]);
    const energia = o.energia !== 'nenhum'
        ? parte(gpu, 'Conector de energia', o.energia === '16pin'
            ? 'Conector 12V-2x6 (16 pinos): leva muita energia da fonte para placas potentes.'
            : 'Recebe energia extra direto da fonte, além dos 75 W que vêm pelo slot PCIe.', [0, 30, -6])
        : null;
    const backplate = o.backplate
        ? parte(gpu, 'Backplate', 'Placa traseira de metal que protege o circuito e deixa a placa mais rígida.', [0, 0, -36])
        : null;
    const suporte = parte(gpu, 'Suporte e saídas de vídeo', 'Prende a placa no gabinete. É aqui que entram os cabos HDMI e DisplayPort do monitor.', [-40, 0, 0]);

    // ---------- Dissipador: aletas finas repetidas (InstancedMesh) ----------
    const zDiss0 = zPCB + 2;
    const zDiss1 = o.ventoinhas > 0 ? zFrente - 7 : zFrente;
    const profundidade = zDiss1 - zDiss0;
    const aletas = [];
    const passo = o.ventoinhas > 0 ? 3 : 4;
    for (let x = esquerda + 10; x <= L / 2 - 4; x += passo) aletas.push([x, 0, (zDiss0 + zDiss1) / 2]);
    const alturaAleta = o.ventoinhas > 0 ? H - 10 : H - 24;
    dissipador.add(instancias(new THREE.BoxGeometry(0.6, alturaAleta, profundidade), matAletas, aletas));
    if (o.ventoinhas === 0) {
        // Base do dissipador passivo
        dissipador.add(caixa(L - 18, alturaAleta, 2, matAletas, 5, 0, zDiss0 + 1));
    } else {
        // Heatpipes de cobre passando por cima das aletas
        const matCobre = material(COR.cobre, 1, 0.3);
        const nTubos = o.slots >= 2.5 ? 4 : o.slots >= 2 ? 3 : 2;
        for (let i = 0; i < nTubos; i++) {
            const pipe = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, L - 30, 16), matCobre);
            pipe.rotation.z = Math.PI / 2;
            pipe.position.set(8, alturaAleta / 2 - 1, zDiss0 + 3 + i * (profundidade - 6) / Math.max(1, nTubos - 1));
            dissipador.add(pipe);
        }
    }

    // ---------- Capa (shroud) e ventoinhas ----------
    const ventoinhas = [];
    if (capa) {
        capa.add(caixaArredondada(L - 6, H, 8, 4, matShroud, 3, 0, zFrente - 4));
        const espaco = (L - 22) / o.ventoinhas;
        const raio = Math.min(H / 2 - 9, espaco / 2 - 4);
        for (let i = 0; i < o.ventoinhas; i++) {
            const v = criarVentoinha(raio, matPas, matShroud, matAro);
            v.position.set(esquerda + 14 + espaco * (i + 0.5), 0, zFrente);
            capa.add(v);
            ventoinhas.push(v);
        }
        // Friso na borda de cima: na cor da fabricante; aceso se tiver LED
        capa.add(caixa(o.led ? L * 0.55 : L * 0.3, 2, 0.6, matFriso, L * 0.12, H / 2 - 4, zFrente + 0.3));
    }

    // ---------- PCB e backplate ----------
    pcb.add(caixa(L - 12, H - 4, 1.6, material(COR.pcbPreto, 0.2, 0.6), 2, 0, zPCB));
    if (backplate) backplate.add(caixa(L - 6, H, 1.5, matBackplate, 3, 0, zPCB - 1.6));

    // ---------- Conector PCIe: aba da PCB + contatos dourados nos dois lados ----------
    const xPcie = esquerda + 51;
    pcie.add(caixa(85, 9, 1.6, material(COR.pcbPreto, 0.2, 0.6), xPcie, -H / 2 - 3.5, zPCB));
    const contatos = [];
    for (let i = 0; i < 82; i++) {
        if (i >= 11 && i <= 12) continue; // chanfro (notch) do PCIe
        const x = xPcie - 41.5 + i * 1.0;
        contatos.push([x, -H / 2 - 5, zPCB + 0.9], [x, -H / 2 - 5, zPCB - 0.9]);
    }
    pcie.add(instancias(new THREE.BoxGeometry(0.7, 6, 0.2), matOuro, contatos));

    // ---------- Conector(es) de energia em cima ----------
    if (energia) {
        const xEnergia = L / 2 - 40;
        if (o.energia === '16pin') {
            energia.add(caixa(19, 8, 8, matPreto.clone(), xEnergia, H / 2 + 3, zPCB + 6));
        } else {
            const n = o.energia === '2x8pin' ? 2 : 1;
            for (let i = 0; i < n; i++) energia.add(caixa(21, 8, 10, matPreto.clone(), xEnergia - i * 24, H / 2 + 3, zPCB + 7));
        }
    }

    // ---------- Suporte metálico (bracket) com as saídas de vídeo ----------
    const alturaSuporte = o.perfilBaixo ? 79 : 120;
    const largura = Math.max(20, o.slots * 20);
    const zSuporte = zPCB + largura / 2 - 6;
    suporte.add(caixa(1, alturaSuporte, largura, matSuporte, esquerda - 4, alturaSuporte / 2 - H / 2 - 8, zSuporte));
    suporte.add(caixa(10, 1, largura, matSuporte, esquerda - 9, alturaSuporte - H / 2 - 8, zSuporte));
    const saidas = o.perfilBaixo ? [[-20, 11], [-6, 11]] : [[-38, 11], [-24, 11], [-10, 11], [4, 14]];
    for (const [y, alturaSaida] of saidas) {
        suporte.add(caixa(1.6, 5, alturaSaida, matPreto, esquerda - 4.8, y + (H - 112) / 2 - 2, zPCB + 8));
    }

    // Animação: gira as ventoinhas
    gpu.userData.atualizar = (dt) => {
        for (const v of ventoinhas) v.userData.rotor.rotation.z -= dt * 5;
    };

    return gpu;
}


// =====================================================
// PROCESSADOR
// Fica deitado no plano XZ (Y para cima), contatos para baixo.
// Parâmetros: soquete (muda formato, tampa e contatos) e o texto.
//   AM4      → 40 × 40 mm, pinos no processador (PGA)
//   AM5      → 40 × 40 mm, tampa com recortes, contatos planos (LGA)
//   LGA1700/1851 (Intel) → 45 × 37,5 mm, contatos planos (LGA)
// =====================================================

function criarProcessador(opcoes = {}) {
    const o = { soquete: 'AM4', linhas: ['PROCESSADOR', 'DESKTOP  ·  64-BIT'], ...opcoes };
    const cpu = new THREE.Group();
    const intel = o.soquete.startsWith('LGA');
    const pga = o.soquete === 'AM4';
    const W = intel ? 45 : 40;       // largura (x)
    const D = intel ? 37.5 : 40;     // profundidade (z)

    const matSubstrato = material(intel ? 0x2f5d3a : COR.pcbVerde, 0.1, 0.55);
    const matIHS       = material(0xcfd3d8, 1, 0.26);
    const matOuro      = material(COR.ouro, 1, 0.3);

    const ihs = parte(cpu, 'Tampa metálica (IHS)', 'Protege o chip e espalha o calor dele por uma área maior, até o cooler que fica em cima.', [0, 16, 0]);
    const substrato = parte(cpu, 'Substrato', 'Base que liga o chip (die), escondido sob a tampa, aos contatos de baixo.', [0, 0, 0]);
    const contatosParte = parte(cpu, pga ? 'Pinos' : 'Contatos (LGA)', pga
        ? 'Pinos que entram nos furinhos do soquete da placa-mãe (encaixe PGA). O triângulo dourado mostra o lado certo.'
        : 'Contatos planos: os pinos ficam no soquete da placa-mãe e encostam aqui (encaixe LGA).', [0, -14, 0]);

    // Substrato: no Intel tem dois recortes em cada lado comprido (guias do soquete)
    const forma = new THREE.Shape();
    forma.moveTo(-W / 2, -D / 2);
    forma.lineTo(W / 2, -D / 2);
    forma.lineTo(W / 2, D / 2);
    forma.lineTo(-W / 2, D / 2);
    forma.closePath();
    if (intel) {
        for (const [x, z] of [[-W / 2, -9], [-W / 2, 9], [W / 2, -9], [W / 2, 9]]) {
            const furo = new THREE.Path();
            furo.absarc(x, z, 1.6, 0, Math.PI * 2, false);
            forma.holes.push(furo);
        }
    }
    const geoSubstrato = new THREE.ExtrudeGeometry(forma, { depth: 1.2, bevelEnabled: false });
    geoSubstrato.rotateX(Math.PI / 2);
    geoSubstrato.translate(0, 0.6, 0);
    substrato.add(new THREE.Mesh(geoSubstrato, matSubstrato));

    // Tampa (IHS)
    if (o.soquete === 'AM5') {
        // Tampa com 8 recortes nas laterais (onde aparecem os capacitores)
        const t = new THREE.Shape();
        const a = 17.5, r = 2.2;
        t.moveTo(-a, -a);
        for (const [x0, x1] of [[-10, -6.5], [6.5, 10]]) { t.lineTo(x0, -a); t.lineTo(x0, -a + r); t.lineTo(x1, -a + r); t.lineTo(x1, -a); }
        t.lineTo(a, -a);
        for (const [z0, z1] of [[-10, -6.5], [6.5, 10]]) { t.lineTo(a, z0); t.lineTo(a - r, z0); t.lineTo(a - r, z1); t.lineTo(a, z1); }
        t.lineTo(a, a);
        for (const [x0, x1] of [[10, 6.5], [-6.5, -10]]) { t.lineTo(x0, a); t.lineTo(x0, a - r); t.lineTo(x1, a - r); t.lineTo(x1, a); }
        t.lineTo(-a, a);
        for (const [z0, z1] of [[10, 6.5], [-6.5, -10]]) { t.lineTo(-a, z0); t.lineTo(-a + r, z0); t.lineTo(-a + r, z1); t.lineTo(-a, z1); }
        t.closePath();
        const geo = new THREE.ExtrudeGeometry(t, { depth: 2.6, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.3, bevelSegments: 2 });
        geo.rotateX(-Math.PI / 2);
        geo.translate(0, 0.6, 0);
        ihs.add(new THREE.Mesh(geo, matIHS));
        // Capacitores visíveis nos recortes
        const matCap = material(0x8a6a3a, 0.4, 0.5);
        for (const [x, z] of [[-8.2, -16.4], [8.2, -16.4], [-8.2, 16.4], [8.2, 16.4], [-16.4, -8.2], [-16.4, 8.2], [16.4, -8.2], [16.4, 8.2]]) {
            substrato.add(caixa(1.2, 0.5, 0.8, matCap, x, 0.85, z));
        }
    } else if (intel) {
        // Base mais larga com "orelhas" + parte de cima menor
        ihs.add(caixaArredondada(37, 1.2, 29, 0.5, matIHS, 0, 1.2, 0));
        ihs.add(caixaArredondada(31, 1.8, 29, 0.6, matIHS, 0, 2.6, 0));
    } else {
        ihs.add(caixaArredondada(35, 1.6, 35, 0.6, matIHS, 0, 1.3, 0));
        ihs.add(caixaArredondada(31, 1.6, 31, 0.6, matIHS, 0, 2.6, 0));
    }
    const topo = o.soquete === 'AM5' ? 3.5 : 3.42;

    // Texto no topo da tampa (CanvasTexture)
    const textura = texturaTexto([
        { texto: o.linhas[0], tamanho: 60, y: 0.32 },
        { texto: o.linhas[1] ?? '', tamanho: 44, y: 0.55, peso: 600 },
        { texto: o.soquete, tamanho: 30, y: 0.76, peso: 400 },
    ], { largura: 512, altura: 512, cor: 'rgba(40,44,50,0.78)' });
    const etiqueta = new THREE.Mesh(
        new THREE.PlaneGeometry(intel ? 27 : 28, intel ? 25 : 28),
        new THREE.MeshStandardMaterial({ map: textura, transparent: true, metalness: 0.6, roughness: 0.4 })
    );
    etiqueta.rotation.x = -Math.PI / 2;
    etiqueta.position.y = topo + 0.02;
    ihs.add(etiqueta);

    // Triângulo dourado indicando o canto 1
    const tri = new THREE.Shape();
    tri.moveTo(0, 0); tri.lineTo(3, 0); tri.lineTo(0, 3); tri.closePath();
    const marcador = new THREE.Mesh(new THREE.ShapeGeometry(tri), matOuro);
    marcador.rotation.x = -Math.PI / 2;
    marcador.position.set(-W / 2 + 0.7, 0.62, D / 2 - 0.7);
    substrato.add(marcador);

    // Contatos: ~1000 a ~1700 cópias numa só InstancedMesh
    const lista = [];
    const passo = pga ? 1.2 : 0.95;
    const nx = Math.floor((W - 3) / passo), nz = Math.floor((D - 3) / passo);
    for (let i = 0; i < nx; i++) {
        for (let j = 0; j < nz; j++) {
            const x = (i - (nx - 1) / 2) * passo, z = (j - (nz - 1) / 2) * passo;
            if (Math.abs(x) < W * 0.14 && Math.abs(z) < D * 0.14) continue;   // centro sem contatos
            lista.push([x, pga ? -1.4 : -0.63, z]);
        }
    }
    const geoContato = pga
        ? new THREE.CylinderGeometry(0.15, 0.15, 1.6, 6)
        : new THREE.CylinderGeometry(0.32, 0.32, 0.06, 8);
    contatosParte.add(instancias(geoContato, matOuro, lista));

    return cpu;
}


// =====================================================
// MEMÓRIA RAM (DIMM com dissipador)
// Em pé no plano XY, contatos para baixo.
// Parâmetros: DDR4/DDR5 (posição do chanfro), RGB, cor e nº de pentes.
// =====================================================

const COR_DISSIPADOR_RAM = { preto: 0x24262b, branco: 0xe6e8ec, cinza: 0x8d939b, vermelho: 0x9e1f24 };

function criarMemoriaRAM(opcoes = {}) {
    const o = { memoria: 'DDR4', rgb: true, cor: 'preto', pentes: 1, linhas: ['MEMÓRIA RAM', 'DESKTOP DIMM'], ...opcoes };
    const ram = new THREE.Group();

    const C = 133.35, A = 31.25, E = 1.2;   // comprimento, altura, espessura (mm)
    // O chanfro fica em lugares diferentes: impede pôr DDR5 num slot DDR4
    const posChave = o.memoria === 'DDR5' ? 69.2 : 71.6;
    const ESPACO = 9.5;                     // distância entre os slots da placa-mãe

    const pcb = parte(ram, 'Placa e chips de memória', 'Placa com os chips DRAM, onde os programas abertos ficam guardados enquanto o PC está ligado.', [0, 0, 0]);
    const grupoContatos = parte(ram, 'Contatos dourados', `Encaixam no slot da placa-mãe. O chanfro fica numa posição diferente no ${o.memoria === 'DDR5' ? 'DDR5 e no DDR4' : 'DDR4 e no DDR5'}, para não encaixar no slot errado.`, [0, -14, 0]);
    const dissFrente = parte(ram, 'Dissipador (frente)', 'Chapa de metal que ajuda a tirar o calor dos chips de memória.', [0, 0, 14]);
    const dissVerso = parte(ram, 'Dissipador (verso)', 'A mesma chapa do outro lado do pente.', [0, 0, -14]);
    const led = o.rgb ? parte(ram, 'Iluminação RGB', 'Difusor de luz no topo do pente; as cores mudam com o tempo.', [0, 14, 0]) : null;

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
    const matPCB = material(o.memoria === 'DDR5' ? COR.pcbPreto : COR.pcbVerde, 0.1, 0.55);

    // Contatos dourados (posições de um pente; repetidas para cada pente)
    const matOuro = material(COR.ouro, 1, 0.3);
    const contatos = [];

    // Dissipador: com RGB é mais alto e recortado; sem RGB é baixo e reto
    const perfil = new THREE.Shape();
    if (o.rgb) {
        perfil.moveTo(-66, 6); perfil.lineTo(66, 6); perfil.lineTo(66, 33); perfil.lineTo(56, 33);
        perfil.lineTo(50, 38); perfil.lineTo(-50, 38); perfil.lineTo(-56, 33); perfil.lineTo(-66, 33);
    } else {
        perfil.moveTo(-66, 6); perfil.lineTo(66, 6); perfil.lineTo(66, 33); perfil.lineTo(-66, 33);
    }
    perfil.closePath();
    const geometriaDissipador = new THREE.ExtrudeGeometry(perfil, {
        depth: 1.4, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.3, bevelSegments: 2,
    });
    const matDissipador = material(COR_DISSIPADOR_RAM[o.cor] ?? COR_DISSIPADOR_RAM.preto, 0.75, 0.42);
    const matVerso = matDissipador.clone();
    const matLuz = material(0x15161a, 0, 0.4, { emissive: 0xff00ff, emissiveIntensity: 1.3 });

    const textura = texturaTexto([
        { texto: o.linhas[0], tamanho: 50, y: 0.42 },
        { texto: o.linhas[1] ?? '', tamanho: 30, y: 0.78, peso: 600, cor: '#29c4ff' },
    ], { largura: 512, altura: 128, cor: o.cor === 'branco' ? '#2a2d33' : '#e9ecef' });
    const matEtiqueta = new THREE.MeshBasicMaterial({ map: textura, transparent: true });

    for (let n = 0; n < o.pentes; n++) {
        const dz = (n - (o.pentes - 1) / 2) * ESPACO;

        const placa = new THREE.Mesh(geometriaPCB, matPCB);
        placa.position.z = dz;
        pcb.add(placa);

        for (let i = 0; i < 144; i++) {
            const x = -C / 2 + 5 + i * 0.85;
            if (Math.abs(x + C / 2 - posChave) < 1.4) continue;
            contatos.push([x, 1.8, dz + E / 2 + 0.03], [x, 1.8, dz - E / 2 - 0.03]);
        }

        const frente = new THREE.Mesh(geometriaDissipador, matDissipador);
        frente.position.z = dz + E / 2 + 0.3;
        dissFrente.add(frente);

        const verso = new THREE.Mesh(geometriaDissipador, matVerso);
        verso.position.z = dz - E / 2 - 0.3;
        verso.scale.z = -1;                // espelha para o outro lado
        dissVerso.add(verso);

        if (led) led.add(caixa(o.rgb ? 98 : 0, 4, 4.2, matLuz, 0, 40, dz));

        const etiqueta = new THREE.Mesh(new THREE.PlaneGeometry(64, 16), matEtiqueta);
        etiqueta.position.set(0, 20, dz + E / 2 + 2.05);
        dissFrente.add(etiqueta);
    }
    grupoContatos.add(instancias(new THREE.BoxGeometry(0.6, 3, 0.05), matOuro, contatos));

    // RGB: a cor da luz percorre o arco-íris
    if (led) {
        let tempo = 0;
        ram.userData.atualizar = (dt) => {
            tempo += dt;
            matLuz.emissive.setHSL((tempo * 0.12) % 1, 1, 0.5);
        };
    }

    return ram;
}


// =====================================================
// SSD M.2 2280 (NVMe)
// Deitado no plano XZ, conector à esquerda (X negativo)
// =====================================================

function criarSSD(opcoes = {}) {
    const o = { capacidade: '', ...opcoes };
    const ssd = new THREE.Group();

    const pcb = parte(ssd, 'Placa M.2', 'Placa de 22 × 80 mm que encaixa direto na placa-mãe, sem cabos. A meia-lua é para o parafuso.', [0, 0, 0]);
    const conector = parte(ssd, 'Conector M.2 (chave M)', 'Contatos que ligam o SSD ao barramento PCIe. O recorte (chave M) define em que slot ele encaixa.', [-14, 0, 0]);
    const controlador = parte(ssd, 'Controlador', 'O "cérebro" do SSD: decide onde cada dado é gravado e cuida do desgaste da memória.', [0, 7, 0]);
    const dram = parte(ssd, 'Cache DRAM', 'Memória rápida que guarda o mapa de onde cada arquivo está.', [0, 7, 0]);
    const nand = parte(ssd, 'Memória NAND', 'Chips onde os arquivos ficam gravados, mesmo com o computador desligado.', [0, 7, 0]);
    const etiquetaParte = parte(ssd, 'Etiqueta', 'Identifica o modelo. Fica colada em cima dos chips de memória.', [0, 14, 0]);

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
    pcb.add(new THREE.Mesh(geometriaPCB, material(COR.pcbPreto, 0.2, 0.55)));

    const topo = 0.8;
    const matChip = material(COR.chip, 0.3, 0.45);

    // Controlador, cache DRAM e dois chips NAND
    controlador.add(caixa(9, 1.1, 9, matChip.clone(), -25, topo + 0.55, 0));
    dram.add(caixa(8, 1.0, 10, matChip.clone(), -13, topo + 0.5, 0));
    nand.add(caixa(14, 1.3, 17, matChip, 4, topo + 0.65, 0));
    nand.add(caixa(14, 1.3, 17, matChip, 22, topo + 0.65, 0));

    // Pequenos componentes SMD
    const matSMD = material(0x7a6040, 0.4, 0.5);
    for (let i = 0; i < 6; i++) {
        pcb.add(caixa(0.8, 0.4, 0.5, matSMD, -32 + (i % 3) * 1.6, topo + 0.2, i < 3 ? 6 : -7));
    }

    // Etiqueta sobre os chips NAND
    const textura = texturaTexto([
        { texto: o.capacidade ? `NVMe  ${o.capacidade}` : 'NVMe', tamanho: o.capacidade ? 96 : 120, y: 0.42 },
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
    etiquetaParte.add(etiqueta);

    // Contatos dourados do conector (em cima e embaixo)
    const matOuro = material(COR.ouro, 1, 0.3);
    const contatos = [];
    for (let z = -10.25; z <= 10.25; z += 0.5) {
        if (z > -5.9 && z < -4.1) continue; // chave M
        contatos.push([-38.4, topo + 0.03, z], [-38.4, -0.03, z]);
    }
    conector.add(instancias(new THREE.BoxGeometry(3, 0.05, 0.3), matOuro, contatos));

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
    // Armazenamento: o mesmo gerador escolhe M.2, SSD SATA ou HD pelo tipo
    ssd: (o = {}) => (o.tipo === 'HD' || o.tipo === 'SATA SSD' ? GERADORES_PC.armazenamento(o) : criarSSD(o)),
    ...GERADORES_PC,
    ...GERADORES_PERIFERICOS,
};

// Vista explodida: cada parte desliza até o seu deslocamento (interpolação suave)
function prepararExplosao(modelo) {
    const partes = modelo.userData.partes;
    if (!partes) return;

    const estado = { atual: 0, alvo: 0 };
    const animacaoOriginal = modelo.userData.atualizar;

    modelo.userData.atualizar = (dt) => {
        animacaoOriginal?.(dt);
        if (estado.atual === estado.alvo) return;
        // Aproxima 8x por segundo; perto do fim, encaixa no alvo
        estado.atual += (estado.alvo - estado.atual) * Math.min(1, dt * 8);
        if (Math.abs(estado.alvo - estado.atual) < 0.001) estado.atual = estado.alvo;
        for (const p of partes) p.position.copy(p.userData.deslocamento).multiplyScalar(estado.atual);
    };

    modelo.userData.explodir = (sim) => { estado.alvo = sim ? 1 : 0; };
}

/** A parte (sub-grupo nomeado) a que um objeto tocado pertence, ou null. */
export function encontrarParte(objeto) {
    for (let o = objeto; o; o = o.parent) {
        if (o.userData?.parte) return o;
    }
    return null;
}

/** Acende (ou apaga, com cor null) o brilho de uma parte para destacá-la. */
export function destacarParte(grupo, cor) {
    grupo.traverse((no) => {
        if (!no.isMesh) return;
        // Partes podem compartilhar material; na primeira vez a parte ganha
        // cópias próprias, para o brilho não "vazar" para as outras partes
        if (!no.userData.materialProprio) {
            no.material = Array.isArray(no.material) ? no.material.map((m) => m.clone()) : no.material.clone();
            no.userData.materialProprio = true;
        }
        const materiais = Array.isArray(no.material) ? no.material : [no.material];
        for (const m of materiais) {
            if (!m.emissive) continue;
            m.userData.emissivoOriginal ??= { cor: m.emissive.getHex(), forca: m.emissiveIntensity };
            if (cor === null) {
                m.emissive.setHex(m.userData.emissivoOriginal.cor);
                m.emissiveIntensity = m.userData.emissivoOriginal.forca;
            } else {
                m.emissive.set(cor);
                m.emissiveIntensity = 0.45;
            }
        }
    });
}

export function existeModeloProcedural(nome) {
    return nome in GERADORES;
}

/**
 * Gera o modelo pelo nome (ex.: 'cpu') já convertido para metros.
 * parametros (opcional) deixa o modelo parecido com um produto
 * (ver parametros.js); sem eles sai o modelo genérico.
 */
// Modelos fiéis de produtos específicos (feitos a partir das fotos de cada um).
// parametros.js põe { especifico: 'chave' } quando reconhece o produto.
const ESPECIFICOS = { ...ESPECIFICOS_PC, ...ESPECIFICOS_PERIFERICOS };

export function gerarModeloProcedural(nome, parametros) {
    const gerador = ESPECIFICOS[parametros?.especifico] ?? GERADORES[nome];
    if (!gerador) {
        throw new Error(`Modelo procedural desconhecido: "${nome}"`);
    }

    const modelo = gerador(parametros);
    prepararExplosao(modelo);
    modelo.scale.setScalar(0.001);   // mm → m
    modelo.name = `procedural:${nome}`;
    return modelo;
}
