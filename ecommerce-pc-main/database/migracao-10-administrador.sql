-- =====================================================
-- MIGRAÇÃO 10: administrador
--
-- Coluna "admin" em usuario: só quem tem admin = TRUE consegue abrir o
-- painel (admin.html) e usar as rotas /api/admin do backend.
-- Todo cadastro novo começa como cliente comum (FALSE).
--
-- Depois de rodar, transforme a SUA conta em administradora trocando
-- o e-mail abaixo pelo que você usa para entrar no site:
--   UPDATE usuario SET admin = TRUE WHERE email = 'seu-email@exemplo.com';
--
-- Rode ANTES de publicar o backend novo (ele já pede a coluna admin).
-- Pode rodar mais de uma vez.
-- =====================================================

ALTER TABLE usuario ADD COLUMN IF NOT EXISTS admin BOOLEAN NOT NULL DEFAULT FALSE;
