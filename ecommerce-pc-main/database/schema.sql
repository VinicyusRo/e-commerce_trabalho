-- =====================================================
-- E-commerce de componentes de computador
-- Esquema do banco de dados (PostgreSQL)
-- =====================================================

-- Permite rodar o script várias vezes: apaga as tabelas antigas.
-- A ordem é das tabelas "filhas" para as "pais", por causa das FKs.
DROP VIEW  IF EXISTS vw_produto_catalogo;
DROP TABLE IF EXISTS item_pedido CASCADE;
DROP TABLE IF EXISTS pedido      CASCADE;
DROP TABLE IF EXISTS endereco    CASCADE;
DROP TABLE IF EXISTS usuario     CASCADE;
DROP TABLE IF EXISTS produto     CASCADE;
DROP TABLE IF EXISTS categoria   CASCADE;
DROP TABLE IF EXISTS modelo_3d   CASCADE;


-- =====================================================
-- MODELO_3D
-- Um modelo pode ser usado por vários produtos e/ou ser o
-- modelo padrão de uma categoria (relação N:1).
--
-- formato:
--   'glb' / 'gltf' → arquivo baixado; 'arquivo' é o caminho
--                    relativo à pasta public do frontend
--   'procedural'   → modelo gerado por código no frontend;
--                    'arquivo' é o nome do gerador (ex.: 'cpu')
-- =====================================================
CREATE TABLE modelo_3d (
    id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome        VARCHAR(100) NOT NULL,
    arquivo     VARCHAR(255) NOT NULL,
    formato     VARCHAR(10)  NOT NULL DEFAULT 'glb'
                CHECK (formato IN ('glb', 'gltf', 'procedural')),
    tamanho_kb  INTEGER      CHECK (tamanho_kb > 0),   -- NULL para procedurais
    creditos    TEXT,                                  -- autor / licença do modelo
    UNIQUE (formato, arquivo)
);


-- =====================================================
-- CATEGORIA
-- modelo_3d_id = modelo genérico usado pelos produtos da
-- categoria que não têm modelo próprio.
-- =====================================================
CREATE TABLE categoria (
    id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome          VARCHAR(60) NOT NULL UNIQUE,
    descricao     TEXT,
    modelo_3d_id  INTEGER
                  REFERENCES modelo_3d(id) ON DELETE SET NULL
);


-- =====================================================
-- PRODUTO
-- modelo_3d_id = modelo específico do produto (opcional).
-- =====================================================
CREATE TABLE produto (
    id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome          VARCHAR(150)  NOT NULL,
    descricao     TEXT,
    preco         NUMERIC(10,2) NOT NULL CHECK (preco >= 0),
    estoque       INTEGER       NOT NULL DEFAULT 0 CHECK (estoque >= 0),
    imagem        VARCHAR(255),
    categoria_id  INTEGER       NOT NULL
                  REFERENCES categoria(id) ON DELETE RESTRICT,
    modelo_3d_id  INTEGER
                  REFERENCES modelo_3d(id) ON DELETE SET NULL
);


-- =====================================================
-- USUARIO
-- =====================================================
CREATE TABLE usuario (
    id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome           VARCHAR(100) NOT NULL,
    email          VARCHAR(150) NOT NULL UNIQUE,
    senha_hash     VARCHAR(255) NOT NULL,   -- hash (bcrypt), nunca a senha pura
    data_cadastro  DATE         NOT NULL DEFAULT CURRENT_DATE
);


-- =====================================================
-- ENDERECO
-- =====================================================
CREATE TABLE endereco (
    id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id  INTEGER      NOT NULL
                REFERENCES usuario(id) ON DELETE CASCADE,
    rua         VARCHAR(150) NOT NULL,
    numero      VARCHAR(10)  NOT NULL,
    cidade      VARCHAR(80)  NOT NULL,
    estado      CHAR(2)      NOT NULL,
    cep         CHAR(8)      NOT NULL
);


-- =====================================================
-- PEDIDO
-- =====================================================
CREATE TABLE pedido (
    id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id   INTEGER      NOT NULL
                 REFERENCES usuario(id) ON DELETE RESTRICT,
    endereco_id  INTEGER      NOT NULL
                 REFERENCES endereco(id) ON DELETE RESTRICT,
    data         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status       VARCHAR(20)  NOT NULL DEFAULT 'pendente'
                 CHECK (status IN ('pendente', 'pago', 'enviado', 'entregue', 'cancelado'))
);


-- =====================================================
-- ITEM_PEDIDO  (tabela associativa N:M entre pedido e produto)
-- =====================================================
CREATE TABLE item_pedido (
    pedido_id       INTEGER       NOT NULL
                    REFERENCES pedido(id) ON DELETE CASCADE,
    produto_id      INTEGER       NOT NULL
                    REFERENCES produto(id) ON DELETE RESTRICT,
    quantidade      INTEGER       NOT NULL CHECK (quantidade > 0),
    preco_unitario  NUMERIC(10,2) NOT NULL CHECK (preco_unitario >= 0),
    PRIMARY KEY (pedido_id, produto_id)
);


-- =====================================================
-- ÍNDICES
-- O PostgreSQL cria índice automático só para PRIMARY KEY e
-- UNIQUE. Chaves estrangeiras usadas em JOIN/WHERE ganham
-- índice manualmente.
-- (item_pedido.pedido_id já é coberto pela PK composta.)
-- =====================================================
CREATE INDEX idx_produto_categoria    ON produto(categoria_id);
CREATE INDEX idx_produto_modelo       ON produto(modelo_3d_id);
CREATE INDEX idx_categoria_modelo     ON categoria(modelo_3d_id);
CREATE INDEX idx_endereco_usuario     ON endereco(usuario_id);
CREATE INDEX idx_pedido_usuario       ON pedido(usuario_id);
CREATE INDEX idx_item_pedido_produto  ON item_pedido(produto_id);


-- =====================================================
-- VIEW: produto pronto para o catálogo
-- Escolhe o modelo 3D assim:
--   1º o modelo próprio do produto
--   2º se não houver, o modelo padrão da categoria
--   3º se nenhum dos dois existir, NULL
-- COALESCE devolve o primeiro valor que não é NULL.
-- =====================================================
CREATE VIEW vw_produto_catalogo AS
SELECT p.id,
       p.nome,
       p.descricao,
       p.preco,
       p.estoque,
       p.imagem,
       c.id        AS categoria_id,
       c.nome      AS categoria,
       m.arquivo   AS modelo_arquivo,
       m.formato   AS modelo_formato,
       m.creditos  AS modelo_creditos,
       CASE
           WHEN p.modelo_3d_id IS NOT NULL THEN 'produto'
           WHEN c.modelo_3d_id IS NOT NULL THEN 'categoria'
       END AS modelo_origem
FROM produto p
JOIN      categoria c ON c.id = p.categoria_id
LEFT JOIN modelo_3d m ON m.id = COALESCE(p.modelo_3d_id, c.modelo_3d_id);
