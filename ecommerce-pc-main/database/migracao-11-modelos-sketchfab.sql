-- =====================================================
-- MIGRAÇÃO 11: modelos do Sketchfab nas páginas de produto
--
-- As 15 categorias passam a mostrar um modelo baixado do Sketchfab
-- (.glb, licença CC BY) no lugar do modelo genérico gerado por código.
--
-- - Só muda o modelo padrão da CATEGORIA. Os produtos com modelo fiel
--   (os 13 destaques) continuam com o deles: o frontend dá preferência
--   ao modelo fiel (viewer/modelo-produto.js).
-- - O "Monte seu PC" não usa esta tabela: continua com os modelos
--   gerados por código, que encaixam no gabinete.
-- - Se o arquivo .glb não existir em frontend/public/modelos, a página
--   volta sozinha para o modelo gerado por código.
-- - A licença CC BY exige o crédito: a página do produto mostra a
--   coluna "creditos" embaixo da descrição.
--
-- Rode depois da migração 10. Pode rodar mais de uma vez.
-- =====================================================

-- 1. Os modelos baixados (UNIQUE (formato, arquivo) evita duplicar)
INSERT INTO modelo_3d (nome, arquivo, formato, creditos)
VALUES
    ('Placa de vídeo (Sketchfab)', 'modelos/placa-de-video.glb', 'glb',
     '"GeForce RTX 3080 Graphics Card" (https://sketchfab.com/3d-models/geforce-rtx-3080-graphics-card-8b947ee1bf7a4e3d8ffa1c24893ac160) by _surovic_ (@samuelsurovic) is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).'),
    ('Processador (Sketchfab)', 'modelos/processador.glb', 'glb',
     '"AMD Ryzen 5 5600X Processor" (https://sketchfab.com/3d-models/amd-ryzen-5-5600x-processor-1649601de2014dbeab4f201010a7c366) by PolyDavid is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).'),
    ('Memória RAM (Sketchfab)', 'modelos/memoria.glb', 'glb',
     '"Crucial BALLISTIX 8GB DDR4 3600 RAM | Black" (https://sketchfab.com/3d-models/crucial-ballistix-8gb-ddr4-3600-ram-black-1fce4935471e46cab6ee57ba140c87f9) by BlackCube (@blackcube4) is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).'),
    ('Armazenamento (Sketchfab)', 'modelos/armazenamento.glb', 'glb',
     '"Storage (SSD, HDD, M.2)" (https://sketchfab.com/3d-models/storage-ssd-hdd-m2-bdd5fd67a7674359ab8648204b5c0575) by Vivien Deroche (@blue-odym) is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).'),
    ('Placa-mãe (Sketchfab)', 'modelos/placa-mae.glb', 'glb',
     '"X570 Prime motherboard [HQ PBR]" (https://sketchfab.com/3d-models/x570-prime-motherboard-hq-pbr-25b3659935774b1e9d73d8954be065d8) by Igor.Jop is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).'),
    ('Gabinete (Sketchfab)', 'modelos/gabinete.glb', 'glb',
     '"Corsair 4000D PC case" (https://sketchfab.com/3d-models/corsair-4000d-pc-case-bc15e007d6634579bc0e8ffdf238e665) by SzaBa is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).'),
    ('Fonte (Sketchfab)', 'modelos/fonte.glb', 'glb',
     '"Power supply Aerocool KCAS 500W ATX" (https://sketchfab.com/3d-models/power-supply-aerocool-kcas-500w-atx-bfb1f77fffb0410f9ee0d0be6fb5fc88) by nofurion is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).'),
    ('Cooler (Sketchfab)', 'modelos/cooler.glb', 'glb',
     '"Cooler Master CPU Cooler" (https://sketchfab.com/3d-models/cooler-master-cpu-cooler-e54651982f524644a2144b52a6b36e89) by BlenderFace (@BlenderFace1) is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).'),
    ('Ventoinha (Sketchfab)', 'modelos/ventoinha.glb', 'glb',
     '"Corsair Fan" (https://sketchfab.com/3d-models/corsair-fan-27f023b65e814d1c946460fcc0cb8250) by umkhero is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).'),
    ('Monitor (Sketchfab)', 'modelos/monitor.glb', 'glb',
     '"Samsung Odyssey G3 144hz" (https://sketchfab.com/3d-models/samsung-odyssey-g3-144hz-c640947b16374bd8959564e32f497e0d) by abdullahpowerfull is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).'),
    ('Teclado (Sketchfab)', 'modelos/teclado.glb', 'glb',
     '"Logitech mechanical gaming keyboard" (https://sketchfab.com/3d-models/logitech-mechanical-gaming-keyboard-c775d45baf854606931584404d7b9109) by BlackCube (@blackcube4) is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).'),
    ('Mouse (Sketchfab)', 'modelos/mouse.glb', 'glb',
     '"Mouse Logitech G203" (https://sketchfab.com/3d-models/mouse-logitech-g203-6b70ace291c44735bed3309b05f44bba) by JorgeAlfredOwO is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).'),
    ('Headset (Sketchfab)', 'modelos/headset.glb', 'glb',
     '"Wireless Gaming Headset" (https://sketchfab.com/3d-models/wireless-gaming-headset-3075896c0ab84e23a6f085c300c33805) by DatSketch is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).'),
    ('Controle (Sketchfab)', 'modelos/controle.glb', 'glb',
     '"Xbox Inalambric Controller (Black)" (https://sketchfab.com/3d-models/xbox-inalambric-controller-black-29cc9624894a4f2cae7d2a675044db45) by Chistodrako._. (@oscar.lopez.riviello) is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).'),
    ('Cadeira (Sketchfab)', 'modelos/cadeira.glb', 'glb',
     '"Gaming Chair [FREE DOWNLOAD]" (https://sketchfab.com/3d-models/gaming-chair-free-download-bcb13eb7ef9e4c3c9499aacff6c79757) by Karlos (@Karldashian) is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).')
ON CONFLICT (formato, arquivo) DO UPDATE SET nome = EXCLUDED.nome, creditos = EXCLUDED.creditos;

-- 2. Cada categoria passa a apontar para o modelo baixado
UPDATE categoria c
SET modelo_3d_id = m.id
FROM (VALUES
    ('Placas de vídeo',  'modelos/placa-de-video.glb'),
    ('Processadores',    'modelos/processador.glb'),
    ('Memórias RAM',     'modelos/memoria.glb'),
    ('Armazenamento',    'modelos/armazenamento.glb'),
    ('Placas-mãe',       'modelos/placa-mae.glb'),
    ('Gabinetes',        'modelos/gabinete.glb'),
    ('Fontes',           'modelos/fonte.glb'),
    ('Coolers',          'modelos/cooler.glb'),
    ('Ventoinhas',       'modelos/ventoinha.glb'),
    ('Monitores',        'modelos/monitor.glb'),
    ('Teclados',         'modelos/teclado.glb'),
    ('Mouses',           'modelos/mouse.glb'),
    ('Headsets e fones', 'modelos/headset.glb'),
    ('Controles',        'modelos/controle.glb'),
    ('Cadeiras',         'modelos/cadeira.glb')
) AS v(categoria, arquivo)
JOIN modelo_3d m ON m.formato = 'glb' AND m.arquivo = v.arquivo
WHERE c.nome = v.categoria;

-- Para voltar ao modelo gerado por código numa categoria:
-- UPDATE categoria SET modelo_3d_id = (SELECT id FROM modelo_3d WHERE formato = 'procedural' AND arquivo = 'gpu')
-- WHERE nome = 'Placas de vídeo';
