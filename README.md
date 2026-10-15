# PC Store

E-commerce de peças de PC e periféricos com prévia 3D de cada produto, feito para as disciplinas de Banco de Dados e Computação Gráfica.

**Site:** [e-commerce-trabalho.vercel.app](https://e-commerce-trabalho.vercel.app)

## Destaques

- **Prévia 3D gerada por código (Three.js):** os 15 tipos de produto têm um modelo 3D próprio, que se ajusta ao nome e aos dados de cada produto. Os 13 produtos em destaque têm modelos fiéis, feitos a partir de fotos. O visualizador tem tela cheia e vista explodida.
- **Monte seu PC:** só mostra peças compatíveis (soquete, memória, tamanho, potência) e anima a montagem em 3D.
- **PostgreSQL:** relações 1:1, 1:N e N:N, JSONB, view do catálogo, pedidos em transação com `FOR UPDATE`, exclusão lógica e RLS no Supabase.
- **API REST em Node.js + Express:** catálogo com busca, cadastro e login com JWT, endereços e pedidos.

## Tecnologias

JavaScript · Vite · Three.js · Node.js · Express · PostgreSQL (Supabase) · JWT · HTML e CSS

## Como rodar

O código está na pasta [ecommerce-pc-main](ecommerce-pc-main). O passo a passo completo (banco, backend e frontend), o diagrama do banco e a documentação da API estão no [README do projeto](ecommerce-pc-main/README.md).

## Autor

Vinicyus Rodrigues · [LinkedIn](https://www.linkedin.com/in/vinicyus-rodrigues-0612492ba)
