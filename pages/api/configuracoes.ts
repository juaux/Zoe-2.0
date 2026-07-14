import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';

// Service role para bypass de RLS em escritas
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { chave } = req.query;

  if (!chave || typeof chave !== 'string') {
    return res.status(400).json({ error: 'Parâmetro "chave" obrigatório' });
  }

  // GET — leitura pública (qualquer um pode ler as configs de campos)
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', chave)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Configuração não encontrada' });

    return res.status(200).json(data.valor);
  }

  // POST/PUT — apenas admin pode salvar
  if (req.method === 'POST' || req.method === 'PUT') {
    const session = await getServerSession(req, res, authOptions);
    if (!session || (session.user as any).perfil !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const valor = req.body;

    if (valor === undefined || valor === null) {
      return res.status(400).json({ error: 'Body obrigatório' });
    }

    const { error } = await supabase
      .from('configuracoes')
      .upsert({ chave, valor, atualizado_em: new Date().toISOString() }, { onConflict: 'chave' });

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
