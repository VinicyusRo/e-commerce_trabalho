-- =====================================================
-- MIGRAÇÃO 09: produtos em destaque
--
-- Coluna "destaque" em produto: os produtos marcados aparecem primeiro
-- no catálogo e nas listas do "Monte seu PC"; depois vêm os que têm foto. Aqui ficam em destaque
-- os 13 produtos que têm modelo 3D feito a partir das fotos.
-- Para destacar outro produto depois, basta:
--   UPDATE produto SET destaque = TRUE WHERE nome = '...';
--
-- Rode depois da migração 08 e ANTES de publicar o backend novo
-- (ele já pede a coluna destaque). Pode rodar mais de uma vez.
-- =====================================================

ALTER TABLE produto ADD COLUMN IF NOT EXISTS destaque BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE produto SET destaque = TRUE
WHERE nome IN (
    'ASRock Radeon RX 7600 Challenger, 8GB, GDDR6',
    'MSI B650 Gaming Plus WiFi, AM5, DDR5',
    'AMD Ryzen 5 5500, 6 núcleos, AM4',
    'SSD Husky ThunderBoost, 512GB, M.2 NVMe',
    'Rise Mode Temp 8 Black ARGB, Air Cooler 120mm',
    'Rise Mode Z 16GB (1x16GB), DDR4, 3200MHz, Branca',
    'Redragon Wideload Lite, Mid-Tower, ATX',
    'LG UltraFine 32UR500, 31,5", 4K UHD, 60Hz',
    'Redragon Kumara K552RGB-1, TKL, Mecânico, ABNT2',
    'Redragon Cobra M711, 12400 DPI, Chroma RGB',
    'HyperX Cloud Stinger 2, Headset, P3',
    '8BitDo Ultimate 2C, Verde, Sem fio',
    'Webshop Stillus, Preto e Vermelho, Apoio para os pés'
);

-- As fotos destes produtos vieram da KaBuM: ficam numa pasta própria
-- (imagens/kabum), para o site mostrar a fonte certa embaixo da foto
UPDATE produto SET imagem = replace(imagem, 'imagens/produtos/', 'imagens/kabum/')
WHERE destaque AND imagem LIKE 'imagens/produtos/%' AND nome <> 'AMD Ryzen 5 5500, 6 núcleos, AM4';

-- Fotos antigas do seed ("imagens/rtx3090.jpg"...) nunca existiram na
-- pasta public: sem isso o produto contaria como "tem foto" na ordem
UPDATE produto SET imagem = NULL
WHERE imagem LIKE 'imagens/%'
  AND imagem NOT LIKE 'imagens/kabum/%'
  AND imagem NOT LIKE 'imagens/produtos/%';

-- ---------- View do catálogo, agora com o destaque ----------
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
       p.especificacoes,
       p.destaque
FROM produto p
JOIN      categoria c       ON c.id = p.categoria_id
LEFT JOIN modelo_3d m       ON m.id = COALESCE(p.modelo_3d_id, c.modelo_3d_id)
LEFT JOIN produto_tecnico t ON t.produto_id = p.id;

-- Supabase: a view respeita as permissões de quem consulta
ALTER VIEW vw_produto_catalogo SET (security_invoker = true);
