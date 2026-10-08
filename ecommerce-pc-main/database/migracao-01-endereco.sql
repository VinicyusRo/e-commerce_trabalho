-- =====================================================
-- MIGRAÇÃO 01: complemento, bairro e exclusão lógica de endereços
-- =====================================================
-- Rode ESTE arquivo no SQL Editor do Supabase (uma vez só).
-- Ele só ACRESCENTA colunas: não apaga nenhum dado.
-- (Não rode o schema.sql de novo no Supabase: ele apaga tudo.)

ALTER TABLE endereco ADD COLUMN IF NOT EXISTS complemento VARCHAR(60);
ALTER TABLE endereco ADD COLUMN IF NOT EXISTS bairro      VARCHAR(80);
ALTER TABLE endereco ADD COLUMN IF NOT EXISTS ativo       BOOLEAN NOT NULL DEFAULT TRUE;
