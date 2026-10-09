import * as THREE from 'three';
import { material, caixa, caixaArredondada, texturaTexto, instancias, parte, criarVentoinha, COR } from './util3d.js';

/*
 * Geradores das peças do "Monte seu PC": placa-mãe, gabinete, fonte,
 * cooler, ventoinha e armazenamento SATA/HD.
 * Todos recebem "opções" (vindas de parametros.js) e mudam de forma
 * conforme o produto. Tudo em milímetros, como em modelos-procedurais.js.
 */


// =====================================================
// Ajudantes
// =====================================================

// Material de LED que percorre o arco-íris (ARGB). Cada um anda com o tempo.
export function luzRGB(intensidade = 1.3) {
    const mat = material(0x15161a, 0, 0.4, { emissive: 0xff0000, emissiveIntensity: intensidade });
    let tempo = Math.random() * 10;
    return {
        mat,
        atualizar(dt) {
            tempo += dt;
            mat.emissive.setHSL((tempo * 0.12) % 1, 1, 0.5);
        },
    };
}

export const CORES_PECA = {
    preto:  { corpo: 0x1d1f24, detalhe: 0x2c3038, pas: 0x3a3f47 },
    branco: { corpo: 0xe8ebef, detalhe: 0xd3d8de, pas: 0xf2f3f5 },
    marrom: { corpo: 0xcdb99b, detalhe: 0xb8a385, pas: 0x6e4b3a },   // o "bege e marrom" clássico
};

/**
 * Ventoinha de gabinete com moldura quadrada (120 ou 140 mm).
 * Fica de frente para +Z, com a moldura de z = -25 a z = 0.
 */
export function ventoinhaComMoldura(tamanho, cores, matAro) {
    const grupo = new THREE.Group();
    const s = tamanho / 2, r = s - 4;

    const forma = new THREE.Shape();
    forma.moveTo(-s + 6, -s);
    forma.lineTo(s - 6, -s); forma.quadraticCurveTo(s, -s, s, -s + 6);
    forma.lineTo(s, s - 6); forma.quadraticCurveTo(s, s, s - 6, s);
    forma.lineTo(-s + 6, s); forma.quadraticCurveTo(-s, s, -s, s - 6);
    forma.lineTo(-s, -s + 6); forma.quadraticCurveTo(-s, -s, -s + 6, -s);
    const furo = new THREE.Path();
    furo.absarc(0, 0, r + 1, 0, Math.PI * 2, true);
    forma.holes.push(furo);
    // Furos dos parafusos nos cantos
    for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const p = new THREE.Path();
        p.absarc(x * (s - 7.5), y * (s - 7.5), 2.2, 0, Math.PI * 2, true);
        forma.holes.push(p);
    }
    const geo = new THREE.ExtrudeGeometry(forma, { depth: 25, bevelEnabled: false, curveSegments: 32 });
    geo.translate(0, 0, -25);
    grupo.add(new THREE.Mesh(geo, material(cores.corpo, 0.1, 0.55)));

    // Hélice (a mesma da placa de vídeo) + suportes do motor atrás
    const helice = criarVentoinha(r - 1, material(cores.pas, 0.15, 0.5), material(cores.detalhe, 0.2, 0.5), matAro ?? material(cores.detalhe, 0.3, 0.5));
    helice.position.z = -2;
    // tira o disco escuro de fundo (aqui o fundo é vazado)
    helice.children[0].visible = false;
    grupo.add(helice);
    for (let i = 0; i < 4; i++) {
        const braco = caixa(r * 0.95, 3, 2, material(cores.corpo, 0.1, 0.55), 0, 0, -23);
        braco.rotation.z = Math.PI / 4 + i * Math.PI / 2;
        braco.translateX(r * 0.45);
        grupo.add(braco);
    }
    grupo.add(new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 3, 24).rotateX(Math.PI / 2).translate(0, 0, -23), material(cores.corpo, 0.1, 0.55)));

    grupo.userData.rotor = helice.userData.rotor;
    return grupo;
}

// Aletas finas empilhadas (InstancedMesh): usado em coolers e radiadores
function pilhaDeAletas(largura, profundidade, espessura, quantidade, passo, mat, eixo = 'y') {
    const geo = eixo === 'y'
        ? new THREE.BoxGeometry(largura, espessura, profundidade)
        : new THREE.BoxGeometry(espessura, largura, profundidade);
    const pos = [];
    for (let i = 0; i < quantidade; i++) {
        const d = (i - (quantidade - 1) / 2) * passo;
        pos.push(eixo === 'y' ? [0, d, 0] : [d, 0, 0]);
    }
    return instancias(geo, mat, pos);
}

function etiquetaPlana(linhas, largura, altura, opcoes) {
    const textura = texturaTexto(linhas, opcoes);
    return new THREE.Mesh(new THREE.PlaneGeometry(largura, altura), new THREE.MeshStandardMaterial({ map: textura, roughness: 0.6 }));
}


// =====================================================
// VENTOINHA (produto: avulsa ou kit com 3)
// =====================================================

function criarVentoinhaProduto(opcoes = {}) {
    const o = { tamanho: 120, quantidade: 1, argb: true, cor: 'preto', ...opcoes };
    const kit = new THREE.Group();
    const cores = CORES_PECA[o.cor] ?? CORES_PECA.preto;

    const moldura = parte(kit, 'Moldura', 'Estrutura que é parafusada no gabinete ou no radiador. Os furos dos cantos são para os parafusos.', [0, 0, -18]);
    const helices = parte(kit, 'Hélice e motor', 'O motor no centro gira as pás, que empurram o ar numa direção só (a seta na moldura indica qual).', [0, 0, 22]);

    const luzes = [];
    const rotores = [];
    for (let i = 0; i < o.quantidade; i++) {
        const luz = o.argb ? luzRGB() : null;
        if (luz) { luz.mat.userData.atraso = i; luzes.push(luz); }
        const v = ventoinhaComMoldura(o.tamanho, cores, luz?.mat);
        const x = (i - (o.quantidade - 1) / 2) * (o.tamanho + 12);
        // A moldura vai para uma parte e a hélice para outra (vista explodida)
        const [corpo, helice, ...resto] = v.children;
        for (const filho of [corpo, ...resto]) { filho.position.x += x; moldura.add(filho); }
        helice.position.x += x;
        helices.add(helice);
        rotores.push(v.userData.rotor);
    }

    kit.userData.atualizar = (dt) => {
        for (const r of rotores) r.rotation.z -= dt * 6;
        for (const l of luzes) l.atualizar(dt);
    };
    return kit;
}


// =====================================================
// COOLER (torre a ar, low profile ou water cooler)
// =====================================================

function criarCooler(opcoes = {}) {
    const o = { tipo: 'Air', torres: 1, ventoinhas: 1, radiador: 240, argb: true, cor: 'preto', lowProfile: false, tela: false, ...opcoes };
    return o.tipo === 'Water' ? criarWaterCooler(o) : criarAirCooler(o);
}

