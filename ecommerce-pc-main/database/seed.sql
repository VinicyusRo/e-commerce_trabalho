-- =====================================================
-- Dados de exemplo
-- =====================================================

-- Limpa os dados (mas mantém as tabelas) e reinicia os ids em 1.
TRUNCATE item_pedido, pedido, endereco, usuario,
         produto, categoria, modelo_3d
         RESTART IDENTITY CASCADE;


-- ---------- MODELOS 3D ----------
-- 1 e 2: arquivos baixados (modelos específicos das RTX)
-- 3 a 6: modelos genéricos gerados por código no frontend
--        (frontend/src/viewer/modelos-procedurais.js), um por categoria
INSERT INTO modelo_3d (nome, arquivo, formato, tamanho_kb, creditos) VALUES
('RTX 3090', 'modelos/rtx3090_gpu.glb', 'glb', 8141,
 '"Nvidia GeForce RTX 3090" (https://skfb.ly/o86BB) by Cem Gürbüz is licensed under Creative Commons Attribution-NonCommercial (http://creativecommons.org/licenses/by-nc/4.0/).'),
('RTX 4090 Founders Edition', 'modelos/rtx4090_gpu.glb', 'glb', 13902,
 '"GeForce RTX 4090 Founders Edition" (https://skfb.ly/oyBLN) by exéla is licensed under Creative Commons Attribution-NonCommercial (http://creativecommons.org/licenses/by-nc/4.0/).'),
('Placa de vídeo genérica', 'gpu', 'procedural', NULL, NULL),
('Processador genérico',    'cpu', 'procedural', NULL, NULL),
('Memória RAM genérica',    'ram', 'procedural', NULL, NULL),
('SSD M.2 genérico',        'ssd', 'procedural', NULL, NULL);


-- ---------- CATEGORIAS ----------
-- modelo_3d_id: modelo padrão da categoria (3 = gpu, 4 = cpu, 5 = ram, 6 = ssd)
INSERT INTO categoria (nome, descricao, modelo_3d_id) VALUES
('Placas de vídeo', 'GPUs para jogos, edição e inteligência artificial', 3),
('Processadores',   'CPUs para desktop',                                 4),
('Memórias RAM',    'Módulos de memória DDR4 e DDR5',                    5),
('Armazenamento',   'SSDs e HDs',                                        6);


-- ---------- PRODUTOS ----------
-- categoria_id: 1 = Placas de vídeo, 2 = Processadores, 3 = Memórias RAM, 4 = Armazenamento
-- modelo_3d_id: só preenchido quando o produto tem modelo próprio;
--               NULL = usa o modelo padrão da categoria
INSERT INTO produto (nome, descricao, preco, estoque, imagem, categoria_id, modelo_3d_id) VALUES
('NVIDIA GeForce RTX 3090 24GB',
 'Placa de vídeo de alto desempenho com 24 GB de memória GDDR6X.',
 7999.90, 5, 'imagens/rtx3090.jpg', 1, 1),

('NVIDIA GeForce RTX 4090 24GB',
 'Placa de vídeo topo de linha com 24 GB de memória GDDR6X.',
 12999.90, 3, 'imagens/rtx4090.jpg', 1, 2),

('AMD Ryzen 7 5800X',
 'Processador de 8 núcleos e 16 threads, soquete AM4.',
 1299.90, 10, 'imagens/ryzen7-5800x.jpg', 2, NULL),

('Memória Corsair Vengeance 16GB DDR4 3200MHz',
 'Módulo de memória RAM DDR4 de 16 GB.',
 289.90, 25, 'imagens/corsair-16gb.jpg', 3, NULL),

('SSD NVMe Kingston 1TB',
 'SSD M.2 NVMe de 1 TB com alta velocidade de leitura.',
 459.90, 15, 'imagens/ssd-kingston-1tb.jpg', 4, NULL),

-- Produtos 6 a 8: sem modelo próprio, mostram o modelo da categoria
('AMD Radeon RX 7800 XT 16GB',
 'Placa de vídeo com 16 GB de memória GDDR6, ótima para jogos em 1440p.',
 3599.90, 8, 'imagens/rx7800xt.jpg', 1, NULL),

('Intel Core i5-13400F',
 'Processador de 10 núcleos (6P + 4E) e 16 threads, soquete LGA1700.',
 1049.90, 12, 'imagens/i5-13400f.jpg', 2, NULL),

('Memória Kingston Fury Beast 32GB DDR5 5600MHz',
 'Módulo de memória RAM DDR5 de 32 GB.',
 649.90, 14, 'imagens/kingston-fury-32gb.jpg', 3, NULL);


-- ---------- USUÁRIO DE TESTE ----------
-- A senha_hash é fictícia: este usuário NÃO consegue fazer login.
-- Para testar o login, crie uma conta pela página de cadastro
-- (o backend gera o hash com bcrypt).
INSERT INTO usuario (nome, email, senha_hash) VALUES
('Usuário Teste', 'teste@email.com', 'hash_ficticio_trocar_no_backend');

INSERT INTO endereco (usuario_id, rua, numero, cidade, estado, cep) VALUES
(1, 'Rua das Flores', '123', 'São Paulo', 'SP', '01001000');


-- ---------- PEDIDO DE EXEMPLO ----------
INSERT INTO pedido (usuario_id, endereco_id, status) VALUES
(1, 1, 'pago');

INSERT INTO item_pedido (pedido_id, produto_id, quantidade, preco_unitario) VALUES
(1, 1, 1, 7999.90),
(1, 4, 2, 289.90);
