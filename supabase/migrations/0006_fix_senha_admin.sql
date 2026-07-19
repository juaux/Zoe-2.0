-- ============================================================
-- Corrigir senha do admin — rode no SQL Editor do Supabase
-- ============================================================

-- Atualizar hash da senha do admin (senha: admin123)
UPDATE usuarios
SET senha_hash = '$2b$10$rOzPqYnlNnWuVKoRgvKhW.oBJdFpxHR6/Xv8zxIzPRfK3lUxQj3S2'
WHERE email = 'admin@zoe.com';

-- Se não existir, cria:
INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo)
VALUES (
  'Administrador',
  'admin@zoe.com',
  '$2b$10$rOzPqYnlNnWuVKoRgvKhW.oBJdFpxHR6/Xv8zxIzPRfK3lUxQj3S2',
  'admin',
  true
)
ON CONFLICT (email) DO UPDATE
  SET senha_hash = EXCLUDED.senha_hash,
      perfil = 'admin',
      ativo = true;

-- Verificar se criou certo:
SELECT id, nome, email, perfil, ativo FROM usuarios;
