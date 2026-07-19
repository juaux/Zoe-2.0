import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CAMPOS_PERMITIDOS = [
  'matricula', 'dataAtual', 'turma', 'nomeCompleto', 'dataNascimento', 'idade',
  'sexo', 'rg', 'cpf', 'cep', 'endereco', 'bairro', 'cidade', 'uf', 'telefone',
  'email', 'nomePai', 'nomeMae', 'responsavel', 'telefoneResponsavel', 'fotoUrl',
] as const;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Não autenticado' });

  const perfil = (session.user as any).perfil;
  if (perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Método ${req.method} não permitido` });
  }

  const body = req.body || {};
  const payload: Record<string, unknown> = {};
  for (const campo of CAMPOS_PERMITIDOS) {
    if (Object.prototype.hasOwnProperty.call(body, campo)) payload[campo] = body[campo];
  }

  const { data, error } = await supabase.from('Alunos').insert([payload]).select().single();

  if (error) {
    if (error.message.includes('cpf_key') || error.message.includes('Alunos_cpf_key')) {
      return res.status(409).json({ error: 'CPF já cadastrado. Verifique se este aluno já está no sistema.' });
    }
    if (error.message.includes('matricula')) {
      return res.status(409).json({ error: 'Matrícula já cadastrada. Tente gerar uma nova matrícula.' });
    }
    return res.status(500).json({ error: error.message });
  }
  return res.status(201).json(data);
}