function criarAirCooler(o) {
    const cooler = new THREE.Group();
    const cores = CORES_PECA[o.cor] ?? CORES_PECA.preto;
    const matCobre = material(COR.cobre, 1, 0.3);
    const matAletas = material(o.cor === 'branco' ? 0xe9ecf0 : COR.aluminio, o.cor === 'branco' ? 0.3 : 1, 0.35);
    const luzes = [];
    const rotores = [];

    const base = parte(cooler, 'Base de cobre', 'Encosta na tampa do processador (com pasta térmica no meio) e puxa o calor para os heatpipes.', [0, -30, 0]);
    const tubos = parte(cooler, 'Heatpipes', 'Tubos de cobre com um líquido dentro que evapora no calor e leva a energia até as aletas.', [0, 0, 0]);
    const aletas = parte(cooler, 'Aletas (dissipador)', 'Muitas chapas finas de alumínio: quanto mais área, mais calor o ar consegue levar embora.', [0, 30, 0]);
    const ventoinhaParte = parte(cooler, o.ventoinhas > 1 ? 'Ventoinhas' : 'Ventoinha', 'Empurra o ar através das aletas. É o que faz o cooler funcionar em silêncio ou não.', o.lowProfile ? [0, 40, 0] : [0, 0, 45]);

    // Base e suporte de fixação
    base.add(caixaArredondada(38, 7, 38, 1, matCobre, 0, 3.5, 0));
    base.add(caixa(80, 3, 12, material(0x2a2d33, 0.8, 0.4), 0, 8.5, 0));

    if (o.lowProfile) {
        // Cooler baixinho: aletas deitadas e ventoinha de 92 mm por cima
        const ny = 10;
        const pilha = pilhaDeAletas(95, 95, 0.4, ny, 2.2, matAletas);
        pilha.position.y = 22;
        aletas.add(pilha);
        for (const x of [-12, 12]) {
            const tubo = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 90, 12), matCobre);
            tubo.rotation.x = Math.PI / 2;
            tubo.position.set(x, 13, 0);
            tubos.add(tubo);
        }
        const v = ventoinhaComMoldura(92, cores);
        v.rotation.x = -Math.PI / 2;
        v.position.y = 57;
        ventoinhaParte.add(v);
        rotores.push(v.userData.rotor);
    } else {
        // Torre: aletas em pé (empilhadas no eixo Y)
        const largura = 125, prof = o.torres === 2 ? 42 : 52;
        const torresZ = o.torres === 2 ? [-30, 30] : [0];
        const n = 52;
        for (const z of torresZ) {
            const pilha = pilhaDeAletas(largura, prof, 0.4, n, 2.4, matAletas);
            pilha.position.set(0, 30 + (n * 2.4) / 2, z);
            aletas.add(pilha);
            // tampa de cima
            aletas.add(caixaArredondada(largura + 1, 4, prof + 1, 1.5, material(cores.corpo, 0.5, 0.4), 0, 30 + n * 2.4 + 2, z));
        }
        // Heatpipes em "U": sobem dos dois lados da torre
        const nTubos = o.torres === 2 ? 6 : 4;
        for (let i = 0; i < nTubos; i++) {
            const x = (i - (nTubos - 1) / 2) * 12;
            for (const z of torresZ.length === 2 ? [-30, 30] : [-14, 14]) {
                const tubo = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 150, 12), matCobre);
                tubo.position.set(x, 85, z);
                tubos.add(tubo);
            }
            const curva = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, torresZ.length === 2 ? 60 : 28, 12), matCobre);
            curva.rotation.x = Math.PI / 2;
            curva.position.set(x, 9, 0);
            tubos.add(curva);
        }

        // Ventoinhas: na frente; dual tower ganha uma no meio; push-pull ganha uma atrás
        const posicoes = [prof / 2 + (o.torres === 2 ? 30 : 0) + 25];
        if (o.torres === 2) posicoes.push(12);
        else if (o.ventoinhas > 1) posicoes.push(-prof / 2 - 2);
        for (const z of posicoes) {
            const luz = o.argb ? luzRGB() : null;
            if (luz) luzes.push(luz);
            const v = ventoinhaComMoldura(120, cores, luz?.mat);
            v.position.set(0, 30 + (n * 2.4) / 2, z);
            ventoinhaParte.add(v);
            rotores.push(v.userData.rotor);
        }
    }

    cooler.userData.atualizar = (dt) => {
        for (const r of rotores) r.rotation.z -= dt * 6;
        for (const l of luzes) l.atualizar(dt);
    };
    return cooler;
}

