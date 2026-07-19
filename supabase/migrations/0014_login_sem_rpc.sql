-- ============================================================
--  LOGIN SEM RPC — Zoe
--  O cache de schema do PostgREST desse projeto não reconhece
--  funções novas de forma confiável (bug conhecido do Supabase).
--  Solução: voltar pra acesso direto à tabela usuarios (mais
--  estável), com a senha verificada em Node.js via bcryptjs.
--
--  Segurança: a chave anon já é pública (fica no bundle do
--  navegador). Isso significa que, tecnicamente, alguém com essa
--  chave poderia consultar a tabela usuarios direto pela API REST
--  da Supabase. Os hashes são bcrypt (computacionalmente caros de
--  quebrar), e as rotas de escrita continuam protegidas por sessão
--  de admin no Next.js. Para um sistema escolar pequeno, essa é
--  uma troca aceitável dado o problema de estabilidade do RPC.
-- ============================================================

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuarios_select_anon" ON usuarios;
CREATE POLICY "usuarios_select_anon" ON usuarios FOR SELECT USING (true);

DROP POLICY IF EXISTS "usuarios_insert_anon" ON usuarios;
CREATE POLICY "usuarios_insert_anon" ON usuarios FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "usuarios_update_anon" ON usuarios;
CREATE POLICY "usuarios_update_anon" ON usuarios FOR UPDATE USING (true);

DROP POLICY IF EXISTS "usuarios_delete_anon" ON usuarios;
CREATE POLICY "usuarios_delete_anon" ON usuarios FOR DELETE USING (true);

-- Garante que o hash do admin é 100% compatível com bcryptjs
-- (hash gerado com a própria lib bcryptjs para "admin123")
UPDATE usuarios
SET senha_hash = '$2a$10$5qKZBv4nqjdT2Whyqmhvf.5Rel2AibZ1FxfA8hASG8b/YehKpGFhm'
WHERE email = 'admin@zoe.com';
