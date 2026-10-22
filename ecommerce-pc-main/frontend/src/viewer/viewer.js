import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
 * Libera da GPU as geometrias, materiais e texturas de um objeto 3D.
 */
function liberarObjeto(objeto) {
    objeto.traverse((no) => {
        if (no.geometry) no.geometry.dispose();

        if (no.material) {
            const materiais = Array.isArray(no.material) ? no.material : [no.material];
            materiais.forEach((material) => {
                // Texturas ficam como propriedades do material (map, normalMap...)
                for (const valor of Object.values(material)) {
                    if (valor && valor.isTexture) valor.dispose();
                }
                material.dispose();
            });
        }
    });
}

/**
 * Cria um visualizador 3D dentro de um elemento HTML.
 * @param {HTMLElement} container - onde o canvas será desenhado
 * @param {object} [opcoes]
 * @param {number}  [opcoes.corFundo=0x202020]  - cor de fundo da cena
 * @param {boolean} [opcoes.autoRotacao=false]  - gira o modelo até o usuário mexer
 * @param {boolean} [opcoes.fundoTransparente=false] - deixa ver o fundo da página
 * @param {number}  [opcoes.folga=1.1]          - margem do enquadramento (1.1 = 10%)
 * @param {function} [opcoes.aoTocar]           - chamada com o objeto 3D tocado (ou null)
 */
