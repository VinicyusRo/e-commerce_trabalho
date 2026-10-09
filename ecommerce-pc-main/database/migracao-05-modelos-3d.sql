-- =====================================================
-- MIGRAÇÃO 05: modelos 3D para todas as categorias
--
-- Cria os modelos procedurais (gerados por código no frontend) das
-- categorias que ainda não tinham 3D e liga cada um à sua categoria.
-- O gerador usa o nome e os dados técnicos do produto para deixar o
-- modelo parecido com ele (modelagem paramétrica: ver parametros.js).
--
-- Rode depois da migração 04. Pode rodar mais de uma vez.
-- =====================================================

INSERT INTO modelo_3d (nome, arquivo, formato)
VALUES
    ('Placa-mãe genérica', 'mae',       'procedural'),
    ('Gabinete genérico',  'gabinete',  'procedural'),
    ('Fonte genérica',     'fonte',     'procedural'),
    ('Cooler genérico',    'cooler',    'procedural'),
    ('Ventoinha genérica', 'ventoinha', 'procedural')
ON CONFLICT (formato, arquivo) DO NOTHING;     -- UNIQUE (formato, arquivo)

-- Modelo padrão de cada categoria (UPDATE com subconsulta)
UPDATE categoria c
SET modelo_3d_id = m.id
FROM (VALUES
    ('Placas-mãe', 'mae'),
    ('Gabinetes',  'gabinete'),
    ('Fontes',     'fonte'),
    ('Coolers',    'cooler'),
    ('Ventoinhas', 'ventoinha')
) AS v(categoria, gerador)
JOIN modelo_3d m ON m.formato = 'procedural' AND m.arquivo = v.gerador
WHERE c.nome = v.categoria;

-- O modelo "SSD M.2 genérico" agora também desenha SSD SATA e HD
UPDATE modelo_3d SET nome = 'Armazenamento genérico (M.2, SATA ou HD)'
WHERE formato = 'procedural' AND arquivo = 'ssd';