function criarWaterCooler(o) {
    const wc = new THREE.Group();
    const cores = CORES_PECA[o.cor] ?? CORES_PECA.preto;
    const nFans = Math.round(o.radiador / 120);
    const L = nFans * 120 + 40;                     // comprimento do radiador
    const luzes = [];
    const rotores = [];

    const radiador = parte(wc, 'Radiador', 'O líquido quente passa por canais finos entre aletas de alumínio; as ventoinhas sopram e ele esfria.', [0, -25, -20]);
    const ventoinhas = parte(wc, 'Ventoinhas', `${nFans} ventoinhas de 120 mm presas no radiador.`, [0, 45, -20]);
    const bomba = parte(wc, 'Bomba e bloco', 'Fica em cima do processador: a base de cobre pega o calor e a bomba faz o líquido circular.', [0, 30, 40]);
    const mangueiras = parte(wc, 'Mangueiras', 'Levam o líquido quente até o radiador e trazem de volta o líquido frio. O sistema é fechado (AIO).', [0, 15, 20]);

    // Radiador deitado (X = comprimento, Z = largura 120 mm), aletas por dentro
    const matCorpo = material(cores.corpo, 0.5, 0.45);
    radiador.add(caixa(L - 40, 2, 122, matCorpo, 0, 1, 0));           // placa de baixo
    radiador.add(caixa(L - 40, 2, 122, matCorpo, 0, 26, 0));          // placa de cima
    radiador.add(caixaArredondada(20, 30, 126, 3, matCorpo, -L / 2 + 10, 13.5, 0));   // tanques
    radiador.add(caixaArredondada(20, 30, 126, 3, matCorpo, L / 2 - 10, 13.5, 0));
    const aletas = pilhaDeAletas(23, 118, 0.35, Math.floor((L - 44) / 1.6), 1.6, material(0x3a3e46, 0.8, 0.45), 'x');
    aletas.position.y = 13.5;
    radiador.add(aletas);

    for (let i = 0; i < nFans; i++) {
        const luz = o.argb ? luzRGB() : null;
        if (luz) luzes.push(luz);
        const v = ventoinhaComMoldura(120, cores, luz?.mat);
        v.rotation.x = -Math.PI / 2;
        v.position.set((i - (nFans - 1) / 2) * 120, 52, 0);
        ventoinhas.add(v);
        rotores.push(v.userData.rotor);
    }

    // Bomba: cilindro com base de cobre; tampa com anel RGB ou tela LCD
    const pz = 150;
    const px = -L / 2 + 90;
    bomba.add(new THREE.Mesh(new THREE.CylinderGeometry(30, 32, 34, 48).translate(px, 19, pz), material(cores.corpo, 0.4, 0.4)));
    bomba.add(caixaArredondada(42, 3, 42, 1, material(COR.cobre, 1, 0.3), px, 1.5, pz));
    if (o.tela) {
        const tela = etiquetaPlana([
            { texto: '42°C', tamanho: 150, y: 0.45 },
            { texto: 'CPU', tamanho: 60, y: 0.78, peso: 500, cor: '#29c4ff' },
        ], 48, 48, { largura: 256, altura: 256, fundo: '#05070a', cor: '#ffffff' });
        tela.rotation.x = -Math.PI / 2;
        tela.position.set(px, 36.1, pz);
        bomba.add(tela);
    } else {
        bomba.add(new THREE.Mesh(new THREE.CylinderGeometry(26, 26, 1, 48).translate(px, 36.2, pz), material(cores.detalhe, 0.6, 0.3)));
    }
    if (o.argb) {
        const luz = luzRGB(1.6);
        luzes.push(luz);
        const anel = new THREE.Mesh(new THREE.TorusGeometry(28, 1.6, 10, 64), luz.mat);
        anel.rotation.x = -Math.PI / 2;
        anel.position.set(px, 36, pz);
        bomba.add(anel);
    }

    // Mangueiras: curvas suaves (CatmullRom + TubeGeometry) da bomba até o tanque
    const matMangueira = material(cores.corpo === 0xe8ebef ? 0xdfe3e8 : 0x15161a, 0.1, 0.8);
    for (const dz of [-12, 12]) {
        const curva = new THREE.CatmullRomCurve3([
            new THREE.Vector3(px - 30, 20, pz + dz),
            new THREE.Vector3(px - 70, 22, pz + dz * 0.8),
            new THREE.Vector3(-L / 2 - 30, 18, 40 + dz),
            new THREE.Vector3(-L / 2 + 2, 14, dz * 2),
        ]);
        mangueiras.add(new THREE.Mesh(new THREE.TubeGeometry(curva, 48, 5, 12), matMangueira));
    }

    wc.userData.ancoras = { bomba: [px, 0, pz], comprimento: L };
    wc.userData.atualizar = (dt) => {
        for (const r of rotores) r.rotation.z -= dt * 6;
        for (const l of luzes) l.atualizar(dt);
    };
    return wc;
}


// =====================================================
// FONTE (PSU)
// Ventoinha virada para cima, etiqueta na lateral (+X),
// conectores na frente (+Z) e tomada atrás (-Z)
// =====================================================

const SELO_80PLUS = {
    'White': ['#f1f2f4', '#1d1f24'], 'Bronze': ['#b0703a', '#ffffff'], 'Silver': ['#b9bec5', '#1d1f24'],
    'Gold': ['#d4a93c', '#1d1f24'], 'Platinum': ['#c8d2da', '#1d1f24'], 'Titanium': ['#6f7f8f', '#ffffff'],
};

function criarFonte(opcoes = {}) {
    const o = { potencia: 650, certificacao: 'Bronze', modular: false, cor: 'preto', ventoinha: 120, ...opcoes };
    const fonte = new THREE.Group();
    const cores = CORES_PECA[o.cor] ?? CORES_PECA.preto;
    const W = 150, H = 86;
    const D = o.potencia <= 650 ? 140 : o.potencia <= 850 ? 150 : o.potencia <= 1000 ? 160 : 180;

    const carcaca = parte(fonte, 'Carcaça', 'Caixa de metal que guarda os componentes. As grades deixam o ar quente sair por trás.', [0, 0, 0]);
    const ventoinhaParte = parte(fonte, 'Ventoinha', `Ventoinha de ${o.ventoinha} mm que puxa ar frio para dentro da fonte.`, [0, 40, 0]);
    const etiqueta = parte(fonte, 'Etiqueta', `Mostra a potência (${o.potencia} W) e o selo de eficiência: quanto melhor o selo, menos energia vira calor.`, [40, 0, 0]);
    const conectores = parte(fonte, o.modular ? 'Conectores modulares' : 'Cabos fixos', o.modular
        ? 'Os cabos são encaixados aqui: só se usa o que precisa, e o gabinete fica mais organizado.'
        : 'Os cabos já saem presos da fonte. É mais barato, mas sobram cabos dentro do gabinete.', [0, 0, 40]);

    const matCorpo = material(cores.corpo, 0.55, 0.45);
    carcaca.add(caixaArredondada(W, H, D, 2, matCorpo, 0, 0, 0));

    // Grade da ventoinha em cima: fundo escuro + aros concêntricos
    const raio = o.ventoinha / 2;
    carcaca.add(new THREE.Mesh(new THREE.CylinderGeometry(raio, raio, 1, 64).translate(0, H / 2 + 0.1, 0), material(0x07080a, 0.1, 0.9)));
    const matGrade = material(cores.detalhe, 0.7, 0.4);
    for (const r of [raio - 2, raio * 0.75, raio * 0.5, raio * 0.25]) {
        const aro = new THREE.Mesh(new THREE.TorusGeometry(r, 0.8, 6, 64), matGrade);
        aro.rotation.x = -Math.PI / 2;
        aro.position.y = H / 2 + 1.2;
        carcaca.add(aro);
    }
    for (let i = 0; i < 4; i++) {
        const raioGrade = caixa(raio * 2 - 4, 1.2, 1.4, matGrade, 0, H / 2 + 1.2, 0);
        raioGrade.rotation.y = (i * Math.PI) / 4;
        carcaca.add(raioGrade);
    }
    const helice = criarVentoinha(raio - 4, material(cores.pas, 0.2, 0.5), material(cores.detalhe, 0.2, 0.5), material(0x07080a, 0.1, 0.9));
    helice.rotation.x = -Math.PI / 2;
    helice.position.y = H / 2 - 4;
    ventoinhaParte.add(helice);

    // Traseira: colmeia de ventilação + tomada + chave
    const furos = [];
    for (let i = 0; i < 16; i++) for (let j = 0; j < 7; j++) {
        furos.push([-W / 2 + 22 + i * 7 + (j % 2) * 3.5, -H / 2 + 14 + j * 6.2, -D / 2 - 0.2]);
    }
    const geoFuro = new THREE.CylinderGeometry(2.6, 2.6, 1, 6).rotateX(Math.PI / 2);
    carcaca.add(instancias(geoFuro, material(0x050607, 0.1, 0.9), furos));
    carcaca.add(caixa(28, 20, 4, material(0x0c0d10, 0.2, 0.7), W / 2 - 30, H / 2 - 22, -D / 2 - 1));
    carcaca.add(caixa(10, 14, 5, material(0x111214, 0.2, 0.6), W / 2 - 54, H / 2 - 22, -D / 2 - 1.5));

    // Frente: painel de conectores (modular) ou maço de cabos (fixo)
    const matConector = material(0x0b0c0e, 0.1, 0.7);
    if (o.modular) {
        conectores.add(caixa(W - 16, H - 16, 1, material(0x101114, 0.3, 0.6), 0, 0, D / 2 + 0.6));
        const linhas = [[24, 10, 4], [16, 8, 4], [12, 8, 4]];
        linhas.forEach(([largura, altura, quantos], li) => {
            for (let k = 0; k < quantos; k++) {
                conectores.add(caixa(largura, altura, 3, matConector, -W / 2 + 22 + k * (largura + 8) + (li === 0 ? 0 : 6), H / 2 - 18 - li * 18, D / 2 + 2));
            }
        });
    } else {
        conectores.add(new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 6, 24).rotateX(Math.PI / 2).translate(-20, 0, D / 2 + 3), matConector));
        const matCabo = material(0x16171a, 0.1, 0.85);
        for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2;
            const curva = new THREE.CatmullRomCurve3([
                new THREE.Vector3(-20 + Math.cos(a) * 4, Math.sin(a) * 4, D / 2 + 5),
                new THREE.Vector3(-22 + Math.cos(a) * 9, -10 + Math.sin(a) * 9, D / 2 + 40),
                new THREE.Vector3(-30 + k * 10, -40, D / 2 + 70 + k * 4),
            ]);
            conectores.add(new THREE.Mesh(new THREE.TubeGeometry(curva, 24, 3.2, 8), matCabo));
        }
    }

    // Etiqueta na lateral: potência + selo 80 Plus (CanvasTexture)
    const nivel = Object.keys(SELO_80PLUS).find((n) => o.certificacao.includes(n)) ?? 'White';
    const [fundoSelo, letraSelo] = SELO_80PLUS[nivel];
    const textura = texturaTexto([
        { texto: `${o.potencia} W`, tamanho: 120, y: 0.36, cor: o.cor === 'branco' ? '#1d1f24' : '#ffffff' },
        { texto: 'FONTE ATX', tamanho: 40, y: 0.62, peso: 600, cor: o.cor === 'branco' ? '#5b6573' : '#98a2b3' },
    ], { largura: 512, altura: 320 });
    const placa = new THREE.Mesh(new THREE.PlaneGeometry(100, 62), new THREE.MeshStandardMaterial({ map: textura, transparent: true, roughness: 0.6 }));
    placa.rotation.y = Math.PI / 2;
    placa.position.set(W / 2 + 0.3, 6, -12);
    etiqueta.add(placa);
    const selo = etiquetaPlana([
        { texto: '80 PLUS', tamanho: 54, y: 0.4, cor: letraSelo },
        { texto: nivel.toUpperCase(), tamanho: 40, y: 0.72, peso: 600, cor: letraSelo },
    ], 34, 34, { largura: 256, altura: 256, fundo: fundoSelo });
    selo.rotation.y = Math.PI / 2;
    selo.position.set(W / 2 + 0.4, -14, D / 2 - 28);
    etiqueta.add(selo);

    fonte.userData.atualizar = (dt) => { helice.userData.rotor.rotation.z -= dt * 5; };
    return fonte;
}


