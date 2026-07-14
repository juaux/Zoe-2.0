import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';

const STALE_TIME = 1000 * 60 * 2; // 2 minutos

export function useAlunos() {
  return useQuery({
    queryKey: ['alunos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('Alunos')
        .select('*')
        .order('nomeCompleto');
      if (error) throw error;
      return data || [];
    },
    staleTime: STALE_TIME,
  });
}

export function useTurmas() {
  return useQuery({
    queryKey: ['turmas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('Turmas')
        .select('*')
        .order('nome');
      if (error) throw error;
      return data || [];
    },
    staleTime: STALE_TIME,
  });
}

export function useProfessores() {
  return useQuery({
    queryKey: ['professores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('Professores')
        .select('*')
        .order('nomeCompleto');
      if (error) throw error;
      return data || [];
    },
    staleTime: STALE_TIME,
  });
}
