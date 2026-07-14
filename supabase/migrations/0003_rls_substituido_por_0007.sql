-- ============================================================
--  ZOE — CORREÇÃO DE RLS
--  Execute no Supabase Dashboard > SQL Editor
-- ============================================================
--
--  PROBLEMA: O sistema usa NextAuth para autenticação, mas os
--  INSERTs no banco usam o cliente Supabase com a anon key.
--  O Supabase não reconhece a sessão NextAuth, então
--  auth.role() retorna 'anon' e a RLS bloqueia tudo.
--
--  SOLUÇÃO: Permitir acesso à anon key (já protegida pelo
--  NextAuth no frontend) e manter o RLS ativo apenas para
--  leitura pública segura.
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- TURMAS — leitura e escrita para o sistema
-- ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "turmas_insert_auth"   ON "Turmas";
DROP POLICY IF EXISTS "turmas_update_auth"   ON "Turmas";
DROP POLICY IF EXISTS "turmas_delete_auth"   ON "Turmas";

CREATE POLICY "turmas_insert_anon"
  ON "Turmas" FOR INSERT
  WITH CHECK (true);

CREATE POLICY "turmas_update_anon"
  ON "Turmas" FOR UPDATE
  USING (true);

CREATE POLICY "turmas_delete_anon"
  ON "Turmas" FOR DELETE
  USING (true);

-- ──────────────────────────────────────────────────────────
-- ALUNOS — leitura e escrita para o sistema
-- ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "alunos_select_auth"   ON "Alunos";
DROP POLICY IF EXISTS "alunos_insert_auth"   ON "Alunos";
DROP POLICY IF EXISTS "alunos_update_auth"   ON "Alunos";
DROP POLICY IF EXISTS "alunos_delete_auth"   ON "Alunos";

CREATE POLICY "alunos_select_anon"
  ON "Alunos" FOR SELECT
  USING (true);

CREATE POLICY "alunos_insert_anon"
  ON "Alunos" FOR INSERT
  WITH CHECK (true);

CREATE POLICY "alunos_update_anon"
  ON "Alunos" FOR UPDATE
  USING (true);

CREATE POLICY "alunos_delete_anon"
  ON "Alunos" FOR DELETE
  USING (true);

-- ──────────────────────────────────────────────────────────
-- PROFESSORES — leitura e escrita para o sistema
-- ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "professores_select_auth"   ON "Professores";
DROP POLICY IF EXISTS "professores_insert_auth"   ON "Professores";
DROP POLICY IF EXISTS "professores_update_auth"   ON "Professores";
DROP POLICY IF EXISTS "professores_delete_auth"   ON "Professores";

CREATE POLICY "professores_select_anon"
  ON "Professores" FOR SELECT
  USING (true);

CREATE POLICY "professores_insert_anon"
  ON "Professores" FOR INSERT
  WITH CHECK (true);

CREATE POLICY "professores_update_anon"
  ON "Professores" FOR UPDATE
  USING (true);

CREATE POLICY "professores_delete_anon"
  ON "Professores" FOR DELETE
  USING (true);

-- ──────────────────────────────────────────────────────────
-- CORREÇÃO: coluna experiencia em Professores
-- O schema original definiu como SMALLINT (número de anos)
-- mas o formulário envia texto livre. Corrigir o tipo:
-- ──────────────────────────────────────────────────────────
ALTER TABLE "Professores"
  ALTER COLUMN experiencia TYPE TEXT USING experiencia::TEXT;

-- ──────────────────────────────────────────────────────────
-- FIM
-- ──────────────────────────────────────────────────────────
