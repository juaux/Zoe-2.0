# Relatório de limpeza e segurança — Zoe 2.0

## ✅ O que já foi feito neste pacote (risco zero de quebrar o app)

1. **Removidos arquivos/pastas duplicados e mortos:**
   - `pages - Copia/` (cópia inteira de `pages/`)
   - `middleware  - Copia.ts` e `middleware - Copia (2).ts`
   - `pages/alunoss.tsx` (não era referenciado em nenhum lugar)
   - `components/layout/Layout2.tsx` (não era referenciado em nenhum lugar)
   - `pages/fix_senha_admin (1).sql` (duplicado)

2. **SQLs organizados** em `supabase/migrations/0001` a `0006`, em ordem
   cronológica. Isso é só organização — não rodei nada no seu banco.

3. **`keep-supabase-alive.yml`** movido para `.github/workflows/`
   (onde o GitHub Actions de fato procura por workflows).

4. **`.gitignore` corrigido** — agora `.env` (sem sufixo) também é ignorado,
   além dos `.env.local`, `.env.production` etc.

5. **`.env` REMOVIDO do pacote** e criado `.env.example` (sem segredos).
   Você precisa recriar seu `.env.local` localmente com as chaves
   (de preferência **novas**, ver seção "AÇÃO MANUAL OBRIGATÓRIA" abaixo).

6. **Removida credencial hardcoded** em `pages/api/auth/register.ts`
   (URL + anon key que estavam como fallback no código-fonte). Agora se a
   env var não existir, a rota lança erro claro em vez de usar um banco
   "escondido".

7. **Removido fallback fraco do `NEXTAUTH_SECRET`** (`'zoe-secret-2024'`)
   no `middleware.ts`. Agora ele só funciona com o secret real definido em env.

8. **Removidos `console.log` sensíveis** no `[...nextauth].ts` (não loga mais
   e-mail, perfil, resultado do bcrypt etc).

➡️ **Nada disso muda o comportamento do app** — só remove lixo e fecha
vazamentos de informação/segredo. Build e funcionamento continuam iguais,
*desde que você configure o `.env.local`* (ver abaixo).

---

## 🔴 AÇÃO MANUAL OBRIGATÓRIA — só você pode fazer isso

A `SUPABASE_SERVICE_ROLE_KEY` e a `NEXT_PUBLIC_SUPABASE_KEY` (anon) que estavam
no `.env` versionado **precisam ser rotacionadas** no painel do Supabase:

`Project Settings → API → Reset/Rotate keys`

Por quê: se esse `.env` já foi commitado/enviado pro GitHub em algum momento
(mesmo que você ache que não, vale checar `git log -- .env`), qualquer pessoa
com acesso ao histórico do repo tem a chave que **ignora todo RLS** (service role).
Trocar a chave invalida qualquer cópia vazada na hora.

Depois de rotacionar:
1. Copie `.env.example` → `.env.local`
2. Preencha com as **novas** chaves
3. Gere um `NEXTAUTH_SECRET` novo e forte:
   ```bash
   openssl rand -base64 32
   ```
4. No painel da Vercel (Settings → Environment Variables), atualize as
   mesmas variáveis para produção/preview.

**Isso NÃO quebra nada** — é só trocar valores de variáveis de ambiente,
o código não muda.

---

## 🟠 RLS — por que NÃO mudei agora (e o plano para mudar sem quebrar)

Eu mapeei todos os pontos do frontend que fazem `insert/update/delete/upsert`
direto com a **anon key** (cliente `supabase` em `supabaseClient.ts`):

- `pages/admin.tsx` → Turmas (insert/update/delete/upsert)
- `pages/alunos.tsx`, `pages/lista_alunos.tsx` → Alunos (insert/update + storage upload)
- `pages/professores.tsx`, `pages/lista_professores.tsx` → Professores (insert/delete + storage upload)
- `pages/professor/index.tsx` → chamadas (upsert)
- `hooks/useSupabaseQuery.ts` → Alunos (update/delete)
- `pages/api/cracha-solicitacoes.ts` e `pages/api/auth/listar-usuarios.ts` →
  já são API routes (server-side), mas usam a **anon key** em vez da service role.

**Se eu simplesmente travasse o RLS agora** (voltar pra `auth.role() = 'authenticated'`
ou políticas baseadas em `auth.uid()`), **todos esses pontos quebrariam imediatamente**,
porque o Supabase não reconhece a sessão do NextAuth — pra ele, toda requisição
do navegador é "anon".

### Caminho seguro (em etapas, sem big-bang):

**Etapa 1 — Server-side primeiro (baixo risco, eu posso ajudar a fazer):**
Criar API routes no Next (`/api/alunos`, `/api/professores`, `/api/turmas`...)
que recebem a sessão NextAuth, validam o `perfil`, e usam a
`SUPABASE_SERVICE_ROLE_KEY` para fazer o insert/update/delete no servidor.
O frontend passa a chamar essas rotas em vez de chamar `supabase.from(...)`
direto. Cada página migra uma por vez — o app nunca fica fora do ar.

**Etapa 2 — Travar o RLS (só depois que a Etapa 1 estiver completa):**
Quando NENHUM write mais sair do navegador com a anon key, aí sim
trocamos as policies de `Alunos`/`Professores`/`Turmas`/`chamadas` para
bloquear `anon` em INSERT/UPDATE/DELETE (e manter SELECT liberado só
no que for público, ex: dados de exibição em portais).

A migration `0003_rls_temporario_PRECISA_REVISAO.sql` (renomeada) é a
política atual — funcional, mas insegura. Não apague ela ainda, é o que
está mantendo o app funcionando.

**Quer que eu já comece pela Etapa 1?** Posso fazer página por página
(ex: começar pelo `lista_alunos.tsx`, que tem o maior volume de PII —
nome, foto, dados de aluno).

---

## 🟡 O que ficou de fora deste pacote (próximos passos, sem pressa)

- Reativar `eslint`/`typescript` no build (`next.config.mjs`) — fazer
  depois de rodar `npm run lint` e `npm run type-check` localmente e
  corrigir os erros que aparecerem (pode ter bastante coisa acumulada).
- Quebrar `admin.tsx`, `lista_alunos.tsx`, `aluno/index.tsx` (600-900 linhas)
  em componentes menores.
- Adicionar testes básicos de autenticação/autorização.
- Comprimir `public/logo2.png` (1.1MB → webp).
