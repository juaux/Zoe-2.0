import Head from 'next/head';
import Link from 'next/link';
import Layout from '../components/layout/Layout';
import { useState, useEffect, useMemo } from 'react';
import React from 'react';
import { supabase } from '../supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from '../components/ui/Toast';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Skeleton, SkeletonTable } from '../components/ui/Skeleton';
import { Pagination } from '../components/ui/Pagination';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { usePagination } from '../hooks/usePagination';
import {
  FaSearch, FaEdit, FaTrash, FaEye, FaTimes, FaUserPlus,
  FaChevronUp, FaUser, FaKey, FaChalkboardTeacher,
} from 'react-icons/fa';

interface Professor {
  id: number; matricula: string; dataAtual?: string;
  nomeCompleto: string; dataNascimento: string;
  idade: string | number; sexo: string; rg: string; cpf: string;
  cep: string; endereco: string; bairro: string; cidade: string; uf: string;
  telefone: string; email: string; especialidade: string; formacao: string;
  experiencia: string; turma?: string;
  fotoUrl?: string; foto?: string; fotoFile?: File;
}

function calcularIdade(d: string) {
  const n = new Date(d), h = new Date();
  let i = h.getFullYear() - n.getFullYear();
  const m = h.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && h.getDate() < n.getDate())) i--;
  return i;
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

const STORAGE_BUCKET = 'professores-fotos';
async function uploadFoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Arquivo inválido.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Máximo 5 MB.');
  const ext = file.name.split('.').pop() ?? 'jpg';
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext.toLowerCase()) ? ext.toLowerCase() : 'jpg';
  const path = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw new Error(`Upload: ${error.message}`);
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error('URL pública indisponível.');
  return data.publicUrl;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error('Erro ao ler arquivo.'));
    r.readAsDataURL(file);
  });
}

async function fetchProfessoresQuery(): Promise<Professor[]> {
  const { data, error } = await supabase.from('Professores').select('*').order('nomeCompleto');
  if (error) throw new Error(error.message);
  return (data || []).map(t => {
    const urlBase = t.fotoUrl ? t.fotoUrl.split('?')[0] : '';
    const turma = t.turma && typeof t.turma === 'object' ? (t.turma as any).nome : t.turma;
    return { ...t, turma, fotoUrl: urlBase ? `${urlBase}?t=${Date.now()}` : t.fotoUrl };
  });
}

async function fetchTurmasQuery(): Promise<string[]> {
  const { data, error } = await supabase.from('Cursos').select('curso').eq('ativo', true).order('curso');
  if (error) throw new Error(error.message);
  return data.map(t => t.curso);
}

function Avatar({ professor, size = 40 }: { professor: Professor; size?: number }) {
  const src = professor.fotoUrl || professor.foto;
  if (src) return <img src={src} alt={professor.nomeCompleto} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', objectPosition: 'center top', flexShrink: 0 }} onError={e => { (e.currentTarget as any).style.display = 'none' }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#e6faf5', color: '#26bf94', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: size * 0.33, flexShrink: 0 }}>
      {initials(professor.nomeCompleto)}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | number }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--nt-border)' }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--nt-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 110, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12.5, color: 'var(--nt-text-primary)' }}>{value}</span>
    </div>
  );
}

const fieldInputStyle: React.CSSProperties = { width: '100%', height: 36, padding: '0 10px', background: 'var(--nt-surface)', border: '1px solid var(--nt-border)', borderRadius: 7, fontSize: 13, color: 'var(--nt-text-primary)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
const fieldLabelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--nt-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 };

