// Rodapé do site: aviso de projeto acadêmico e fontes dos dados.
// É criado no fim do <body> de qualquer página que monta o cabeçalho.
export function montarRodape() {
    if (document.getElementById('rodape')) return;

    const rodape = document.createElement('footer');
    rodape.id = 'rodape';
    rodape.innerHTML = `
      <div class="rodape-linha">
        <div class="rodape-coluna">
            <span class="rodape-logo">PC<span class="logo-destaque">Store</span></span>
            <p>Loja fictícia criada como trabalho acadêmico. Nenhum produto é vendido de verdade.</p>
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
        Projeto sem fins comerciais. As marcas, nomes de produtos e imagens pertencem aos seus respectivos donos.
      </div>
    `;
    document.body.appendChild(rodape);
}
