import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

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
          // Busca sem filtrar ativo na query (evita problema de tipo boolean vs int)
          const { data: user, error } = await supabase
            .from('usuarios')
            .select('id, nome, email, senha_hash, perfil, ativo, aluno_id, professor_id')
            .eq('email', credentials.email.trim().toLowerCase())
            .maybeSingle();

          if (error || !user) return null;

          // Verifica ativo separadamente (aceita true, 1, "true")
          if (!user.ativo) {
            return null;
          }

          // Verifica senha
          const ok = await bcrypt.compare(credentials.password, user.senha_hash);
          if (!ok) return null;

          // Verifica perfil (todos os perfis, inclusive admin)
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
