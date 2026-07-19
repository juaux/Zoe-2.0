-- ============================================================
--  REALINHAR RLS COM A ARQUITETURA REAL DO APP — Zoe
--
--  O app não usa Supabase Auth (usa NextAuth + a função
--  verificar_login). A proteção de rotas admin/professor/aluno
--  é feita pelo middleware.ts do Next.js, não pelo RLS do
--  Supabase. As páginas (Alunos, Professores, Turmas) escrevem
--  direto do navegador com a chave anon.
--
--  A migration 0007 removeu as políticas de escrita para anon
--  nessas tabelas (assumindo que as escritas passariam por uma
--  API com service_role, o que nunca foi implementado nas
--  páginas de cadastro). Esta migration restaura escrita para
--  anon nessas tabelas, igual já é feito em "chamadas".
-- ============================================================

-- ─── ALUNOS ───
DROP POLICY IF EXISTS "alunos_insert_anon" ON "Alunos";
CREATE POLICY "alunos_insert_anon" ON "Alunos" FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "alunos_update_anon" ON "Alunos";
CREATE POLICY "alunos_update_anon" ON "Alunos" FOR UPDATE USING (true);

DROP POLICY IF EXISTS "alunos_delete_anon" ON "Alunos";
CREATE POLICY "alunos_delete_anon" ON "Alunos" FOR DELETE USING (true);

-- ─── PROFESSORES ───
DROP POLICY IF EXISTS "professores_insert_anon" ON "Professores";
CREATE POLICY "professores_insert_anon" ON "Professores" FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "professores_update_anon" ON "Professores";
CREATE POLICY "professores_update_anon" ON "Professores" FOR UPDATE USING (true);

DROP POLICY IF EXISTS "professores_delete_anon" ON "Professores";
CREATE POLICY "professores_delete_anon" ON "Professores" FOR DELETE USING (true);

-- ─── TURMAS ───
DROP POLICY IF EXISTS "turmas_insert_anon" ON "Turmas";
CREATE POLICY "turmas_insert_anon" ON "Turmas" FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "turmas_update_anon" ON "Turmas";
CREATE POLICY "turmas_update_anon" ON "Turmas" FOR UPDATE USING (true);

DROP POLICY IF EXISTS "turmas_delete_anon" ON "Turmas";
CREATE POLICY "turmas_delete_anon" ON "Turmas" FOR DELETE USING (true);

-- ─── USUARIOS: continua bloqueado para anon ───
-- (login passa pela função verificar_login, que já é SECURITY DEFINER
--  e não expõe senha_hash — não precisa de policy de select/insert direta)
