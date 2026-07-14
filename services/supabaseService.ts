// services/supabaseService.ts
// Arquivo centralizado de serviços do Supabase
// Criado para resolver: "Module not found: Can't resolve '../services/supabaseService'"

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wvcsllnqceqjkfpfyyzu.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2Y3NsbG5xY2VxamtmcGZ5eXp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA5NDQ0NzcsImV4cCI6MjA1NjUyMDQ3N30.T3i4AhoPofS7lww_-wMzcPLbbok1h8j45yeY0oJ6v-g';

export const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================
// TIPOS
// ============================================================

export type CursoItem = {
  id: number;
  curso: string;
};

export type AlunoData = {
  matricula: string;
  dataAtual: string;
  cursos: string;
  nomeCompleto: string;
  dataNascimento: string;
  idade: string;
  sexo: string;
  rg: string;
  cpf: string;
  cep: string;
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
  telefone: string;
  email: string;
  nomePai?: string;
  nomeMae?: string;
  responsavel?: string;
  telefoneResponsavel?: string;
  turma?: string;
  fotoUrl?: string;
};

export type ProfessorData = {
  matricula: string;
  dataAtual: string;
  cursos: string;
  nomeCompleto: string;
  dataNascimento: string;
  idade: string;
  sexo: string;
  rg: string;
  cpf: string;
  cep: string;
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
  telefone: string;
  email: string;
  especialidade: string;
  formacao: string;
  experiencia?: string;
  fotoUrl?: string;
};

// ============================================================
// CURSOS
// ============================================================

export const buscarCursos = async (): Promise<CursoItem[]> => {
  const { data, error } = await supabase
    .from('Cursos')
    .select('id, curso')
    .eq('ativo', true)
    .order('curso');

  if (error) {
    console.error('Erro ao buscar cursos:', error);
    throw new Error(error.message);
  }

  return data || [];
};

// ============================================================
// ALUNOS
// ============================================================

export const cadastrarAluno = async (alunoData: AlunoData) => {
  const { data, error } = await supabase
    .from('Alunos')
    .insert([alunoData])
    .select();

  if (error) {
    console.error('Erro ao cadastrar aluno:', error);
    throw new Error(error.message);
  }

  return data;
};

export const uploadFotoAluno = async (file: File, matricula: string): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${matricula}.${fileExt}`;
  const filePath = `fotos/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('alunos-fotos')
    .upload(filePath, file, { cacheControl: '3600', upsert: true });

  if (uploadError) {
    console.error('Erro no upload da foto do aluno:', uploadError);
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from('alunos-fotos').getPublicUrl(filePath);
  return data.publicUrl;
};

// ============================================================
// PROFESSORES
// ============================================================

export const cadastrarProfessor = async (professorData: ProfessorData) => {
  const { data, error } = await supabase
    .from('Professores')
    .insert([professorData])
    .select();

  if (error) {
    console.error('Erro ao cadastrar professor:', error);
    throw new Error(error.message);
  }

  return data;
};

export const uploadFotoProfessor = async (file: File, matricula: string): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${matricula}.${fileExt}`;
  const filePath = `fotos/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('alunos-fotos')
    .upload(filePath, file, { cacheControl: '3600', upsert: true });

  if (uploadError) {
    console.error('Erro no upload da foto do professor:', uploadError);
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from('alunos-fotos').getPublicUrl(filePath);
  return data.publicUrl;
};
