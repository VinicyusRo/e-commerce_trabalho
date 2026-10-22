-- =====================================================
-- MIGRAÇÃO 12: modelos do Sketchfab de produtos específicos
--
-- Cinco produtos têm no Sketchfab um modelo do próprio produto
-- (licença CC BY). Eles passam a usar esse modelo no lugar do modelo
-- da categoria, e a página mostra o selo "3D do produto".
--
-- - O crédito aparece embaixo da descrição (coluna "creditos").
-- - O DualSense do modelo é branco; o produto da loja é o Cosmic Red.
--
-- Rode depois da migração 11. Pode rodar mais de uma vez.
-- =====================================================

-- 1. Os modelos baixados (UNIQUE (formato, arquivo) evita duplicar)
INSERT INTO modelo_3d (nome, arquivo, formato, creditos)
VALUES
    ('Samsung 990 Pro (Sketchfab)', 'modelos/samsung-990-pro.glb', 'glb',
     '"Samsung 990 PRO SSD" (https://sketchfab.com/3d-models/samsung-990-pro-ssd-6ada64c9ba734e499978a084e68ec3df) by PolyDavid is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).'),
    ('Logitech MX Master 3S (Sketchfab)', 'modelos/logitech-mx-master-3s.glb', 'glb',
     '"Logitech MX Master 3S by Scaniverse" (https://sketchfab.com/3d-models/logitech-mx-master-3s-by-scaniverse-be1d82499209475c8cd1d009df9aaa00) by Zhirayr (@zhirayrsfabcloud) is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).'),
    ('DualSense (Sketchfab)', 'modelos/dualsense.glb', 'glb',
     '"Playstation 5 Dualsense" (https://sketchfab.com/3d-models/playstation-5-dualsense-878c1f882808477ab81c2fe86d5a3936) by AHarmlessPotato is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).'),
    ('Ryzen 5 7600 (Sketchfab)', 'modelos/ryzen-5-7600.glb', 'glb',
     '"AMD Ryzen 5 7600 CPU chip (AM5 socket)" (https://sketchfab.com/3d-models/amd-ryzen-5-7600-cpu-chip-am5-socket-a05c2732e0b847c2967e2c9282abd5f9) by arsdever is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).'),
    ('Core i5-12400F (Sketchfab)', 'modelos/core-i5-12400f.glb', 'glb',
     '"Intel Core i5-12400F" (https://sketchfab.com/3d-models/intel-core-i5-12400f-ad8a458fa799483b92d119018f6505f1) by Alex (@alex.ars.460) is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).')
ON CONFLICT (formato, arquivo) DO UPDATE SET nome = EXCLUDED.nome, creditos = EXCLUDED.creditos;

-- 2. Cada produto passa a apontar para o seu modelo
UPDATE produto p
SET modelo_3d_id = m.id
FROM (VALUES
    ('SSD Samsung 990 Pro%',          'modelos/samsung-990-pro.glb'),
    ('Logitech MX Master 3S%',        'modelos/logitech-mx-master-3s.glb'),
    ('DualSense Sony PS5%',           'modelos/dualsense.glb'),
    ('AMD Ryzen 5 7600,%',            'modelos/ryzen-5-7600.glb'),
    ('Intel Core i5-12400F%',         'modelos/core-i5-12400f.glb')
) AS v(padrao, arquivo)
JOIN modelo_3d m ON m.formato = 'glb' AND m.arquivo = v.arquivo
WHERE p.nome LIKE v.padrao;

-- Para voltar ao modelo da categoria num produto:
-- UPDATE produto SET modelo_3d_id = NULL WHERE nome LIKE 'Intel Core i5-12400F%';
