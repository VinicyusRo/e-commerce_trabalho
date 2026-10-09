-- =====================================================
-- MIGRAÇÃO 06: periféricos
--
-- 1. Coluna JSONB "especificacoes" em produto: guarda características
--    que mudam de categoria para categoria (polegadas do monitor,
--    formato do teclado, cor da cadeira...). JSONB é um tipo do
--    PostgreSQL para dados semiestruturados: cada produto pode ter
--    chaves diferentes, sem criar uma coluna para cada uma.
-- 2. Seis categorias novas com o seu modelo 3D procedural.
-- 3. 68 periféricos com nome, preço à vista e foto tirados da Pichau
--    em 08/10/2026 como REFERÊNCIA (trabalho acadêmico). Estoques fictícios.
-- 4. A view do catálogo passa a mostrar as especificações.
--
-- Rode depois da migração 05. Pode rodar mais de uma vez.
-- =====================================================

ALTER TABLE produto ADD COLUMN IF NOT EXISTS especificacoes JSONB;

-- Modelos 3D gerados por código no frontend
INSERT INTO modelo_3d (nome, arquivo, formato)
VALUES
    ('Monitor genérico', 'monitor', 'procedural'),
    ('Teclado genérico', 'teclado', 'procedural'),
    ('Mouse genérico', 'mouse', 'procedural'),
    ('Headset genérico', 'headset', 'procedural'),
    ('Controle genérico', 'controle', 'procedural'),
    ('Cadeira genérica', 'cadeira', 'procedural')
ON CONFLICT (formato, arquivo) DO NOTHING;

-- Categorias novas já ligadas ao modelo 3D
INSERT INTO categoria (nome, descricao, modelo_3d_id)
SELECT v.nome, v.descricao, m.id
FROM (VALUES
    ('Monitores', 'Monitores Full HD, QHD, 4K e ultrawide', 'monitor'),
    ('Teclados', 'Teclados mecânicos e de membrana', 'teclado'),
    ('Mouses', 'Mouses gamer e de escritório', 'mouse'),
    ('Headsets e fones', 'Headsets gamer e fones de ouvido', 'headset'),
    ('Controles', 'Controles para PC e consoles', 'controle'),
    ('Cadeiras', 'Cadeiras gamer e de escritório', 'cadeira')
) AS v(nome, descricao, gerador)
JOIN modelo_3d m ON m.formato = 'procedural' AND m.arquivo = v.gerador
WHERE NOT EXISTS (SELECT 1 FROM categoria c WHERE c.nome = v.nome);

