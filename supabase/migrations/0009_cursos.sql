-- ============================================================
--  CURSOS — Zoe
--  Cria a tabela Cursos (usada por pages/cursos.tsx) e remove
--  a tabela "cursos" (minúscula) duplicada e sem RLS que ficou
--  no banco de experimentos anteriores.
-- ============================================================

-- Remove a tabela duplicada/insegura, se existir (não é usada por nenhuma página)
DROP TABLE IF EXISTS cursos;

CREATE TABLE IF NOT EXISTS "Cursos" (
  id                SERIAL PRIMARY KEY,
  curso             VARCHAR(255) UNIQUE NOT NULL,
  descricao         TEXT,
  periodo           VARCHAR(100),
  ativo             BOOLEAN NOT NULL DEFAULT true,
  imagem            TEXT,
  data_criacao      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_atualizacao  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cursos_curso ON "Cursos" (curso);

ALTER TABLE "Cursos" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cursos_select_all" ON "Cursos";
CREATE POLICY "cursos_select_all"
  ON "Cursos" FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "cursos_insert_auth" ON "Cursos";
CREATE POLICY "cursos_insert_auth"
  ON "Cursos" FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "cursos_update_auth" ON "Cursos";
CREATE POLICY "cursos_update_auth"
  ON "Cursos" FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "cursos_delete_auth" ON "Cursos";
CREATE POLICY "cursos_delete_auth"
  ON "Cursos" FOR DELETE
  USING (true);

-- Trigger para manter data_atualizacao em dia
CREATE OR REPLACE FUNCTION set_cursos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data_atualizacao = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cursos_updated_at ON "Cursos";
CREATE OR REPLACE TRIGGER trg_cursos_updated_at
  BEFORE UPDATE ON "Cursos"
  FOR EACH ROW EXECUTE FUNCTION set_cursos_updated_at();

-- Bucket de imagens dos cursos (crie manualmente se este bloco não rodar):
-- Dashboard > Storage > New Bucket > nome: cursos-imagens, público: true
