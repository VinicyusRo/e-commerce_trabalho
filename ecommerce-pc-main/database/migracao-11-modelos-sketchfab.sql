-- =====================================================
-- MIGRAÇÃO 11: modelos do Sketchfab nas páginas de produto
--
-- Placas de vídeo, processadores e gabinetes passam a mostrar um
-- modelo baixado do Sketchfab (.glb, licença CC BY) no lugar do
-- modelo genérico gerado por código.
--
-- - Só muda o modelo padrão da CATEGORIA. Os produtos com modelo fiel
--   (RX 7600 Challenger, Ryzen 5 5500, Wideload Lite) continuam com o
--   deles: o frontend dá preferência ao modelo fiel (viewer/modelo-produto.js).
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
    ('Gabinete (Sketchfab)', 'modelos/gabinete.glb', 'glb',
     '"Gaming PC Case" (https://sketchfab.com/3d-models/gaming-pc-case-5f9261fef2874bf9ae39dd0f4029e978) by dylanheyes is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).')
ON CONFLICT (formato, arquivo) DO UPDATE SET nome = EXCLUDED.nome, creditos = EXCLUDED.creditos;

-- 2. Cada categoria passa a apontar para o modelo baixado
UPDATE categoria c
SET modelo_3d_id = m.id
FROM (VALUES
    ('Placas de vídeo', 'modelos/placa-de-video.glb'),
    ('Processadores',   'modelos/processador.glb'),
    ('Gabinetes',       'modelos/gabinete.glb')
) AS v(categoria, arquivo)
JOIN modelo_3d m ON m.formato = 'glb' AND m.arquivo = v.arquivo
WHERE c.nome = v.categoria;

-- Para voltar ao modelo gerado por código numa categoria:
-- UPDATE categoria SET modelo_3d_id = (SELECT id FROM modelo_3d WHERE formato = 'procedural' AND arquivo = 'gpu')
-- WHERE nome = 'Placas de vídeo';