-- ---------- Produtos ----------
-- Monitores
INSERT INTO produto (nome, descricao, preco, estoque, imagem, categoria_id, especificacoes)
SELECT v.nome, v.descricao, v.preco, v.estoque, v.imagem, c.id, v.especificacoes::jsonb
FROM (VALUES
    ('Zinnia Delfos ES21.5, 21,5", Full HD, 75Hz',
     'Monitor de entrada de 21,5" Full HD com painel TN, 75Hz e 94% sRGB, com entradas HDMI e VGA. Ideal para escritório e uso básico.',
     339.99, 18,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/z/n/zno-dlfes215-bl01421552.jpg',
     '{"polegadas": 21.5, "resolucao": "1920x1080", "hz": 75, "painel": "TN", "curvo": false, "proporcao": "16:9", "cor": "preto"}'),
    ('Pichau Athen V4B, 23,8", Full HD, 144Hz',
     'Monitor gamer de 23,8" Full HD com painel VA, 144Hz e 1ms, cobrindo 100% sRGB. Ótimo custo-benefício para quem está começando.',
     479.99, 11,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/p/g/pg-ath24v4b-bl013.jpg',
     '{"polegadas": 23.8, "resolucao": "1920x1080", "hz": 144, "painel": "VA", "curvo": false, "proporcao": "16:9", "cor": "preto"}'),
    ('LG Ultragear 24G411B, 24", Full HD, 144Hz',
     'Monitor gamer LG UltraGear de 24" Full HD IPS com 144Hz, 1ms e compatibilidade G-Sync/FreeSync. Cores fiéis com 99% sRGB.',
     749.99, 17,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/2/4/24g411b-b5.jpg',
     '{"polegadas": 24, "resolucao": "1920x1080", "hz": 144, "painel": "IPS", "curvo": false, "proporcao": "16:9", "cor": "preto"}'),
    ('Zowie XL2540X, 24", Full HD, 280Hz',
     'Monitor competitivo Zowie de 24" Full HD com painel TN rápido de 280Hz e 1ms, pensado para e-sports e FPS.',
     3579.99, 14,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/x/l/xl2540x-plus2122.jpg',
     '{"polegadas": 24, "resolucao": "1920x1080", "hz": 280, "painel": "TN", "curvo": false, "proporcao": "16:9", "cor": "preto"}'),
    ('Samsung Essential S3, 27", Full HD, 120Hz',
     'Monitor Samsung de 27" Full HD com painel IPS e 120Hz, tela plana 16:9. Bom para trabalho, estudos e jogos casuais.',
     799.99, 16,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/l/s/ls27f320galmzd5.jpg',
     '{"polegadas": 27, "resolucao": "1920x1080", "hz": 120, "painel": "IPS", "curvo": false, "proporcao": "16:9", "cor": "preto"}'),
    ('Gigabyte G27Q2, 27", QHD, 210Hz',
     'Monitor gamer Gigabyte de 27" QHD IPS com até 210Hz, 0,5ms, HDR10, USB-C e altura ajustável, com 95% DCI-P3.',
     1399.99, 13,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/g/2/g27q2.jpg',
     '{"polegadas": 27, "resolucao": "2560x1440", "hz": 210, "painel": "IPS", "curvo": false, "proporcao": "16:9", "cor": "preto"}'),
    ('Gigabyte M27UP, 27", 4K, 160Hz',
     'Monitor 4K de 27" IPS dual-mode: UHD a 160Hz ou FHD a 320Hz, com HDR 400, USB-C e som integrado.',
     2999.99, 5,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/m/2/m27up.jpg',
     '{"polegadas": 27, "resolucao": "3840x2160", "hz": 160, "painel": "IPS", "curvo": false, "proporcao": "16:9", "cor": "preto"}'),
    ('AOC Agon G4, 27", QHD, 240Hz',
     'Monitor AOC Agon de 27" QD-OLED QHD com 240Hz e 0,03ms, cobrindo 99% DCI-P3. Contraste perfeito para jogos.',
     4099.99, 14,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/q/2/q27g4zdr12212129.jpg',
     '{"polegadas": 27, "resolucao": "2560x1440", "hz": 240, "painel": "OLED", "curvo": false, "proporcao": "16:9", "cor": "preto"}'),
    ('Gigabyte MO27Q3, 27", QHD, 360Hz',
     'Monitor Gigabyte de 27" QD-OLED QHD com 360Hz, 0,03ms e HDR 400, cores de 10 bits e 99% DCI-P3.',
     4599.99, 5,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/m/o/mo27q3.jpg',
     '{"polegadas": 27, "resolucao": "2560x1440", "hz": 360, "painel": "OLED", "curvo": false, "proporcao": "16:9", "cor": "preto"}'),
    ('LG Smart 32SR50F, 32", Full HD, 60Hz',
     'Monitor smart LG de 32" Full HD IPS na cor branca, com 60Hz, HDMI e USB. Funciona também como central de streaming.',
     1899.99, 4,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/3/2/32sr50f-wawzm23.jpg',
     '{"polegadas": 32, "resolucao": "1920x1080", "hz": 60, "painel": "IPS", "curvo": false, "proporcao": "16:9", "cor": "branco"}'),
    ('LG 29WQ600B-W, 29", UltraWide FHD, 100Hz',
     'Monitor LG UltraWide 21:9 de 29" IPS com resolução 2560x1080, 100Hz e 1ms, na cor branca. Mais espaço para multitarefa.',
     1499.99, 10,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/2/9/29wq600b-w1.jpg',
     '{"polegadas": 29, "resolucao": "2560x1080", "hz": 100, "painel": "IPS", "curvo": false, "proporcao": "21:9", "cor": "branco"}'),
    ('Samsung ViewFinity S5, 34", UltraWide QHD, 100Hz',
     'Monitor Samsung ViewFinity de 34" ultrawide plano, VA UWQHD 3440x1440 com 100Hz e FreeSync. Ótimo para produtividade.',
     1749.99, 12,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/l/s/ls34c500galmzd1225222.jpg',
     '{"polegadas": 34, "resolucao": "3440x1440", "hz": 100, "painel": "VA", "curvo": false, "proporcao": "21:9", "cor": "preto"}'),
    ('Asus ROG Strix, 34", UltraWide QHD, 280Hz',
     'Monitor ultrawide curvo (1800R) Asus ROG de 34" QD-OLED 3440x1440 com 280Hz, 0,03ms e HDR 400.',
     6499.99, 17,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/x/g/xg34wcdms64552.jpg',
     '{"polegadas": 34, "resolucao": "3440x1440", "hz": 280, "painel": "OLED", "curvo": true, "proporcao": "21:9", "cor": "preto"}'),
    ('LG Ultragear 39GX950B, 39", 5K2K, 165Hz',
     'Monitor LG UltraGear curvo de 39" OLED 21:9 com modo duplo: 5K2K a 165Hz ou WFHD a 330Hz, 0,03ms.',
     10999.99, 11,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/3/9/39gx950b-b00.jpg',
     '{"polegadas": 39, "resolucao": "5120x2160", "hz": 165, "painel": "OLED", "curvo": true, "proporcao": "21:9", "cor": "preto"}')
) AS v(nome, descricao, preco, estoque, imagem, especificacoes)
JOIN categoria c ON c.nome = 'Monitores'
WHERE NOT EXISTS (SELECT 1 FROM produto p WHERE p.nome = v.nome);

