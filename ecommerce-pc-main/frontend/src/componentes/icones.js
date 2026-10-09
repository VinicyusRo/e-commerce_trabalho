// Ícones SVG simples (desenhados com linhas, usam a cor do texto: currentColor)

export const ICONES = {
    gpu: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="4" y="12" width="40" height="20" rx="3"/><circle cx="16" cy="22" r="6"/><circle cx="32" cy="22" r="6"/><path d="M10 32v5h14v-5"/></svg>`,
    cpu: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="12" y="12" width="24" height="24" rx="2"/><rect x="18" y="18" width="12" height="12"/><path d="M18 6v6M24 6v6M30 6v6M18 36v6M24 36v6M30 36v6M6 18h6M6 24h6M6 30h6M36 18h6M36 24h6M36 30h6"/></svg>`,
    ram: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 14h40v16H27v4h-6v-4H4z"/><rect x="9" y="18" width="6" height="8"/><rect x="21" y="18" width="6" height="8"/><rect x="33" y="18" width="6" height="8"/></svg>`,
    ssd: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="4" y="16" width="40" height="16" rx="2"/><path d="M8 20v8"/><rect x="16" y="20" width="10" height="8"/><rect x="30" y="20" width="8" height="8"/></svg>`,
    placaMae: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="6" y="6" width="36" height="36" rx="2"/><rect x="12" y="12" width="12" height="12"/><path d="M30 12v12M34 12v12M12 31h24M12 36h16"/><circle cx="35" cy="35" r="2"/></svg>`,
    montar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><circle cx="12" cy="15" r="3"/><path d="M9 6h6M9 9h6"/></svg>`,
    gabinete: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="12" y="4" width="24" height="40" rx="2"/><circle cx="24" cy="30" r="6"/><path d="M17 10h14M17 15h14"/></svg>`,
    fonte: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="4" y="12" width="40" height="26" rx="2"/><circle cx="18" cy="25" r="8"/><path d="M18 17v16M10 25h16M34 19h4M34 25h4M34 31h4"/></svg>`,
    cooler: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="8" y="8" width="32" height="32" rx="3"/><circle cx="24" cy="24" r="11"/><circle cx="24" cy="24" r="3"/><path d="M24 13c4 4 4 8 0 8M35 24c-4 4-8 4-8 0M24 35c-4-4-4-8 0-8M13 24c4-4 8-4 8 0"/></svg>`,
    ventoinha: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><circle cx="24" cy="24" r="18"/><circle cx="24" cy="24" r="3"/><path d="M24 21c-2-6 2-11 7-10M27 24c6-2 11 2 10 7M24 27c2 6-2 11-7 10M21 24c-6 2-11-2-10-7"/></svg>`,
    monitor: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="4" y="8" width="40" height="26" rx="2"/><path d="M20 34l-2 7h12l-2-7M14 41h20"/></svg>`,
    teclado: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="13" width="42" height="22" rx="3"/><path d="M9 19h2M15 19h2M21 19h2M27 19h2M33 19h2M39 19h0M9 24h2M15 24h2M21 24h2M27 24h2M33 24h4M14 30h20"/></svg>`,
    mouse: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="13" y="5" width="22" height="38" rx="11"/><path d="M24 5v13M13 18h22"/></svg>`,
    headset: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M8 28v-4a16 16 0 0 1 32 0v4"/><rect x="5" y="27" width="9" height="13" rx="3"/><rect x="34" y="27" width="9" height="13" rx="3"/><path d="M10 40c0 3 4 4 10 4"/></svg>`,
    controle: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M14 14h20c6 0 9 6 10 14 1 7-2 10-5 10-4 0-6-6-9-6H18c-3 0-5 6-9 6-3 0-6-3-5-10 1-8 4-14 10-14z"/><path d="M13 21v6M10 24h6"/><circle cx="33" cy="22" r="1.5"/><circle cx="37" cy="26" r="1.5"/></svg>`,
    cadeira: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M16 4h16l-2 22H18z"/><path d="M12 26h24v5H12zM24 31v8M14 43l10-4 10 4M10 22v6M38 22v6"/></svg>`,
    outro: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M24 4l17 10v20L24 44 7 34V14z"/><path d="M7 14l17 10 17-10M24 24v20"/></svg>`,

    carrinho: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L22 7H6"/></svg>`,
    usuario: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>`,
    busca: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>`,
    olho: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>`,
    olhoFechado: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6A17.4 17.4 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="M3 3l18 18"/></svg>`,
    lixeira: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>`,
    seta: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
    cubo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M3 7l9 5 9-5M12 12v10"/></svg>`,
};

// Escolhe o ícone pelo nome da categoria (vem do banco)
export function iconeDaCategoria(nomeCategoria = '') {
    const nome = nomeCategoria.toLowerCase();
    if (nome.includes('mãe') || nome.includes('mae')) return ICONES.placaMae;
    if (nome.includes('gabinete')) return ICONES.gabinete;
    if (nome.includes('monitor')) return ICONES.monitor;
    if (nome.includes('teclado')) return ICONES.teclado;
    if (nome.includes('mouse')) return ICONES.mouse;
    if (nome.includes('headset') || nome.includes('fone')) return ICONES.headset;
    if (nome.includes('controle')) return ICONES.controle;
    if (nome.includes('cadeira')) return ICONES.cadeira;
    if (nome.includes('fonte')) return ICONES.fonte;
    if (nome.includes('cooler')) return ICONES.cooler;
    if (nome.includes('ventoinha')) return ICONES.ventoinha;
    if (nome.includes('vídeo') || nome.includes('video')) return ICONES.gpu;
    if (nome.includes('processador')) return ICONES.cpu;
    if (nome.includes('memória') || nome.includes('memoria')) return ICONES.ram;
    if (nome.includes('armazenamento') || nome.includes('ssd')) return ICONES.ssd;
    return ICONES.outro;
}
