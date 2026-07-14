-- ============================================================
-- SETUP COMPLETO — Zoe
-- Execute no SQL Editor do Supabase
-- ============================================================

-- ── 1. Criar tabela usuarios ──────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id            SERIAL PRIMARY KEY,
  nome          VARCHAR(200) NOT NULL,
  email         VARCHAR(200) NOT NULL UNIQUE,
  senha_hash    TEXT NOT NULL,
  perfil        VARCHAR(20)  NOT NULL DEFAULT 'admin'
                  CHECK (perfil IN ('admin', 'professor', 'aluno')),
  aluno_id      INTEGER REFERENCES "Alunos"(id) ON DELETE SET NULL,
  professor_id  INTEGER REFERENCES "Professores"(id) ON DELETE SET NULL,
  ativo         BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email       ON usuarios (email);
CREATE INDEX IF NOT EXISTS idx_usuarios_perfil      ON usuarios (perfil);
CREATE INDEX IF NOT EXISTS idx_usuarios_aluno_id    ON usuarios (aluno_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_professor   ON usuarios (professor_id);

-- ── 2. Criar admin padrão (senha: admin123) ───────────────────
-- Hash bcrypt de "admin123"
INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo)
VALUES (
  'Administrador',
  'admin@novostempos.comauthorize ',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
  'admin',
  true
)
ON CONFLICT (email) DO NOTHING;

-- ── 3. Corrigir constraint de sexo (se necessário) ───────────
-- Verifica se a constraint existe e atualiza para aceitar Masculino/Feminino
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Alunos_sexo_check'
    AND table_name = 'Alunos'
  ) THEN
    ALTER TABLE "Alunos" DROP CONSTRAINT "Alunos_sexo_check";
    ALTER TABLE "Alunos" ADD CONSTRAINT "Alunos_sexo_check"
      CHECK (sexo IN ('Masculino', 'Feminino', 'M', 'F', ''));
  END IF;
END $$;

-- ── 4. Garantir que chamadas existe ──────────────────────────
CREATE TABLE IF NOT EXISTS chamadas (
  id          SERIAL PRIMARY KEY,
  aluno_id    INTEGER NOT NULL REFERENCES "Alunos"(id) ON DELETE CASCADE,
  data        DATE    NOT NULL DEFAULT CURRENT_DATE,
  turma       VARCHAR(100) NOT NULL,
  presenca    VARCHAR(10)  NOT NULL CHECK (presenca IN ('presente', 'falta')),
  observacao  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (aluno_id, data, turma)
);

CREATE INDEX IF NOT EXISTS idx_chamadas_data   ON chamadas (data);
CREATE INDEX IF NOT EXISTS idx_chamadas_turma  ON chamadas (turma);
CREATE INDEX IF NOT EXISTS idx_chamadas_aluno  ON chamadas (aluno_id);

-- ── 5. Índices de performance nos Alunos ─────────────────────
CREATE INDEX IF NOT EXISTS idx_alunos_nomeCompleto ON "Alunos" ("nomeCompleto");
CREATE INDEX IF NOT EXISTS idx_alunos_turma        ON "Alunos" ("turma");
CREATE INDEX IF NOT EXISTS idx_alunos_matricula    ON "Alunos" ("matricula");

-- ── 6. Índices nos Professores ────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_professores_nome ON "Professores" ("nomeCompleto");

-- ============================================================
-- COMO CRIAR USUÁRIOS PARA PROFESSORES E ALUNOS:
-- ============================================================
-- 
-- Primeiro descubra o ID do aluno ou professor:
-- SELECT id, "nomeCompleto" FROM "Alunos" LIMIT 20;
-- SELECT id, "nomeCompleto" FROM "Professores" LIMIT 20;
--
-- Depois crie o usuário (senha padrão: novos123):
--
-- Para aluno/pai:
-- INSERT INTO usuarios (nome, email, senha_hash, perfil, aluno_id, ativo)
-- VALUES ('Nome do Pai', 'email@gmail.com',
--   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
--   'aluno', ID_DO_ALUNO_AQUI, true);
--
-- Para professor:
-- INSERT INTO usuarios (nome, email, senha_hash, perfil, professor_id, ativo)
-- VALUES ('Nome Professor', 'email@gmail.com',
--   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
--   'professor', ID_DO_PROFESSOR_AQUI, true);
--
-- SENHAS PADRÃO:
-- admin123  → $2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.
-- novos123  → (rode: node -e "require('bcryptjs').hash('novos123',10).then(console.log)")
-- ============================================================
