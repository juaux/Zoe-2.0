import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CAMPOS_PERMITIDOS = ['nome', 'faixa_etaria', 'descricao', 'ativo'] as const;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Não autenticado' });

  const perfil = (session.user as any).perfil;
  if (perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });

  const { id } = req.query;
  if (!id || Array.isArray(id)) return res.status(400).json({ error: 'id inválido' });

  if (req.method === 'PUT' || req.method === 'PATCH') {
    const body = req.body || {};
    const dados: Record<string, unknown> = {};
    for (const campo of CAMPOS_PERMITIDOS) {
      if (Object.prototype.hasOwnProperty.call(body, campo)) dados[campo] = body[campo];
    }
    if (Object.keys(dados).length === 0) {
      return res.status(400).json({ error: 'Nenhum campo válido para atualizar' });
    }
    const { data, error } = await supabase.from('Turmas').update(dados).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase.from('Turmas').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  res.setHeader('Allow', ['PUT', 'PATCH', 'DELETE']);
  return res.status(405).json({ error: `Método ${req.method} não permitido` });
}
