-- =====================================================
-- Rodar SÓ no Supabase, depois do schema.sql e do seed.sql
-- =====================================================
-- O Supabase cria automaticamente uma API pública para as tabelas
-- do schema "public". Ativar o RLS (Row Level Security) sem criar
-- nenhuma regra bloqueia esse acesso público: ninguém de fora
-- consegue ler, por exemplo, a tabela de usuários.
--
-- O nosso backend continua funcionando normalmente, porque ele
-- conecta como o dono das tabelas (usuário postgres), que não é
-- afetado pelo RLS.

ALTER TABLE modelo_3d   ENABLE ROW LEVEL SECURITY;
ALTER TABLE categoria   ENABLE ROW LEVEL SECURITY;
ALTER TABLE produto     ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario     ENABLE ROW LEVEL SECURITY;
ALTER TABLE endereco    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido      ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_pedido ENABLE ROW LEVEL SECURITY;

-- A view também passa a respeitar as permissões de quem consulta
-- (assim a API pública não a usa para contornar o RLS acima).
ALTER VIEW vw_produto_catalogo SET (security_invoker = true);
