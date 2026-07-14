import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rotas públicas — acessíveis sem login
const PUBLIC_ROUTES = ['/signIn', '/api/auth'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Deixa passar rotas públicas e assets
  if (
    PUBLIC_ROUTES.some(r => pathname.startsWith(r)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // arquivos estáticos (.png, .ico, etc)
  ) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Não autenticado → vai para login
  if (!token) {
    const loginUrl = new URL('/signIn', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const perfil = token.perfil as string;

  // Professor tentando acessar área admin → redireciona pro portal dele
  if (perfil === 'professor' && !pathname.startsWith('/professor') && !pathname.startsWith('/api')) {
    return NextResponse.redirect(new URL('/professor', req.url));
  }

  // Aluno tentando acessar área admin ou professor → redireciona pro portal dele
  if (perfil === 'aluno' && !pathname.startsWith('/aluno') && !pathname.startsWith('/api')) {
    return NextResponse.redirect(new URL('/aluno', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
