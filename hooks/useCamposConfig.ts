/**
 * hooks/useCamposConfig.ts
 *
 * Lê e salva as configurações de campos no Supabase (tabela "configuracoes")
 * em vez de localStorage — garante consistência entre admins e dispositivos.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface CampoConfig {
  key: string;
  label: string;
  ativo: boolean;
  obrigatorio: boolean;
  editavel: boolean;
}

export const CAMPOS_ALUNOS_DEFAULT: CampoConfig[] = [
  { key: 'nomeCompleto',        label: 'Nome Completo',           ativo: true, obrigatorio: true,  editavel: false },
  { key: 'dataNascimento',      label: 'Data de Nascimento',      ativo: true, obrigatorio: true,  editavel: false },
  { key: 'turma',               label: 'Curso',       ativo: true, obrigatorio: true,  editavel: false },
  { key: 'sexo',                label: 'Sexo',                    ativo: true, obrigatorio: true,  editavel: true  },
  { key: 'rg',                  label: 'RG',                      ativo: true, obrigatorio: true,  editavel: true  },
  { key: 'cpf',                 label: 'CPF',                     ativo: true, obrigatorio: true,  editavel: true  },
  { key: 'telefone',            label: 'Telefone',                ativo: true, obrigatorio: false, editavel: true  },
  { key: 'email',               label: 'Email',                   ativo: true, obrigatorio: false, editavel: true  },
  { key: 'cep',                 label: 'CEP',                     ativo: true, obrigatorio: true,  editavel: true  },
  { key: 'endereco',            label: 'Endereço',                ativo: true, obrigatorio: false, editavel: true  },
  { key: 'bairro',              label: 'Bairro',                  ativo: true, obrigatorio: false, editavel: true  },
  { key: 'cidade',              label: 'Cidade',                  ativo: true, obrigatorio: false, editavel: true  },
  { key: 'uf',                  label: 'UF',                      ativo: true, obrigatorio: false, editavel: true  },
  { key: 'nomePai',             label: 'Nome do Pai',             ativo: true, obrigatorio: false, editavel: true  },
  { key: 'nomeMae',             label: 'Nome da Mãe',             ativo: true, obrigatorio: false, editavel: true  },
  { key: 'responsavel',         label: 'Responsável',             ativo: true, obrigatorio: false, editavel: true  },
  { key: 'telefoneResponsavel', label: 'Telefone do Responsável', ativo: true, obrigatorio: false, editavel: true  },
  { key: 'foto',                label: 'Foto',                    ativo: true, obrigatorio: false, editavel: true  },
];

export const CAMPOS_TREIN_DEFAULT: CampoConfig[] = [
  { key: 'nomeCompleto',   label: 'Nome Completo',      ativo: true, obrigatorio: true,  editavel: false },
  { key: 'dataNascimento', label: 'Data de Nascimento', ativo: true, obrigatorio: true,  editavel: false },
  { key: 'turma',          label: 'Curso Responsável',  ativo: true, obrigatorio: true,  editavel: false },
  { key: 'sexo',           label: 'Sexo',               ativo: true, obrigatorio: true,  editavel: true  },
  { key: 'rg',             label: 'RG',                 ativo: true, obrigatorio: true,  editavel: true  },
  { key: 'cpf',            label: 'CPF',                ativo: true, obrigatorio: true,  editavel: true  },
  { key: 'telefone',       label: 'Telefone',           ativo: true, obrigatorio: false, editavel: true  },
  { key: 'email',          label: 'Email',              ativo: true, obrigatorio: false, editavel: true  },
  { key: 'cep',            label: 'CEP',                ativo: true, obrigatorio: true,  editavel: true  },
  { key: 'endereco',       label: 'Endereço',           ativo: true, obrigatorio: false, editavel: true  },
  { key: 'bairro',         label: 'Bairro',             ativo: true, obrigatorio: false, editavel: true  },
  { key: 'cidade',         label: 'Cidade',             ativo: true, obrigatorio: false, editavel: true  },
  { key: 'uf',             label: 'UF',                 ativo: true, obrigatorio: false, editavel: true  },
  { key: 'especialidade',  label: 'Especialidade',      ativo: true, obrigatorio: true,  editavel: true  },
  { key: 'formacao',       label: 'Formação',           ativo: true, obrigatorio: true,  editavel: true  },
  { key: 'experiencia',    label: 'Experiência',        ativo: true, obrigatorio: false, editavel: true  },
  { key: 'foto',           label: 'Foto',               ativo: true, obrigatorio: false, editavel: true  },
];

async function fetchConfig(chave: string, defaults: CampoConfig[]): Promise<CampoConfig[]> {
  try {
    const res = await fetch(`/api/configuracoes?chave=${chave}`);
    if (!res.ok) return defaults;
    const data = await res.json();
    if (!Array.isArray(data)) return defaults;
    // Merge: mantém defaults para chaves novas que o banco não tem
    const dbKeys = new Set(data.map((c: CampoConfig) => c.key));
    const extras = defaults.filter(d => !dbKeys.has(d.key));
    return [...data, ...extras];
  } catch {
    return defaults;
  }
}

async function saveConfig(chave: string, campos: CampoConfig[]): Promise<void> {
  const res = await fetch(`/api/configuracoes?chave=${chave}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(campos),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Erro ao salvar configuração');
  }
}

export function useCamposConfig(tipo: 'alunos' | 'professores') {
  const queryClient = useQueryClient();
  const chave    = tipo === 'alunos' ? 'campos_alunos' : 'campos_professores';
  const defaults = tipo === 'alunos' ? CAMPOS_ALUNOS_DEFAULT : CAMPOS_TREIN_DEFAULT;
  const queryKey = ['configuracoes', chave];

  const { data: campos = defaults, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => fetchConfig(chave, defaults),
    staleTime: 1000 * 60 * 10,
    gcTime:    1000 * 60 * 30,
    retry: 1,
  });

  const mutation = useMutation({
    mutationFn: (novosCampos: CampoConfig[]) => saveConfig(chave, novosCampos),
    onSuccess: (_data, novosCampos) => {
      queryClient.setQueryData(queryKey, novosCampos);
    },
  });

  const isAtivo = (key: string): boolean => {
    const c = campos.find(f => f.key === key);
    return c ? c.ativo : true;
  };

  const isObrigatorio = (key: string): boolean => {
    const c = campos.find(f => f.key === key);
    return c ? c.obrigatorio : false;
  };

  const getLabel = (key: string, fallback?: string): string => {
    const c = campos.find(f => f.key === key);
    return c?.label ?? fallback ?? key;
  };

  return {
    campos,
    isAtivo,
    isObrigatorio,
    getLabel,
    isLoading,
    isError,
    salvar:    mutation.mutateAsync,
    saving:    mutation.isPending,
    saveError: mutation.error,
  };
}
