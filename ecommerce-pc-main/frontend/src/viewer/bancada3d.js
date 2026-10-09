import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { gerarModeloProcedural } from './modelos-procedurais.js';
import { ancorasPlacaMae, ancorasGabinete } from './modelos-pc.js';
import { parametrosDoProduto } from './parametros.js';

/*
 * BANCADA 3D do "Monte seu PC"
 * Cada peça escolhida aparece e é animada até o seu lugar dentro do
 * gabinete (ou na mesa, no caso dos periféricos).
 *
 * Sistema de coordenadas: o "quadro do gabinete" está em milímetros,
 * com o centro do gabinete na origem, a frente em +Z e o vidro em -X.
 * A placa-mãe tem o próprio quadro (girado para ficar em pé na bandeja);
 * processador, memória, placa de vídeo, M.2 e cooler são posicionados
 * nos pontos de encaixe da placa (ancorasPlacaMae) e convertidos para o
 * mundo multiplicando as matrizes: mundo = gabinete × placa × peça.
 */

// Passo do Monte seu PC → gerador procedural
const GERADOR = {
    gab: 'gabinete', mae: 'mae', cpu: 'cpu', ram: 'ram', gpu: 'gpu', arm: 'ssd', cooler: 'cooler',
    fonte: 'fonte', fan: 'ventoinha', monitor: 'monitor', teclado: 'teclado', mouse: 'mouse',
    headset: 'headset', controle: 'controle', cadeira: 'cadeira',
};
const ORDEM = Object.keys(GERADOR);
const PERIFERICOS = ['monitor', 'teclado', 'mouse', 'headset', 'controle', 'cadeira'];
const MM = 0.001;

// Suavização: começa rápido e freia no fim (ou o contrário)
const suavizar = { saida: (t) => 1 - (1 - t) ** 3, entrada: (t) => t ** 3, ambos: (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2) };

function liberar(objeto) {
    objeto.traverse((no) => {
        no.geometry?.dispose();
        const mats = Array.isArray(no.material) ? no.material : no.material ? [no.material] : [];
        for (const m of mats) {
            for (const v of Object.values(m)) if (v?.isTexture) v.dispose();
            m.dispose();
        }
    });
}

