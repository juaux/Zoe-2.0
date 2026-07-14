-- ============================================================
--  ZOE DASHBOARD — Schema Supabase
--  Gerado a partir dos formulários: Alunos e Professores
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 1. TURMAS
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Turmas" (
  id          SERIAL PRIMARY KEY,
  nome        VARCHAR(100) NOT NULL UNIQUE,
  descricao   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Dados iniciais conforme regra de idade do formulário de alunos
INSERT INTO "Turmas" (nome, descricao) VALUES
  ('Turma A', 'Alunos de 5 a 8 anos'),
  ('Turma B', 'Alunos de 9 a 12 anos'),
  ('Turma C', 'Alunos de 13 a 17 anos'),
  ('Turma D', 'Alunos a partir de 18 anos')
ON CONFLICT (nome) DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- 2. ALUNOS
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Alunos" (
  id                    SERIAL PRIMARY KEY,

  -- Identificação
  matricula             VARCHAR(20)  NOT NULL UNIQUE,   -- ex: DI123456
  "dataAtual"           DATE         NOT NULL DEFAULT CURRENT_DATE,

  -- Turma (texto salvo diretamente pelo form)
  turma                 VARCHAR(100) NOT NULL,
  turma_id              INTEGER REFERENCES "Turmas"(id) ON DELETE SET NULL,

  -- Dados pessoais
  "nomeCompleto"        VARCHAR(200) NOT NULL,
  "dataNascimento"      DATE         NOT NULL,
  idade                 SMALLINT,                       -- calculado no front, salvo para consultas rápidas
  sexo                  VARCHAR(20)  NOT NULL CHECK (sexo IN ('Masculino', 'Feminino')),

  -- Documentos
  rg                    VARCHAR(30)  NOT NULL,
  cpf                   VARCHAR(14)  NOT NULL UNIQUE,   -- formato: 000.000.000-00

  -- Endereço
  cep                   VARCHAR(10)  NOT NULL,
  endereco              VARCHAR(250),
  bairro                VARCHAR(100),
  cidade                VARCHAR(100),
  uf                    CHAR(2),

  -- Contato
  telefone              VARCHAR(20),
  email                 VARCHAR(150),

  -- Família / responsável
  "nomePai"             VARCHAR(200),
  "nomeMae"             VARCHAR(200),
  responsavel           VARCHAR(200),
  "telefoneResponsavel" VARCHAR(20),

  -- Foto
  "fotoUrl"             TEXT,                           -- URL pública do Supabase Storage

  -- Controle
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_alunos_turma       ON "Alunos"(turma);
CREATE INDEX IF NOT EXISTS idx_alunos_nome        ON "Alunos"("nomeCompleto");
CREATE INDEX IF NOT EXISTS idx_alunos_cpf         ON "Alunos"(cpf);

-- ──────────────────────────────────────────────────────────
-- 3. PROFESSORES
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Professores" (
  id              SERIAL PRIMARY KEY,

  -- Identificação
  matricula       VARCHAR(20)  NOT NULL UNIQUE,
  "dataAtual"     DATE         NOT NULL DEFAULT CURRENT_DATE,

  -- Turma vinculada
  turma           VARCHAR(100) NOT NULL,
  turma_id        INTEGER REFERENCES "Turmas"(id) ON DELETE SET NULL,

  -- Dados pessoais
  "nomeCompleto"  VARCHAR(200) NOT NULL,
  "dataNascimento" DATE        NOT NULL,
  idade           SMALLINT,
  sexo            VARCHAR(20)  NOT NULL CHECK (sexo IN ('Masculino', 'Feminino')),

  -- Documentos
  rg              VARCHAR(30)  NOT NULL,
  cpf             VARCHAR(14)  NOT NULL UNIQUE,

  -- Endereço
  cep             VARCHAR(10)  NOT NULL,
  endereco        VARCHAR(250),
  bairro          VARCHAR(100),
  cidade          VARCHAR(100),
  uf              CHAR(2),

  -- Contato
  telefone        VARCHAR(20),
  email           VARCHAR(150),

  -- Formação profissional
  especialidade   VARCHAR(150) NOT NULL,
  formacao        VARCHAR(150) NOT NULL,
  experiencia     SMALLINT,                             -- anos de experiência

  -- Foto
  "fotoUrl"       TEXT,

  -- Controle
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_professores_turma  ON "Professores"(turma);
CREATE INDEX IF NOT EXISTS idx_professores_nome   ON "Professores"("nomeCompleto");
CREATE INDEX IF NOT EXISTS idx_professores_cpf    ON "Professores"(cpf);

-- ──────────────────────────────────────────────────────────
-- 4. TRIGGER — atualiza updated_at automaticamente
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_alunos_updated_at
  BEFORE UPDATE ON "Alunos"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_professores_updated_at
  BEFORE UPDATE ON "Professores"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ──────────────────────────────────────────────────────────
-- 5. ROW LEVEL SECURITY (RLS)
-- ──────────────────────────────────────────────────────────
-- Habilita RLS em todas as tabelas
ALTER TABLE "Turmas"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Alunos"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Professores" ENABLE ROW LEVEL SECURITY;

-- Turmas: leitura pública (necessária para popular os selects)
CREATE POLICY "turmas_select_all"
  ON "Turmas" FOR SELECT
  USING (true);

-- Turmas: escrita apenas por usuários autenticados
CREATE POLICY "turmas_insert_auth"
  ON "Turmas" FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Alunos: autenticados podem inserir e ler
CREATE POLICY "alunos_select_auth"
  ON "Alunos" FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "alunos_insert_auth"
  ON "Alunos" FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "alunos_update_auth"
  ON "Alunos" FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Professores: autenticados podem inserir e ler
CREATE POLICY "professores_select_auth"
  ON "Professores" FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "professores_insert_auth"
  ON "Professores" FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "professores_update_auth"
  ON "Professores" FOR UPDATE
  USING (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────
-- 6. STORAGE BUCKETS  (execute via Supabase Dashboard ou API)
-- ──────────────────────────────────────────────────────────
-- Bucket para fotos de alunos (já referenciado no código):
--   Nome   : alunos-fotos
--   Público: true
--   Pasta  : fotos/<matricula>.<ext>
--
-- Bucket para fotos de professores:
--   Nome   : professores-fotos
--   Público: true
--   Pasta  : fotos/<matricula>.<ext>
--
-- Crie via Dashboard > Storage > New Bucket
-- ou via SQL abaixo (requer extensão storage):
--
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('alunos-fotos', 'alunos-fotos', true)
-- ON CONFLICT DO NOTHING;
--
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('professores-fotos', 'professores-fotos', true)
-- ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- FIM DO SCRIPT
-- ──────────────────────────────────────────────────────────
