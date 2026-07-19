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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const session = await getServerSession(req, res, authOptions);
  if (!session || (session.user as any).perfil !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const { nome, email, senha, perfil, aluno_id, professor_id } = req.body;
  if (!nome || !email || !senha || !perfil) {
    return res.status(400).json({ error: 'Nome, email, senha e perfil são obrigatórios' });
  }

  const emailNorm = email.trim().toLowerCase();

  const { data: existente } = await supabase.from('usuarios').select('id').eq('email', emailNorm).maybeSingle();
  if (existente) return res.status(400).json({ error: 'Este email já está em uso' });

  const senhaHash = await bcrypt.hash(senha, 10);

  const { data, error } = await supabase
    .from('usuarios')
    .insert([{ nome, email: emailNorm, senha_hash: senhaHash, perfil, aluno_id: aluno_id || null, professor_id: professor_id || null, ativo: true }])
    .select('id, nome, email, perfil, ativo')
    .single();

  if (error) return res.status(400).json({ error: error.message });

  return res.status(201).json({ message: 'Usuário criado com sucesso', user: data });
}