// =====================================================
// PLACA-MÃE
// Deitada (Y para cima). X = largura, Z = altura da placa;
// o "topo" da placa (soquete e painel traseiro) fica em Z negativo.
// =====================================================

const TAMANHO_PLACA = { 'ITX': [170, 170], 'M-ATX': [244, 244], 'ATX': [244, 305], 'E-ATX': [277, 305] };

/**
 * Pontos de encaixe da placa-mãe (em mm, no espaço da própria placa).
 * Usados pelo gerador e pelo "Monte seu PC" em 3D (onde cada peça encaixa).
 */
export function ancorasPlacaMae(opcoes = {}) {
    const o = { formato: 'ATX', soquete: 'AM5', nivel: 'medio', ...opcoes };
    const [W, D] = TAMANHO_PLACA[o.formato] ?? TAMANHO_PLACA.ATX;
    const topo = -D / 2, esq = -W / 2, y0 = 1.6;
    const itx = o.formato === 'ITX';
    const sx = itx ? esq + 70 : esq + 110;
    const sz = topo + (itx ? 55 : 72);
    const nRam = itx || o.nivel === 'baixo' ? 2 : 4;
    const zPcie0 = itx ? D / 2 - 25 : topo + 150;
    // Placa modelada a partir de fotos: as posições medidas (mm a partir do
    // canto de cima à esquerda) substituem as posições típicas
    const m = o.medidas;
    if (m) {
        return {
            W, D, y0, sx: esq + m.soquete[0], sz: topo + m.soquete[1],
            topoSoquete: y0 + (o.soquete === 'AM4' ? 4 : 3.2),
            ram: { xs: m.ram.xs.map((x) => esq + x), z: topo + m.ram.z, topo: y0 + 8 },
            pcie: { x: esq + m.pcie[0], z: topo + m.pcie[1], topo: y0 + 11 },
            m2: { x: esq + m.m2[0], z: topo + m.m2[1], y: y0 + 1.5 },
        };
    }
    return {
        W, D, y0, sx, sz,
        topoSoquete: y0 + (o.soquete === 'AM4' ? 4 : 3.2),
        ram: { xs: Array.from({ length: nRam }, (_, i) => sx + 52 + i * 9), z: sz + 28, topo: y0 + 8 },
        pcie: { x: esq + 60, z: zPcie0, topo: y0 + 11 },
        m2: { x: esq + 70, z: itx ? 10 : zPcie0 - 22, y: y0 + 5 },
    };
}

