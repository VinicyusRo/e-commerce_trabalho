import { escapar } from '../utils.js';

/*
 * Foto do produto (coluna produto.imagem).
 * - Pode ser um endereço completo (https://...) ou um caminho da pasta
 *   public (ex.: "imagens/placas/rtx-5080.jpg").
 * - Se a foto não carregar, ela some e o ícone da categoria aparece
 *   no lugar (o ícone fica sempre por baixo, escondido pelo CSS).
 */

export function urlImagem(imagem) {
    if (!imagem) return null;
    return /^https?:\/\//.test(imagem) ? imagem : `/${imagem.replace(/^\//, '')}`;
}

/** Foto com a fonte, quando ela vem de outro site (ex.: Pichau). */
export function fonteDaImagem(imagem) {
    if (imagem?.startsWith('imagens/produtos/')) return 'Pichau';   // fotos baixadas pelo script
    if (!imagem || !/^https?:\/\//.test(imagem)) return null;
    if (imagem.includes('pichau.com.br')) return 'Pichau';
    return new URL(imagem).hostname;
}

/** <img> da foto; a classe "foto-produto" liga o tratamento de erro abaixo. */
export function fotoHTML(p) {
    const url = urlImagem(p.imagem);
    if (!url) return '';
    // no-referrer: alguns sites bloqueiam fotos pedidas por outro domínio
    return `<img class="foto-produto" src="${escapar(url)}" alt="${escapar(p.nome)}"
                 loading="lazy" decoding="async" referrerpolicy="no-referrer">`;
}

// Erro de imagem não "borbulha", por isso escutamos na fase de captura
document.addEventListener('error', (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || !img.classList.contains('foto-produto')) return;
    img.closest('.tem-foto')?.classList.remove('tem-foto');
    img.remove();
}, true);
