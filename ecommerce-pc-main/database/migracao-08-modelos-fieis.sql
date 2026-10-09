-- =====================================================
-- MIGRAÇÃO 08: produtos com modelo 3D fiel
--
-- 12 produtos novos (o Ryzen 5 5500 já existia). Para cada um, o
-- frontend tem um modelo 3D feito a partir das fotos do produto
-- (viewer/especificos-pc.js e viewer/especificos-perifericos.js).
-- O modelo é escolhido pelo nome do produto (viewer/parametros.js),
-- então aqui só entram os dados normais do catálogo.
--
-- Preços à vista (PIX) da KaBuM/Gigantec em 09/10/2026, como
-- REFERÊNCIA para o trabalho acadêmico. Estoques fictícios.
-- As fotos ficam no próprio projeto (frontend/public/imagens/produtos).
--
-- Rode depois da migração 07. Pode rodar mais de uma vez.
-- =====================================================

-- ---------- Peças do PC ----------
INSERT INTO produto (nome, descricao, preco, estoque, imagem, categoria_id)
SELECT v.nome, v.descricao, v.preco, v.estoque, v.imagem, c.id
FROM (VALUES
    ('Placas de vídeo', 'ASRock Radeon RX 7600 Challenger, 8GB, GDDR6',
     'Placa de vídeo AMD Radeon RX 7600 com 8GB GDDR6, duas ventoinhas, backplate de metal e área vazada no fim do dissipador. Saídas: 3 DisplayPort e 1 HDMI. Um conector de 8 pinos.',
     1949.99, 9, 'imagens/produtos/asrock-rx7600-challenger.jpg'),
    ('Placas-mãe', 'MSI B650 Gaming Plus WiFi, AM5, DDR5',
     'Placa-mãe ATX com chipset B650 para Ryzen 7000, 8000 e 9000. 4 slots DDR5, PCIe x16 reforçado, 2 slots M.2, rede 2,5G e Wi-Fi 6E.',
     1887.99, 7, 'imagens/produtos/msi-b650-gaming-plus-wifi.jpg'),
    ('Armazenamento', 'SSD Husky ThunderBoost, 512GB, M.2 NVMe',
     'SSD M.2 2280 NVMe PCIe 3.0 x4 de 512GB, com até 2200MB/s de leitura e 1600MB/s de gravação.',
     689.99, 15, 'imagens/produtos/husky-thunderboost-512gb.jpg'),
    ('Coolers', 'Rise Mode Temp 8 Black ARGB, Air Cooler 120mm',
     'Air cooler de torre dupla com 6 heatpipes, ventoinha ARGB de 120mm, LED nas bordas da tampa e mostrador digital de temperatura. Para AMD e Intel.',
     228.90, 12, 'imagens/produtos/rise-mode-temp8.jpg'),
    ('Memórias RAM', 'Rise Mode Z 16GB (1x16GB), DDR4, 3200MHz, Branca',
     'Memória DDR4 de 16GB a 3200MHz (CL19) com dissipador branco de alumínio. Sem iluminação RGB.',
     912.90, 14, 'imagens/produtos/rise-mode-z-16gb-branca.jpg'),
    ('Gabinetes', 'Redragon Wideload Lite, Mid-Tower, ATX',
     'Gabinete aquário de duas câmaras com frente e lateral de vidro temperado, sem coluna no canto. Topo, fundo e lateral com tela em colmeia, 6 slots de expansão. Vem sem ventoinhas.',
     299.99, 10, 'imagens/produtos/redragon-wideload-lite.jpg')
) AS v(categoria, nome, descricao, preco, estoque, imagem)
JOIN categoria c ON c.nome = v.categoria
WHERE NOT EXISTS (SELECT 1 FROM produto p WHERE p.nome = v.nome);