function criarPlacaMae(opcoes = {}) {
    const o = { formato: 'ATX', soquete: 'AM5', memoria: 'DDR5', nivel: 'medio', cor: 'preto', wifi: false, chipset: 'B650', ...opcoes };
    const mae = new THREE.Group();
    const [W, D] = TAMANHO_PLACA[o.formato] ?? TAMANHO_PLACA.ATX;
    const branca = o.cor === 'branco';
    const alto = o.nivel === 'alto';
    const topo = -D / 2, esq = -W / 2;
    const y0 = 1.6;                                   // face de cima da placa

    const matDissipador = material(branca ? 0xe6e9ee : alto ? 0x3a3f47 : 0x2a2d33, alto ? 0.85 : 0.6, 0.35);
    const matSlot = material(branca ? 0xf2f3f5 : 0x111215, 0.1, 0.6);
    const matMetal = material(0xc9ced5, 1, 0.3);

    const pcb = parte(mae, 'Placa (PCB)', `Placa ${o.formato} de ${W} × ${D} mm com várias camadas de trilhas de cobre ligando tudo.`, [0, -20, 0]);
    const soquete = parte(mae, 'Soquete do processador', o.soquete === 'AM4'
        ? 'Soquete AM4 (PGA): o processador tem os pinos e eles entram nos furinhos. A alavanca trava.'
        : `Soquete ${o.soquete} (LGA): os pinos ficam aqui na placa e a tampa de metal prende o processador.`, [0, 30, 0]);
    const vrm = parte(mae, 'Dissipadores do VRM', 'Cobrem os reguladores de tensão que alimentam o processador. Placas melhores têm dissipadores maiores.', [0, 45, 0]);
    const slotsRam = parte(mae, 'Slots de memória', `Slots ${o.memoria}: só aceitam pentes ${o.memoria}.`, [0, 25, 0]);
    const slotsPcie = parte(mae, 'Slots PCIe', 'O slot maior (x16) é o da placa de vídeo. Placas melhores têm o slot reforçado com metal.', [0, 25, 0]);
    const m2 = parte(mae, 'Slots M.2 (com dissipador)', 'Onde o SSD NVMe é encaixado, deitado na placa, com uma chapa por cima para resfriar.', [0, 40, 0]);
    const chipset = parte(mae, 'Chipset', `Chip ${o.chipset}: controla as portas USB, os SATA e parte dos slots.`, [0, 35, 0]);
    const painel = parte(mae, 'Painel traseiro', `Capa sobre as portas USB, rede${o.wifi ? ', Wi-Fi' : ''} e áudio que ficam na parte de trás do gabinete.`, [-30, 0, 0]);

    // PCB
    pcb.add(caixa(W, 1.6, D, material(branca ? 0x2e3238 : COR.pcbPreto, 0.25, 0.6), 0, 0.8, 0));
    // Furos de parafuso (anéis prateados)
    const furos = [[esq + 7, topo + 7], [W / 2 - 7, topo + 7], [esq + 7, D / 2 - 7], [W / 2 - 7, D / 2 - 7], [esq + 7, 0], [W / 2 - 7, 0]];
    pcb.add(instancias(new THREE.CylinderGeometry(3.2, 3.2, 0.2, 16), matMetal, furos.map(([x, z]) => [x, y0 + 0.05, z])));

    // ---------- Soquete ----------
    const anc = ancorasPlacaMae(o);
    const { sx, sz } = anc;
    mae.userData.ancoras = anc;
    if (o.soquete === 'AM4') {
        soquete.add(caixa(40, 4, 40, material(0xe9e2d0, 0.05, 0.6), sx, y0 + 2, sz));        // soquete bege
        soquete.add(caixa(52, 6, 8, material(0x15161a, 0.1, 0.6), sx, y0 + 3, sz - 30));      // presilhas pretas
        soquete.add(caixa(52, 6, 8, material(0x15161a, 0.1, 0.6), sx, y0 + 3, sz + 30));
        soquete.add(new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 40, 8).rotateX(Math.PI / 2).translate(sx + 22, y0 + 4, sz), matMetal));
        // furinhos (grade escura)
        soquete.add(caixa(34, 0.2, 34, material(0x9a9280, 0.1, 0.8), sx, y0 + 4.1, sz));
    } else {
        const intel = o.soquete.startsWith('LGA');
        const [lw, lz] = intel ? [48, 62] : [56, 56];
        soquete.add(caixa(lw, 3, lz, material(0x1b1c20, 0.6, 0.4), sx, y0 + 1.5, sz));        // base
        // placa de pressão (load plate) com janela
        const forma = new THREE.Shape();
        forma.moveTo(-lw / 2, -lz / 2); forma.lineTo(lw / 2, -lz / 2); forma.lineTo(lw / 2, lz / 2); forma.lineTo(-lw / 2, lz / 2);
        const janela = new THREE.Path();
        janela.moveTo(-lw / 2 + 8, -lz / 2 + 10); janela.lineTo(-lw / 2 + 8, lz / 2 - 10); janela.lineTo(lw / 2 - 8, lz / 2 - 10); janela.lineTo(lw / 2 - 8, -lz / 2 + 10);
        forma.holes.push(janela);
        const geo = new THREE.ExtrudeGeometry(forma, { depth: 1, bevelEnabled: false });
        geo.rotateX(-Math.PI / 2);
        geo.translate(sx, y0 + 3, sz);
        soquete.add(new THREE.Mesh(geo, matMetal));
        soquete.add(caixa(lw - 18, 0.4, lz - 22, material(COR.ouro, 0.9, 0.35), sx, y0 + 3.1, sz));   // contatos dourados
        soquete.add(new THREE.Mesh(new THREE.CylinderGeometry(1, 1, lz, 8).rotateX(Math.PI / 2).translate(sx + lw / 2 + 4, y0 + 3, sz), matMetal));
    }

    // ---------- VRM: em "L" à esquerda e acima do soquete ----------
    const hVrm = alto ? 34 : o.nivel === 'baixo' ? 14 : 24;
    vrm.add(caixaArredondada(22, hVrm, 90, 2, matDissipador, sx - 48, y0 + hVrm / 2, sz + 10));
    if (o.nivel !== 'baixo') vrm.add(caixaArredondada(70, hVrm * 0.8, 20, 2, matDissipador, sx + 8, y0 + hVrm * 0.4, sz - 44));
    if (alto) {
        // ranhuras no dissipador (aletas)
        const ranhuras = [];
        for (let i = 0; i < 12; i++) ranhuras.push([sx - 48, y0 + hVrm + 0.6, sz - 30 + i * 7]);
        vrm.add(instancias(new THREE.BoxGeometry(23, 1.2, 2.5), material(0x2a2d33, 0.8, 0.35), ranhuras));
    }
    // capacitores sólidos ao lado do VRM
    const caps = [];
    for (let i = 0; i < 6; i++) caps.push([sx - 33, y0 + 4, sz - 10 + i * 9]);
    vrm.add(instancias(new THREE.CylinderGeometry(3, 3, 8, 16), material(0x3b3e44, 0.9, 0.3), caps));

    // ---------- Painel traseiro (capa das portas) ----------
    const hPainel = alto ? 42 : 34;
    painel.add(caixaArredondada(26, hPainel, o.formato === 'ITX' ? 120 : 160, 3, matDissipador, esq + 13, y0 + hPainel / 2, topo + (o.formato === 'ITX' ? 62 : 82)));
    if (o.wifi) {
        for (const dz of [-8, 8]) {
            painel.add(new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 10, 12).rotateZ(Math.PI / 2).translate(esq - 4, y0 + 14, topo + 30 + dz), material(COR.ouro, 1, 0.3)));
        }
    }

    // ---------- Slots de memória ----------
    for (const x of anc.ram.xs) {
        slotsRam.add(caixa(6, 8, 138, matSlot, x, y0 + 4, sz + 28));
        slotsRam.add(caixa(6, 10, 6, matSlot, x, y0 + 5, sz + 28 - 69 - 3));   // trava
    }

    // ---------- Conector de 24 pinos na borda direita ----------
    if (o.formato !== 'ITX') pcb.add(caixa(10, 12, 52, matSlot, W / 2 - 9, y0 + 6, sz + 50));

    // ---------- Slots PCIe ----------
    const nPcie = o.formato === 'ITX' ? 1 : o.nivel === 'baixo' ? 1 : o.nivel === 'medio' ? 2 : 3;
    const zPcie0 = anc.pcie.z;
    for (let i = 0; i < nPcie; i++) {
        const z = zPcie0 + i * (o.formato === 'M-ATX' ? 40 : 45);
        if (z > D / 2 - 10) break;
        const reforcado = i === 0 && o.nivel !== 'baixo';
        slotsPcie.add(caixa(89, 11, 7.5, reforcado ? matMetal : matSlot, esq + 60, y0 + 5.5, z));
        slotsPcie.add(caixa(6, 12, 8, matSlot, esq + 108, y0 + 6, z));          // trava
    }

    // ---------- M.2 com dissipador ----------
    const nM2 = o.formato === 'ITX' ? 1 : o.nivel === 'baixo' ? 1 : o.nivel === 'medio' ? 2 : 3;
    for (let i = 0; i < nM2; i++) {
        const z = (o.formato === 'ITX' ? 10 : zPcie0 - 22) + i * (o.formato === 'M-ATX' ? 40 : 45);
        if (z > D / 2 - 15) break;
        m2.add(caixaArredondada(82, 4, 24, 1.5, matDissipador, esq + 70, y0 + 3, z));
    }

    // ---------- Chipset com o nome ----------
    const cx = W / 2 - 50, cz = o.formato === 'ITX' ? D / 2 - 45 : D / 2 - 60;
    chipset.add(caixaArredondada(50, 8, 50, 2, matDissipador, cx, y0 + 4, cz));
    const nomeChip = etiquetaPlana([{ texto: o.chipset, tamanho: 90, y: 0.55, cor: branca ? '#3a3f47' : '#c9ced5' }], 40, 20,
        { largura: 256, altura: 128 });
    nomeChip.material.transparent = true;
    nomeChip.rotation.x = -Math.PI / 2;
    nomeChip.position.set(cx, y0 + 8.1, cz);
    chipset.add(nomeChip);

    // Portas SATA na borda direita
    if (o.formato !== 'ITX') {
        const sata = [];
        for (let i = 0; i < 4; i++) sata.push([W / 2 - 6, y0 + 4, cz - 10 + (i % 2) * 9 + Math.floor(i / 2) * 20]);
        pcb.add(instancias(new THREE.BoxGeometry(8, 8, 6), matSlot, sata));
    }

    return mae;
}


