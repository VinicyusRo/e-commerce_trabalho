-- =====================================================
-- E-commerce de componentes de computador
-- Esquema do banco de dados (PostgreSQL)
-- =====================================================

-- Permite rodar o script várias vezes: apaga as tabelas antigas.
-- A ordem é das tabelas "filhas" para as "pais", por causa das FKs.
DROP TABLE IF EXISTS item_pedido CASCADE;
DROP TABLE IF EXISTS pedido      CASCADE;
DROP TABLE IF EXISTS endereco    CASCADE;
DROP TABLE IF EXISTS usuario     CASCADE;
DROP TABLE IF EXISTS modelo_3d   CASCADE;
DROP TABLE IF EXISTS produto     CASCADE;
DROP TABLE IF EXISTS categoria   CASCADE;


-- =====================================================
-- CATEGORIA
-- =====================================================
CREATE TABLE categoria (
    id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome       VARCHAR(60) NOT NULL UNIQUE,
    descricao  TEXT
);


-- =====================================================
-- PRODUTO
-- =====================================================
CREATE TABLE produto (
    id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome          VARCHAR(150)  NOT NULL,
    descricao     TEXT,
    preco         NUMERIC(10,2) NOT NULL CHECK (preco >= 0),
    estoque       INTEGER       NOT NULL DEFAULT 0 CHECK (estoque >= 0),
    imagem        VARCHAR(255),
    categoria_id  INTEGER       NOT NULL
                  REFERENCES categoria(id) ON DELETE RESTRICT
);


-- =====================================================
-- MODELO_3D  (relação 1:0..1 com produto)
-- =====================================================
CREATE TABLE modelo_3d (
    id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    produto_id  INTEGER      NOT NULL UNIQUE
                REFERENCES produto(id) ON DELETE CASCADE,
    arquivo     VARCHAR(255) NOT NULL,      -- caminho relativo, ex.: modelos/rtx3090_gpu.glb
    formato     VARCHAR(10)  NOT NULL DEFAULT 'glb',
    tamanho_kb  INTEGER      CHECK (tamanho_kb > 0),
    creditos    TEXT                         -- autor / licença do modelo
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