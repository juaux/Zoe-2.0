-- ============================================================
--  FIX: search_path das funções precisa incluir "extensions"
--  (é onde o Supabase instala o pgcrypto por padrão)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER FUNCTION verificar_login(TEXT, TEXT)
  SET search_path = public, extensions;

ALTER FUNCTION criar_usuario(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER)
  SET search_path = public, extensions;

ALTER FUNCTION atualizar_usuario(INTEGER, BOOLEAN, TEXT)
  SET search_path = public, extensions;

-- Garante que o admin tem um hash válido gerado com o crypt correto
UPDATE usuarios
SET senha_hash = extensions.crypt('admin123', extensions.gen_salt('bf', 10))
WHERE email = 'admin@zoe.com';
