// Formata número como moeda brasileira: 7999.9 → "R$ 7.999,90"
export function formatarPreco(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Escapa texto antes de colocá-lo em innerHTML.
// Dados vindos do banco/usuário nunca devem virar HTML cru (XSS).
export function escapar(texto) {
    const div = document.createElement('div');
    div.textContent = texto ?? '';
    return div.innerHTML;
}