// =====================================================
// GABINETE
// Frente em +Z, lateral de vidro em +X
// =====================================================

const TAMANHO_GABINETE = { mini: [400, 210, 390], micro: [380, 205, 370], mid: [470, 225, 450], grande: [490, 235, 470] };

/** Medidas internas do gabinete (mm). Sem gabinete escolhido, o 3D usa um Mid Tower. */
export function ancorasGabinete(opcoes = {}) {
    const o = { torre: 'mid', ventoinhas: 0, ...opcoes };
    if (o.especifico === 'wideload-lite') return ANCORAS_WIDELOAD;
    const [H, W, D] = TAMANHO_GABINETE[o.torre] ?? TAMANHO_GABINETE.mid;
    const nFrente = o.torre === 'mini' || o.torre === 'micro' ? 2 : 3;
    return { H, W, D, bandejaX: W / 2 - 23, topoFonte: -H / 2 + 92, nFrente, ventoinhasFrente: Math.min(o.ventoinhas, nFrente) };
}

/*
 * Redragon Wideload Lite: gabinete de duas câmaras (estilo "aquário").
 * A placa-mãe fica numa bandeja mais para dentro e a fonte e os discos
 * ficam na câmara de trás (lado +X), escondidos atrás da bandeja.
 * O modelo está em modelos-especificos.js; aqui só as medidas, que o
 * "Monte seu PC" em 3D usa para encaixar as peças.
 */
const ANCORAS_WIDELOAD = (() => {
    const H = 430, W = 290, D = 410;
    const bandeja = W / 2 - 100;                 // x da bandeja (a câmara de trás tem ~100 mm)
    const xTras = (bandeja + W / 2) / 2;         // meio da câmara de trás
    const xFrente = (-W / 2 + bandeja) / 2;      // meio da câmara principal
    return {
        H, W, D, bandejaX: bandeja - 1, topoFonte: -H / 2 + 120, nFrente: 0, ventoinhasFrente: 0,
        duasCamaras: true,
        // fonte deitada de lado no fundo da câmara de trás, tomada na traseira
        fonte: { pos: [xTras, -H / 2 + 34 + 75, -D / 2 + 85], rot: [0, 0, -Math.PI / 2] },
        // discos SATA empilhados acima da fonte
        disco: (i, hd) => ({ pos: [xTras, -H / 2 + 200 + i * (hd ? 30 : 12), -D / 2 + 110], rot: [0, Math.PI / 2, 0] }),
        radiadorX: xFrente,
        lugaresVentoinha: [
            // laterais (na frente da bandeja, puxando ar para a câmara principal)
            { pos: [bandeja - 27, 60, D / 2 - 75], rot: [0, -Math.PI / 2, 0] },
            { pos: [bandeja - 27, -65, D / 2 - 75], rot: [0, -Math.PI / 2, 0] },
            // embaixo, soprando para cima
            ...[-125, 0, 125].map((z) => ({ pos: [xFrente, -H / 2 + 36 + 25, z], rot: [-Math.PI / 2, 0, 0] })),
            // traseira, tirando o ar quente
            { pos: [-78, H / 2 - 95, -D / 2 + 27], rot: [0, Math.PI, 0] },
            // teto (não usado se houver radiador)
            ...[-120, 10].map((z) => ({ pos: [xFrente, H / 2 - 18, z], rot: [-Math.PI / 2, 0, 0], teto: true })),
        ],
    };
})();