export function criarBancada(container) {
    // ---------- Cena ----------
    const cena = new THREE.Scene();
    cena.background = new THREE.Color(0x10141c);
    const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 50);
    camera.position.set(-1.1, 0.55, 0.9);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));   // cena pesada: limita em telas 2x/3x
    container.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    cena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const luz = new THREE.DirectionalLight(0xffffff, 1.4);
    luz.position.set(-3, 4, 3);
    cena.add(luz);

    const controles = new OrbitControls(camera, renderer.domElement);
    controles.enableDamping = true;
    controles.autoRotateSpeed = 1.2;
    controles.addEventListener('start', () => { controles.autoRotate = false; });

    // Quadro do gabinete: tudo é posicionado em mm aqui dentro
    const quadro = new THREE.Group();
    quadro.scale.setScalar(MM);
    cena.add(quadro);

    // Contorno de um gabinete "fantasma" enquanto nenhum é escolhido
    const fantasma = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
        new THREE.LineBasicMaterial({ color: 0x3a4456, transparent: true, opacity: 0.8 })
    );
    quadro.add(fantasma);

    // Chão (disco) e mesa dos periféricos
    const chao = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshStandardMaterial({ color: 0x161b25, roughness: 0.9 }));
    chao.rotation.x = -Math.PI / 2;
    cena.add(chao);
    const mesa = new THREE.Group();
    const matMesa = new THREE.MeshStandardMaterial({ color: 0x2a2f3a, roughness: 0.6, metalness: 0.2 });
    mesa.add(new THREE.Mesh(new THREE.BoxGeometry(950, 25, 1600), matMesa));
    for (const [x, z] of [[-440, -760], [440, -760], [-440, 760], [440, 760]]) {
        mesa.add(new THREE.Mesh(new THREE.BoxGeometry(40, 715, 40), matMesa).translateX(x).translateY(-370).translateZ(z));
    }
    mesa.visible = false;
    quadro.add(mesa);

    // Aviso "Encaixando..." no canto
    const legenda = document.createElement('div');
    legenda.className = 'bancada-legenda';
    legenda.hidden = true;
    container.appendChild(legenda);
    let timerLegenda = null;
    function mostrarLegenda(texto) {
        legenda.textContent = texto;
        legenda.hidden = false;
        clearTimeout(timerLegenda);
        timerLegenda = setTimeout(() => { legenda.hidden = true; }, 2200);
    }

    // ---------- Animações (tweens) ----------
    let animacoes = [];
    function animar(obj, { pos, quat, escala, dur = 0.9, ease = suavizar.saida, fim } = {}) {
        animacoes = animacoes.filter((a) => a.obj !== obj);   // a nova substitui a antiga
        animacoes.push({
            obj, t: 0, dur, ease, fim,
            p0: obj.position.clone(), p1: pos ?? obj.position.clone(),
            q0: obj.quaternion.clone(), q1: quat ?? obj.quaternion.clone(),
            s0: obj.scale.clone(), s1: escala ?? obj.scale.clone(),
        });
    }
    function atualizarAnimacoes(dt) {
        for (const a of animacoes) {
            a.t = Math.min(1, a.t + dt / a.dur);
            const k = a.ease(a.t);
            a.obj.position.lerpVectors(a.p0, a.p1, k);
            a.obj.quaternion.slerpQuaternions(a.q0, a.q1, k);
            a.obj.scale.lerpVectors(a.s0, a.s1, k);
        }
        const terminadas = animacoes.filter((a) => a.t >= 1);
        animacoes = animacoes.filter((a) => a.t < 1);
        for (const a of terminadas) a.fim?.();
    }

    // ---------- Peças na cena ----------
    // slot → { chave, objetos: [Object3D], produto }
    const pecas = new Map();
    let sel = {};
    let finalizado = false;
    let tubos = null;

    function criarObjetos(slot, item) {
        const g = GERADOR[slot];
        const p = item.produto;
        const base = parametrosDoProduto(g, p) ?? {};
        const novos = [];
        if (slot === 'ram') {
            // um modelo por pente (kit × quantidade), cada um no seu slot
            const total = Math.min(4, (base.pentes ?? 1) * item.qtd);
            for (let i = 0; i < total; i++) novos.push(gerarModeloProcedural(g, { ...base, pentes: 1 }));
        } else if (slot === 'fan') {
            const total = Math.min(6, (base.quantidade ?? 1) * item.qtd);
            for (let i = 0; i < total; i++) novos.push(gerarModeloProcedural(g, { ...base, quantidade: 1 }));
        } else if (slot === 'arm') {
            for (let i = 0; i < Math.min(3, item.qtd); i++) novos.push(gerarModeloProcedural(g, base));
        } else if (slot === 'cooler' && base.tipo === 'Water') {
            novos.push(...separarWaterCooler(gerarModeloProcedural(g, base)));
        } else {
            novos.push(gerarModeloProcedural(g, base));
        }
        for (const o of novos) { o.userData.slot = slot; o.userData.params = base; }
        return novos;
    }

    // O water cooler vem num modelo só; aqui a bomba (vai no processador)
    // e o radiador com as ventoinhas (vai no teto) viram dois objetos.
    function separarWaterCooler(modelo) {
        const [px, , pz] = modelo.userData.ancoras.bomba;
        const parte = (nome) => modelo.userData.partes.find((g) => g.userData.parte.nome === nome);
        const bomba = new THREE.Group();
        const radiador = new THREE.Group();
        bomba.scale.setScalar(MM);
        radiador.scale.setScalar(MM);
        const b = parte('Bomba e bloco');
        b.position.set(-px, 0, -pz);
        bomba.add(b);
        radiador.add(parte('Radiador'), parte('Ventoinhas'));
        const mangueiras = parte('Mangueiras');
        liberar(mangueiras);
        radiador.userData.atualizar = modelo.userData.atualizar;   // ventoinhas e RGB continuam
        radiador.userData.comprimento = modelo.userData.ancoras.comprimento;
        bomba.userData.ehBomba = true;
        radiador.userData.ehRadiador = true;
        return [bomba, radiador];
    }

    // ---------- Onde cada peça fica (alvos) ----------
    const tmp = new THREE.Object3D();
    function alvoEm(matrizPai, pos, rot = [0, 0, 0]) {
        tmp.position.set(...pos);
        tmp.rotation.set(...rot);
        tmp.scale.setScalar(1);
        tmp.updateMatrix();
        const m = new THREE.Matrix4().multiplyMatrices(matrizPai, tmp.matrix);
        // o quadro já está em mm (escala 0,001): a peça também tem escala 0,001
        const mundo = new THREE.Matrix4().multiplyMatrices(quadro.matrixWorld, m);
        const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
        mundo.decompose(p, q, s);
        return { pos: p, quat: q, escala: s };
    }

    function calcularAlvos() {
        quadro.updateMatrixWorld();
        const gab = pecas.get('gab');
        const caixa = ancorasGabinete(gab ? gab.objetos[0].userData.params : {});
        const maeItem = pecas.get('mae');
        const cpuSoq = sel.cpu?.produto.tecnico?.soquete;
        const placa = ancorasPlacaMae(maeItem ? maeItem.objetos[0].userData.params : { formato: 'ATX', soquete: cpuSoq ?? 'AM5' });
        const { H, W, D } = caixa;

        fantasma.visible = !gab;
        fantasma.scale.set(W, H, D);

        // Matriz da placa-mãe dentro do gabinete: em pé na bandeja, componentes para o vidro
        const mPlaca = new THREE.Matrix4().makeBasis(
            new THREE.Vector3(0, 0, 1),     // X da placa → frente do gabinete
            new THREE.Vector3(-1, 0, 0),    // Y da placa (lado dos componentes) → vidro
            new THREE.Vector3(0, -1, 0),    // Z da placa (borda de baixo) → para baixo
        ).setPosition(caixa.bandejaX, H / 2 - 25 - placa.D / 2, -D / 2 + 30 + placa.W / 2);
        const I = new THREE.Matrix4();

        const alvos = new Map();
        const por = (slot, lista) => alvos.set(slot, lista);

        if (gab) por('gab', [alvoEm(I, [0, 0, 0])]);
        if (maeItem) por('mae', [alvoEm(mPlaca, [0, 0, 0])]);
        if (pecas.has('cpu')) por('cpu', [alvoEm(mPlaca, [placa.sx, placa.topoSoquete, placa.sz])]);

        const cooler = pecas.get('cooler');
        if (cooler) {
            const lista = [];
            for (const o of cooler.objetos) {
                if (o.userData.ehRadiador) {
                    // Radiador deitado embaixo do teto, ventoinhas para baixo, ao longo da profundidade
                    lista.push(alvoEm(I, [caixa.radiadorX ?? -20, H / 2 - 8, 0], [Math.PI, Math.PI / 2, 0]));
                } else {
                    // Air cooler (ou bomba) em cima do processador; ventoinha virada para a frente
                    lista.push(alvoEm(mPlaca, [placa.sx, placa.topoSoquete + 4, placa.sz], [0, Math.PI / 2, 0]));
                }
            }
            por('cooler', lista);
        }

        const ram = pecas.get('ram');
        if (ram) {
            const xs = placa.ram.xs;
            const n = ram.objetos.length;
            const ordem = n === 1 ? [xs[Math.min(1, xs.length - 1)]] : n === 2 && xs.length === 4 ? [xs[1], xs[3]] : xs;
            por('ram', ram.objetos.map((_, i) => alvoEm(mPlaca, [ordem[i % ordem.length] ?? xs[0], placa.y0 + 1, placa.ram.z], [0, Math.PI / 2, 0])));
        }

        const gpu = pecas.get('gpu');
        if (gpu) {
            // dedosPcie: distância do suporte até o meio dos contatos (51 mm no modelo genérico)
            const { comprimento: L, altura: Hg, dedosPcie = 51 } = gpu.objetos[0].userData.params;
            por('gpu', [alvoEm(mPlaca, [placa.pcie.x + L / 2 - dedosPcie, placa.y0 + 2 + Hg / 2 + 8, placa.pcie.z + 15])]);
        }

        const arm = pecas.get('arm');
        if (arm) {
            const tipo = arm.objetos[0].userData.params.tipo;
            por('arm', arm.objetos.map((_, i) => {
                if (tipo === 'NVMe') return alvoEm(mPlaca, [placa.m2.x, placa.m2.y + 1 + i * 6, placa.m2.z + i * 45]);
                // gabinete de duas câmaras: os discos ficam atrás da bandeja
                if (caixa.disco) { const d = caixa.disco(i, tipo === 'HD'); return alvoEm(I, d.pos, d.rot); }
                return alvoEm(I, [-35, caixa.topoFonte + 1 + i * (tipo === 'HD' ? 28 : 9), D / 2 - 100]);
            }));
        }

        const fonte = pecas.get('fonte');
        if (fonte) {
            const pot = fonte.objetos[0].userData.params.potencia ?? 650;
            const Dp = pot <= 650 ? 140 : pot <= 850 ? 150 : pot <= 1000 ? 160 : 180;
            por('fonte', [caixa.fonte
                ? alvoEm(I, caixa.fonte.pos, caixa.fonte.rot)
                : alvoEm(I, [0, -H / 2 + 47, -D / 2 + Dp / 2 + 8], [0, 0, Math.PI])]);
        }

        const fan = pecas.get('fan');
        if (fan) {
            const lugares = [];
            const temRadiador = cooler?.objetos.some((o) => o.userData.ehRadiador);
            if (caixa.lugaresVentoinha) {
                for (const l of caixa.lugaresVentoinha) if (!(temRadiador && l.teto)) lugares.push([l.pos, l.rot]);
            }
            if (!caixa.lugaresVentoinha) for (let i = caixa.ventoinhasFrente; i < caixa.nFrente; i++) {
                lugares.push([[-10, H / 2 - 95 - i * 125 + (caixa.nFrente === 2 ? -20 : 0), D / 2 - 18], [0, 0, 0]]);
            }
            if (!temRadiador && !caixa.lugaresVentoinha) for (let i = 0; i < 2; i++) lugares.push([[-30, H / 2 - 18, -D / 2 + 110 + i * 130], [-Math.PI / 2, 0, 0]]);
            if (!caixa.lugaresVentoinha) for (let i = 0; i < 3; i++) lugares.push([[-60, -H / 2 + 110, -D / 2 + 80 + i * 130], [-Math.PI / 2, 0, 0]]);
            por('fan', fan.objetos.map((_, i) => alvoEm(I, ...(lugares[i] ?? [[-60, H / 2 - 150, D / 2 - 40 - i * 10], [0, 0, 0]]))));
        }

        // Periféricos na mesa: quem usa fica do lado do vidro (-X)
        const yMesa = -H / 2 - 10;
        const lugaresMesa = {
            monitor: [[90, yMesa, 650], [0, -Math.PI / 2, 0]],
            teclado: [[-330, yMesa, 650], [0, -Math.PI / 2, 0]],
            mouse: [[-330, yMesa, 930], [0, -Math.PI / 2, 0]],
            controle: [[-380, yMesa + 6, 330], [0, -Math.PI / 2, 0]],
            headset: [[-60, yMesa + 46, 1080], [0, -Math.PI / 2, 0]],
            cadeira: [[-950, yMesa - 740, 650], [0, Math.PI / 2, 0]],
        };
        for (const slot of PERIFERICOS) {
            if (pecas.has(slot)) por(slot, [alvoEm(I, ...lugaresMesa[slot])]);
        }
        const comMesa = PERIFERICOS.some((s) => pecas.has(s));
        mesa.visible = comMesa;
        mesa.position.set(-225, yMesa - 12.5, 450);
        chao.position.y = (comMesa ? yMesa - 740 : -H / 2 - 10) * MM;
        chao.scale.setScalar(comMesa ? 1.9 : 0.45);
        chao.position.x = comMesa ? -0.3 : 0;
        chao.position.z = comMesa ? 0.4 : 0;
        return alvos;
    }

    // ---------- Mangueiras do water cooler (refeitas quando tudo para) ----------
    function refazerTubos() {
        if (tubos) { quadro.remove(tubos); liberar(tubos); tubos = null; }
        const cooler = pecas.get('cooler');
        const bomba = cooler?.objetos.find((o) => o.userData.ehBomba);
        const radiador = cooler?.objetos.find((o) => o.userData.ehRadiador);
        if (!bomba || !radiador) return;
        quadro.updateMatrixWorld();
        const inv = new THREE.Matrix4().copy(quadro.matrixWorld).invert();
        const noQuadro = (obj, x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(obj.matrixWorld).applyMatrix4(inv);
        bomba.updateMatrixWorld();
        radiador.updateMatrixWorld();
        tubos = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.8 });
        const L = radiador.userData.comprimento;
        for (const lado of [-1, 1]) {
            const a = noQuadro(bomba, -28, 22, lado * 12);
            const d = noQuadro(radiador, -L / 2 + 10, 14, lado * 30);
            const meio1 = a.clone().add(new THREE.Vector3(-40, 30, 0));
            const meio2 = d.clone().add(new THREE.Vector3(-40, -40, 0));
            const curva = new THREE.CatmullRomCurve3([a, meio1, meio2, d]);
            tubos.add(new THREE.Mesh(new THREE.TubeGeometry(curva, 48, 5, 10), mat));
        }
        quadro.add(tubos);
    }

    // ---------- Sincronizar com o que foi escolhido ----------
    function sincronizar(novoSel) {
        sel = novoSel;
        let ultimo = null;

        for (const slot of ORDEM) {
            const item = sel[slot];
            const chave = item ? `${item.produto.id}x${item.qtd}` : null;
            const atual = pecas.get(slot);
            if (atual?.chave === chave) continue;

            // Sai a peça antiga: sobe e encolhe
            if (atual) {
                pecas.delete(slot);
                for (const o of atual.objetos) {
                    animar(o, {
                        pos: o.position.clone().add(new THREE.Vector3(-0.25, 0.3, 0)),
                        escala: o.scale.clone().multiplyScalar(0.05),
                        dur: 0.5, ease: suavizar.entrada,
                        fim: () => { cena.remove(o); liberar(o); },
                    });
                }
                if (slot === 'cooler') refazerTubos();
            }
            if (chave) {
                const objetos = criarObjetos(slot, item);
                pecas.set(slot, { chave, objetos, produto: item.produto, novo: true });
                for (const o of objetos) cena.add(o);
                if (slot === 'gab') {
                    objetos[0].userData.silhueta.visible = false;      // a placa de verdade entra no lugar
                    abrirVidro(objetos[0], !finalizado);
                }
                ultimo = slot;
            }
        }

        // Recalcula onde tudo fica (trocar a placa-mãe ou o gabinete move as outras peças)
        const alvos = calcularAlvos();
        for (const [slot, peca] of pecas) {
            const lista = alvos.get(slot) ?? [];
            peca.objetos.forEach((o, i) => {
                const alvo = lista[i];
                if (!alvo) return;
                if (peca.novo) {
                    // Entra de fora (do lado do vidro, um pouco acima) até o encaixe
                    const deFora = PERIFERICOS.includes(slot)
                        ? new THREE.Vector3(0, 0.35, 0)
                        : slot === 'gab' ? new THREE.Vector3(0, 0.3, 0) : new THREE.Vector3(-0.35, 0.15, 0);
                    o.position.copy(alvo.pos).add(deFora);
                    o.quaternion.copy(alvo.quat);
                    o.scale.copy(alvo.escala);
                    animar(o, { ...alvo, dur: 1.0 + i * 0.15, ease: suavizar.saida, fim: slot === 'cooler' ? refazerTubos : undefined });
                } else if (o.position.distanceTo(alvo.pos) > 1e-5 || o.quaternion.angleTo(alvo.quat) > 1e-4) {
                    animar(o, { ...alvo, dur: 0.8, ease: suavizar.ambos, fim: slot === 'cooler' ? refazerTubos : undefined });
                }
            });
            peca.novo = false;
        }
        if (pecas.has('cooler')) setTimeout(refazerTubos, 900);

        if (ultimo) {
            mostrarLegenda(`Encaixando: ${sel[ultimo].produto.nome.split(',')[0]}`);
            focar(ultimo, 1.1);
        }
    }

    function abrirVidro(gabinete, abrir) {
        const vidro = gabinete.userData.vidro;
        if (!vidro) return;
        const alvo = abrir ? vidro.userData.deslocamento.clone().multiplyScalar(2.2) : new THREE.Vector3();
        animar(vidro, { pos: alvo, dur: 0.9, ease: suavizar.ambos });
    }

    // ---------- Câmera ----------
    function caixaDe(slots) {
        const b = new THREE.Box3();
        for (const s of slots) for (const o of pecas.get(s)?.objetos ?? []) b.expandByObject(o);
        return b;
    }

    // animar() trabalha com position/quaternion/scale: este "objeto" aponta para o alvo da câmera
    const alvoCamera = { position: controles.target, quaternion: new THREE.Quaternion(), scale: new THREE.Vector3(1, 1, 1) };

    function enquadrar(caixa, direcao, folga = 1.3, dur = 1.0) {
        if (caixa.isEmpty()) return;
        const centro = caixa.getCenter(new THREE.Vector3());
        const raio = Math.max(caixa.getSize(new THREE.Vector3()).length() / 2, 0.12);
        const dist = (raio / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2))) * folga;
        const destino = centro.clone().add(direcao.clone().normalize().multiplyScalar(dist));
        // anima a câmera e o ponto para onde ela olha
        animar(camera, { pos: destino, dur, ease: suavizar.ambos });
        animar(alvoCamera, { pos: centro, dur, ease: suavizar.ambos });
    }

    function focar(slot, atraso = 0) {
        setTimeout(() => {
            if (PERIFERICOS.includes(slot)) {
                enquadrar(caixaDe([...PERIFERICOS, 'gab']), new THREE.Vector3(-1, 0.65, 0.35), 1.1);
                return;
            }
            let alvo = caixaDe([slot]);
            if (alvo.isEmpty() || ['gab', 'fonte', 'fan'].includes(slot)) alvo = caixaDe(ORDEM.filter((s) => !PERIFERICOS.includes(s)));
            if (alvo.isEmpty()) alvo = new THREE.Box3().setFromObject(fantasma);
            // peça pequena (processador, memória...): aproxima, mas sem perder o contexto
            const centro = alvo.getCenter(new THREE.Vector3());
            const minimo = new THREE.Vector3(0.1, 0.1, 0.1);
            alvo.union(new THREE.Box3(centro.clone().sub(minimo), centro.clone().add(minimo)));
            // olha mais de lado (pelo vidro aberto), para o teto não atrapalhar
            enquadrar(alvo, new THREE.Vector3(-1, 0.3, 0.55), 1.1);
        }, atraso * 1000);
    }

    /** Revisão: fecha o vidro, mostra tudo e gira devagar. */
    function finalizar(sim) {
        finalizado = sim;
        const gab = pecas.get('gab');
        if (gab) abrirVidro(gab.objetos[0], !sim);
        controles.autoRotate = sim;
        if (sim) enquadrar(caixaDe(ORDEM), new THREE.Vector3(-1, 0.55, 0.9), 1.15);
    }


    // ---------- Tamanho e loop ----------
    function ajustar() {
        const w = container.clientWidth, h = container.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }
    const observador = new ResizeObserver(ajustar);
    observador.observe(container);
    ajustar();

    let anterior = null;
    renderer.setAnimationLoop((tempo) => {
        const dt = anterior === null ? 0 : Math.min((tempo - anterior) / 1000, 0.1);
        anterior = tempo;
        atualizarAnimacoes(dt);
        for (const [, peca] of pecas) for (const o of peca.objetos) o.userData.atualizar?.(dt);
        controles.update();
        renderer.render(cena, camera);
    });

    // Começa olhando para o gabinete fantasma
    calcularAlvos();
    enquadrar(new THREE.Box3().setFromObject(fantasma), new THREE.Vector3(-1, 0.55, 0.9), 1.25, 0.01);

    let destruida = false;
    function destruir() {
        if (destruida) return;
        destruida = true;
        renderer.setAnimationLoop(null);
        observador.disconnect();
        controles.dispose();
        for (const [, peca] of pecas) for (const o of peca.objetos) liberar(o);
        if (tubos) liberar(tubos);
        liberar(cena);
        cena.environment.dispose();
        pmrem.dispose();
        renderer.dispose();
        renderer.domElement.remove();
        legenda.remove();
    }

    return { sincronizar, focar, finalizar, destruir };
}
