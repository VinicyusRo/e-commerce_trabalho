-- =====================================================
-- Dados de exemplo
-- =====================================================

-- Limpa os dados (mas mantém as tabelas) e reinicia os ids em 1.
TRUNCATE item_pedido, pedido, endereco, usuario,
         modelo_3d, produto, categoria
         RESTART IDENTITY CASCADE;


-- ---------- CATEGORIAS ----------
INSERT INTO categoria (nome, descricao) VALUES
('Placas de vídeo', 'GPUs para jogos, edição e inteligência artificial'),
('Processadores',   'CPUs para desktop'),
('Memórias RAM',    'Módulos de memória DDR4 e DDR5'),
('Armazenamento',   'SSDs e HDs');


-- ---------- PRODUTOS ----------
-- categoria_id: 1 = Placas de vídeo, 2 = Processadores, 3 = Memórias RAM, 4 = Armazenamento
INSERT INTO produto (nome, descricao, preco, estoque, imagem, categoria_id) VALUES
('NVIDIA GeForce RTX 3090 24GB',
 'Placa de vídeo de alto desempenho com 24 GB de memória GDDR6X.',
 7999.90, 5, 'imagens/rtx3090.jpg', 1),

('NVIDIA GeForce RTX 4090 24GB',
 'Placa de vídeo topo de linha com 24 GB de memória GDDR6X.',
 12999.90, 3, 'imagens/rtx4090.jpg', 1),

('AMD Ryzen 7 5800X',
 'Processador de 8 núcleos e 16 threads, soquete AM4.',
 1299.90, 10, 'imagens/ryzen7-5800x.jpg', 2),

('Memória Corsair Vengeance 16GB DDR4 3200MHz',
 'Módulo de memória RAM DDR4 de 16 GB.',
 289.90, 25, 'imagens/corsair-16gb.jpg', 3),

('SSD NVMe Kingston 1TB',
 'SSD M.2 NVMe de 1 TB com alta velocidade de leitura.',
 459.90, 15, 'imagens/ssd-kingston-1tb.jpg', 4);


-- ---------- MODELOS 3D ----------
-- Só os produtos 1 e 2 têm modelo 3D (relação 1:0..1).
-- Troque 'creditos' pelo autor e a licença reais dos seus arquivos.
INSERT INTO modelo_3d (produto_id, arquivo, formato, tamanho_kb, creditos) VALUES
(1, 'modelos/rtx3090_gpu.glb', 'glb', NULL, '"Nvidia GeForce RTX 3090" (https://skfb.ly/o86BB) by Cem Gürbüz is licensed under Creative Commons Attribution-NonCommercial (http://creativecommons.org/licenses/by-nc/4.0/).'),
(2, 'modelos/rtx4090_gpu.glb', 'glb', NULL, '"GeForce RTX 4090 Founders Edition" (https://skfb.ly/oyBLN) by exéla is licensed under Creative Commons Attribution-NonCommercial (http://creativecommons.org/licenses/by-nc/4.0/).');


-- ---------- USUÁRIO DE TESTE ----------
-- A senha_hash é fictícia por enquanto. Quando fizermos o cadastro
-- no backend, o bcrypt vai gerar hashes reais.
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