-- Teclados
INSERT INTO produto (nome, descricao, preco, estoque, imagem, categoria_id, especificacoes)
SELECT v.nome, v.descricao, v.preco, v.estoque, v.imagem, c.id, v.especificacoes::jsonb
FROM (VALUES
    ('Redragon Shiva 61, 60%, Membrana',
     'Teclado de membrana compacto 60% com iluminação RGB, layout ABNT2 e cabo USB-C removível de 1,5 m. Opção de entrada para setups enxutos.',
     119.99, 3,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/k/5/k522-rgbpt.jpg',
     '{"formato": "60", "mecanico": false, "rgb": true, "sem_fio": false, "cor": "preto"}'),
    ('Logitech G G512 X, 75%, Mecânico',
     'Mecânico 75% com soquetes Dual Swap que aceitam switches mecânicos e magnéticos analógicos (9 inclusos), RGB LIGHTSYNC e conexão USB-C com fio.',
     1189.99, 12,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/9/2/920-0139484.jpg',
     '{"formato": "75", "mecanico": true, "rgb": true, "sem_fio": false, "cor": "branco"}'),
    ('K-Mex Neonblade, 60%, Mecânico',
     'Mecânico 60% de 61 teclas ABNT2 com switch White, 12 efeitos RGB, keycaps translúcidas fumê e cabo USB-C destacável. Ótimo custo-benefício.',
     94.99, 18,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/k/w/kwn181u0004cb0x.jpg',
     '{"formato": "60", "mecanico": true, "rgb": true, "sem_fio": false, "cor": "branco"}'),
    ('Redragon Kumara Pro, TKL, Mecânico',
     'Mecânico TKL ABNT2 com switches Marrom hot-swap, RGB por tecla e conexão tripla: cabo USB, 2.4 GHz e Bluetooth.',
     339.99, 11,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/k/5/k552rgb-brs-w-pro8_1.jpg',
     '{"formato": "tkl", "mecanico": true, "rgb": true, "sem_fio": true, "cor": "branco"}'),
    ('Redragon Crescent 68 Pro, 65%, Membrana',
     'Teclado de membrana 65% ABNT2 com RGB e conexão tri-mode (USB-C, 2.4 GHz e Bluetooth). Compacto e silencioso.',
     169.99, 9,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/k/5/k519rgb-pro15521218.jpg',
     '{"formato": "65", "mecanico": false, "rgb": true, "sem_fio": true, "cor": "preto"}'),
    ('Redragon Netherbane Pro, Full Size, Membrana',
     'Teclado de membrana full size com teclado numérico, RGB, layout ABNT2 e conexão USB-C, 2.4 GHz ou Bluetooth.',
     179.99, 5,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/k/5/k521rgb-kspt6.jpg',
     '{"formato": "full", "mecanico": false, "rgb": true, "sem_fio": true, "cor": "preto"}'),
    ('R8 GW101, Full Size, Membrana',
     'Teclado de entrada full size com 104 teclas, iluminação rainbow com 3 níveis e efeito respiração, conexão USB plug and play.',
     42.99, 16,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/r/8/r8-gw101-bk.jpg',
     '{"formato": "full", "mecanico": false, "rgb": true, "sem_fio": false, "cor": "preto"}'),
    ('Logitech G Pro X Lightspeed, 60%, Mecânico',
     'Mecânico 60% com switches ópticos GX Tactile, RGB LIGHTSYNC e conexão LIGHTSPEED 2.4 GHz, Bluetooth ou cabo. Versão magenta.',
     1099.99, 9,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/9/2/920-01194016.jpg',
     '{"formato": "60", "mecanico": true, "rgb": true, "sem_fio": true, "cor": "magenta"}'),
    ('Keychron Black Myth Wukong, 75%, Mecânico',
     'Edição Black Myth Wukong da Keychron: mecânico 75% de 81 teclas com switch TTC Bluish White, RGB e conexão 2.4 GHz, Bluetooth 5.2 ou USB-C.',
     1499.99, 4,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/w/k/wks-2000.jpg',
     '{"formato": "75", "mecanico": true, "rgb": true, "sem_fio": true, "cor": "preto"}'),
    ('PCYES Arkeum, 75%, Mecânico',
     'Mecânico 75% ABNT2 com switches Outemu Blue, knob, keycaps doubleshot tricolores e LED de cor única. Cabo USB-C removível de 1,8 m.',
     199.99, 15,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/a/k/aksm75bbr3.jpg',
     '{"formato": "75", "mecanico": true, "rgb": false, "sem_fio": false, "cor": "multicolor"}'),
    ('Corsair Vanguard Air 99, Full Size, Mecânico',
     'Mecânico 99% de perfil baixo com switches ópticos Corsair OPX lubrificados, RGB e conexão Slipstream 8K, Bluetooth ou cabo USB.',
     1699.99, 9,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/c/h/ch-91ha01b-na2.jpg',
     '{"formato": "full", "mecanico": true, "rgb": true, "sem_fio": true, "cor": "preto"}'),
    ('Mancer Black Ghost V3, 65%, Mecânico',
     'Mecânico compacto ABNT2 com switches Huano Vermelho hot-swap, iluminação rainbow e conexão USB com fio. Bom custo-benefício.',
     149.99, 15,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/m/c/mcr-bkg-rbw035.jpg',
     '{"formato": "65", "mecanico": true, "rgb": true, "sem_fio": false, "cor": "preto"}')
) AS v(nome, descricao, preco, estoque, imagem, especificacoes)
JOIN categoria c ON c.nome = 'Teclados'
WHERE NOT EXISTS (SELECT 1 FROM produto p WHERE p.nome = v.nome);

