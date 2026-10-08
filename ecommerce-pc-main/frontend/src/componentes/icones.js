// Ícones SVG simples (desenhados com linhas, usam a cor do texto: currentColor)

export const ICONES = {
    gpu: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="4" y="12" width="40" height="20" rx="3"/><circle cx="16" cy="22" r="6"/><circle cx="32" cy="22" r="6"/><path d="M10 32v5h14v-5"/></svg>`,
    cpu: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="12" y="12" width="24" height="24" rx="2"/><rect x="18" y="18" width="12" height="12"/><path d="M18 6v6M24 6v6M30 6v6M18 36v6M24 36v6M30 36v6M6 18h6M6 24h6M6 30h6M36 18h6M36 24h6M36 30h6"/></svg>`,
    ram: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 14h40v16H27v4h-6v-4H4z"/><rect x="9" y="18" width="6" height="8"/><rect x="21" y="18" width="6" height="8"/><rect x="33" y="18" width="6" height="8"/></svg>`,
    ssd: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="4" y="16" width="40" height="16" rx="2"/><path d="M8 20v8"/><rect x="16" y="20" width="10" height="8"/><rect x="30" y="20" width="8" height="8"/></svg>`,
    outro: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M24 4l17 10v20L24 44 7 34V14z"/><path d="M7 14l17 10 17-10M24 24v20"/></svg>`,

    carrinho: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L22 7H6"/></svg>`,
    usuario: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>`,
    busca: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>`,
    olho: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>`,
    olhoFechado: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6A17.4 17.4 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="M3 3l18 18"/></svg>`,
    lixeira: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>`,
    cubo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M3 7l9 5 9-5M12 12v10"/></svg>`,
};

// Escolhe o ícone pelo nome da categoria (vem do banco)
export function iconeDaCategoria(nomeCategoria = '') {
    const nome = nomeCategoria.toLowerCase();
    if (nome.includes('vídeo') || nome.includes('video')) return ICONES.gpu;
    if (nome.includes('processador')) return ICONES.cpu;
    if (nome.includes('memória') || nome.includes('memoria')) return ICONES.ram;
    if (nome.includes('armazenamento') || nome.includes('ssd')) return ICONES.ssd;
    return ICONES.outro;
}
