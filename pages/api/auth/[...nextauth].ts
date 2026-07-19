import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// Chave anon — sem RPC (o cache de schema do PostgREST vinha travando
// pra funções novas nesse projeto). Consulta direta na tabela, com
// RLS liberando SELECT em usuarios (ver migration 0014).
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
);

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Senha',    type: 'password' },
        perfil:   { label: 'Perfil',   type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const { data: user, error } = await supabase
            .from('usuarios')
            .select('id, nome, email, senha_hash, perfil, ativo, aluno_id, professor_id')
            .eq('email', credentials.email.trim().toLowerCase())
            .maybeSingle();

          if (error) {
            console.error('[AUTH] erro ao buscar usuario:', error);
            return null;
          }
          if (!user || !user.ativo) return null;

          const senhaOk = await bcrypt.compare(credentials.password, user.senha_hash);
          if (!senhaOk) return null;

          if (credentials.perfil && user.perfil !== credentials.perfil) {
            return null;
          }

          return {
            id:          user.id.toString(),
            name:        user.nome,
            email:       user.email,
            perfil:      user.perfil,
            alunoId:     user.aluno_id,
            professorId: user.professor_id,
          } as any;
        } catch (e) {
          console.error('[AUTH] erro inesperado:', e);
          return null;
        }
      },
    }),
  ],
  pages: { signIn: '/signIn' },
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.perfil      = (user as any).perfil;
        token.alunoId     = (user as any).alunoId;
        token.professorId = (user as any).professorId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).perfil      = token.perfil;
        (session.user as any).alunoId     = token.alunoId;
        (session.user as any).professorId = token.professorId;
      }
      return session;
    },
    async redirect({ url, baseUrl, token }: any) {
      const perfil = token?.perfil;
      if (perfil === 'professor') return `${baseUrl}/professor`;
      if (perfil === 'aluno')     return `${baseUrl}/aluno`;
      return baseUrl;
    },
  },
};

export default NextAuth(authOptions);