function criarGabinete(opcoes = {}) {
    const o = { torre: 'mid', ventoinhas: 3, argb: true, cor: 'preto', frente: 'mesh', ...opcoes };
    const gab = new THREE.Group();
    const [H, W, D] = TAMANHO_GABINETE[o.torre] ?? TAMANHO_GABINETE.mid;
    // Montado "espelhado": o vidro fica no lado esquerdo (-X) e a placa-mãe
    // no direito, como num gabinete real visto de frente.
    const espelho = new THREE.Group();
    espelho.scale.x = -1;
    gab.add(espelho);
    const cores = CORES_PECA[o.cor] ?? CORES_PECA.preto;
    const branco = o.cor === 'branco';
    const luzes = [];
    const rotores = [];

    const estrutura = parte(gab, 'Estrutura', 'Esqueleto de aço onde a placa-mãe, a fonte e as outras peças são parafusadas.', [0, 0, 0]);
    const vidro = parte(gab, 'Lateral de vidro', 'Vidro temperado para mostrar as peças por dentro. Sai puxando para fora.', [110, 0, 0]);
    const frente = parte(gab, 'Painel frontal', o.frente === 'vidro'
        ? 'Frente de vidro (estilo "aquário"): bonito, mas entra menos ar.'
        : 'Frente com tela (mesh): deixa entrar bastante ar para as ventoinhas.', [0, 0, 90]);
    const ventoinhas = parte(gab, 'Ventoinhas', o.ventoinhas
        ? `${o.ventoinhas} ventoinhas: as da frente puxam ar frio, a de trás tira o ar quente.`
        : 'Este gabinete vem sem ventoinhas: os lugares para instalar estão marcados.', [0, 0, 0]);
    const shroud = parte(gab, 'Cobertura da fonte', 'Esconde a fonte e os cabos na parte de baixo, deixando o visual mais limpo.', [0, -60, 0]);

    const matChapa = material(cores.corpo, 0.5, 0.45);
    const matDentro = material(branco ? 0xdcdfe4 : 0x111317, 0.4, 0.6);
    const esp = 2;

    // Chapas: lado direito, topo, base e traseira
    estrutura.add(caixa(esp, H, D, matChapa, -W / 2 + esp / 2, 0, 0));
    estrutura.add(caixa(W, esp, D, matChapa, 0, H / 2 - esp / 2, 0));
    estrutura.add(caixa(W, esp, D, matChapa, 0, -H / 2 + esp / 2, 0));
    estrutura.add(caixa(W, H, esp, matChapa, 0, 0, -D / 2 + esp / 2));
    // Moldura do lado do vidro
    for (const [w, h, d, y, z] of [[3, 8, D, H / 2 - 4, 0], [3, 8, D, -H / 2 + 4, 0], [3, H, 8, 0, D / 2 - 4], [3, H, 8, 0, -D / 2 + 4]]) {
        estrutura.add(caixa(w, h, d, matChapa, W / 2 - 1.5, y, z));
    }
    // Pés
    for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        estrutura.add(caixaArredondada(30, 10, 40, 3, material(0x15161a, 0.2, 0.7), x * (W / 2 - 25), -H / 2 - 5, z * (D / 2 - 35)));
    }
    // Bandeja da placa-mãe e uma "placa" dentro (silhueta)
    estrutura.add(caixa(esp, H - 100, D - 60, matDentro, -W / 2 + 22, 30, -10));
    const silhueta = caixa(1.6, 244, 244, material(0x1d2026, 0.3, 0.6), -W / 2 + 26, H / 2 - 150, -D / 2 + 150);
    estrutura.add(silhueta);
    // Saídas traseiras: painel da placa e tampas dos slots
    estrutura.add(caixa(46, 160, 1, material(0x0a0b0d, 0.3, 0.7), -W / 2 + 45, H / 2 - 110, -D / 2 - 0.3));
    for (let i = 0; i < 7; i++) estrutura.add(caixa(110, 12, 1, material(cores.detalhe, 0.5, 0.45), -W / 2 + 85 + 30, H / 2 - 215 - i * 18, -D / 2 - 0.3));
    // Grade de ventilação no topo (textura de furinhos)
    const tela = texturaTexto([], { largura: 256, altura: 256 });
    const ctx = tela.image.getContext('2d');
    ctx.fillStyle = branco ? '#cfd3d9' : '#2a2d33';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#050607';
    for (let y = 0; y < 256; y += 10) for (let x = (y / 10) % 2 ? 5 : 0; x < 256; x += 10) { ctx.beginPath(); ctx.arc(x, y, 3.3, 0, Math.PI * 2); ctx.fill(); }
    tela.needsUpdate = true;
    tela.wrapS = tela.wrapT = THREE.RepeatWrapping;
    const telaTopo = tela.clone();
    telaTopo.needsUpdate = true;
    telaTopo.repeat.set(4, 6);
    const grade = new THREE.Mesh(new THREE.PlaneGeometry(W - 50, D - 100), new THREE.MeshStandardMaterial({ map: telaTopo, roughness: 0.7 }));
    grade.rotation.x = -Math.PI / 2;
    grade.position.set(0, H / 2 + 0.2, 10);
    estrutura.add(grade);

    // Lateral de vidro (transparente)
    vidro.add(caixa(4, H - 16, D - 16, new THREE.MeshStandardMaterial({
        color: 0xb8cce0, transparent: true, opacity: 0.1, roughness: 0.02, metalness: 0.1, depthWrite: false,
    }), W / 2 + 1, 0, 0));

    // Frente: tela (mesh) ou vidro
    if (o.frente === 'vidro') {
        frente.add(caixa(W - 6, H - 16, 4, new THREE.MeshStandardMaterial({
            color: 0xb8cce0, transparent: true, opacity: 0.1, roughness: 0.02, metalness: 0.1, depthWrite: false,
        }), 0, 0, D / 2 + 2));
        // colunas da frente (o vidro encosta nelas)
        frente.add(caixa(8, H, 8, matChapa, -W / 2 + 4, 0, D / 2 - 4));
    } else {
        const telaFrente = tela.clone();
        telaFrente.needsUpdate = true;
        telaFrente.repeat.set(4, 8);
        frente.add(new THREE.Mesh(
            new RoundedFace(W, H),
            new THREE.MeshStandardMaterial({ map: telaFrente, roughness: 0.7, transparent: true, opacity: 0.6, depthWrite: false })
        ).translateZ(D / 2 + 3));
        frente.add(caixa(W, 10, 6, matChapa, 0, H / 2 - 5, D / 2 + 1));
        frente.add(caixa(W, 10, 6, matChapa, 0, -H / 2 + 5, D / 2 + 1));
    }

    // Cobertura da fonte (embaixo)
    shroud.add(caixa(W - 6, 90, D - 10, matDentro, 0, -H / 2 + 47, 0));

    // Ventoinhas: até 3 na frente, 1 atrás; o que sobrar vai para o topo e a base
    const lugares = [];
    const nFrente = Math.min(3, o.torre === 'mini' || o.torre === 'micro' ? 2 : 3);
    for (let i = 0; i < nFrente; i++) lugares.push({ pos: [10, H / 2 - 95 - i * 125 + (nFrente === 2 ? -20 : 0), D / 2 - 18], rot: [0, 0, 0] });
    lugares.push({ pos: [30, H / 2 - 80, -D / 2 + 30], rot: [0, Math.PI, 0] });
    // no teto: viradas para cima (tiram o ar quente), moldura para dentro do gabinete
    for (let i = 0; i < 2; i++) lugares.push({ pos: [30, H / 2 - 18, -D / 2 + 110 + i * 130], rot: [-Math.PI / 2, 0, 0] });
    for (let i = 0; i < 3; i++) lugares.push({ pos: [-10, -H / 2 + 110, -D / 2 + 80 + i * 130], rot: [-Math.PI / 2, 0, 0] });

    for (let i = 0; i < Math.min(o.ventoinhas, lugares.length); i++) {
        const luz = o.argb ? luzRGB() : null;
        if (luz) luzes.push(luz);
        const v = ventoinhaComMoldura(120, cores, luz?.mat);
        v.position.set(...lugares[i].pos);
        v.rotation.set(...lugares[i].rot);
        ventoinhas.add(v);
        rotores.push(v.userData.rotor);
    }
    // Sem ventoinhas: marca os lugares com contornos
    if (o.ventoinhas === 0) {
        for (const l of lugares.slice(0, nFrente + 1)) {
            const marca = new THREE.Mesh(new THREE.TorusGeometry(56, 0.8, 6, 48), material(cores.detalhe, 0.4, 0.5));
            marca.position.set(...l.pos);
            marca.rotation.set(...l.rot);
            ventoinhas.add(marca);
        }
    }

    // As partes vão para dentro do grupo espelhado (continuam registradas no gabinete)
    for (const p of gab.userData.partes) espelho.add(p);

    gab.userData.atualizar = (dt) => {
        for (const r of rotores) r.rotation.z -= dt * 5;
        for (const l of luzes) l.atualizar(dt);
    };
    // O vidro está do lado esquerdo: a câmera começa olhando por ele
    gab.userData.direcaoCamera = [-1, 0.55, 1];
    gab.userData.silhueta = silhueta;
    gab.userData.vidro = vidro;
    // Medidas internas (mm) para o "Monte seu PC" em 3D
    gab.userData.ancoras = ancorasGabinete(o);
    return gab;
}

