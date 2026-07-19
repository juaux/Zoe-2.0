-- ============================================================
--  LOGIN SEM SERVICE_ROLE KEY — Zoe
--  Verifica email+senha inteiramente dentro do Postgres,
--  usando uma função SECURITY DEFINER. Assim o login funciona
--  só com a chave anon (NEXT_PUBLIC_SUPABASE_KEY), sem precisar
--  da service_role/legacy key.
-- ============================================================

-- Extensão necessária para comparar hash bcrypt dentro do SQL
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Função de verificação de login.
-- SECURITY DEFINER = roda com privilégio elevado internamente,
-- mas só retorna os campos abaixo (nunca o senha_hash).
CREATE OR REPLACE FUNCTION verificar_login(p_email TEXT, p_senha TEXT)
RETURNS TABLE (
  id            INTEGER,
  nome          VARCHAR,
  email         VARCHAR,
  perfil        VARCHAR,
  aluno_id      INTEGER,
  professor_id  INTEGER,
  ativo         BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.nome, u.email, u.perfil, u.aluno_id, u.professor_id, u.ativo
  FROM usuarios u
  WHERE u.email = lower(trim(p_email))
    AND u.ativo = true
    AND u.senha_hash = crypt(p_senha, u.senha_hash);
END;
$$;

-- Permite que a chave anon (pública) chame essa função.
-- Ela não acessa a tabela usuarios diretamente, só via essa função,
-- que nunca expõe o senha_hash.
GRANT EXECUTE ON FUNCTION verificar_login(TEXT, TEXT) TO anon, authenticated;

-- Garante que ninguém consiga ler a tabela usuarios direto pela API
-- (removendo qualquer policy antiga de select público, se existir)
DROP POLICY IF EXISTS "usuarios_select_public" ON usuarios;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- ── Recria o admin padrão com hash gerado pelo próprio Postgres ──
-- (garante 100% de compatibilidade com crypt() usado em verificar_login)
INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo)
VALUES (
  'Administrador',
  'admin@zoe.com',
  crypt('admin123', gen_salt('bf', 10)),
  'admin',
  true
)
ON CONFLICT (email) DO UPDATE
  SET senha_hash = crypt('admin123', gen_salt('bf', 10)),
      ativo = true;
