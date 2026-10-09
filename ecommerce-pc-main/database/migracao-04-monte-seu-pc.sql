-- =====================================================
-- MIGRAÇÃO 04: "Monte seu PC"
--
-- 1. Duas tabelas novas com os dados técnicos usados para saber
--    quais peças combinam (soquete, tipo de memória, tamanho...).
-- 2. Quatro categorias novas: gabinetes, fontes, coolers, ventoinhas.
-- 3. Mais produtos (memórias, armazenamento e as categorias novas),
--    com nome, preço à vista e foto tirados da Pichau em 08/10/2026
--    como REFERÊNCIA para o trabalho acadêmico. Estoques fictícios.
-- 4. Os dados técnicos de todos os produtos.
-- 5. A view do catálogo passa a mostrar os dados técnicos.
--
-- Rode depois das migrações 02 e 03. Pode rodar mais de uma vez.
-- =====================================================

-- ---------- 1. Tabelas ----------

-- Relação 1:1 com produto: só as peças que têm dados técnicos ganham
-- uma linha aqui (ex.: um SSD não tem soquete nem potência).
CREATE TABLE IF NOT EXISTS produto_tecnico (
    produto_id      INTEGER PRIMARY KEY
                    REFERENCES produto(id) ON DELETE CASCADE,
    soquete         VARCHAR(10),            -- processador e placa-mãe: AM4, AM5, LGA1700...
    memoria         VARCHAR(4)              -- placa-mãe e memória
                    CHECK (memoria IN ('DDR4', 'DDR5')),
    formato         VARCHAR(5)              -- placa-mãe: tamanho; gabinete: maior tamanho que cabe
                    CHECK (formato IN ('ITX', 'M-ATX', 'ATX', 'E-ATX')),
    consumo_w       INTEGER CHECK (consumo_w > 0),    -- processador e placa de vídeo (aproximado)
    potencia_w      INTEGER CHECK (potencia_w > 0),   -- fonte
    video_integrado BOOLEAN                           -- processador
);

-- Relação N:N: um cooler serve em vários soquetes
CREATE TABLE IF NOT EXISTS cooler_soquete (
    produto_id  INTEGER     NOT NULL REFERENCES produto(id) ON DELETE CASCADE,
    soquete     VARCHAR(10) NOT NULL,
    PRIMARY KEY (produto_id, soquete)
);

-- Supabase: bloqueia a API pública nas tabelas novas (igual às outras)
ALTER TABLE produto_tecnico ENABLE ROW LEVEL SECURITY;
ALTER TABLE cooler_soquete  ENABLE ROW LEVEL SECURITY;

-- ---------- 2. Categorias novas ----------
INSERT INTO categoria (nome, descricao)
SELECT v.nome, v.descricao
FROM (VALUES
    ('Gabinetes',   'Gabinetes Mid-Tower, Mini-Tower e Full-Tower'),
    ('Fontes',      'Fontes de alimentação ATX com certificação 80 Plus'),
    ('Coolers',     'Air coolers e water coolers para processador'),
    ('Ventoinhas',  'Ventoinhas avulsas e kits para o gabinete')
) AS v(nome, descricao)
WHERE NOT EXISTS (SELECT 1 FROM categoria c WHERE c.nome = v.nome);

-- ---------- 3. Produtos ----------

