import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ✅ QueryClient com configurações otimizadas para Supabase
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Dados ficam "frescos" por 2 minutos — sem refetch desnecessário
      staleTime: 1000 * 60 * 2,
      // Cache mantido por 10 minutos mesmo sem componente ativo
      gcTime: 1000 * 60 * 10,
      // Não refaz query ao focar a janela (evita flood no Supabase)
      refetchOnWindowFocus: false,
      // Tenta de novo 1x em caso de erro
      retry: 1,
    },
  },
});

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider session={session}>
        <Component {...pageProps} />
      </SessionProvider>
    </QueryClientProvider>
  );
}