-- ---------- Periféricos (com as especificações em JSONB) ----------
INSERT INTO produto (nome, descricao, preco, estoque, imagem, categoria_id, especificacoes)
SELECT v.nome, v.descricao, v.preco, v.estoque, v.imagem, c.id, v.especificacoes::jsonb
FROM (VALUES
    ('Monitores', 'LG UltraFine 32UR500, 31,5", 4K UHD, 60Hz',
     'Monitor LG UltraFine de 31,5" com painel VA 4K (3840x2160), 60Hz, HDR10 e 4ms. Entradas HDMI e DisplayPort, bordas finas em três lados.',
     1700.99, 8, 'imagens/produtos/lg-ultrafine-32ur500.jpg',
     '{"polegadas": 31.5, "resolucao": "3840x2160", "hz": 60, "painel": "VA", "curvo": false, "proporcao": "16:9", "cor": "preto"}'),
    ('Teclados', 'Redragon Kumara K552RGB-1, TKL, Mecânico, ABNT2',
     'Teclado mecânico TKL ABNT2 com switches Outemu Brown, RGB, anti-ghosting e teclas flutuantes. Com fio.',
     139.99, 20, 'imagens/produtos/redragon-kumara-k552rgb-1.jpg',
     '{"formato": "tkl", "mecanico": true, "rgb": true, "sem_fio": false, "cor": "preto"}'),
    ('Mouses', 'Redragon Cobra M711, 12400 DPI, Chroma RGB',
     'Mouse gamer com sensor PixArt PMW3327 de até 12400 DPI, 8 botões, faixa Chroma RGB em volta do corpo e pés de teflon.',
     89.99, 25, 'imagens/produtos/redragon-cobra-m711.jpg',
     '{"rgb": true, "sem_fio": false, "cor": "preto", "furado": false}'),
    ('Headsets e fones', 'HyperX Cloud Stinger 2, Headset, P3',
     'Headset gamer leve com drivers de 50mm, conchas giratórias, microfone que silencia ao girar e controle de volume no arco. Cabo P3.',
     179.99, 16, 'imagens/produtos/hyperx-cloud-stinger-2.jpg',
     '{"tipo": "headset", "rgb": false, "sem_fio": false, "cor": "preto"}'),
    ('Controles', '8BitDo Ultimate 2C, Verde, Sem fio',
     'Controle Bluetooth verde com sticks de efeito Hall, gatilhos analógicos, dois botões traseiros extras e USB-C. Para PC, Switch e celular.',
     199.99, 13, 'imagens/produtos/8bitdo-ultimate-2c.jpg',
     '{"estilo": "xbox", "sem_fio": true, "cor": "verde"}'),
    ('Cadeiras', 'Webshop Stillus, Preto e Vermelho, Apoio para os pés',
     'Cadeira gamer preta e vermelha com almofadas de pescoço e lombar, apoio retrátil para os pés, encosto reclinável e suporte até 120 kg.',
     537.53, 9, 'imagens/produtos/webshop-stillus.jpg',
     '{"cor_principal": "preto", "cor_detalhe": "vermelho", "tipo": "gamer", "reclinavel": true, "apoio_pes": true}')
) AS v(categoria, nome, descricao, preco, estoque, imagem, especificacoes)
JOIN categoria c ON c.nome = v.categoria
WHERE NOT EXISTS (SELECT 1 FROM produto p WHERE p.nome = v.nome);

-- ---------- Dados técnicos (o "Monte seu PC" usa para ver o que combina) ----------
INSERT INTO produto_tecnico (produto_id, soquete, memoria, formato, consumo_w, potencia_w, video_integrado)
-- (os NULL precisam de tipo: sem o "::", o PostgreSQL acha que são texto)
SELECT p.id, v.soquete, v.memoria, v.formato, v.consumo_w::INTEGER, v.potencia_w::INTEGER, v.video_integrado::BOOLEAN
FROM (VALUES
    ('ASRock Radeon RX 7600 Challenger, 8GB, GDDR6', NULL, NULL, NULL, 165, NULL, NULL),
    ('MSI B650 Gaming Plus WiFi, AM5, DDR5', 'AM5', 'DDR5', 'ATX', NULL, NULL, NULL),
    ('Rise Mode Z 16GB (1x16GB), DDR4, 3200MHz, Branca', NULL, 'DDR4', NULL, NULL, NULL, NULL),
    ('Redragon Wideload Lite, Mid-Tower, ATX', NULL, NULL, 'ATX', NULL, NULL, NULL)
) AS v(nome, soquete, memoria, formato, consumo_w, potencia_w, video_integrado)
JOIN produto p ON p.nome = v.nome
ON CONFLICT (produto_id) DO NOTHING;

-- O cooler serve em AMD e Intel
INSERT INTO cooler_soquete (produto_id, soquete)
SELECT p.id, s.soquete
FROM produto p
CROSS JOIN (VALUES ('AM4'), ('AM5'), ('LGA1700'), ('LGA1851')) AS s(soquete)
WHERE p.nome = 'Rise Mode Temp 8 Black ARGB, Air Cooler 120mm'
ON CONFLICT DO NOTHING;