-- Mouses
INSERT INTO produto (nome, descricao, preco, estoque, imagem, categoria_id, especificacoes)
SELECT v.nome, v.descricao, v.preco, v.estoque, v.imagem, c.id, v.especificacoes::jsonb
FROM (VALUES
    ('Marvo Duke 20, 6400 DPI, Sem fio',
     'Mouse gamer sem fio 2.4 GHz com sensor óptico de até 6400 DPI, 7 botões e iluminação RGB. Também funciona com cabo USB.',
     69.99, 7,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/m/8/m803w-v2-wb5565623.jpg',
     '{"rgb": true, "sem_fio": true, "cor": "branco", "dpi": 6400, "furado": false}'),
    ('Redragon Viper Fly, 26000 DPI, Sem fio',
     'Mouse gamer tri-mode (2.4 GHz, Bluetooth e USB-C) com sensor HL9339 de 26000 DPI, 10 botões programáveis e RGB.',
     269.99, 5,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/m/9/m925-wl-f9.jpg',
     '{"rgb": true, "sem_fio": true, "cor": "preto", "dpi": 26000, "furado": false}'),
    ('Lamzu Atlantis Mini Champion, 30000 DPI, Sem fio',
     'Mouse ultraleve de 51 g sem furos, sensor PixArt PAW3950 de 30000 DPI e conexão sem fio 2.4 GHz ou cabo USB-C.',
     679.99, 9,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/a/t/atlantis-mini-red4655520.jpg',
     '{"rgb": false, "sem_fio": true, "cor": "branco e vermelho", "dpi": 30000, "furado": false}'),
    ('Logitech G PRO X2 Superstrike Lightspeed, 44000 DPI, Sem fio',
     'Mouse topo de linha para eSports com sensor HERO 2 de 44000 DPI, 61 g, 5 botões e conexão sem fio LIGHTSPEED.',
     1019.99, 14,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/9/1/910-0077751.jpg',
     '{"rgb": false, "sem_fio": true, "cor": "branco e preto", "dpi": 44000, "furado": false}'),
    ('Corsair Sabre V2 Pro Ultralight, 33000 DPI, Sem fio',
     'Mouse ultraleve de apenas 36 g com sensor óptico Corsair Marksman S de 33000 DPI, 5 botões e conexão sem fio.',
     599.99, 5,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/c/h/ch-931g000-ww22.jpg',
     '{"rgb": false, "sem_fio": true, "cor": "preto", "dpi": 33000, "furado": false}'),
    ('Logitech MX Master 3S, 8000 DPI, Sem fio',
     'Mouse ergonômico para produtividade com sensor Darkfield de 8000 DPI (funciona até em vidro), 7 botões e conexão Bluetooth.',
     700.39, 12,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/9/1/910-0075024.jpg',
     '{"rgb": false, "sem_fio": true, "cor": "grafite", "dpi": 8000, "furado": false}'),
    ('Benq Zowie U2 DW, 3200 DPI, Sem fio',
     'Mouse sem fio da Zowie voltado a eSports, com 60 g, 5 botões, até 3200 DPI e receptor 2.4 GHz. Sem software, plug and play.',
     1199.99, 8,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/u/2/u2-dw-d.jpg',
     '{"rgb": false, "sem_fio": true, "cor": "preto", "dpi": 3200, "furado": false}'),
    ('Redragon Bludhound Lite, 10000 DPI, Com fio',
     'Mouse ultraleve de 41 g com estrutura colmeia, sensor PAW3313 de 10000 DPI, 6 botões e cabo USB-C paracord removível.',
     89.99, 12,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/m/6/m617-lit0.jpg',
     '{"rgb": false, "sem_fio": false, "cor": "preto", "dpi": 10000, "furado": true}'),
    ('Marvo M811W, 1600 DPI, Sem fio',
     'Mouse de escritório sem fio com receptor 2.4 GHz e Bluetooth 5.2, 6 botões e DPI ajustável de 800 a 1600.',
     69.99, 15,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/m/8/m811w0.jpg',
     '{"rgb": false, "sem_fio": true, "cor": "preto", "dpi": 1600, "furado": false}'),
    ('Marvo Duke 50, 12800 DPI, Com fio',
     'Mouse gamer com fio de entrada, sensor A825 de até 12800 DPI, 6 botões, 68 g e iluminação RGB.',
     42.99, 14,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/m/3/m3685.jpg',
     '{"rgb": true, "sem_fio": false, "cor": "cinza e laranja", "dpi": 12800, "furado": false}'),
    ('Ajazz AJ199 Carbon Fiber, 24000 DPI, Sem fio',
     'Mouse gamer tri-mode (cabo, 2.4 GHz e Bluetooth) com sensor PAW3311 de 24000 DPI, 60 g e acabamento texturizado em fibra de carbono.',
     119.99, 7,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/a/j/aj199-cf-gpb4.jpg',
     '{"rgb": false, "sem_fio": true, "cor": "rosa e azul", "dpi": 24000, "furado": false}'),
    ('Havit MS955WB, 22000 DPI, Sem fio',
     'Mouse gamer tri-mode com base de carregamento, sensor PAW3311 de 22000 DPI, 63 g, 6 botões e iluminação RGB.',
     259.99, 9,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/m/s/ms955wb55.jpg',
     '{"rgb": true, "sem_fio": true, "cor": "branco", "dpi": 22000, "furado": false}')
) AS v(nome, descricao, preco, estoque, imagem, especificacoes)
JOIN categoria c ON c.nome = 'Mouses'
WHERE NOT EXISTS (SELECT 1 FROM produto p WHERE p.nome = v.nome);

