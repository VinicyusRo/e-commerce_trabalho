# PC Store: e-commerce de peças de PC

Projeto de Banco de Dados + Computação Gráfica: loja de componentes com prévia 3D de cada produto.

## Como rodar

### 1. Banco (PostgreSQL)

Crie o banco `ecommerce_pc` e rode os scripts nesta ordem (pelo terminal ou pelo Query Tool do pgAdmin):

```bash
psql -U postgres -d ecommerce_pc -f database/schema.sql
psql -U postgres -d ecommerce_pc -f database/seed.sql
```

O `schema.sql` apaga e recria as tabelas. Rode-o de novo sempre que o esquema mudar.

### 2. Backend (porta 3000)

```bash
cd backend
cp .env.example .env    # preencha DB_PASSWORD e JWT_SECRET
npm install
npm run dev
```

### 3. Frontend (porta 5173)

```bash
cd frontend
npm install
npm run dev
```

Abra http://localhost:5173. O Vite repassa as chamadas `/api` para o backend (ver `frontend/vite.config.js`).

## Modelos 3D

Todo produto mostra uma prévia 3D na própria página (`produto.html`), com opção de tela cheia (`visualizador.html`).
Qual modelo usar é decidido no banco, pela view `vw_produto_catalogo`:

1. o modelo próprio do produto (`produto.modelo_3d_id`), se existir;
2. senão, o modelo padrão da categoria (`categoria.modelo_3d_id`);
3. senão, nenhum.

A tabela `modelo_3d` aceita dois formatos:

| formato      | `arquivo` contém                                         | exemplo                    |
|--------------|----------------------------------------------------------|----------------------------|
| `glb`/`gltf` | caminho dentro de `frontend/public`                      | `modelos/rtx3090_gpu.glb`  |
| `procedural` | nome do gerador em `src/viewer/modelos-procedurais.js`   | `cpu`, `gpu`, `ram`, `ssd` |

Os modelos procedurais são gerados por código com Three.js (formas extrudadas, `InstancedMesh` para pinos e contatos, texturas desenhadas em canvas e animação das ventoinhas).

## API

| Rota                                  | Descrição                                         |
|---------------------------------------|---------------------------------------------------|
| `GET /api/produtos`                   | lista produtos (`?categoria=1`, `?busca=rtx`)     |
| `GET /api/produtos/:id`               | um produto, com `modelo_3d`                       |
| `GET /api/categorias`                 | categorias com a quantidade de produtos           |
| `POST /api/auth/cadastro` / `login`   | cadastro e login (JWT)                            |
| `GET /api/auth/eu`                    | usuário logado                                    |
| `GET/POST /api/enderecos`             | endereços do usuário logado                       |
| `GET/POST /api/pedidos`               | pedidos (criação em transação com `FOR UPDATE`)   |

O campo `modelo_3d` de um produto vem assim:

```json
{ "arquivo": "cpu", "formato": "procedural", "creditos": null, "origem": "categoria" }
```

## Créditos dos modelos

- "Nvidia GeForce RTX 3090" (https://skfb.ly/o86BB) por Cem Gürbüz, licença CC BY-NC 4.0.
- "GeForce RTX 4090 Founders Edition" (https://skfb.ly/oyBLN) por exéla, licença CC BY-NC 4.0.
