-- ============================================================
--  ZOE — CORREÇÃO DE RLS (substitui 0003)
--  Execute no Supabase Dashboard > SQL Editor
-- ============================================================
--
--  PROBLEMA ANTERIOR: policies "anon" com USING(true) permitiam
--  que QUALQUER pessoa com a URL do Supabase deletasse dados,
--  mesmo sem autenticação NextAuth.
--
--  SOLUÇÃO: todas as writes vêm das APIs com a service_role key,
--  que bypassa RLS por design — não precisam de policy de escrita.
--  O SELECT público é necessário para o frontend (anon key) ler dados.
--
--  RESULTADO: leitura ok pelo frontend, escritas só pelas APIs server-side.
-- ============================================================

-- ─── TURMAS ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "turmas_insert_anon"  ON "Turmas";
DROP POLICY IF EXISTS "turmas_update_anon"  ON "Turmas";
DROP POLICY IF EXISTS "turmas_delete_anon"  ON "Turmas";
-- SELECT público mantido (leitura no frontend)
DROP POLICY IF EXISTS "turmas_select_anon"  ON "Turmas";
CREATE POLICY "turmas_select_anon"
  ON "Turmas" FOR SELECT USING (true);

-- ─── ALUNOS ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "alunos_insert_anon"  ON "Alunos";
DROP POLICY IF EXISTS "alunos_update_anon"  ON "Alunos";
DROP POLICY IF EXISTS "alunos_delete_anon"  ON "Alunos";
DROP POLICY IF EXISTS "alunos_select_anon"  ON "Alunos";
CREATE POLICY "alunos_select_anon"
  ON "Alunos" FOR SELECT USING (true);

-- ─── PROFESSORES ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "professores_insert_anon"  ON "Professores";
DROP POLICY IF EXISTS "professores_update_anon"  ON "Professores";
DROP POLICY IF EXISTS "professores_delete_anon"  ON "Professores";
DROP POLICY IF EXISTS "professores_select_anon"  ON "Professores";
CREATE POLICY "professores_select_anon"
  ON "Professores" FOR SELECT USING (true);

-- ─── USUÁRIOS — somente service_role escreve ─────────────────────────────────
-- (service_role bypassa RLS automaticamente — não precisa de policy)
-- SELECT bloqueado para anon (senha_hash não deve vazar)
DROP POLICY IF EXISTS "usuarios_select_anon"     ON "usuarios";
DROP POLICY IF EXISTS "usuarios_insert_anon"     ON "usuarios";
DROP POLICY IF EXISTS "usuarios_update_anon"     ON "usuarios";
DROP POLICY IF EXISTS "usuarios_delete_anon"     ON "usuarios";

-- ─── CHAMADAS — escrita pelo frontend autenticado ─────────────────────────────
-- chamadas são feitas pelo frontend com anon key mas sob sessão NextAuth
-- mantém INSERT/UPDATE/DELETE para anon (necessário para chamada funcionar)
-- se quiser restringir mais, mova para API server-side também
DROP POLICY IF EXISTS "chamadas_insert_anon" ON "chamadas";
DROP POLICY IF EXISTS "chamadas_update_anon" ON "chamadas";
DROP POLICY IF EXISTS "chamadas_select_anon" ON "chamadas";
CREATE POLICY "chamadas_select_anon"
  ON "chamadas" FOR SELECT USING (true);
CREATE POLICY "chamadas_insert_anon"
  ON "chamadas" FOR INSERT WITH CHECK (true);
CREATE POLICY "chamadas_update_anon"
  ON "chamadas" FOR UPDATE USING (true);

-- ─── FIM ──────────────────────────────────────────────────────────────────────
-- Renomear 0003 para deixar claro que foi substituído (faça isso no git):
-- mv supabase/migrations/0003_rls_temporario_PRECISA_REVISAO.sql
--    supabase/migrations/0003_rls_substituido_por_0007.sql
