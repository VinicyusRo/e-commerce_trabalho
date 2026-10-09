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
        if (modeloAtual) {
            scene.remove(modeloAtual);
            liberarObjeto(modeloAtual);
        }

        modeloAtual = objeto;
        scene.add(modeloAtual);
        enquadrarModelo(modeloAtual);
        controls.autoRotate = autoRotacao;   // modelo novo volta a girar
        esconderAviso();
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
            const acertos = raycaster.intersectObject(modeloAtual, true);
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

        controls.update();
        renderer.render(scene, camera);
    });

    return { carregarModelo, mostrarObjeto, limpar, resetarCamera, destruir, pausar, retomar, obterModelo, controles: controls };
}
