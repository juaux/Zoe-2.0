import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Não autenticado' });

  const perfil = (session.user as any).perfil;

  // POST: aluno solicita 2ª via
  if (req.method === 'POST') {
    if (perfil !== 'aluno') return res.status(403).json({ error: 'Apenas alunos podem solicitar' });

    const alunoId = (session.user as any).alunoId;
    const alunoNome = session.user?.name || '';
    const { motivo } = req.body;

    // Verificar se já tem solicitação pendente
    const { data: existente } = await supabase
      .from('cracha_solicitacoes')
      .select('id')
      .eq('aluno_id', alunoId)
      .eq('status', 'pendente')
      .single();

    if (existente) {
      return res.status(409).json({ error: 'Você já tem uma solicitação pendente.' });
    }

    const { error } = await supabase.from('cracha_solicitacoes').insert({
      aluno_id: alunoId,
      aluno_nome: alunoNome,
      motivo: motivo || 'Não informado',
      status: 'pendente',
      criado_em: new Date().toISOString(),
    });

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  // GET: admin lista todas as pendentes
  if (req.method === 'GET') {
    if (perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });

    const { data, error } = await supabase
      .from('cracha_solicitacoes')
      .select('*')
      .order('criado_em', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  }

  // PATCH: admin marca como resolvida
  if (req.method === 'PATCH') {
    if (perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });

    const { id, status } = req.body;
    const { error } = await supabase
      .from('cracha_solicitacoes')
      .update({ status, resolvido_em: new Date().toISOString() })
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
