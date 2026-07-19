import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CAMPOS_PERMITIDOS = ['nome', 'faixa_etaria', 'descricao', 'ativo'] as const;

function pickPermitidos(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const campo of CAMPOS_PERMITIDOS) {
    if (Object.prototype.hasOwnProperty.call(body, campo)) out[campo] = body[campo];
  }
  return out;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Não autenticado' });

  const perfil = (session.user as any).perfil;
  if (perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });

  if (req.method === 'POST') {
    const payload = { ...pickPermitidos(req.body || {}), ativo: true };
    const { data, error } = await supabase.from('Turmas').insert([payload]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  // Upsert em lote — usado para criar as categorias "Sub" padrão de uma vez.
  if (req.method === 'PUT') {
    const items = Array.isArray(req.body) ? req.body : [];
    if (items.length === 0) return res.status(400).json({ error: 'Envie uma lista de turmas' });
    const payload = items.map(pickPermitidos);
    const { data, error } = await supabase.from('Turmas').upsert(payload, { onConflict: 'nome' }).select();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  res.setHeader('Allow', ['POST', 'PUT']);
  return res.status(405).json({ error: `Método ${req.method} não permitido` });
}