-- Headsets e fones
INSERT INTO produto (nome, descricao, preco, estoque, imagem, categoria_id, especificacoes)
SELECT v.nome, v.descricao, v.preco, v.estoque, v.imagem, c.id, v.especificacoes::jsonb
FROM (VALUES
    ('Redragon Cragblade, Headset, Com fio',
     'Headset com fio P2 e drivers de 53mm, microfone removível com mute no cabo. Compatível com PC, PS4, PS5 e Xbox One.',
     199.99, 2,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/h/5/h541w6.jpg',
     '{"tipo": "headset", "rgb": false, "sem_fio": false, "cor": "branco"}'),
    ('Fortrek Win, Headset, Com fio',
     'Headset gamer com fio (P3 + USB), drivers de 50mm e microfone omnidirecional removível. Plug and play em Windows e Mac.',
     139.99, 13,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/8/6/8695052.jpg',
     '{"tipo": "headset", "rgb": false, "sem_fio": false, "cor": "preto"}'),
    ('Force One Titan V2, Headset, Sem fio',
     'Headset tri-mode (2.4GHz, Bluetooth 5.4 e cabo) com iluminação RGB, drivers de 50mm e microfone omnidirecional.',
     179.99, 6,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/f/r/frautt021.jpg',
     '{"tipo": "headset", "rgb": true, "sem_fio": true, "cor": "preto"}'),
    ('Havit Fuxi H8, Headset, Sem fio',
     'Headset tri-mode com RGB e visual dourado, drivers de 32mm, microfone removível com ENC e até 30h de bateria. Funciona em PC, consoles e celular.',
     459.99, 5,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/f/u/fuxi-h8-golden455.jpg',
     '{"tipo": "headset", "rgb": true, "sem_fio": true, "cor": "dourado"}'),
    ('HyperX CloudX Stinger Core, Headset, Sem fio',
     'Headset sem fio 2.4GHz para Xbox Series X|S e Xbox One, drivers de 40mm, microfone com cancelamento de ruído e até 17h de bateria.',
     519.99, 16,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/4/p/4p5j0aa2.jpg',
     '{"tipo": "headset", "rgb": false, "sem_fio": true, "cor": "preto e verde"}'),
    ('Logitech G325 Lightspeed, Headset, Sem fio',
     'Headset leve sem fio com LIGHTSPEED e Bluetooth 5.2, drivers de 32mm e áudio 24-bit. Compatível com PC, Xbox, PS5 e Switch.',
     589.99, 3,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/9/8/981-001530.jpg',
     '{"tipo": "headset", "rgb": false, "sem_fio": true, "cor": "branco"}'),
    ('Razer Blackshark V3 X Hyperspeed Playstation Licensed, Headset, Sem fio',
     'Headset sem fio licenciado PlayStation, 2.4GHz e Bluetooth, drivers TriForce de 50mm, mic HyperClear destacável e até 70h de bateria no PC.',
     749.99, 10,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/r/z/rz04-05420400-r3ua1.jpg',
     '{"tipo": "headset", "rgb": false, "sem_fio": true, "cor": "preto"}'),
    ('JBL Tune 780NC, Headphone, Sem fio',
     'Headphone Bluetooth com cancelamento de ruído adaptativo, drivers de 40mm e até 76h de bateria. Acompanha cabo para uso com fio.',
     479.99, 12,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/j/b/jblt780ncblk12222.jpg',
     '{"tipo": "over-ear", "rgb": false, "sem_fio": true, "cor": "preto"}'),
    ('QCY H3S, Headphone, Sem fio',
     'Headphone Bluetooth 6.0 com LDAC, ANC de até 56dB, drivers duplos (40mm + 13mm) e até 102h de bateria.',
     333.99, 14,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/q/c/qcyh3s-07.jpg',
     '{"tipo": "over-ear", "rgb": false, "sem_fio": true, "cor": "cinza"}'),
    ('Geonav, Fone intra-auricular, Com fio',
     'Fone intra-auricular com fio P2 de 1,2m, drivers de 10mm, microfone para chamadas e fones magnéticos com três tamanhos de ponteiras.',
     44.99, 9,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/e/s/esfnsg1.jpg',
     '{"tipo": "in-ear", "rgb": false, "sem_fio": false, "cor": "cinza espacial"}'),
    ('JBL Tune Buds 2, Fone TWS, Sem fio',
     'Fones true wireless com Bluetooth 5.3, cancelamento de ruído adaptativo, drivers de 10mm, resistência IP54 e estojo de recarga.',
     519.99, 4,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/j/b/jbltbuds2wht9.jpg',
     '{"tipo": "tws", "rgb": false, "sem_fio": true, "cor": "branco"}'),
    ('Sony Pulse Explore, Fone TWS, Sem fio',
     'Fones sem fio com drivers planares magnéticos, PlayStation Link para PS5, PC e Portal, além de Bluetooth e microfone com redução de ruído por IA.',
     1249.99, 5,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/1/0/1000044172.jpg',
     '{"tipo": "tws", "rgb": false, "sem_fio": true, "cor": "midnight black"}')
) AS v(nome, descricao, preco, estoque, imagem, especificacoes)
JOIN categoria c ON c.nome = 'Headsets e fones'
WHERE NOT EXISTS (SELECT 1 FROM produto p WHERE p.nome = v.nome);

