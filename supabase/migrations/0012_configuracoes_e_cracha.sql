-- ============================================================
--  TABELAS FALTANTES + REMOÇÃO FINAL DE SERVICE_ROLE — Zoe
-- ============================================================

-- ─── CONFIGURAÇÕES (usada por hooks/useCamposConfig.ts) ───
CREATE TABLE IF NOT EXISTS configuracoes (
  id             SERIAL PRIMARY KEY,
  chave          VARCHAR(100) UNIQUE NOT NULL,
  valor          JSONB NOT NULL,
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "configuracoes_select_all" ON configuracoes;
CREATE POLICY "configuracoes_select_all" ON configuracoes FOR SELECT USING (true);

DROP POLICY IF EXISTS "configuracoes_upsert_all" ON configuracoes;
CREATE POLICY "configuracoes_upsert_all" ON configuracoes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "configuracoes_update_all" ON configuracoes;
CREATE POLICY "configuracoes_update_all" ON configuracoes FOR UPDATE USING (true);

-- ─── SOLICITAÇÕES DE 2ª VIA DE CRACHÁ (usada por pages/api/cracha-solicitacoes.ts) ───
CREATE TABLE IF NOT EXISTS cracha_solicitacoes (
  id            SERIAL PRIMARY KEY,
  aluno_id      INTEGER REFERENCES "Alunos"(id) ON DELETE CASCADE,
  aluno_nome    VARCHAR(255),
  motivo        TEXT,
  status        VARCHAR(20) NOT NULL DEFAULT 'pendente',
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolvido_em  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cracha_sol_aluno  ON cracha_solicitacoes (aluno_id);
CREATE INDEX IF NOT EXISTS idx_cracha_sol_status ON cracha_solicitacoes (status);

ALTER TABLE cracha_solicitacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cracha_sol_select_all" ON cracha_solicitacoes;
CREATE POLICY "cracha_sol_select_all" ON cracha_solicitacoes FOR SELECT USING (true);

DROP POLICY IF EXISTS "cracha_sol_insert_all" ON cracha_solicitacoes;
CREATE POLICY "cracha_sol_insert_all" ON cracha_solicitacoes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "cracha_sol_update_all" ON cracha_solicitacoes;
CREATE POLICY "cracha_sol_update_all" ON cracha_solicitacoes FOR UPDATE USING (true);