export function criarVisualizador(container, opcoes = {}) {
    const { corFundo = 0x202020, autoRotacao = false, fundoTransparente = false, folga = 1.1, aoTocar = null } = opcoes;

    // Garante que o container seja a referência para o aviso por cima
    if (getComputedStyle(container).position === 'static') {
        container.style.position = 'relative';
    }

    let destruido = false;

    // ---------- Cena, câmera, renderizador ----------
    const scene = new THREE.Scene();
    if (!fundoTransparente) scene.background = new THREE.Color(corFundo);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: fundoTransparente });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // limita em telas 3x
    container.appendChild(renderer.domElement);

    // ---------- Aviso na tela (carregando / erro) ----------
    const aviso = document.createElement('div');
    aviso.style.cssText = `
        position: absolute; inset: 0;
        display: none; align-items: center; justify-content: center;
        color: #fff; font-family: sans-serif; font-size: 18px;
        text-align: center; padding: 20px; pointer-events: none;
    `;
    container.appendChild(aviso);

    function mostrarAviso(texto, cor = '#fff') {
        aviso.textContent = texto;
        aviso.style.color = cor;
        aviso.style.display = 'flex';
    }

    function esconderAviso() {
        aviso.style.display = 'none';
    }

    // ---------- Controles ----------
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = autoRotacao;
    controls.autoRotateSpeed = 1.5;

    // Quando o usuário começa a arrastar, para a rotação automática
    controls.addEventListener('start', () => {
        controls.autoRotate = false;
    });

    // ---------- Iluminação ----------
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const luz = new THREE.DirectionalLight(0xffffff, 1.5);
    luz.position.set(5, 5, 5);
    scene.add(luz);

    // ---------- Tamanho acompanha o container ----------
    function ajustarTamanho() {
        const largura = container.clientWidth;
        const altura = container.clientHeight;
        if (largura === 0 || altura === 0) return;

        renderer.setSize(largura, altura);
        camera.aspect = largura / altura;
        camera.updateProjectionMatrix();
    }

    const observador = new ResizeObserver(ajustarTamanho);
    observador.observe(container);
    ajustarTamanho();

    // ---------- Enquadramento automático ----------
    let modeloAtual = null;
    const vistaInicial = {
        posicao: new THREE.Vector3(),
        alvo: new THREE.Vector3()
    };

    function enquadrarModelo(modelo) {
        const caixa = new THREE.Box3().setFromObject(modelo);
        const centro = caixa.getCenter(new THREE.Vector3());
        modelo.position.sub(centro);

        const tamanho = caixa.getSize(new THREE.Vector3());
        const raio = tamanho.length() / 2;

        const fovVertical = THREE.MathUtils.degToRad(camera.fov);
        const fovHorizontal = 2 * Math.atan(Math.tan(fovVertical / 2) * camera.aspect);
        const fovMenor = Math.min(fovVertical, fovHorizontal);
        const distancia = (raio / Math.sin(fovMenor / 2)) * folga;

        // O modelo pode pedir outro ângulo (ex.: gabinete, vidro do lado esquerdo)
        const direcao = new THREE.Vector3(...(modelo.userData.direcaoCamera ?? [1, 0.6, 1])).normalize();
        camera.position.copy(direcao).multiplyScalar(distancia);

        camera.near = distancia / 100;
        camera.far = distancia * 100;
        camera.updateProjectionMatrix();

        controls.target.set(0, 0, 0);
        controls.minDistance = raio * 0.5;
        controls.maxDistance = distancia * 3;
        controls.update();

        vistaInicial.posicao.copy(camera.position);
        vistaInicial.alvo.copy(controls.target);
    }

    // Coloca um objeto na cena no lugar do modelo anterior
    function trocarModelo(objeto) {
        removerMetadeB();
        materiaisCortados.clear();   // os materiais do modelo antigo vão ser liberados
        afastamento = 0;
        if (modeloAtual) {
            scene.remove(modeloAtual);
            liberarObjeto(modeloAtual);
        }

        modeloAtual = objeto;
        scene.add(modeloAtual);
        enquadrarModelo(modeloAtual);
        posicaoBase.copy(modeloAtual.position);
        definirCorte();   // se o corte já estava ligado, vale para o modelo novo
        controls.autoRotate = autoRotacao && !corte.ligado;   // modelo novo volta a girar
        esconderAviso();
    }

    // ---------- Plano de corte (clipping) ----------
    // Um plano corta o modelo: o que fica do lado "negativo" dele não é
    // desenhado (o próprio WebGL descarta esses pixels). Assim dá para ver
    // o modelo por dentro, como num desenho técnico em corte.
    //
    // Só cortar deixaria o modelo "oco" (vemos as paredes de dentro, com luz
    // estranha). Para parecer um objeto maciço cortado, enquanto o corte está
    // ligado os materiais passam a desenhar também a face de trás, e o
    // fragment shader pinta essas faces de uma cor só (a "superfície do corte").
    //
    // "Separar as metades": uma cópia do modelo é cortada pelo plano oposto,
    // e as duas metades se afastam, como uma peça serrada ao meio.
    renderer.localClippingEnabled = true;   // cada material tem o seu plano

    const planoCorte = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);   // posição do corte
    const planoMetadeA = new THREE.Plane();   // plano da metade original (já deslocada)
    const planoMetadeB = new THREE.Plane();   // plano oposto, da cópia
    const corte = { ligado: false, eixo: 'x', posicao: 0.5, inverter: false, separar: false };
    const materiaisCortados = new Map();   // material do modelo → como ele era antes

    // A cópia (outra metade) e as listas de nós dos dois modelos, na mesma ordem
    let metadeB = null;
    let nosA = [];
    let nosB = [];
    const posicaoBase = new THREE.Vector3();   // onde o enquadramento colocou o modelo
    let afastamento = 0;                         // quanto as metades se afastam agora (anima)

    // Cor das superfícies cortadas (laranja, em RGB de 0 a 1)
    const COR_CORTE = 'vec3(1.0, 0.42, 0.18)';

    // Faz o material ser cortado pelo plano e pintar a superfície do corte
    function ativarCorteNoMaterial(material, plano) {
        material.side = THREE.DoubleSide;
        material.clippingPlanes = [plano];
        material.onBeforeCompile = (shader) => {
            // gl_FrontFacing é falso quando o pixel vem da face de trás de um triângulo
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <dithering_fragment>',
                `#include <dithering_fragment>
                if (!gl_FrontFacing) gl_FragColor = vec4(${COR_CORTE}, 1.0);`
            );
        };
        // Avisa o three.js que este shader é diferente (senão ele reaproveita o antigo)
        material.customProgramCacheKey = () => 'corte';
        material.needsUpdate = true;
    }

    function prepararMaterialParaCorte(material) {
        if (materiaisCortados.has(material)) return;
        // Material que só desenha o verso (fundo de tela, por exemplo) fica como está
        if (material.side === THREE.BackSide) return;

        materiaisCortados.set(material, {
            side: material.side,
            clippingPlanes: material.clippingPlanes,
            onBeforeCompile: material.onBeforeCompile,
            customProgramCacheKey: material.customProgramCacheKey,
        });
        ativarCorteNoMaterial(material, planoMetadeA);
    }

    function restaurarMateriais() {
        for (const [material, original] of materiaisCortados) {
            Object.assign(material, original);
            material.needsUpdate = true;
        }
        materiaisCortados.clear();
    }

    function listaDeMateriais(no) {
        return Array.isArray(no.material) ? no.material : [no.material];
    }

    // Percorre o modelo e prepara os materiais. Roda a cada quadro enquanto o
    // corte está ligado, porque a vista explodida pode trocar materiais por cópias.
    function aplicarCorteNoModelo() {
        modeloAtual?.traverse((no) => {
            if (no.isMesh) listaDeMateriais(no).forEach(prepararMaterialParaCorte);
        });
    }

    // Cria a outra metade: uma cópia do modelo que divide as geometrias com o
    // original, mas tem materiais próprios (cortados pelo plano oposto)
    function criarMetadeB() {
        metadeB = modeloAtual.clone(true);
        metadeB.userData = {};   // sem animação nem vista explodida própria
        metadeB.traverse((no) => {
            if (!no.isMesh) return;
            const copias = listaDeMateriais(no).map((m) => {
                const copia = m.clone();
                // Copia o lado de antes do corte (o verso só é desenhado por causa do corte)
                copia.side = materiaisCortados.get(m)?.side ?? m.side;
                if (copia.side !== THREE.BackSide) ativarCorteNoMaterial(copia, planoMetadeB);
                return copia;
            });
            no.material = Array.isArray(no.material) ? copias : copias[0];
        });
        nosA = [];
        nosB = [];
        modeloAtual.traverse((no) => nosA.push(no));
        metadeB.traverse((no) => nosB.push(no));
        scene.add(metadeB);
    }

    // Tira a cópia da cena. As geometrias são do modelo original, então só os
    // materiais copiados são liberados aqui.
    function removerMetadeB() {
        if (!metadeB) return;
        scene.remove(metadeB);
        metadeB.traverse((no) => {
            if (no.isMesh) listaDeMateriais(no).forEach((m) => m.dispose());
        });
        metadeB = null;
        nosA = [];
        nosB = [];
    }

    // Posiciona o plano: "posicao" vai de 0 (começo do modelo) a 1 (fim)
    // no eixo escolhido, usando a caixa que envolve o modelo agora.
    // Depois afasta as metades (se "separar" estiver ligado) e leva os planos junto.
    function atualizarPlanoCorte(dt = 0) {
        if (!modeloAtual) return;

        // A caixa é medida com o modelo no lugar original (sem o afastamento)
        modeloAtual.position.copy(posicaoBase);
        const caixa = new THREE.Box3().setFromObject(modeloAtual);
        const i = { x: 0, y: 1, z: 2 }[corte.eixo];
        const minimo = caixa.min.getComponent(i);
        const maximo = caixa.max.getComponent(i);
        const d = minimo + (maximo - minimo) * corte.posicao;

        // Fica visível o que tem distância >= 0 do plano:
        // normal (-1,0,0) e constante d → mantém x <= d (a parte "de trás")
        const normal = new THREE.Vector3();
        normal.setComponent(i, corte.inverter ? 1 : -1);
        planoCorte.set(normal, corte.inverter ? -d : d);

        // Afastamento animado: vai chegando aos poucos em 35% do tamanho do modelo
        const alvo = corte.separar ? (maximo - minimo) * 0.35 : 0;
        afastamento += (alvo - afastamento) * Math.min(1, dt * 6);
        if (!dt) afastamento = alvo;
        if (!corte.separar && afastamento < 0.001 * (maximo - minimo)) removerMetadeB();

        // Cada metade anda metade do afastamento para o seu lado, e o plano dela vai junto
        const deslocA = normal.clone().multiplyScalar(afastamento / 2);
        modeloAtual.position.copy(posicaoBase).add(deslocA);
        planoMetadeA.copy(planoCorte).translate(deslocA);

        if (metadeB) {
            const deslocB = deslocA.clone().negate();
            metadeB.position.copy(posicaoBase).add(deslocB);
            planoMetadeB.copy(planoCorte).negate().translate(deslocB);
            // A cópia acompanha as peças do original (ex.: vista explodida, ventoinhas)
            for (let k = 1; k < nosA.length && k < nosB.length; k++) {
                nosB[k].position.copy(nosA[k].position);
                nosB[k].quaternion.copy(nosA[k].quaternion);
                nosB[k].scale.copy(nosA[k].scale);
                nosB[k].visible = nosA[k].visible;
            }
        }
    }

    /**
     * Liga, ajusta ou desliga o corte.
     * @param {object} [ajustes] - { ligado, eixo: 'x'|'y'|'z', posicao: 0 a 1, inverter, separar }
     */
    function definirCorte(ajustes = {}) {
        Object.assign(corte, ajustes);
        if (corte.ligado && modeloAtual) {
            aplicarCorteNoModelo();
            if (corte.separar && !metadeB) criarMetadeB();
            atualizarPlanoCorte(metadeB ? 1 / 60 : 0);   // com a cópia, o afastamento anima
        } else if (!corte.ligado) {
            removerMetadeB();
            restaurarMateriais();
            afastamento = 0;
            modeloAtual?.position.copy(posicaoBase);
        }
    }

    // ---------- Toque na peça (raycasting) ----------
    // Um "toque" é apertar e soltar quase no mesmo lugar e rápido;
    // assim arrastar para girar a câmera não conta como toque.
    if (aoTocar) {
        const raycaster = new THREE.Raycaster();
        let inicio = null;

        renderer.domElement.addEventListener('pointerdown', (e) => {
            inicio = { x: e.clientX, y: e.clientY, t: performance.now() };
        });

        renderer.domElement.addEventListener('pointerup', (e) => {
            if (!inicio || !modeloAtual) return;
            const moveu = Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y);
            const demorou = performance.now() - inicio.t;
            inicio = null;
            if (moveu > 8 || demorou > 500) return;

            // Posição do toque em coordenadas normalizadas (-1 a 1)
            const ret = renderer.domElement.getBoundingClientRect();
            const ponto = new THREE.Vector2(
                ((e.clientX - ret.left) / ret.width) * 2 - 1,
                -((e.clientY - ret.top) / ret.height) * 2 + 1
            );
            raycaster.setFromCamera(ponto, camera);
            // Com o corte ligado, ignora o que foi cortado (não aparece na tela)
            const acertos = raycaster.intersectObject(modeloAtual, true)
                .filter((a) => !corte.ligado || planoMetadeA.distanceToPoint(a.point) >= 0);
            aoTocar(acertos.length ? acertos[0].object : null);
        });
    }

    // ---------- Interface pública ----------
    const loader = new GLTFLoader();

    // Cada carregamento recebe um número. Se o usuário pedir outro modelo
    // antes do download terminar, o resultado antigo é descartado
    // (senão um modelo lento poderia aparecer por cima do mais novo).
    let ultimoPedido = 0;

    /** Carrega um arquivo .glb/.gltf pela URL. */
    async function carregarModelo(url) {
        const pedido = ++ultimoPedido;
        mostrarAviso('Carregando modelo...');

        try {
            const gltf = await loader.loadAsync(url, (progresso) => {
                // total pode ser 0 se o servidor não informar o tamanho do arquivo
                if (progresso.total > 0 && pedido === ultimoPedido) {
                    const porcentagem = Math.round((progresso.loaded / progresso.total) * 100);
                    mostrarAviso(`Carregando modelo... ${porcentagem}%`);
                }
            });

            // Destruído durante o download, ou já pediram outro modelo: descarta
            if (destruido || pedido !== ultimoPedido) {
                liberarObjeto(gltf.scene);
                return;
            }

            trocarModelo(gltf.scene);

        } catch (erro) {
            if (!destruido && pedido === ultimoPedido) {
                mostrarAviso('Não foi possível carregar o modelo 3D.', '#ff8080');
            }
            throw erro; // quem chamou ainda pode tratar o erro
        }
    }

    /** Mostra um objeto 3D já pronto (ex.: um modelo gerado por código). */
    function mostrarObjeto(objeto) {
        ++ultimoPedido;              // cancela qualquer download em andamento
        if (destruido) {
            liberarObjeto(objeto);
            return;
        }
        trocarModelo(objeto);
    }

    /** Remove o modelo atual e mostra uma mensagem no lugar. */
    function limpar(mensagem = '') {
        ++ultimoPedido;
        removerMetadeB();
        materiaisCortados.clear();
        if (modeloAtual) {
            scene.remove(modeloAtual);
            liberarObjeto(modeloAtual);
            modeloAtual = null;
        }
        if (mensagem) mostrarAviso(mensagem, '#aab');
        else esconderAviso();
    }

    function resetarCamera() {
        camera.position.copy(vistaInicial.posicao);
        controls.target.copy(vistaInicial.alvo);
        controls.update();
    }

    // Desmonta tudo e libera a memória
    function destruir() {
        if (destruido) return;
        destruido = true;

        renderer.setAnimationLoop(null);   // para o loop
        observador.disconnect();           // para de observar o container
        removerMetadeB();
        controls.dispose();                // remove os eventos do mouse

        if (modeloAtual) {
            scene.remove(modeloAtual);
            liberarObjeto(modeloAtual);
            modeloAtual = null;
        }

        scene.environment.dispose();
        pmrem.dispose();
        renderer.dispose();

        renderer.domElement.remove();      // tira o canvas da página
        aviso.remove();
    }

    // Pausa o desenho quando o visualizador está escondido (economiza GPU)
    let pausado = false;
    function pausar() { pausado = true; }
    function retomar() { pausado = false; tempoAnterior = null; }
    function obterModelo() { return modeloAtual; }

    // ---------- Loop de renderização ----------
    // O setAnimationLoop entrega o tempo atual em ms; dt = segundos desde o quadro anterior
    let tempoAnterior = null;

    renderer.setAnimationLoop((tempo) => {
        if (pausado) return;
        const dt = tempoAnterior === null ? 0 : Math.min((tempo - tempoAnterior) / 1000, 0.1);
        tempoAnterior = tempo;

        // Modelos podem ter animação própria (ex.: ventoinhas girando)
        modeloAtual?.userData.atualizar?.(dt);

        // O corte acompanha o modelo (ex.: peças se afastando na vista explodida)
        if (corte.ligado) {
            aplicarCorteNoModelo();
            atualizarPlanoCorte(dt);
        }

        controls.update();
        renderer.render(scene, camera);
    });

    return { carregarModelo, mostrarObjeto, limpar, resetarCamera, destruir, pausar, retomar, obterModelo, definirCorte, controles: controls };
}
