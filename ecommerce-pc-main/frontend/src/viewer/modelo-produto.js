import { gerarModeloProcedural, existeModeloProcedural } from './modelos-procedurais.js';

/**
 * Mostra no visualizador o modelo 3D de um produto, do jeito que a API devolve:
 *   produto.modelo_3d = { arquivo, formato, creditos, origem } ou null
 *
 * - formato 'glb'/'gltf' → baixa o arquivo (caminho relativo à pasta public)
 * - formato 'procedural' → gera o modelo por código (modelos-procedurais.js)
 */
export function exibirModeloDoProduto(visualizador, modelo) {
    if (!modelo) {
        visualizador.limpar('Este produto ainda não tem prévia 3D.');
        return;
    }

    if (modelo.formato === 'procedural') {
        if (!existeModeloProcedural(modelo.arquivo)) {
            console.warn('Gerador procedural não encontrado:', modelo.arquivo);
            visualizador.limpar('Prévia 3D indisponível.');
            return;
        }
        visualizador.mostrarObjeto(gerarModeloProcedural(modelo.arquivo));
        return;
    }

    // O caminho do banco é relativo ("modelos/..."), então prefixamos com "/"
    visualizador
        .carregarModelo(`/${modelo.arquivo}`)
        .catch((erro) => console.error('Erro ao carregar o modelo:', erro));
}

/** Texto curto para o selo: "3D do produto" ou "3D genérico". */
export function textoSeloModelo(modelo) {
    if (!modelo) return null;
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