// Retângulo (frente do gabinete) com os cantos levemente arredondados
class RoundedFace extends THREE.ShapeGeometry {
    constructor(w, h, r = 6) {
        const s = new THREE.Shape();
        s.moveTo(-w / 2 + r, -h / 2);
        s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
        s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
        s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
        s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
        super(s, 8);
        // UV de 0 a 1 para a textura da tela
        const uv = this.attributes.uv, p = this.attributes.position;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) + w / 2) / w, (p.getY(i) + h / 2) / h);
    }
}


// =====================================================
// ARMAZENAMENTO SATA: SSD de 2,5" e HD de 3,5"
// Deitados (Y para cima), conectores em X negativo
// =====================================================

function criarArmazenamento(opcoes = {}) {
    const o = { tipo: 'SATA SSD', capacidade: '1TB', rpm: '', ...opcoes };
    const disco = new THREE.Group();
    const hd = o.tipo === 'HD';
    const [C, A, L] = hd ? [147, 26, 101.6] : [100, 7, 69.85];

    const carcaca = parte(disco, hd ? 'Carcaça e tampa' : 'Carcaça', hd
        ? 'Caixa de alumínio fechada: dentro giram os discos magnéticos e a agulha (cabeça) que lê e grava.'
        : 'Caixa fina de 2,5". Dentro há só chips de memória: nada se mexe, por isso é rápido e silencioso.', [0, hd ? 30 : 15, 0]);
    const etiqueta = parte(disco, 'Etiqueta', 'Mostra o tipo e a capacidade do disco.', [0, hd ? 55 : 30, 0]);
    const conectores = parte(disco, 'Conectores SATA', 'O menor leva os dados até a placa-mãe; o maior recebe energia da fonte.', [-25, 0, 0]);
    const placa = hd ? parte(disco, 'Placa controladora', 'Fica embaixo do HD e controla o motor e a cabeça de leitura.', [0, -25, 0]) : null;

    if (hd) {
        carcaca.add(caixaArredondada(C, A - 2, L, 3, material(0x9aa1a9, 0.9, 0.45), 0, A / 2, 0));
        carcaca.add(caixaArredondada(C - 4, 1, L - 4, 2, material(0xc7ccd2, 1, 0.25), 0, A + 0.5, 0));
        const parafusos = [];
        for (const [x, z] of [[-60, -38], [60, -38], [-60, 38], [60, 38], [0, -45], [0, 45], [20, 0]]) parafusos.push([x, A + 1.1, z]);
        carcaca.add(instancias(new THREE.CylinderGeometry(2, 2, 0.6, 12), material(0x3a3e44, 0.8, 0.4), parafusos));
        placa.add(caixa(C - 30, 1.6, L - 20, material(0x14361f, 0.2, 0.6), 10, -0.8, 0));
    } else {
        carcaca.add(caixaArredondada(C, A, L, 1.2, material(0x23262c, 0.7, 0.35), 0, A / 2, 0));
    }

    const textura = texturaTexto([
        { texto: hd ? 'HD' : 'SSD', tamanho: 110, y: 0.32 },
        { texto: o.capacidade, tamanho: 96, y: 0.62, peso: 800, cor: '#29c4ff' },
        { texto: hd ? `SATA  ·  ${o.rpm || '7200 RPM'}` : 'SATA  ·  2,5"', tamanho: 38, y: 0.86, peso: 600 },
    ], { largura: 512, altura: 512, fundo: hd ? '#e9ecf0' : '#14171c', cor: hd ? '#1d1f24' : '#ffffff' });
    const adesivo = new THREE.Mesh(new THREE.PlaneGeometry(hd ? 80 : 62, hd ? 70 : 54), new THREE.MeshStandardMaterial({ map: textura, roughness: 0.6 }));
    adesivo.rotation.x = -Math.PI / 2;
    adesivo.position.set(hd ? 18 : 6, A + (hd ? 1.25 : 0.05), 0);
    etiqueta.add(adesivo);

    // Conectores: dados (7 pinos) e energia (15 pinos), com contatos dourados
    const matConector = material(0x0d0e10, 0.1, 0.7);
    const yC = hd ? 5 : A / 2;
    conectores.add(caixa(4, 5, 14, matConector, -C / 2 - 2, yC, -L / 2 + 22));
    conectores.add(caixa(4, 5, 24, matConector, -C / 2 - 2, yC, -L / 2 + 44));
    const pinos = [];
    for (let i = 0; i < 7; i++) pinos.push([-C / 2 - 4.1, yC, -L / 2 + 17 + i * 1.6]);
    for (let i = 0; i < 15; i++) pinos.push([-C / 2 - 4.1, yC, -L / 2 + 33 + i * 1.4]);
    conectores.add(instancias(new THREE.BoxGeometry(0.2, 1.5, 0.8), material(COR.ouro, 1, 0.3), pinos));

    return disco;
}


export const GERADORES_PC = {
    mae: criarPlacaMae,
    gabinete: criarGabinete,
    fonte: criarFonte,
    cooler: criarCooler,
    ventoinha: criarVentoinhaProduto,
    armazenamento: criarArmazenamento,
};