-- Controles
INSERT INTO produto (nome, descricao, preco, estoque, imagem, categoria_id, especificacoes)
SELECT v.nome, v.descricao, v.preco, v.estoque, v.imagem, c.id, v.especificacoes::jsonb
FROM (VALUES
    ('DualSense Sony PS5 Cosmic Red, Vermelho, Sem fio',
     'Controle oficial do PS5 sem fio, com gatilhos adaptáveis, feedback háptico, touchpad, microfone embutido e bateria recarregável via USB-C.',
     469.99, 18,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/1/0/1000050734155521.jpg',
     '{"estilo": "playstation", "sem_fio": true, "cor": "vermelho (cosmic red)"}'),
    ('GameSir G7 SE Dynamic, Azul, Com fio',
     'Controle com fio USB para Xbox Series X|S, Xbox One e PC, sticks e gatilhos Hall Effect, 2 botões traseiros programáveis e entrada P2.',
     369.99, 14,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/g/s/gsg700se2en-1p.jpg',
     '{"estilo": "xbox", "sem_fio": false, "cor": "azul"}'),
    ('GameSir Nova Lite, Rosa, Sem fio',
     'Controle tri-mode (Bluetooth, 2.4GHz e USB-C) com sticks Hall Effect e turbo. Compatível com PC, Steam, Switch, iOS e Android.',
     159.99, 14,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/g/s/gst4nl002-3.jpg',
     '{"estilo": "xbox", "sem_fio": true, "cor": "rosa"}'),
    ('8BitDo Ultimate 2, Branco, Sem fio',
     'Controle sem fio para Switch e Windows com sticks TMR, anéis RGB nos analógicos, gatilhos Hall Effect e botões traseiros extras.',
     374.99, 11,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/8/0/80nd015.jpg',
     '{"estilo": "xbox", "sem_fio": true, "cor": "branco"}'),
    ('Ajazz GP100, Branco, Sem fio',
     'Controle com Bluetooth 5.3, 2.4GHz e cabo, sticks Hall Effect com polling de 1000Hz e gatilhos lineares com trava. Para PC, Switch e celular.',
     189.99, 17,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/g/p/gp100-wh4.jpg',
     '{"estilo": "xbox", "sem_fio": true, "cor": "branco"}'),
    ('Redragon Juno, Preto, Sem fio',
     'Controle USB ou Bluetooth com LED nos botões, giroscópio de 6 eixos, vibração dupla e entrada P2. Compatível com PS3, PS4, PC e celular.',
     237.99, 10,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/g/8/g8185.jpg',
     '{"estilo": "playstation", "sem_fio": true, "cor": "preto"}'),
    ('PowerA Spectra, Preto, Com fio',
     'Controle com fio licenciado para Nintendo Switch, cabo USB trançado de 3m, iluminação LED nas bordas com 8 cores e 2 botões traseiros.',
     209.99, 15,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/1/5/1510925-018.jpg',
     '{"estilo": "generico", "sem_fio": false, "cor": "preto"}'),
    ('TGT T90, Verde, Com fio',
     'Controle com fio de 1,8m para PC, PS3 e Android, com vibração dupla, turbo, modos X-input/D-input e botões ABXY iluminados.',
     64.99, 7,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/t/g/tgt-t90-gr01.jpg',
     '{"estilo": "playstation", "sem_fio": false, "cor": "verde"}')
) AS v(nome, descricao, preco, estoque, imagem, especificacoes)
JOIN categoria c ON c.nome = 'Controles'
WHERE NOT EXISTS (SELECT 1 FROM produto p WHERE p.nome = v.nome);

