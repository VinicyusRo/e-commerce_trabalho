// Rodapé do site: equipe, aviso de projeto acadêmico e fontes dos dados.
// É criado no fim do <body> de qualquer página que monta o cabeçalho.
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
      <div class="rodape-linha">
        <div class="rodape-coluna">
            <span class="rodape-logo">PC<span class="logo-destaque">Store</span></span>
            <p>Loja fictícia criada como trabalho acadêmico das disciplinas de Banco de Dados
               e Computação Gráfica. Nenhum produto é vendido de verdade.</p>
            <p class="rodape-tecnologias">Feito com PostgreSQL (Supabase), Node.js + Express e Vite + Three.js.</p>
        </div>
        <div class="rodape-coluna">
            <h3>Desenvolvido por</h3>
            <ul class="rodape-equipe">
                ${EQUIPE.map((nome) => `<li>${nome}</li>`).join('')}
            </ul>
        </div>
        <div class="rodape-coluna">
            <h3>Fontes dos dados</h3>
            <p>Nomes, preços e fotos dos produtos foram tirados da
               <a href="https://www.pichau.com.br" target="_blank" rel="noopener">Pichau</a> e da
               <a href="https://www.kabum.com.br" target="_blank" rel="noopener">KaBuM</a>
               só como referência. Os estoques são fictícios.</p>
        </div>
      </div>
      <div class="rodape-aviso">
        © ${new Date().getFullYear()} PCStore · Projeto sem fins comerciais. As marcas, nomes de produtos e imagens pertencem aos seus respectivos donos.
      </div>
    `;
    document.body.appendChild(rodape);
}
