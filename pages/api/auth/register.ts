import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { name, email, password } = req.body;

    // Validações básicas
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }

    // Verificar se o email já existe
    const { data: existingUser, error: checkError } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (checkError) {
      console.error('Erro ao verificar usuário existente:', checkError);
      return res.status(500).json({ error: 'Erro ao verificar usuário existente' });
    }

    if (existingUser) {
      return res.status(400).json({ error: 'Este email já está em uso' });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 12);

    // Inserir novo usuário
    console.log('Tentando inserir usuário:', { nome: name, email: email });
    
    const { data: newUser, error: insertError } = await supabase
      .from('usuarios')
      .insert([
        {
          nome: name,
          email: email,
          senha_hash: hashedPassword,
          data_criacao: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao inserir usuário:', insertError);
      console.error('Detalhes do erro:', {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      });
      return res.status(500).json({ 
        error: 'Erro ao criar usuário',
        details: insertError.message 
      });
    }

    // Retornar sucesso (sem a senha)
    const { senha_hash, ...userWithoutPassword } = newUser;
    
    res.status(201).json({
      message: 'Usuário criado com sucesso',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
