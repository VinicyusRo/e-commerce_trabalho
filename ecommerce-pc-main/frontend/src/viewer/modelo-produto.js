import { gerarModeloProcedural, existeModeloProcedural } from './modelos-procedurais.js';
import { parametrosDoProduto, modeloFiel } from './parametros.js';

// Categorias que usam um modelo baixado (.glb, migração 11) → gerador por código
// da mesma peça. O modelo fiel do produto tem preferência sobre o baixado, e o
// gerador serve de reserva se o arquivo .glb não existir.
const GERADOR_DA_CATEGORIA = {
    'Placas de vídeo': 'gpu',
    'Processadores': 'cpu',
    'Gabinetes': 'gabinete',
};

/** Nome do gerador por código que vale para este modelo (ou undefined). */
function geradorDoModelo(modelo, produto) {
    if (modelo?.formato === 'procedural') return modelo.arquivo;
    if (modelo?.origem === 'categoria') return GERADOR_DA_CATEGORIA[produto?.categoria];
    return undefined;
}

/**
 * Mostra no visualizador o modelo 3D de um produto, do jeito que a API devolve:
 *   produto.modelo_3d = { arquivo, formato, creditos, origem } ou null
 *
 * - formato 'glb'/'gltf' → baixa o arquivo (caminho relativo à pasta public)
 * - formato 'procedural' → gera o modelo por código (modelos-procedurais.js)
 */
export function exibirModeloDoProduto(visualizador, modelo, produto = null) {
    if (!modelo) {
        visualizador.limpar('Este produto ainda não tem prévia 3D.');
        return;
    }

    const gerador = geradorDoModelo(modelo, produto);
    function gerar() {
        if (!existeModeloProcedural(gerador)) {
            console.warn('Gerador procedural não encontrado:', gerador);
            visualizador.limpar('Prévia 3D indisponível.');
            return;
        }
        // Com o produto, o modelo genérico ganha a cara dele (modelagem paramétrica)
        visualizador.mostrarObjeto(gerarModeloProcedural(gerador, parametrosDoProduto(gerador, produto)));
    }

    if (modelo.formato === 'procedural' || temModeloFiel(modelo, produto)) {
        gerar();
        return;
    }

    // O caminho do banco é relativo ("modelos/..."), então prefixamos com "/"
    visualizador
        .carregarModelo(`/${modelo.arquivo}`)
        .catch((erro) => {
            console.error('Erro ao carregar o modelo:', erro);
            if (gerador) gerar();   // sem o .glb, volta para o modelo gerado por código
        });
}

/** O produto tem modelo 3D fiel (feito a partir das fotos dele)? */
export function temModeloFiel(modelo, produto) {
    const gerador = geradorDoModelo(modelo, produto);
    return Boolean(gerador && modeloFiel(gerador, produto));
}

/** Texto curto para o selo: "3D do produto" ou "3D genérico". */
export function textoSeloModelo(modelo, produto = null) {
    if (!modelo) return null;
    if (temModeloFiel(modelo, produto)) return '3D deste produto';
    return modelo.origem === 'produto' ? '3D do produto' : '3D genérico';
}

/**
 * Créditos com as URLs viradas em links (a licença CC BY exige mostrar).
 * Monta com nós de texto, sem innerHTML: o texto vem do banco.
 */
export function elementoCreditos(texto) {
    const p = document.createElement('p');
    p.className = 'creditos';
    p.append('Modelo 3D: ');

    for (const parte of texto.split(/(https?:\/\/[^\s)]+)/g)) {
        if (/^https?:\/\//.test(parte)) {
            const link = document.createElement('a');
            link.href = parte;
            link.textContent = parte;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            p.append(link);
        } else {
            p.append(parte);
        }
    }
    return p;
}