export default function ListarProfessores() {
  const queryClient = useQueryClient();
  const { data: professores = [], isLoading: loading, error: queryError } = useQuery({ queryKey: ['professores'], queryFn: fetchProfessoresQuery });
  const { data: turmasList = [] } = useQuery({ queryKey: ['turmas'], queryFn: fetchTurmasQuery });

  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState('nomeCompleto');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filterEspecialidade, setFilterEsp] = useState('');
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'warning' } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Professor | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProfessor, setSelectedProfessor] = useState<Professor | null>(null);
  const [formData, setFormData] = useState<Partial<Professor>>({});
  const [saving, setSaving] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [loginModalProfessor, setLoginModalProfessor] = useState<Professor | null>(null);
  const [loginForm, setLoginForm] = useState({ email: '', senha: '' });
  const [loginSaving, setLoginSaving] = useState(false);

  const criarLogin = async () => {
    if (!loginModalProfessor || !loginForm.email || !loginForm.senha) return;
    setLoginSaving(true);
    try {
      const res = await fetch('/api/auth/criar-usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: loginModalProfessor.nomeCompleto,
          email: loginForm.email,
          senha: loginForm.senha,
          perfil: 'professor',
          professor_id: loginModalProfessor.id,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao criar login');
      showToast(`Login criado para ${loginModalProfessor.nomeCompleto}!`);
      setLoginModalProfessor(null);
      setLoginForm({ email: '', senha: '' });
    } catch (err: any) {
      showToast(err.message || 'Erro ao criar login', 'error');
    } finally {
      setLoginSaving(false);
    }
  };

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => setToast({ message, type });

  const handleDelete = async (professor: Professor) => {
    try {
      const id = typeof professor.id === 'string' ? parseInt(professor.id, 10) : professor.id;
      const { error, data } = await supabase.from('Professores').delete().eq('id', id).select();
      if (error) { showToast(`Erro: ${error.message} (${error.code})`, 'error'); return; }
      if (!data || data.length === 0) { showToast('Nenhum registro excluído — sem permissão ou id não encontrado.', 'error'); return; }
      queryClient.setQueryData<Professor[]>(['professores'], prev => (prev || []).filter(t => t.id !== professor.id));
      setConfirmDelete(null);
      showToast(`Professor "${professor.nomeCompleto}" excluído.`, 'warning');
    } catch (err: any) {
      showToast(`Erro inesperado: ${err?.message ?? err}`, 'error');
    }
  };

  const handleEdit = (professor: Professor) => {
    setSelectedProfessor(professor);
    const { fotoFile, foto, ...rest } = professor as any;
    setFormData({ ...rest, fotoFile: undefined });
    const inp = document.getElementById('fotoUploadProfessor') as HTMLInputElement | null;
    if (inp) inp.value = '';
    setIsModalOpen(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'dataNascimento') {
      const idade = calcularIdade(value).toString();
      setFormData(prev => ({ ...prev, dataNascimento: value, idade }));
    }
  };

  const atualizarProfessor = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProfessor?.id) return;
    if (!formData.sexo || !['Masculino', 'Feminino'].includes(formData.sexo)) { showToast('Selecione o sexo.', 'error'); return; }
    setSaving(true);
    try {
      let novaFotoUrl: string | undefined;
      if (formData.fotoFile instanceof File) {
        setUploadingFoto(true);
        try { novaFotoUrl = await uploadFoto(formData.fotoFile); }
        catch (err) { showToast(`⚠️ ${err instanceof Error ? err.message : 'Erro na foto.'} Dados salvos normalmente.`, 'warning'); }
        finally { setUploadingFoto(false); }
      }
      const dados: Record<string, unknown> = {
        nomeCompleto: formData.nomeCompleto || selectedProfessor.nomeCompleto,
        dataNascimento: formData.dataNascimento || selectedProfessor.dataNascimento,
        idade: formData.idade != null ? parseInt(String(formData.idade)) : selectedProfessor.idade,
        sexo: formData.sexo,
        turma: formData.turma || null,
        matricula: formData.matricula || selectedProfessor.matricula,
        dataAtual: formData.dataAtual ?? selectedProfessor.dataAtual,
        rg: formData.rg ?? null,
        cpf: formData.cpf || selectedProfessor.cpf,
        cep: formData.cep || selectedProfessor.cep,
        endereco: formData.endereco ?? null,
        bairro: formData.bairro ?? null,
        cidade: formData.cidade ?? null,
        uf: formData.uf ?? null,
        telefone: formData.telefone ?? null,
        email: formData.email ?? null,
        especialidade: formData.especialidade ?? null,
        formacao: formData.formacao ?? null,
        experiencia: formData.experiencia ?? null,
      };
      if (novaFotoUrl) dados.fotoUrl = novaFotoUrl;
      const { error } = await supabase.from('Professores').update(dados).eq('id', selectedProfessor.id);
      if (error) throw new Error(error.message);
      queryClient.setQueryData<Professor[]>(['professores'], prev =>
        (prev || []).map(t => t.id === selectedProfessor.id ? { ...t, ...(dados as any), fotoUrl: novaFotoUrl || t.fotoUrl } : t)
      );
      setIsModalOpen(false);
      setSelectedProfessor(null);
      setFormData({});
      showToast('Professor atualizado com sucesso!');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao atualizar.', 'error');
    } finally { setSaving(false); }
  };

  const especialidades = useMemo(() => [...new Set(professores.map(t => t.especialidade).filter(Boolean))].sort(), [professores]);

  const filtered = useMemo(() => professores.filter(t => {
    const ms = !searchTerm || String(t[searchField as keyof Professor] || '').toLowerCase().includes(searchTerm.toLowerCase());
    const me = !filterEspecialidade || t.especialidade === filterEspecialidade;
    return ms && me;
  }), [professores, searchTerm, searchField, filterEspecialidade]);

  const pagination = usePagination(filtered, 20);

  return (
    <>
      <Head><title>Lista de Professores — Zoe</title></Head>
      <Layout>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--nt-text-primary)', margin: 0, letterSpacing: '-0.01em' }}>Lista de Professores</h1>
              <p style={{ fontSize: 14, color: 'var(--nt-text-muted)', margin: '2px 0 0' }}>{professores.length} professor{professores.length !== 1 ? 'es' : ''} cadastrado{professores.length !== 1 ? 's' : ''}</p>
            </div>
            <Link href="/professores" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--nt-primary)', color: '#fff', borderRadius: 8, fontSize: 15, fontWeight: 600, textDecoration: 'none' }}>
              <FaUserPlus style={{ fontSize: 15 }} /> + Novo Professor
            </Link>
          </div>

          <div style={{ background: 'var(--nt-surface)', borderRadius: 10, border: '1px solid var(--nt-border)', padding: '10px 14px', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <FaSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--nt-text-muted)', fontSize: 15 }} />
              <input type="text" placeholder="Pesquisar professores..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', paddingLeft: 30, paddingRight: 12, height: 34, background: 'var(--nt-bg)', border: '1px solid var(--nt-border)', borderRadius: 7, fontSize: 15, color: 'var(--nt-text-primary)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <select value={searchField} onChange={e => setSearchField(e.target.value)}
              style={{ height: 34, padding: '0 10px', background: 'var(--nt-bg)', border: '1px solid var(--nt-border)', borderRadius: 7, fontSize: 14, color: 'var(--nt-text-secondary)', fontFamily: 'inherit', outline: 'none' }}>
              <option value="nomeCompleto">Nome</option>
              <option value="matricula">Matrícula</option>
              <option value="cpf">CPF</option>
              <option value="especialidade">Especialidade</option>
              <option value="turma">Curso</option>
            </select>
            {especialidades.length > 0 && (
              <select value={filterEspecialidade} onChange={e => setFilterEsp(e.target.value)}
                style={{ height: 34, padding: '0 10px', background: 'var(--nt-bg)', border: '1px solid var(--nt-border)', borderRadius: 7, fontSize: 14, color: 'var(--nt-text-secondary)', fontFamily: 'inherit', outline: 'none' }}>
                <option value="">Todas as especialidades</option>
                {especialidades.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            )}
            {(searchTerm || filterEspecialidade) && (
              <button onClick={() => { setSearchTerm(''); setFilterEsp(''); }}
                style={{ height: 34, padding: '0 12px', background: 'transparent', border: '1px solid var(--nt-border)', borderRadius: 7, fontSize: 14, color: 'var(--nt-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <FaTimes style={{ fontSize: 12 }} /> Limpar
              </button>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 15, color: 'var(--nt-text-muted)' }}>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {isMobile && (
            <ErrorBoundary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{ background: 'var(--nt-surface)', borderRadius: 12, border: '1px solid var(--nt-border)', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <Skeleton width={44} height={44} borderRadius="50%" style={{ flexShrink: 0 }} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <Skeleton width="60%" height={14} />
                        <Skeleton width="40%" height={11} />
                      </div>
                    </div>
                    <Skeleton width="100%" height={10} style={{ marginBottom: 6 }} />
                    <Skeleton width="70%" height={10} />
                  </div>
                ))
              ) : filtered.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--nt-text-muted)', fontSize: 14 }}>Nenhum professor encontrado.</div>
              ) : pagination.pageData.map(professor => (
                <div key={professor.id} style={{ background: 'var(--nt-surface)', borderRadius: 12, border: '1px solid var(--nt-border)', padding: '14px 16px', boxShadow: '0 1px 4px rgba(22,29,60,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <Avatar professor={professor} size={44} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--nt-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{professor.nomeCompleto}</div>
                      <div style={{ fontSize: 12, color: 'var(--nt-text-muted)', marginTop: 2 }}>{professor.email || professor.telefone || '—'}</div>
                    </div>
                    {professor.especialidade && (
                      <span style={{ fontSize: 12, fontWeight: 600, background: '#fff8e6', color: '#b45309', padding: '3px 9px', borderRadius: 20, flexShrink: 0 }}>
                        {professor.especialidade}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--nt-border)', paddingTop: 10 }}>
                    <button onClick={() => handleEdit(professor)} style={{ flex: 1, height: 36, borderRadius: 8, border: '1px solid var(--nt-border)', background: 'transparent', color: 'var(--nt-text-secondary)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <FaEdit style={{ fontSize: 12 }} /> Editar
                    </button>
                    <button onClick={() => { setLoginModalProfessor({ ...professor }); setLoginForm({ email: professor.email || '', senha: '' }); }} style={{ flex: 1, height: 36, borderRadius: 8, border: '1px solid var(--nt-border)', background: 'transparent', color: '#7c3aed', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <FaKey style={{ fontSize: 12 }} /> Login
                    </button>
                    <button onClick={() => setConfirmDelete(professor)} style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #fee2e2', background: 'transparent', color: '#dc2626', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {!loading && filtered.length > 0 && (
              <Pagination {...pagination} />
            )}
            </ErrorBoundary>
          )}

          {!isMobile && <ErrorBoundary><div style={{ background: 'var(--nt-surface)', borderRadius: 10, border: '1px solid var(--nt-border)', overflow: 'hidden' }}>
            {loading ? (
              <SkeletonTable rows={8} cols={6} />
            ) : queryError ? (
              <div className="nt-error-state">
                <div className="nt-error-state-icon">⚠️</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--nt-text-primary)' }}>Erro ao carregar professores</div>
                <div style={{ fontSize: 13, color: 'var(--nt-text-muted)' }}>Verifique sua conexão e tente recarregar.</div>
                <button onClick={() => window.location.reload()} style={{ marginTop: 8, padding: '7px 16px', borderRadius: 8, border: 'none', background: 'var(--nt-primary)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Recarregar</button>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 56, textAlign: 'center' }}>
                <FaChalkboardTeacher style={{ fontSize: 32, color: 'var(--nt-text-muted)', opacity: 0.3, marginBottom: 10 }} />
                <div style={{ fontSize: 14, color: 'var(--nt-text-secondary)', fontWeight: 500, marginBottom: 4 }}>Nenhum professor encontrado</div>
                <div style={{ fontSize: 15, color: 'var(--nt-text-muted)' }}>{searchTerm || filterEspecialidade ? 'Tente outros filtros.' : 'Cadastre o primeiro professor.'}</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--nt-border)', background: 'var(--nt-bg)' }}>
                    {['Professor', 'Matrícula', 'Especialidade', 'Curso', 'Formação', 'Contato', 'Ações'].map((h, i) => (
                      <th key={h} style={{ padding: '9px 14px', fontSize: 12, fontWeight: 600, color: 'var(--nt-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: i === 6 ? 'center' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagination.pageData.map((professor) => (
                    <React.Fragment key={professor.id}>
                      <tr style={{ borderBottom: '1px solid var(--nt-border)', background: expandedId === professor.id ? 'var(--nt-bg)' : 'var(--nt-surface)' }}>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Avatar professor={professor} size={32} />
                            <div>
                              <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--nt-text-primary)' }}>{professor.nomeCompleto}</div>
                              <div style={{ fontSize: 15, color: 'var(--nt-text-muted)' }}>{professor.email || professor.telefone || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 14, color: 'var(--nt-text-muted)', fontFamily: 'monospace' }}>{professor.matricula || '—'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          {professor.especialidade
                            ? <span style={{ fontSize: 15, fontWeight: 600, background: '#fff8e6', color: '#b45309', padding: '3px 9px', borderRadius: 20 }}>{professor.especialidade}</span>
                            : <span style={{ fontSize: 14, color: 'var(--nt-text-muted)' }}>—</span>}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {professor.turma
                            ? <span style={{ fontSize: 15, fontWeight: 600, background: 'var(--nt-primary-pale)', color: 'var(--nt-primary)', padding: '3px 9px', borderRadius: 20 }}>{professor.turma}</span>
                            : <span style={{ fontSize: 14, color: 'var(--nt-text-muted)' }}>—</span>}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 14, color: 'var(--nt-text-secondary)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{professor.formacao || '—'}</td>
                        <td style={{ padding: '10px 14px', fontSize: 14, color: 'var(--nt-text-secondary)' }}>{professor.telefone || professor.email || '—'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', gap: 2, justifyContent: 'center', alignItems: 'center' }}>
                            <button onClick={() => setExpandedId(expandedId === professor.id ? null : professor.id)} title="Ver"
                              style={{ width: 30, height: 30, borderRadius: 6, background: 'transparent', border: 'none', color: expandedId === professor.id ? 'var(--nt-primary)' : 'var(--nt-text-muted)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {expandedId === professor.id ? <FaChevronUp /> : <FaEye />}
                            </button>
                            <button onClick={() => handleEdit(professor)} title="Editar"
                              style={{ width: 30, height: 30, borderRadius: 6, background: 'transparent', border: 'none', color: 'var(--nt-text-muted)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <FaEdit />
                            </button>
                            <button onClick={() => setConfirmDelete(professor)} title="Excluir"
                              style={{ width: 30, height: 30, borderRadius: 6, background: 'transparent', border: 'none', color: '#dc2626', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <FaTrash />
                            </button>
                            <button onClick={() => { setLoginModalProfessor({ ...professor }); setLoginForm({ email: professor.email || '', senha: '' }); }} title="Criar Login"
                              style={{ width: 30, height: 30, borderRadius: 6, background: 'transparent', border: 'none', color: '#7c3aed', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <FaKey />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedId === professor.id && (
                        <tr style={{ borderBottom: '1px solid var(--nt-border)' }}>
                          <td colSpan={7} style={{ padding: 0, background: 'var(--nt-bg)' }}>
                            <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr', gap: 24 }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                <Avatar professor={professor} size={64} />
                                <span style={{ fontSize: 12, fontWeight: 600, background: '#e6faf5', color: '#16a34a', padding: '2px 10px', borderRadius: 20 }}>Ativo</span>
                              </div>
                              {[
                                { title: 'Dados Pessoais', rows: [['RG', professor.rg], ['CPF', professor.cpf], ['Nascimento', professor.dataNascimento ? new Date(professor.dataNascimento).toLocaleDateString('pt-BR') : null], ['Idade', professor.idade], ['Email', professor.email], ['Telefone', professor.telefone]] },
                                { title: 'Profissional', rows: [['Especialidade', professor.especialidade], ['Formação', professor.formacao], ['Experiência', professor.experiencia], ['Curso', professor.turma]] },
                                { title: 'Endereço', rows: [['Endereço', professor.endereco], ['Bairro', professor.bairro], ['Cidade/UF', professor.cidade && professor.uf ? `${professor.cidade} — ${professor.uf}` : professor.cidade || professor.uf], ['CEP', professor.cep]] },
                              ].map(sec => (
                                <div key={sec.title}>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--nt-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{sec.title}</div>
                                  {sec.rows.map(([l, v]) => l != null ? <InfoRow key={l as string} label={l as string} value={v as any} /> : null)}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
              </div>
            )}
            {!loading && filtered.length > 0 && (
              <Pagination {...pagination} />
            )}
          </div></ErrorBoundary>}
        </div>

        {/* Modal de Edição */}
        {isModalOpen && selectedProfessor && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'var(--nt-surface)', borderRadius: 12, width: isMobile ? '100%' : 620, maxWidth: '100%', maxHeight: isMobile ? '92vh' : '90vh', overflowY: 'auto', padding: isMobile ? 16 : 24, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--nt-text-primary)' }}>Editar Professor</div>
                <button onClick={() => setIsModalOpen(false)} style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--nt-bg)', border: '1px solid var(--nt-border)', color: 'var(--nt-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaTimes /></button>
              </div>
              <form onSubmit={atualizarProfessor}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 18, gap: 8 }}>
                  <div style={{ position: 'relative' }}>
                    <Avatar professor={{ ...selectedProfessor, fotoUrl: formData.fotoUrl, foto: formData.foto } as Professor} size={72} />
                    {formData.fotoFile instanceof File && (
                      <div style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--nt-primary)', color: '#fff', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, border: '2px solid #fff' }}>✓</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input type="file" id="fotoUploadProfessor" accept="image/*" style={{ display: 'none' }}
                      onChange={async e => {
                        const file = e.target.files?.[0]; if (!file) return;
                        if (!file.type.startsWith('image/')) { alert('Selecione uma imagem.'); return; }
                        if (file.size > 5 * 1024 * 1024) { alert('Máximo 5 MB.'); return; }
                        const url = await fileToBase64(file);
                        setFormData(prev => ({ ...prev, fotoUrl: url, fotoFile: file }));
                      }} />
                    <label htmlFor="fotoUploadProfessor" style={{ fontSize: 14, color: 'var(--nt-text-muted)', cursor: 'pointer', padding: '4px 10px', border: '1px solid var(--nt-border)', borderRadius: 6 }}>
                      📷 Trocar foto
                    </label>
                    {formData.fotoFile instanceof File && (
                      <button type="button" style={{ fontSize: 14, color: '#dc2626', padding: '4px 10px', border: '1px solid var(--nt-border)', borderRadius: 6, cursor: 'pointer', background: 'transparent' }}
                        onClick={() => { setFormData(prev => ({ ...prev, fotoUrl: selectedProfessor.fotoUrl || selectedProfessor.foto, fotoFile: undefined })); const i = document.getElementById('fotoUploadProfessor') as any; if (i) i.value = ''; }}>
                        ✕ Cancelar
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={fieldLabelStyle}>Matrícula</label>
                    <input name="matricula" value={formData.matricula || ''} onChange={handleFormChange} style={fieldInputStyle} />
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>Data Cadastro</label>
                    <input name="dataAtual" type="date" value={formData.dataAtual || ''} onChange={handleFormChange} style={fieldInputStyle} />
                  </div>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={fieldLabelStyle}>Nome Completo</label>
                    <input name="nomeCompleto" value={formData.nomeCompleto || ''} onChange={handleFormChange} required style={fieldInputStyle} />
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>Data Nascimento</label>
                    <input name="dataNascimento" type="date" value={formData.dataNascimento || ''} onChange={handleFormChange} style={fieldInputStyle} />
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>Sexo</label>
                    <select name="sexo" value={formData.sexo || ''} onChange={handleFormChange} style={fieldInputStyle}>
                      <option value="">Selecione</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Feminino">Feminino</option>
                    </select>
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>Idade</label>
                    <input name="idade" value={formData.idade || ''} onChange={handleFormChange} style={fieldInputStyle} />
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>Curso</label>
                    <select name="turma" value={formData.turma || ''} onChange={handleFormChange} style={fieldInputStyle}>
                      <option value="">Selecione um curso</option>
                      {turmasList.map(turma => <option key={turma} value={turma}>{turma}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>RG</label>
                    <input name="rg" value={formData.rg || ''} onChange={handleFormChange} style={fieldInputStyle} />
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>CPF</label>
                    <input name="cpf" value={formData.cpf || ''} onChange={handleFormChange} style={fieldInputStyle} />
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>Telefone</label>
                    <input name="telefone" value={formData.telefone || ''} onChange={handleFormChange} style={fieldInputStyle} />
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>Email</label>
                    <input name="email" type="email" value={formData.email || ''} onChange={handleFormChange} style={fieldInputStyle} />
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>Especialidade</label>
                    <input name="especialidade" value={formData.especialidade || ''} onChange={handleFormChange} style={fieldInputStyle} />
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>Formação</label>
                    <input name="formacao" value={formData.formacao || ''} onChange={handleFormChange} style={fieldInputStyle} />
                  </div>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={fieldLabelStyle}>Experiência</label>
                    <input name="experiencia" value={formData.experiencia || ''} onChange={handleFormChange} style={fieldInputStyle} />
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>CEP</label>
                    <input name="cep" value={formData.cep || ''} onChange={handleFormChange} style={fieldInputStyle} />
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>Endereço</label>
                    <input name="endereco" value={formData.endereco || ''} onChange={handleFormChange} style={fieldInputStyle} />
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>Bairro</label>
                    <input name="bairro" value={formData.bairro || ''} onChange={handleFormChange} style={fieldInputStyle} />
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>Cidade</label>
                    <input name="cidade" value={formData.cidade || ''} onChange={handleFormChange} style={fieldInputStyle} />
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>UF</label>
                    <input name="uf" value={formData.uf || ''} onChange={handleFormChange} style={fieldInputStyle} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '8px 16px', borderRadius: 7, border: '1px solid var(--nt-border)', background: 'transparent', color: 'var(--nt-text-secondary)', fontSize: 15, cursor: 'pointer' }}>Cancelar</button>
                  <button type="submit" disabled={saving || uploadingFoto} style={{ padding: '8px 20px', borderRadius: 7, border: 'none', background: 'var(--nt-primary)', color: '#fff', fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>
                    {uploadingFoto ? 'Enviando foto...' : saving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Criar Login */}
        {loginModalProfessor && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 400, boxShadow: '0 24px 64px rgba(0,0,0,.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>🔑 Criar Login</div>
                  <div style={{ fontSize: 12.5, color: '#6b7280', marginTop: 2 }}>{loginModalProfessor.nomeCompleto}</div>
                </div>
                <button onClick={() => setLoginModalProfessor(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#9ca3af' }}>×</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>E-mail</label>
                  <input type="email" placeholder="email@exemplo.com" value={loginForm.email}
                    onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                    style={{ width: '100%', height: 40, padding: '0 12px', border: '1px solid #d1d5db', borderRadius: 9, fontSize: 14, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Senha inicial</label>
                  <input type="password" placeholder="Mínimo 6 caracteres" value={loginForm.senha}
                    onChange={e => setLoginForm(f => ({ ...f, senha: e.target.value }))}
                    style={{ width: '100%', height: 40, padding: '0 12px', border: '1px solid #d1d5db', borderRadius: 9, fontSize: 14, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }} />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button
                    onClick={criarLogin}
                    disabled={loginSaving || !loginForm.email || loginForm.senha.length < 6}
                    style={{ flex: 1, height: 40, background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: loginSaving || !loginForm.email || loginForm.senha.length < 6 ? 'not-allowed' : 'pointer', opacity: loginSaving || !loginForm.email || loginForm.senha.length < 6 ? 0.6 : 1 }}>
                    {loginSaving ? 'Criando...' : 'Criar Login'}
                  </button>
                  <button onClick={() => setLoginModalProfessor(null)} style={{ flex: 1, height: 40, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                </div>
              </div>
              <div style={{ marginTop: 12, fontSize: 11.5, color: '#9ca3af', background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
                💡 O professor usará este e-mail e senha para acessar o portal do professor.
              </div>
            </div>
          </div>
        )}

        {confirmDelete && (
          <ConfirmDialog title="Excluir Professor"
            message={`Deseja excluir permanentemente "${confirmDelete.nomeCompleto}"? Esta ação não pode ser desfeita.`}
            confirmLabel="Excluir" onConfirm={() => handleDelete(confirmDelete)} onCancel={() => setConfirmDelete(null)} />
        )}
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </Layout>
    </>
  );
}
