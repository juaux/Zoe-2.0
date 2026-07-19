-- ============================================================
--  GESTÃO DE USUÁRIOS SEM SERVICE_ROLE KEY — Zoe
--  Funções SECURITY DEFINER chamáveis com a chave anon.
--  A proteção de "só admin pode chamar" já é feita nas rotas
--  /api/auth/criar-usuario e /api/auth/listar-usuarios via
--  getServerSession antes de chamar essas funções.
-- ============================================================

-- Criar usuário (senha já entra em texto puro, hash feito aqui dentro)
CREATE OR REPLACE FUNCTION criar_usuario(
  p_nome TEXT, p_email TEXT, p_senha TEXT, p_perfil TEXT,
  p_aluno_id INTEGER DEFAULT NULL, p_professor_id INTEGER DEFAULT NULL
)
RETURNS TABLE (id INTEGER, nome VARCHAR, email VARCHAR, perfil VARCHAR, ativo BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM usuarios u WHERE u.email = lower(trim(p_email))) THEN
    RAISE EXCEPTION 'Este email já está em uso';
  END IF;

  RETURN QUERY
  INSERT INTO usuarios (nome, email, senha_hash, perfil, aluno_id, professor_id, ativo)
  VALUES (p_nome, lower(trim(p_email)), crypt(p_senha, gen_salt('bf', 10)), p_perfil, p_aluno_id, p_professor_id, true)
  RETURNING usuarios.id, usuarios.nome, usuarios.email, usuarios.perfil, usuarios.ativo;
END;
$$;

-- Listar usuários (nunca retorna senha_hash)
CREATE OR REPLACE FUNCTION listar_usuarios()
RETURNS TABLE (
  id INTEGER, nome VARCHAR, email VARCHAR, perfil VARCHAR, ativo BOOLEAN,
  aluno_id INTEGER, professor_id INTEGER, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.nome, u.email, u.perfil, u.ativo, u.aluno_id, u.professor_id, u.created_at
  FROM usuarios u ORDER BY u.id DESC;
END;
$$;

-- Atualizar status/senha de um usuário
CREATE OR REPLACE FUNCTION atualizar_usuario(
  p_id INTEGER, p_ativo BOOLEAN DEFAULT NULL, p_senha TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE usuarios SET
    ativo = COALESCE(p_ativo, ativo),
    senha_hash = CASE WHEN p_senha IS NOT NULL AND p_senha <> '' THEN crypt(p_senha, gen_salt('bf', 10)) ELSE senha_hash END
  WHERE id = p_id;
END;
$$;

-- Remover usuário
CREATE OR REPLACE FUNCTION deletar_usuario(p_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  DELETE FROM usuarios WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION criar_usuario(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION listar_usuarios() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION atualizar_usuario(INTEGER, BOOLEAN, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION deletar_usuario(INTEGER) TO anon, authenticated;
