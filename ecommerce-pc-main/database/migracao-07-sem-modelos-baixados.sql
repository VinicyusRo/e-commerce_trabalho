-- =====================================================
-- MIGRAÇÃO 07: só modelos 3D gerados por código
--
-- As duas placas RTX usavam modelos baixados do Sketchfab (.glb).
-- Eles não entravam na animação do "Monte seu PC" e pesavam 22 MB,
-- então os produtos passam a usar o modelo paramétrico da categoria
-- (que já se ajusta a cada placa) e os registros .glb são apagados.
--
-- Pode rodar mais de uma vez.
-- =====================================================

-- 1. Os produtos deixam de apontar para os modelos baixados
--    (NULL = usa o modelo padrão da categoria, pela view)
UPDATE produto
SET modelo_3d_id = NULL
WHERE modelo_3d_id IN (SELECT id FROM modelo_3d WHERE formato IN ('glb', 'gltf'));

-- 2. Apaga os modelos baixados
DELETE FROM modelo_3d WHERE formato IN ('glb', 'gltf');