-- Memórias RAM
INSERT INTO produto (nome, descricao, preco, estoque, imagem, categoria_id)
SELECT v.nome, v.descricao, v.preco, v.estoque, v.imagem, c.id
FROM (VALUES
    ('Direct Tech 8GB (1x8GB), DDR4, 3200MHz',
     'Pente DDR4 de 8GB a 3200MHz com latência CL19 e 1,35V, opção de entrada para upgrades de desktops básicos.',
     399.99, 4,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/d/t/dt4-8g3200121.jpg'),
    ('Team Group T-Force Vulcan Z 8GB (1x8GB), DDR4, 3200MHz',
     'Memória gamer DDR4 de 8GB a 3200MHz com CL16 e dissipador de alumínio cinza, boa latência para PCs de entrada.',
     479.99, 17,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/t/l/tlzgd48g3200hc16f01.jpg'),
    ('Mancer Vant S 16GB (1x16GB), DDR4, 3200MHz',
     'Módulo DDR4 de 16GB a 3200MHz, CL19 e 1,35V, com dissipador preto; custo-benefício para desktops de uso geral.',
     619.99, 9,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/m/c/mcr-vnt3200-16gb.jpg'),
    ('Puskill 16GB (1x16GB), DDR4, 3200MHz',
     'Pente DDR4 de 16GB a 3200MHz com latência CL16 e 1,35V, voltado a desktops que buscam boa resposta em jogos.',
     739.99, 6,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/p/s/psk-d4d16m3200b-16gb.jpg'),
    ('Direct Tech 16GB (1x16GB), DDR4, 3200MHz',
     'Memória DDR4 de 16GB a 3200MHz, CL19, com iluminação RGB e dissipador preto para setups gamer.',
     899.99, 11,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/d/t/dt4-16g3200rgb.jpg'),
    ('Hiksemi Future 16GB (1x16GB), DDR4, 3200MHz',
     'Módulo DDR4 de 16GB a 3200MHz com CL16 e dissipador preto, para desktops com plataforma DDR4.',
     1109.99, 15,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/h/s/hsc416u32c2-16g.jpg'),
    ('Corsair Vengeance Pro SL 16GB (2x8GB), DDR4, 4000MHz',
     'Kit DDR4 de 16GB (2x8GB) a 4000MHz, CL18, com XMP 2.0, RGB e dissipador de alumínio; foco em alto desempenho em dual channel.',
     1949.99, 13,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/c/m/cmh16gx4m2z4000c181.jpg'),
    ('Indilinx Magic II 8GB (1x8GB), DDR5, 5600MHz',
     'Pente DDR5 de 8GB a 5600MHz com CL46, porta de entrada acessível para plataformas DDR5.',
     899.99, 11,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/i/n/ind-md5p56sp08x1551222.jpg'),
    ('Adata XPG Lancer Blade 8GB (1x8GB), DDR5, 5600MHz',
     'Memória DDR5 de 8GB a 5600MHz, CL46, com RGB, perfis XMP 3.0/EXPO e PMIC integrado em visual low-profile.',
     1069.99, 17,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/a/x/ax5u5600c468g-slabrbk-30491.jpg'),
    ('Adata XPG Novakey 16GB (1x16GB), DDR5, 5600MHz',
     'Módulo DDR5 de 16GB a 5600MHz com CL46 e iluminação RGB, em dissipador preto para PCs gamer de nova geração.',
     1969.99, 9,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/a/x/ax5u5600c4616g-cnkrbk.jpg'),
    ('Team Group Delta A 16GB (1x16GB), DDR5, 7200MHz',
     'DDR5 de 16GB a 7200MHz com CL34, RGB e perfil AMD EXPO, otimizada para placas AMD série 800.',
     3399.99, 6,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/f/f/ff7d516g7200hc34a012.jpg'),
    ('Kingston Fury Renegade 24GB (1x24GB), DDR5, 8800MT/s',
     'Módulo CUDIMM DDR5 de 24GB a 8800MT/s, CL42, com RGB e 1,4V no XMP; topo de linha para overclock extremo.',
     4599.99, 17,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/k/f/kf588cu42rsa-24.jpg'),
    ('Corsair Vengeance 32GB (2x16GB), DDR5, 6000MHz',
     'Kit DDR5 de 32GB (2x16GB) a 6000MHz com latência baixa CL28, XMP e dissipador de alumínio; alto desempenho em dual channel.',
     5799.99, 15,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/c/m/cmk32gx5m2b6000c28.jpg'),
    ('Team Group Delta A 32GB (1x32GB), DDR5, 6000MHz',
     'Pente único DDR5 de 32GB a 6000MHz, CL38, com RGB, 1,25V e perfil AMD EXPO para plataformas AMD 600/800.',
     5799.99, 12,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/f/f/ff7d532g6000hc38j011223.jpg')
) AS v(nome, descricao, preco, estoque, imagem)
JOIN categoria c ON c.nome = 'Memórias RAM'
WHERE NOT EXISTS (SELECT 1 FROM produto p WHERE p.nome = v.nome);

-- Armazenamento
INSERT INTO produto (nome, descricao, preco, estoque, imagem, categoria_id)
SELECT v.nome, v.descricao, v.preco, v.estoque, v.imagem, c.id
FROM (VALUES
    ('SSD Adata Legend 860, 500GB, NVMe M.2',
     'SSD NVMe M.2 2280 PCIe 4.0 de 500GB com leitura de 5000MB/s e gravação de 3000MB/s, opção de entrada rápida.',
     739.99, 6,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/s/l/sleg-860-500gcs.jpg'),
    ('SSD Lexar NM790, 512GB, NVMe M.2',
     'SSD M.2 NVMe PCIe 4.0 de 512GB com até 7200MB/s de leitura e 4400MB/s de gravação, resistência de 500TBW.',
     699.99, 2,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/l/n/lnm790x512g-rnnng2.jpg'),
    ('SSD Sandisk Optimus 5100, 1TB, NVMe M.2',
     'SSD NVMe PCIe 4.0 M.2 2280 de 1TB com leitura de 7100MB/s e gravação de 6700MB/s para jogos e criação.',
     1579.99, 6,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/s/d/sdsp51100tan-000e01.jpg'),
    ('SSD Team Group NV10000, 1TB, NVMe M.2',
     'SSD M.2 NVMe PCIe 5.0 de 1TB com até 10000MB/s de leitura e 8200MB/s de gravação, 600TBW; Gen5 com bom custo.',
     1869.99, 9,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/t/m/tm8fgp001t0c101.jpg'),
    ('SSD Sandisk Optimus GX PRO 8100, 1TB, NVMe M.2',
     'SSD NVMe PCIe 5.0 M.2 2280 de 1TB com até 14900MB/s de leitura e 11000MB/s de gravação; topo de linha para entusiastas.',
     2799.99, 3,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/s/d/sdsp82100tan-000e01.jpg'),
    ('SSD Kingston NV3, 2TB, NVMe M.2',
     'SSD M.2 NVMe PCIe 4.0 de 2TB com leitura de 6000MB/s e gravação de 5000MB/s, bom espaço para jogos e projetos.',
     2199.99, 3,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/s/n/snv3s-2000g1.jpg'),
    ('SSD Samsung 990 Pro, 4TB, NVMe M.2',
     'SSD NVMe PCIe 4.0 de 4TB com V-NAND TLC, cache DDR4 de 4GB e até 7450MB/s de leitura e 6900MB/s de gravação.',
     6799.99, 16,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/m/z/mz-v9p4t0cw2.jpg'),
    ('SSD Sandisk Plus, 500GB, SATA 2.5"',
     'SSD SATA III 2,5" de 500GB com leitura de 545MB/s e gravação de 505MB/s, ideal para dar vida nova a PCs antigos.',
     609.99, 6,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/s/d/sdssda-500g-g281.jpg'),
    ('SSD Team Group T-Force QX Extra Large, 1TB, SATA 2.5"',
     'SSD SATA III 2,5" de 1TB com flash 3D QLC e cache SLC, até 560MB/s de leitura e 500MB/s de gravação.',
     849.99, 9,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/t/2/t253x7001t0c101.jpg'),
    ('SSD WD Green, 2TB, SATA 2.5"',
     'SSD SATA III 2,5" de 2TB da linha WD Green, com 545MB/s de leitura e 515MB/s de gravação para armazenamento amplo.',
     1699.99, 8,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/w/d/wds200t5g0a1.jpg'),
    ('HD WD Purple, 1TB, 5400RPM',
     'HD 3,5" de 1TB, 5400RPM, SATA III e cache de 64MB, voltado a sistemas de vigilância DVR/NVR.',
     899.99, 7,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/w/d/wd11purz.jpg'),
    ('HD Seagate Skyhawk, 2TB, 5400RPM',
     'HD 3,5" de 2TB para vigilância, 5400RPM, gravação CMR, cache de 256MB e até 180MB/s via SATA III.',
     1139.99, 12,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/s/t/st2000vx017.jpg'),
    ('HD WD Red Plus NAS, 4TB, 5400RPM',
     'HD 3,5" de 4TB para NAS, 5400RPM, CMR, cache de 128MB e até 180MB/s, feito para operação contínua.',
     1879.99, 5,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/w/d/wd40efzz1222.jpg'),
    ('HD WD Black, 4TB, 7200RPM',
     'HD de desempenho 3,5" com 4TB, 7200RPM, cache de 256MB, CMR e até 267MB/s, ideal para bibliotecas de jogos.',
     1999.99, 9,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/w/d/wd4006fzbx1.jpg')
) AS v(nome, descricao, preco, estoque, imagem)
JOIN categoria c ON c.nome = 'Armazenamento'
WHERE NOT EXISTS (SELECT 1 FROM produto p WHERE p.nome = v.nome);

-- Gabinetes
INSERT INTO produto (nome, descricao, preco, estoque, imagem, categoria_id)
SELECT v.nome, v.descricao, v.preco, v.estoque, v.imagem, c.id
FROM (VALUES
    ('Bluecase BG-066 Life, Mini-Tower, M-ATX',
     'Mini tower de entrada para placas Micro-ATX e Mini-ITX, com laterais de vidro, câmara dupla e suporte a GPU de até 260 mm. Vem sem ventoinhas.',
     99.99, 4,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/b/g/bg-066-life-bk2.jpg'),
    ('Redragon Flux, Mid-Tower, ATX',
     'Mid tower ATX preto com vidro temperado, compatível com placas de conector traseiro, radiador de 360 mm no topo e base e GPU de até 435 mm. Sem fans.',
     329.99, 18,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/c/a/ca-632b12121.jpg'),
    ('Redragon Wideload Horizon, Mini Tower, M-ATX',
     'Mini tower estilo aquário para Micro-ATX e Mini-ITX, com vidro temperado, radiador de até 360 mm na base e GPU de até 400 mm. Vem sem fans.',
     449.99, 13,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/c/a/ca-619b.jpg'),
    ('Cooler Master Q300L V2, Mini Tower, M-ATX',
     'Mini tower compacto para Micro-ATX e Mini-ITX, com lateral de vidro, 1 fan traseiro de 120 mm, radiador frontal de 240 mm e GPU de até 360 mm.',
     419.99, 12,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/q/3/q300lv2-kgnn-s016.jpg'),
    ('Cooler Master Elite 302, Mini Tower, M-ATX',
     'Mini tower branco para Micro-ATX e Mini-ITX, com vidro temperado, 1 fan traseiro de 120 mm, radiador frontal de até 360 mm e GPU de até 365 mm.',
     419.99, 4,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/e/3/e302-wgnn-s001.jpg'),
    ('Thermaltake Versa H16 TG, Micro-Tower, M-ATX',
     'Micro tower em aço SPCC para Micro-ATX e Mini-ITX, com 3 fans ARGB de 120 mm, lateral de vidro de 3 mm, radiador frontal de 280 mm e GPU de até 330 mm.',
     499.99, 12,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/c/a/ca-1y8-00s1wn-021.jpg'),
    ('Lian Li Lancool 205, Mid-Tower, ATX',
     'Mid tower ATX branco com frente em mesh, 3 fans ARGB PWM (2x 140 mm e 1x 120 mm), radiador de 280 mm no topo e frente e GPU de até 350 mm.',
     999.99, 9,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/l/a/lancool-205-mesh-w-white.jpg'),
    ('Cougar MX600 Air, Mid-Tower, E-ATX',
     'Mid tower com suporte até E-ATX, 4 fans ARGB (3x 140 mm e 1x 120 mm), radiador de 360 mm na frente ou topo e GPU de até 400 mm.',
     519.99, 12,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/3/8/382sc9000011.jpg'),
    ('Aigo Darkflash TH285 PLUS, Mid-Tower, ATX',
     'Mid tower ATX branco estilo aquário com 8 fans ARGB de 120 mm, radiador de 360 mm na base e lateral e GPU de até 410 mm.',
     539.99, 5,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/t/h/th285-plus-pc-case-white114221227.jpg'),
    ('MSI Gungnir 211R Airflow PZ, Mid-Tower, ATX',
     'Mid tower airflow preto compatível com placas Project Zero, 4 fans ARGB PWM de 120 mm, radiador de 360 mm no topo e frente e GPU de até 360 mm.',
     949.99, 13,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/3/0/306-7g22r12-w571.jpg'),
    ('Thermaltake CTE E660 MX, Mid-Tower, E-ATX',
     'Gabinete grande com layout CTE e suporte até E-ATX, duas laterais de vidro de 4 mm, radiadores de até 420 mm e GPU de até 415 mm; até 14 fans de 120 mm.',
     1899.99, 13,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/c/a/ca-1y3-00m1wn-013.jpg'),
    ('Corsair Frame 4000D RS, Mid-Tower, E-ATX',
     'Mid tower premium branco até E-ATX, com tela LCD touch de 14,5", 4 fans RS120 ARGB, radiador de 360 mm e GPU de até 430 mm.',
     2499.99, 13,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/c/c/cc-9011327-ww22.jpg')
) AS v(nome, descricao, preco, estoque, imagem)
JOIN categoria c ON c.nome = 'Gabinetes'
WHERE NOT EXISTS (SELECT 1 FROM produto p WHERE p.nome = v.nome);

-- Fontes
INSERT INTO produto (nome, descricao, preco, estoque, imagem, categoria_id)
SELECT v.nome, v.descricao, v.preco, v.estoque, v.imagem, c.id
FROM (VALUES
    ('Thermaltake TR2 S, 650W, 80 Plus White',
     'Fonte ATX de 650 W com certificação 80 Plus White, PFC ativo, ventoinha de 120 mm e cabos fixos com 2 conectores PCIe 6+2.',
     349.99, 3,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/p/s/ps-trs-0650nnfawb-12.jpg'),
    ('Thermalright TR-TB550S, 550W, 80 Plus Bronze',
     'Fonte ATX 3.0 de 550 W, 80 Plus Bronze, com cabos fixos, ventoinha de 120 mm e 5 conectores SATA, boa para PCs de entrada.',
     329.99, 15,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/t/r/tr-tb550s2.jpg'),
    ('MSI MAG A650BNL White, 650W, 80 Plus Bronze',
     'Fonte branca de 650 W, 80 Plus Bronze, não modular, com PFC ativo, ventoinha silenciosa de 120 mm e proteções OCP, OVP, OPP e SCP.',
     329.99, 8,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/m/a/mag-a650bnl-white6523232022.jpg'),
    ('Redragon Charge, 750W, 80 Plus Bronze',
     'Fonte ATX de 750 W reais, 80 Plus Bronze, com PFC ativo, bivolt automático, ventoinha de 120 mm e 2 conectores PCIe 6+2.',
     375.99, 7,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/f/r/frc-750.jpg'),
    ('Cougar Atlas 750, 750W, 80 Plus Bronze',
     'Fonte ATX 3.1 de 750 W, 80 Plus Bronze, com conector nativo 12V-2x6 para GPUs modernas, 4 PCIe 6+2 e ventoinha de 120 mm.',
     399.99, 18,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/c/g/cgr-vg-7502.jpg'),
    ('Cooler Master MWE Gold 750 V3, 750W, 80 Plus Gold',
     'Fonte full modular de 750 W, 80 Plus Gold e ATX 3.1, com conector 12V-2x6, 4 PCIe 6+2 e ventoinha de 120 mm.',
     549.99, 5,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/m/p/mpx-7503-afag-2ebbr165553.jpg'),
    ('Lian Li EG0850G, 850W, 80 Plus Gold',
     'Fonte full modular de 850 W, 80 Plus Gold e ATX 3.1, com conector 12VHPWR, ventoinha FDB de 120 mm e eficiência de até 90,7%.',
     949.99, 3,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/e/g/eg0850g-bk4.jpg'),
    ('Deepcool GamerStorm PN1000D, 1000W, 80 Plus Gold',
     'Fonte ATX 3.1 de 1000 W, 80 Plus Gold, não modular, com conector 12V-2x6 de até 600 W e ventoinha de 120 mm com rolamento hidráulico.',
     699.99, 13,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/r/-/r-pna00d-fc0b-jgwo-v23.jpg'),
    ('Corsair RM850x, 850W, Cybenetics Gold',
     'Fonte full modular de 850 W com certificação Cybenetics Gold, ATX 3.1 e PCIe 5.1, cabo nativo 12V-2x6 e modo Zero RPM.',
     849.99, 14,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/c/p/cp-9020270-br.jpg'),
    ('MSI Pro A850PL, 850W, 80 Plus Platinum',
     'Fonte full modular de 850 W, 80 Plus Platinum (até 92%), ATX 3.1, com conector PCIe 5.1 16 pinos de 600 W e ventoinha de 120 mm.',
     859.99, 17,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/3/0/306-7zply19-hd8.jpg'),
    ('Corsair HX1000i Shift, 1000W, 80 Plus Platinum',
     'Fonte full modular de 1000 W, 80 Plus Platinum, com conectores laterais Shift, ATX 3.1, cabo 12V-2x6 e ventoinha de 140 mm com Zero RPM.',
     1599.99, 2,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/c/p/cp-9020265-ww.jpg'),
    ('ASRock Taichi, 1300W, 80 Plus Titanium',
     'Fonte topo de linha de 1300 W, 80 Plus Titanium, full modular, ATX 3.1, com dois conectores 12+4 pinos PCIe 5.1 e ventoinha FDB de 135 mm.',
     2749.99, 2,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/t/c/tc-1300t6.jpg')
) AS v(nome, descricao, preco, estoque, imagem)
JOIN categoria c ON c.nome = 'Fontes'
WHERE NOT EXISTS (SELECT 1 FROM produto p WHERE p.nome = v.nome);

-- Coolers
INSERT INTO produto (nome, descricao, preco, estoque, imagem, categoria_id)
SELECT v.nome, v.descricao, v.preco, v.estoque, v.imagem, c.id
FROM (VALUES
    ('Noctua NH-L9a-AM4 chromax, Air Cooler 92mm',
     'Cooler low profile de apenas 37 mm de altura, com ventoinha de 92 mm até 2500 RPM e 2 heatpipes de cobre. Ideal para PCs compactos com AM4, com ruído de até 23,6 dB(A).',
     469.99, 9,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/n/h/nh-l9a-am4-ch.bk1.jpg'),
    ('Cooler Master Hyper 212 Spectrum V3, Air Cooler 120mm',
     'Cooler torre de entrada com 4 heatpipes e ventoinha de 120 mm PWM ARGB (650–1750 RPM, até 27,2 dBA). Tem 152 mm de altura e suporta AM4, AM5 e LGA1700.',
     94.99, 14,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/r/r/rr-s4na-17pa-r11.jpg'),
    ('Cooler Master Hyper 212 3DHP, Air Cooler 120mm',
     'Cooler torre com heatpipes 3DHP de contato direto e ventoinha de 120 mm ARGB PWM de até 2050 RPM e 22,6 dBA. Altura de 158 mm, compatível com AM5 e LGA1851.',
     224.99, 12,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/m/a/may-t2hp-217pa-r14.jpg'),
    ('Arctic Freezer 36, Air Cooler 120mm',
     'Cooler torre única com 4 heatpipes de 6 mm e duas ventoinhas P12 PWM PST A-RGB de 120 mm em push-pull (200–2000 RPM). Compatível com AM4, AM5, LGA1700 e LGA1851.',
     239.99, 13,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/a/c/acfre00124a.jpg'),
    ('Thermaltake Astria 400, Air Cooler 120mm',
     'Cooler torre única com 6 heatpipes de cobre e ventoinha de 120 mm ARGB PWM (500–1800 RPM, 26,8 dBA). Suporta até 230 W de TDP e tem 160 mm de altura.',
     329.99, 16,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/c/l/cl-p120-ca12sw-a.jpg'),
    ('Thermaltake Astria 600, Air Cooler 2x120mm',
     'Cooler dual tower com 6 heatpipes de cobre e duas ventoinhas de 120 mm ARGB PWM (500–1800 RPM). Suporta até 265 W de TDP, com 160 mm de altura.',
     449.99, 6,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/c/l/cl-p121-ca12sw-a3.jpg'),
    ('Cooler Master 240 Elite, Water Cooler 240mm',
     'Water cooler AIO de 240 mm com radiador de alumínio, 2 ventoinhas ARGB de 120 mm (600–2100 RPM) e bomba ARGB de 3200 RPM. Compatível com AM4, AM5, LGA1700 e LGA1851.',
     339.99, 6,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/e/l/elwd24ma21dar11651.jpg'),
    ('Thermalright Core Matrix Vision 240, Water Cooler 240mm',
     'Water cooler AIO de 240 mm com tela de 2" no bloco, ventoinhas ARGB PWM de até 2000 RPM e 68,9 CFM. Suporta até 270 W de TDP.',
     399.99, 15,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/t/l/tl-core-matrix-240-vision-argb-bk.jpg'),
    ('Cooler Master MasterLiquid 360L Core, Water Cooler 360mm',
     'Water cooler AIO branco de 360 mm com bomba de câmara dupla silenciosa (12 dBA) e ventoinhas ARGB de 120 mm (650–1750 RPM). Compatível com AM4, AM5 e LGA1700.',
     434.99, 6,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/m/l/mlw-d36m-a18pz-rw.jpg'),
    ('Redragon X Gamerstorm LE360 RD, Water Cooler 360mm',
     'Water cooler AIO de 360 mm com bomba ARGB de até 3400 RPM e três ventoinhas de 120 mm (500–2100 RPM, 75,89 CFM). Compatível com AM4, AM5, LGA1700 e LGA1851.',
     459.99, 11,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/l/e/le360rd-bkammm-a-1.jpg'),
    ('Arctic Liquid Freezer III Pro 360, Water Cooler 360mm',
     'Water cooler AIO de 360 mm com radiador de 38 mm e 3 ventoinhas P12 Pro (600–3000 RPM, 77 CFM). Bomba PWM de até 2800 RPM, sem iluminação RGB.',
     739.99, 6,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/a/c/acfre00180a1.jpg'),
    ('Thermaltake Toughliquid 360 EX Pro, Water Cooler 360mm',
     'Water cooler AIO topo de linha de 360 mm com tela LCD de 2,1" no bloco, ventoinhas ARGB PWM de 500–2000 RPM e bomba de até 3300 RPM. Suporta até 360 W de TDP.',
     1079.99, 3,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/c/l/cl-w400-pl12bl-a.jpg')
) AS v(nome, descricao, preco, estoque, imagem)
JOIN categoria c ON c.nome = 'Coolers'
WHERE NOT EXISTS (SELECT 1 FROM produto p WHERE p.nome = v.nome);

-- Ventoinhas
INSERT INTO produto (nome, descricao, preco, estoque, imagem, categoria_id)
SELECT v.nome, v.descricao, v.preco, v.estoque, v.imagem, c.id
FROM (VALUES
    ('Pichau Ventus NX Reverse, 1x120mm, ARGB',
     'Ventoinha branca de 120 mm com pás reversas e iluminação ARGB 5V, rotação de 800 a 1600 RPM e fluxo de 62 CFM. Opção de entrada com conector 4 pinos.',
     25.99, 8,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/p/c/pch-vtnr-wh01v5422.jpg'),
    ('Pichau Ventus NX, 3x120mm, ARGB',
     'Kit com 3 ventoinhas brancas de 120 mm com ARGB 5V sincronizável, controle PWM de 800 a 1600 RPM e 62 CFM cada. Ótimo custo-benefício.',
     74.99, 11,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/p/c/pch-vtnx3-wh0114552.jpg'),
    ('Redragon GC-F015, 3x120mm, ARGB',
     'Kit com 3 ventoinhas pretas de 120 mm com ARGB 5V e PWM 4 pinos, de 600 a 1600 RPM e até 79 CFM. Ruído máximo de 33,99 dBA.',
     99.99, 13,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/g/c/gc-f0151.jpg'),
    ('Ocypus Delta F12, 1x120mm, ARGB',
     'Ventoinha branca de 120 mm com ARGB e PWM 4 pinos, girando de 500 a 2000 RPM com até 73 CFM e 29 dB(A).',
     59.99, 11,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/d/e/delta-f12-wh1amoox-gl.jpg'),
    ('Arctic Cooling P12 Pro Reverse, 3x120mm, ARGB',
     'Kit com 3 ventoinhas reversas de 120 mm com 12 LEDs A-RGB, PWM de 500 a 3000 RPM, 73 CFM e 4,5 mmH₂O de pressão estática, com cabos em cascata.',
     249.99, 10,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/a/c/acfan00333a5.jpg'),
    ('Noctua NF-A12x25-PWM, 1x120mm',
     'Ventoinha premium de 120 mm na cor marrom clássica, PWM de até 2000 RPM, 60,09 CFM e apenas 22,6 dB(A). Sem iluminação.',
     259.99, 10,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/n/f/nf-a12x25-pwm4.jpg'),
    ('Noctua NF-A14-PWM, 1x140mm',
     'Ventoinha premium de 140 mm marrom com PWM de até 1500 RPM, 82,52 CFM e 24,6 dB(A). Silenciosa e sem iluminação.',
     194.99, 5,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/n/f/nf-a14-pwm.jpg'),
    ('Arctic Cooling P14 Pro PWM, 1x140mm, ARGB',
     'Ventoinha de 140 mm com 12 LEDs A-RGB e PWM de 400 a 2500 RPM, entregando até 110 CFM. Usa conectores 4 pinos e 3 pinos A-RGB.',
     109.99, 10,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/a/c/acfan00315a7.jpg'),
    ('Arctic Cooling P14 Pro Reverse, 1x140mm',
     'Ventoinha reversa de 140 mm e 30 mm de espessura, sem RGB, com PWM de 400 a 2650 RPM (para em 0 RPM) e fluxo de até 98 CFM.',
     69.99, 14,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/a/c/acfan00329a3.jpg'),
    ('NZXT F140Q, 1x140mm',
     'Ventoinha branca de 140 mm focada em silêncio, com PWM de 500 a 1500 RPM, 102,9 CFM e 29,8 dBA. Sem iluminação.',
     89.99, 9,
     'https://media.pichau.com.br/media/catalog/product/cache/22c0d71a45cddf08af7927cb2bce3571/r/f/rf-q14sf-w23.jpg')
) AS v(nome, descricao, preco, estoque, imagem)
JOIN categoria c ON c.nome = 'Ventoinhas'
WHERE NOT EXISTS (SELECT 1 FROM produto p WHERE p.nome = v.nome);

-- ---------- 4. Dados técnicos ----------
-- Ligados pelo nome do produto, para funcionar em qualquer banco
-- (os ids podem ser diferentes no Supabase e no computador).
-- consumo_w é aproximado: potência máxima do processador e consumo
-- típico da placa de vídeo, usados só para sugerir a fonte.
INSERT INTO produto_tecnico (produto_id, soquete, memoria, formato, consumo_w, potencia_w, video_integrado)
SELECT p.id, v.soquete, v.memoria, v.formato, v.consumo_w, v.potencia_w, v.video_integrado
FROM (VALUES
    ('NVIDIA GeForce RTX 3090 24GB', NULL, NULL, NULL, 350, NULL, NULL),
    ('NVIDIA GeForce RTX 4090 24GB', NULL, NULL, NULL, 450, NULL, NULL),
    ('AMD Ryzen 7 5800X', 'AM4', NULL, NULL, 142, NULL, FALSE),
    ('Memória Corsair Vengeance 16GB DDR4 3200MHz', NULL, 'DDR4', NULL, NULL, NULL, NULL),
    ('AMD Radeon RX 7800 XT 16GB', NULL, NULL, NULL, 263, NULL, NULL),
    ('Intel Core i5-13400F', 'LGA1700', NULL, NULL, 148, NULL, FALSE),
    ('Memória Kingston Fury Beast 32GB DDR5 5600MHz', NULL, 'DDR5', NULL, NULL, NULL, NULL),
    ('Palit GeForce RTX 5090 GameRock, 32GB, GDDR7', NULL, NULL, NULL, 575, NULL, NULL),
    ('Gigabyte Radeon RX 9050 Gaming OC, 8GB, GDDR6', NULL, NULL, NULL, 150, NULL, NULL),
    ('AsRock Radeon RX 9070 XT Challenger, 16GB, GDDR6', NULL, NULL, NULL, 304, NULL, NULL),
    ('ASRock Intel ARC B570 Challenger OC, 10GB, GDDR6', NULL, NULL, NULL, 150, NULL, NULL),
    ('PowerColor Radeon RX 9070 GRE Red Devil, 12GB, GDDR6', NULL, NULL, NULL, 220, NULL, NULL),
    ('Sapphire Pulse Radeon RX 9070 GRE, 12GB, GDDR6', NULL, NULL, NULL, 220, NULL, NULL),
    ('Zotac GeForce RTX 3050 Twin Edge OC, 6GB, GDDR6', NULL, NULL, NULL, 70, NULL, NULL),
    ('PCYes Nvidia GeForce RTX 5060, 8GB, GDDR7', NULL, NULL, NULL, 145, NULL, NULL),
    ('Leadertech Radeon RX 550, 4GB, GDDR5', NULL, NULL, NULL, 50, NULL, NULL),
    ('Zotac Gaming GeForce RTX 5070 Twin Edge OC, 12GB, GDDR7', NULL, NULL, NULL, 250, NULL, NULL),
    ('Leadertech GeForce GT610 Low Profile, 2GB, DDR3', NULL, NULL, NULL, 30, NULL, NULL),
    ('MSI GeForce RTX 5060 Ventus 2x OC White, 8GB, GDDR7', NULL, NULL, NULL, 145, NULL, NULL),
    ('Leadertech GeForce GTX750 Ti, 4GB, GDDR5', NULL, NULL, NULL, 60, NULL, NULL),
    ('PowerColor Radeon RX 6500 XT Fighter, 4GB, GDDR6', NULL, NULL, NULL, 107, NULL, NULL),
    ('PCYes Radeon RX 7600 XT, 16GB, GDDR6', NULL, NULL, NULL, 190, NULL, NULL),
    ('MSI GeForce GT 1030 4GD4 LP OC Edition, 4GB, DDR4', NULL, NULL, NULL, 30, NULL, NULL),
    ('Gigabyte Radeon RX 9070 XT Gaming, 16GB, GDDR6', NULL, NULL, NULL, 304, NULL, NULL),
    ('Asus GeForce RTX 5080 Prime OC, 16GB, GDDR7', NULL, NULL, NULL, 360, NULL, NULL),
    ('Asus Radeon RX 9070 GRE, 12GB, GDDR6', NULL, NULL, NULL, 220, NULL, NULL),
    ('Maxsun GeForce RTX 3060, 12GB, GDDR6', NULL, NULL, NULL, 170, NULL, NULL),
    ('Zotac GeForce RTX 5060 Ti Twin Edge OC, 8GB, GDDR7', NULL, NULL, NULL, 180, NULL, NULL),
    ('Asus Radeon RX 9060 XT Dual, 16GB, GDDR6', NULL, NULL, NULL, 160, NULL, NULL),
    ('Gigabyte GeForce RTX 5070 Ti Gaming OC, 16GB, GDDR7', NULL, NULL, NULL, 300, NULL, NULL),
    ('Gigabyte Radeon RX 9070 Gaming, 16GB, GDDR6', NULL, NULL, NULL, 220, NULL, NULL),
    ('PowerColor Radeon RX 9060 XT Reaper, 16GB, GDDR6', NULL, NULL, NULL, 160, NULL, NULL),
    ('XFX Swift Radeon RX 9070 GRE White Triple Fan Gaming, 12GB, GDDR6', NULL, NULL, NULL, 220, NULL, NULL),
    ('ASRock Intel ARC A380 Challenger ITX OC, 6GB, GDDR6', NULL, NULL, NULL, 75, NULL, NULL),
    ('PowerColor Radeon RX 7600 Fighter, 8GB, GDDR6', NULL, NULL, NULL, 165, NULL, NULL),
    ('PowerColor Radeon RX 9070 XT Hellhound OC White, 16GB, GDDR6', NULL, NULL, NULL, 304, NULL, NULL),
    ('Palit GeForce RTX 5060 Infinity 3 OC, 8GB, GDDR7', NULL, NULL, NULL, 145, NULL, NULL),
    ('MSI GeForce RTX 5080 Shadow 3X OC, 16GB, GDDR7', NULL, NULL, NULL, 360, NULL, NULL),
    ('Gigabyte GeForce RTX 5090 Gaming OC, 32GB, GDDR7', NULL, NULL, NULL, 575, NULL, NULL),
    ('Zotac GeForce RTX 5050 Gaming Twin Edge OC, 8GB, GDDR6', NULL, NULL, NULL, 130, NULL, NULL),
    ('Gigabyte GeForce RTX 5080 Aorus Infinity, 16GB, GDDR7', NULL, NULL, NULL, 360, NULL, NULL),
    ('Mancer Radeon RX 6600 Streaky V2, 8GB, GDDR6', NULL, NULL, NULL, 132, NULL, NULL),
    ('Maxsun Intel ARC B580 iCraft, 12GB, GDDR6', NULL, NULL, NULL, 190, NULL, NULL),
    ('Asus Prime B850M-K, AM5, DDR5', 'AM5', 'DDR5', 'M-ATX', NULL, NULL, NULL),
    ('Gigabyte H810M Gaming WIFI6 Gen5, LGA1851, DDR5', 'LGA1851', 'DDR5', 'M-ATX', NULL, NULL, NULL),
    ('Gigabyte B840M D3HP WIFI6E, AM5, DDR5', 'AM5', 'DDR5', 'M-ATX', NULL, NULL, NULL),
    ('Gigabyte B760 Gaming X WIFI6E Gen5, LGA1700, DDR5', 'LGA1700', 'DDR5', 'ATX', NULL, NULL, NULL),
    ('Gigabyte X870E Aorus Pro X3D, AM5, DDR5', 'AM5', 'DDR5', 'ATX', NULL, NULL, NULL),
    ('Gigabyte B840 Gaming X WiFi6E, AM5, DDR5', 'AM5', 'DDR5', 'ATX', NULL, NULL, NULL),
    ('MSI Z890 Gaming Plus WIFI6E, LGA1851, DDR5', 'LGA1851', 'DDR5', 'ATX', NULL, NULL, NULL),
    ('MSI B550M Gaming Plus Wifi6e, AM4, DDR4', 'AM4', 'DDR4', 'M-ATX', NULL, NULL, NULL),
    ('Gigabyte B850 Aorus Stealth ICE, AM5, DDR5', 'AM5', 'DDR5', 'ATX', NULL, NULL, NULL),
    ('Gigabyte X870 Aorus Elite X3D ICE, AM5, DDR5', 'AM5', 'DDR5', 'ATX', NULL, NULL, NULL),
    ('Asus Prime B760M A WIFI II, LGA1700, DDR5', 'LGA1700', 'DDR5', 'M-ATX', NULL, NULL, NULL),
    ('MSI B550 GAMING WIFI6E, AM4, DDR4', 'AM4', 'DDR4', 'ATX', NULL, NULL, NULL),
    ('MSI X870E Gaming Plus Wifi, AM5, DDR5', 'AM5', 'DDR5', 'ATX', NULL, NULL, NULL),
    ('MSI Pro B550M-P, AM4, DDR4', 'AM4', 'DDR4', 'M-ATX', NULL, NULL, NULL),
    ('Gigabyte B850M Force WIFI6E, AM5, DDR5', 'AM5', 'DDR5', 'M-ATX', NULL, NULL, NULL),
    ('MSI Pro H810M-E, LGA1851, DDR5', 'LGA1851', 'DDR5', 'M-ATX', NULL, NULL, NULL),
    ('Gigabyte X870E Aorus Xtreme X3D AI TOP, AM5, DDR5', 'AM5', 'DDR5', 'E-ATX', NULL, NULL, NULL),
    ('Asus TUF Gaming B850M PLUS II, AM5, DDR5', 'AM5', 'DDR5', 'M-ATX', NULL, NULL, NULL),
    ('3Green A520MH, AM4, DDR4', 'AM4', 'DDR4', 'M-ATX', NULL, NULL, NULL),
    ('Gigabyte B860M Eagle V2, LGA1851, DDR5', 'LGA1851', 'DDR5', 'M-ATX', NULL, NULL, NULL),
    ('AMD Ryzen 9 9950X3D, 16 núcleos, AM5', 'AM5', NULL, NULL, 230, NULL, TRUE),
    ('Intel Core i7-14700F, 20 núcleos, LGA1700', 'LGA1700', NULL, NULL, 219, NULL, FALSE),
    ('Intel Core i7-12700KF, 12 núcleos, LGA1700', 'LGA1700', NULL, NULL, 190, NULL, FALSE),
    ('Intel Core i9-14900K, 24 núcleos, LGA1700', 'LGA1700', NULL, NULL, 253, NULL, TRUE),
    ('AMD Ryzen 9 9900X, 12 núcleos, AM5', 'AM5', NULL, NULL, 162, NULL, TRUE),
    ('AMD Ryzen 5 5500, 6 núcleos, AM4', 'AM4', NULL, NULL, 88, NULL, FALSE),
    ('Intel Core Ultra 9 285K, 24 núcleos, LGA1851', 'LGA1851', NULL, NULL, 250, NULL, TRUE),
    ('AMD Ryzen 5 7600, 6 núcleos, AM5', 'AM5', NULL, NULL, 88, NULL, TRUE),
    ('Intel Core i5-14600K, 14 núcleos, LGA1700', 'LGA1700', NULL, NULL, 181, NULL, TRUE),
    ('AMD Ryzen 3 3200G, 4 núcleos, AM4', 'AM4', NULL, NULL, 88, NULL, TRUE),
    ('Intel Core Ultra 5 245KF, 14 núcleos, LGA1851', 'LGA1851', NULL, NULL, 159, NULL, FALSE),
    ('AMD Ryzen 7 5800X3D, 8 núcleos, AM4', 'AM4', NULL, NULL, 142, NULL, FALSE),
    ('Intel Core i5-14400F, 10 núcleos, LGA1700', 'LGA1700', NULL, NULL, 148, NULL, FALSE),
    ('AMD Ryzen 7 9800X3D, 8 núcleos, AM5', 'AM5', NULL, NULL, 162, NULL, TRUE),
    ('Intel Core i5-12400F, 6 núcleos, LGA1700', 'LGA1700', NULL, NULL, 117, NULL, FALSE),
    ('Intel Core i3-12100F, 4 núcleos, LGA1700', 'LGA1700', NULL, NULL, 89, NULL, FALSE),
    ('Intel Core Ultra 7 270K Plus, 24 núcleos, LGA1851', 'LGA1851', NULL, NULL, 250, NULL, TRUE),
    ('AMD Ryzen 7 8700G, 8 núcleos, AM5', 'AM5', NULL, NULL, 88, NULL, TRUE),
    ('AMD Ryzen 7 5700X, 8 núcleos, AM4', 'AM4', NULL, NULL, 88, NULL, FALSE),
    ('AMD Ryzen 5 8600G, 6 núcleos, AM5', 'AM5', NULL, NULL, 88, NULL, TRUE),
    ('Corsair Vengeance 32GB (2x16GB), DDR5, 6000MHz', NULL, 'DDR5', NULL, NULL, NULL, NULL),
    ('Kingston Fury Renegade 24GB (1x24GB), DDR5, 8800MT/s', NULL, 'DDR5', NULL, NULL, NULL, NULL),
    ('Direct Tech 8GB (1x8GB), DDR4, 3200MHz', NULL, 'DDR4', NULL, NULL, NULL, NULL),
    ('Hiksemi Future 16GB (1x16GB), DDR4, 3200MHz', NULL, 'DDR4', NULL, NULL, NULL, NULL),
    ('Mancer Vant S 16GB (1x16GB), DDR4, 3200MHz', NULL, 'DDR4', NULL, NULL, NULL, NULL),
    ('Indilinx Magic II 8GB (1x8GB), DDR5, 5600MHz', NULL, 'DDR5', NULL, NULL, NULL, NULL),
    ('Puskill 16GB (1x16GB), DDR4, 3200MHz', NULL, 'DDR4', NULL, NULL, NULL, NULL),
    ('Team Group Delta A 32GB (1x32GB), DDR5, 6000MHz', NULL, 'DDR5', NULL, NULL, NULL, NULL),
    ('Direct Tech 16GB (1x16GB), DDR4, 3200MHz', NULL, 'DDR4', NULL, NULL, NULL, NULL),
    ('Adata XPG Novakey 16GB (1x16GB), DDR5, 5600MHz', NULL, 'DDR5', NULL, NULL, NULL, NULL),
    ('Corsair Vengeance Pro SL 16GB (2x8GB), DDR4, 4000MHz', NULL, 'DDR4', NULL, NULL, NULL, NULL),
    ('Team Group T-Force Vulcan Z 8GB (1x8GB), DDR4, 3200MHz', NULL, 'DDR4', NULL, NULL, NULL, NULL),
    ('Adata XPG Lancer Blade 8GB (1x8GB), DDR5, 5600MHz', NULL, 'DDR5', NULL, NULL, NULL, NULL),
    ('Team Group Delta A 16GB (1x16GB), DDR5, 7200MHz', NULL, 'DDR5', NULL, NULL, NULL, NULL),
    ('Redragon Wideload Horizon, Mini Tower, M-ATX', NULL, NULL, 'M-ATX', NULL, NULL, NULL),
    ('Corsair Frame 4000D RS, Mid-Tower, E-ATX', NULL, NULL, 'E-ATX', NULL, NULL, NULL),
    ('Redragon Flux, Mid-Tower, ATX', NULL, NULL, 'ATX', NULL, NULL, NULL),
    ('Bluecase BG-066 Life, Mini-Tower, M-ATX', NULL, NULL, 'M-ATX', NULL, NULL, NULL),
    ('Cougar MX600 Air, Mid-Tower, E-ATX', NULL, NULL, 'E-ATX', NULL, NULL, NULL),
    ('Cooler Master Q300L V2, Mini Tower, M-ATX', NULL, NULL, 'M-ATX', NULL, NULL, NULL),
    ('Aigo Darkflash TH285 PLUS, Mid-Tower, ATX', NULL, NULL, 'ATX', NULL, NULL, NULL),
    ('Thermaltake Versa H16 TG, Micro-Tower, M-ATX', NULL, NULL, 'M-ATX', NULL, NULL, NULL),
    ('Lian Li Lancool 205, Mid-Tower, ATX', NULL, NULL, 'ATX', NULL, NULL, NULL),
    ('Cooler Master Elite 302, Mini Tower, M-ATX', NULL, NULL, 'M-ATX', NULL, NULL, NULL),
    ('Thermaltake CTE E660 MX, Mid-Tower, E-ATX', NULL, NULL, 'E-ATX', NULL, NULL, NULL),
    ('MSI Gungnir 211R Airflow PZ, Mid-Tower, ATX', NULL, NULL, 'ATX', NULL, NULL, NULL),
    ('Deepcool GamerStorm PN1000D, 1000W, 80 Plus Gold', NULL, NULL, NULL, NULL, 1000, NULL),
    ('MSI MAG A650BNL White, 650W, 80 Plus Bronze', NULL, NULL, NULL, NULL, 650, NULL),
    ('Thermalright TR-TB550S, 550W, 80 Plus Bronze', NULL, NULL, NULL, NULL, 550, NULL),
    ('Cooler Master MWE Gold 750 V3, 750W, 80 Plus Gold', NULL, NULL, NULL, NULL, 750, NULL),
    ('MSI Pro A850PL, 850W, 80 Plus Platinum', NULL, NULL, NULL, NULL, 850, NULL),
    ('Corsair HX1000i Shift, 1000W, 80 Plus Platinum', NULL, NULL, NULL, NULL, 1000, NULL),
    ('Cougar Atlas 750, 750W, 80 Plus Bronze', NULL, NULL, NULL, NULL, 750, NULL),
    ('Corsair RM850x, 850W, Cybenetics Gold', NULL, NULL, NULL, NULL, 850, NULL),
    ('Thermaltake TR2 S, 650W, 80 Plus White', NULL, NULL, NULL, NULL, 650, NULL),
    ('Lian Li EG0850G, 850W, 80 Plus Gold', NULL, NULL, NULL, NULL, 850, NULL),
    ('Redragon Charge, 750W, 80 Plus Bronze', NULL, NULL, NULL, NULL, 750, NULL),
    ('ASRock Taichi, 1300W, 80 Plus Titanium', NULL, NULL, NULL, NULL, 1300, NULL)
) AS v(nome, soquete, memoria, formato, consumo_w, potencia_w, video_integrado)
JOIN produto p ON p.nome = v.nome
ON CONFLICT (produto_id) DO UPDATE
SET soquete = EXCLUDED.soquete, memoria = EXCLUDED.memoria, formato = EXCLUDED.formato,
    consumo_w = EXCLUDED.consumo_w, potencia_w = EXCLUDED.potencia_w,
    video_integrado = EXCLUDED.video_integrado;

INSERT INTO cooler_soquete (produto_id, soquete)
SELECT p.id, v.soquete
FROM (VALUES
    ('Thermaltake Astria 400, Air Cooler 120mm', 'AM4'),
    ('Thermaltake Astria 400, Air Cooler 120mm', 'AM5'),
    ('Thermaltake Astria 400, Air Cooler 120mm', 'LGA1700'),
    ('Thermaltake Astria 400, Air Cooler 120mm', 'LGA1851'),
    ('Cooler Master Hyper 212 Spectrum V3, Air Cooler 120mm', 'AM4'),
    ('Cooler Master Hyper 212 Spectrum V3, Air Cooler 120mm', 'AM5'),
    ('Cooler Master Hyper 212 Spectrum V3, Air Cooler 120mm', 'LGA1700'),
    ('Cooler Master Hyper 212 Spectrum V3, Air Cooler 120mm', 'LGA1851'),
    ('Thermaltake Toughliquid 360 EX Pro, Water Cooler 360mm', 'AM4'),
    ('Thermaltake Toughliquid 360 EX Pro, Water Cooler 360mm', 'AM5'),
    ('Thermaltake Toughliquid 360 EX Pro, Water Cooler 360mm', 'LGA1700'),
    ('Thermaltake Toughliquid 360 EX Pro, Water Cooler 360mm', 'LGA1851'),
    ('Noctua NH-L9a-AM4 chromax, Air Cooler 92mm', 'AM4'),
    ('Arctic Liquid Freezer III Pro 360, Water Cooler 360mm', 'AM4'),
    ('Arctic Liquid Freezer III Pro 360, Water Cooler 360mm', 'AM5'),
    ('Arctic Liquid Freezer III Pro 360, Water Cooler 360mm', 'LGA1700'),
    ('Arctic Liquid Freezer III Pro 360, Water Cooler 360mm', 'LGA1851'),
    ('Arctic Freezer 36, Air Cooler 120mm', 'AM4'),
    ('Arctic Freezer 36, Air Cooler 120mm', 'AM5'),
    ('Arctic Freezer 36, Air Cooler 120mm', 'LGA1700'),
    ('Arctic Freezer 36, Air Cooler 120mm', 'LGA1851'),
    ('Thermalright Core Matrix Vision 240, Water Cooler 240mm', 'AM4'),
    ('Thermalright Core Matrix Vision 240, Water Cooler 240mm', 'AM5'),
    ('Thermalright Core Matrix Vision 240, Water Cooler 240mm', 'LGA1700'),
    ('Thermalright Core Matrix Vision 240, Water Cooler 240mm', 'LGA1851'),
    ('Cooler Master MasterLiquid 360L Core, Water Cooler 360mm', 'AM4'),
    ('Cooler Master MasterLiquid 360L Core, Water Cooler 360mm', 'AM5'),
    ('Cooler Master MasterLiquid 360L Core, Water Cooler 360mm', 'LGA1700'),
    ('Cooler Master MasterLiquid 360L Core, Water Cooler 360mm', 'LGA1851'),
    ('Thermaltake Astria 600, Air Cooler 2x120mm', 'AM4'),
    ('Thermaltake Astria 600, Air Cooler 2x120mm', 'AM5'),
    ('Thermaltake Astria 600, Air Cooler 2x120mm', 'LGA1700'),
    ('Thermaltake Astria 600, Air Cooler 2x120mm', 'LGA1851'),
    ('Cooler Master 240 Elite, Water Cooler 240mm', 'AM4'),
    ('Cooler Master 240 Elite, Water Cooler 240mm', 'AM5'),
    ('Cooler Master 240 Elite, Water Cooler 240mm', 'LGA1700'),
    ('Cooler Master 240 Elite, Water Cooler 240mm', 'LGA1851'),
    ('Cooler Master Hyper 212 3DHP, Air Cooler 120mm', 'AM4'),
    ('Cooler Master Hyper 212 3DHP, Air Cooler 120mm', 'AM5'),
    ('Cooler Master Hyper 212 3DHP, Air Cooler 120mm', 'LGA1700'),
    ('Cooler Master Hyper 212 3DHP, Air Cooler 120mm', 'LGA1851'),
    ('Redragon X Gamerstorm LE360 RD, Water Cooler 360mm', 'AM4'),
    ('Redragon X Gamerstorm LE360 RD, Water Cooler 360mm', 'AM5'),
    ('Redragon X Gamerstorm LE360 RD, Water Cooler 360mm', 'LGA1700'),
    ('Redragon X Gamerstorm LE360 RD, Water Cooler 360mm', 'LGA1851')
) AS v(nome, soquete)
JOIN produto p ON p.nome = v.nome
ON CONFLICT DO NOTHING;

-- ---------- 5. View do catálogo com os dados técnicos ----------
-- DROP + CREATE porque a view ganha colunas no meio.
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
        WHERE cs.produto_id = p.id) AS soquetes_cooler
FROM produto p
JOIN      categoria c       ON c.id = p.categoria_id
LEFT JOIN modelo_3d m       ON m.id = COALESCE(p.modelo_3d_id, c.modelo_3d_id)
LEFT JOIN produto_tecnico t ON t.produto_id = p.id;

-- Supabase: a view respeita as permissões de quem consulta
ALTER VIEW vw_produto_catalogo SET (security_invoker = true);
