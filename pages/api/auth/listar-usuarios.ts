import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { authOptions } from './[...nextauth]';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || (session.user as any).perfil !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nome, email, perfil, ativo, aluno_id, professor_id, created_at')
      .order('id', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'PATCH') {
    const { id, ativo, senha } = req.body;
    const update: any = {};
    if (typeof ativo === 'boolean') update.ativo = ativo;
    if (senha) update.senha_hash = await bcrypt.hash(senha, 10);

    const { error } = await supabase.from('usuarios').update(update).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ message: 'Atualizado' });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    const { error } = await supabase.from('usuarios').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ message: 'Removido' });
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
