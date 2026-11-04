// Rodapé do site em blocos: aviso de projeto acadêmico, navegação da loja,
// equipe, a marca grande e um atalho para o Monte seu PC.
// É criado no fim do <body> de qualquer página que monta o cabeçalho.
// Fica sempre visível (sem a animação de entrada), para nunca sumir o aviso.
const EQUIPE = [
    'Murilo Pacheco',
    'Giovanni Oliveira',
    'Vinicyus Rodrigues',
    'Italo Silva Lira',
    'Pierre Silva de Sá',
    'Guilherme Augusto',
];

export function montarRodape() {
    if (document.getElementById('rodape')) return;

    const rodape = document.createElement('footer');
    rodape.id = 'rodape';
    rodape.innerHTML = `
      <div class="rodape-tabua">
        <div class="r-frase">
            <span>Loja fictícia de um trabalho acadêmico de Banco de Dados e Computação Gráfica. Nada é vendido de verdade.</span>
            <small>Nomes, preços e fotos tirados da
               <a href="https://www.pichau.com.br" target="_blank" rel="noopener">Pichau</a> e da
               <a href="https://www.kabum.com.br" target="_blank" rel="noopener">KaBuM</a> só como referência; os estoques são fictícios.
               As marcas pertencem aos seus donos. © ${new Date().getFullYear()} TechForAll.</small>
        </div>
        <nav class="r-nav" aria-label="Loja">
            <span class="r-titulo">Loja</span>
            <ul>
                <li><a href="/?grupo=hardware">Hardware</a></li>
                <li><a href="/?grupo=perifericos">Periféricos</a></li>
                <li><a href="/monte-seu-pc.html">Monte seu PC</a></li>
                <li><a href="/conta.html">Minha conta</a></li>
            </ul>
        </nav>
        <div class="r-time">
            <span class="r-titulo">Feito por</span>
            <ul>${EQUIPE.map((nome) => `<li>${nome}</li>`).join('')}</ul>
        </div>
        <div class="r-marca" aria-hidden="true">
            <span><img src="/logo.svg" alt="" width="100" height="100"><span>Tech<span>ForAll</span></span></span>
        </div>
        <a class="r-acao" href="/monte-seu-pc.html">
            Montar meu PC agora
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </a>
      </div>
    `;
    document.body.appendChild(rodape);
}