-- Cadeiras
INSERT INTO produto (nome, descricao, preco, estoque, imagem, categoria_id, especificacoes)
SELECT v.nome, v.descricao, v.preco, v.estoque, v.imagem, c.id, v.especificacoes::jsonb
FROM (VALUES
    ('TGT Heron TC2, Preto e Vermelho',
     'Cadeira gamer de entrada preta e vermelha com espuma de alta densidade, mecanismo borboleta e suporte até 120 kg. Acompanha energético.',
     329.99, 13,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/k/i/kit-hrtc-eng-maca-651295511325451.jpg',
     '{"cor_principal": "preto", "cor_detalhe": "vermelho", "tipo": "gamer", "reclinavel": false, "apoio_pes": false}'),
    ('DT3 Elise V3, Preto e Azul',
     'Cadeira gamer DT3 preta e azul em PU e tecido respirável, reclina até 150° com balanço, braços ajustáveis e suporte até 130 kg.',
     1329.99, 9,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/1/3/13761-89.jpg',
     '{"cor_principal": "preto", "cor_detalhe": "azul", "tipo": "gamer", "reclinavel": true, "apoio_pes": false}'),
    ('Mancer Tyr Pro Purple Edition, Roxo',
     'Cadeira gamer Mancer roxa em tecido, reclina de 90° a 180°, braços 4D e estrutura metálica para até 150 kg.',
     799.99, 10,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/m/c/mcr-trz-prp24.jpg',
     '{"cor_principal": "roxo", "cor_detalhe": "preto", "tipo": "gamer", "reclinavel": true, "apoio_pes": false}'),
    ('ThunderX3 Batman Core Smart, Preto e Amarelo',
     'Cadeira gamer ThunderX3 edição Batman, preta e amarela em couro sintético, inclinação síncrona, braços 3D e até 150 kg.',
     2049.99, 11,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/8/7/870022.jpg',
     '{"cor_principal": "preto", "cor_detalhe": "amarelo", "tipo": "gamer", "reclinavel": true, "apoio_pes": false}'),
    ('Cougar Explorer, Navy Blue',
     'Cadeira gamer Cougar Explorer azul-marinho com revestimento tipo couro, reclina de 90° a 155°, braços 3D e suporte até 120 kg.',
     1749.99, 8,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/3/m/3menfbub00018.jpg',
     '{"cor_principal": "azul", "cor_detalhe": null, "tipo": "gamer", "reclinavel": true, "apoio_pes": false}'),
    ('Razer Iskur V2 X, Light Gray Fabric',
     'Cadeira gamer Razer Iskur V2 X em tecido cinza-claro multicamadas com espuma moldada, reclina até 152° e braços 2D.',
     1999.99, 8,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/r/z/rz38-05310200-r3ua1.jpg',
     '{"cor_principal": "cinza", "cor_detalhe": null, "tipo": "gamer", "reclinavel": true, "apoio_pes": false}'),
    ('Aigo Darkflash EA100, Rosa',
     'Cadeira de escritório Darkflash rosa em PU e mesh, inclinação de 90° a 125° e braços com ajuste de altura.',
     489.99, 17,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/e/a/ea100-p-hq11222.jpg',
     '{"cor_principal": "rosa", "cor_detalhe": null, "tipo": "escritorio", "reclinavel": true, "apoio_pes": false}'),
    ('Cougar Stryder, Branco',
     'Cadeira de escritório Cougar Stryder branca com revestimento imitação de linho, braços articulados e suporte até 120 kg.',
     1159.99, 5,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/3/m/3mstdasw00012.jpg',
     '{"cor_principal": "branco", "cor_detalhe": null, "tipo": "escritorio", "reclinavel": false, "apoio_pes": false}'),
    ('Pichau Office Lyse, Cinza',
     'Cadeira ergonômica full mesh cinza com braços 5D, base de alumínio, reclina até 135°, apoio de pés retrátil e até 200 kg.',
     1799.99, 13,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/p/c/pch-lys-gy2_1.jpg',
     '{"cor_principal": "cinza", "cor_detalhe": null, "tipo": "escritorio", "reclinavel": true, "apoio_pes": true}'),
    ('DT3 ErgoOne, Preto',
     'Cadeira ergonômica premium DT3 ErgoOne preta em mesh, estrutura de alumínio, reclina até 160°, braços 6D e apoio de pés.',
     5999.99, 13,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/1/4/14523-51.jpg',
     '{"cor_principal": "preto", "cor_detalhe": null, "tipo": "escritorio", "reclinavel": true, "apoio_pes": true}')
) AS v(nome, descricao, preco, estoque, imagem, especificacoes)
JOIN categoria c ON c.nome = 'Cadeiras'
WHERE NOT EXISTS (SELECT 1 FROM produto p WHERE p.nome = v.nome);

-- ---------- View do catálogo com as especificações ----------
DROP VIEW IF EXISTS vw_produto_catalogo;
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
       END AS modelo_origem,
       t.soquete,
       t.memoria,
       t.formato   AS formato_placa,
       t.consumo_w,
       t.potencia_w,
       t.video_integrado,
       -- soquetes do cooler numa lista só (subconsulta correlacionada)
       (SELECT array_agg(cs.soquete ORDER BY cs.soquete)
        FROM cooler_soquete cs
        WHERE cs.produto_id = p.id) AS soquetes_cooler,
       p.especificacoes
FROM produto p
JOIN      categoria c       ON c.id = p.categoria_id
LEFT JOIN modelo_3d m       ON m.id = COALESCE(p.modelo_3d_id, c.modelo_3d_id)
LEFT JOIN produto_tecnico t ON t.produto_id = p.id;

-- Supabase: a view respeita as permissões de quem consulta
ALTER VIEW vw_produto_catalogo SET (security_invoker = true);
