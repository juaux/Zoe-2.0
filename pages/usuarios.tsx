import Head from 'next/head';
import Layout from '../components/layout/Layout';
import { useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from './api/auth/[...nextauth]';
import {
  FaUserShield, FaChalkboardTeacher, FaUserGraduate,
  FaSearch, FaPlus, FaKey, FaTrash, FaToggleOn, FaToggleOff,
  FaTimes, FaCheckCircle, FaExclamationCircle, FaLink, FaUnlink,
  FaSync,
} from 'react-icons/fa';

/* ─── Tipos ─── */
interface Usuario {
  id: number;
  nome: string;
  email: string;
  perfil: 'admin' | 'professor' | 'aluno';
  ativo: boolean;
  aluno_id: number | null;
  professor_id: number | null;
  created_at?: string;
}
interface AlunoRow    { id: number; nomeCompleto: string; turma?: string; fotoUrl?: string; }
interface TreinRow    { id: number; nomeCompleto: string; especialidade?: string; fotoUrl?: string; }

/* ─── Paleta por perfil ─── */
const P: Record<string, { cor: string; bg: string; label: string; icon: React.ReactNode }> = {
  admin:     { cor: '#FF4403', bg: '#fff2f0', label: 'Administrador', icon: <FaUserShield /> },
  professor: { cor: '#26bf94', bg: '#e6faf5', label: 'Professor',    icon: <FaChalkboardTeacher /> },
  aluno:     { cor: '#4bc5e8', bg: '#edf8fd', label: 'Aluno',        icon: <FaUserGraduate /> },
};

function initials(n: string) { return n.split(' ').slice(0, 2).map(x => x[0]).join('').toUpperCase(); }

function Avatar({ nome, foto, cor, bg, size = 36 }: { nome: string; foto?: string; cor: string; bg: string; size?: number }) {
  return foto
    ? <img src={foto} alt={nome} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', objectPosition: 'center top', flexShrink: 0, border: `2px solid ${cor}33` }} />
    : <div style={{ width: size, height: size, borderRadius: '50%', background: bg, color: cor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size * 0.33, flexShrink: 0 }}>{initials(nome)}</div>;
}

/* ─── Modal de senha ─── */
function ModalSenha({ nome, onSalvar, onClose }: { nome: string; onSalvar: (s: string) => void; onClose: () => void }) {
  const [senha, setSenha] = useState('');
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 380, boxShadow: '0 24px 64px rgba(0,0,0,.25)' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 4 }}>🔑 Alterar senha</div>
        <div style={{ fontSize: 12.5, color: '#6b7280', marginBottom: 18 }}>{nome}</div>
        <div style={{ position: 'relative', marginBottom: 18 }}>
          <input type={show ? 'text' : 'password'} placeholder="Nova senha (mín. 6 caracteres)" value={senha}
            onChange={e => setSenha(e.target.value)}
            style={{ width: '100%', height: 42, padding: '0 40px 0 12px', border: '1px solid #d1d5db', borderRadius: 9, fontSize: 14, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }} />
          <button type="button" onClick={() => setShow(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#9ca3af' }}>{show ? '🙈' : '👁'}</button>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => senha.length >= 6 && onSalvar(senha)} disabled={senha.length < 6}
            style={{ flex: 1, height: 40, background: '#FF4403', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: senha.length < 6 ? 'not-allowed' : 'pointer', opacity: senha.length < 6 ? 0.6 : 1 }}>
            Salvar
          </button>
          <button onClick={onClose} style={{ flex: 1, height: 40, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Modal criar usuário ─── */
function ModalNovoUsuario({ alunos, professores, onCriado, onClose }: {
  alunos: AlunoRow[]; professores: TreinRow[];
  onCriado: (msg: string) => void; onClose: () => void;
}) {
  const [form, setForm] = useState({ nome: '', email: '', senha: '', perfil: 'aluno' as 'admin' | 'professor' | 'aluno', aluno_id: '', professor_id: '' });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [showSenha, setShowSenha] = useState(false);

  const pc = P[form.perfil];

  // Auto-preenche nome/email ao selecionar vínculo
  const handleAlunoId = (id: string) => {
    setForm(f => {
      const a = alunos.find(x => x.id === Number(id));
      return { ...f, aluno_id: id, nome: a?.nomeCompleto || f.nome };
    });
  };
  const handleTreinId = (id: string) => {
    setForm(f => {
      const t = professores.find(x => x.id === Number(id));
      return { ...f, professor_id: id, nome: t?.nomeCompleto || f.nome };
    });
  };

  const criar = async () => {
    if (!form.nome || !form.email || !form.senha) { setErro('Nome, email e senha são obrigatórios.'); return; }
    if (form.senha.length < 6) { setErro('Senha deve ter pelo menos 6 caracteres.'); return; }
    setSalvando(true); setErro('');
    const body: any = { nome: form.nome, email: form.email.trim().toLowerCase(), senha: form.senha, perfil: form.perfil };
    if (form.perfil === 'aluno' && form.aluno_id) body.aluno_id = Number(form.aluno_id);
    if (form.perfil === 'professor' && form.professor_id) body.professor_id = Number(form.professor_id);
    const res = await fetch('/api/auth/criar-usuario', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (res.ok) { onCriado(`✅ Login criado para "${form.nome}" — email: ${form.email}`); }
    else setErro(data.error || 'Erro ao criar usuário.');
    setSalvando(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 520, maxWidth: '100%', boxShadow: '0 28px 80px rgba(0,0,0,.25)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Novo usuário / login</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Crie acesso ao sistema para aluno, professor ou admin</div>
          </div>
          <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#6b7280', fontSize: 14 }}><FaTimes /></button>
        </div>

        {erro && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#dc2626', display: 'flex', gap: 8, alignItems: 'center' }}>
            <FaExclamationCircle /> {erro}
          </div>
        )}

        {/* Perfil (escolha visual) */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Perfil de acesso</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['aluno', 'professor', 'admin'] as const).map(p => (
              <button key={p} onClick={() => setForm(f => ({ ...f, perfil: p, aluno_id: '', professor_id: '' }))}
                style={{ flex: 1, padding: '10px 8px', borderRadius: 10, border: `2px solid ${form.perfil === p ? P[p].cor : '#e5e7eb'}`, background: form.perfil === p ? P[p].bg : '#fafafa', cursor: 'pointer', transition: 'all .15s' }}>
                <div style={{ fontSize: 18, marginBottom: 4, color: P[p].cor }}>{P[p].icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: form.perfil === p ? P[p].cor : '#6b7280' }}>{P[p].label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Vínculo */}
        {form.perfil === 'aluno' && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <FaLink style={{ marginRight: 5 }} />Vincular ao aluno cadastrado
            </div>
            <select value={form.aluno_id} onChange={e => handleAlunoId(e.target.value)}
              style={{ width: '100%', height: 40, padding: '0 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13.5, background: '#fff', fontFamily: 'inherit', outline: 'none', cursor: 'pointer', boxSizing: 'border-box' }}>
              <option value="">— Selecione o aluno (opcional) —</option>
              {alunos.map(a => <option key={a.id} value={a.id}>{a.nomeCompleto}{a.turma ? ` · ${a.turma}` : ''}</option>)}
            </select>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>O nome será preenchido automaticamente. Sem aluno vinculado: acesso genérico de aluno.</div>
          </div>
        )}
        {form.perfil === 'professor' && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <FaLink style={{ marginRight: 5 }} />Vincular ao professor cadastrado
            </div>
            <select value={form.professor_id} onChange={e => handleTreinId(e.target.value)}
              style={{ width: '100%', height: 40, padding: '0 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13.5, background: '#fff', fontFamily: 'inherit', outline: 'none', cursor: 'pointer', boxSizing: 'border-box' }}>
              <option value="">— Selecione o professor (opcional) —</option>
              {professores.map(t => <option key={t.id} value={t.id}>{t.nomeCompleto}{t.especialidade ? ` · ${t.especialidade}` : ''}</option>)}
            </select>
          </div>
        )}

        {/* Campos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Nome completo *</label>
            <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome do usuário"
              style={{ width: '100%', height: 40, padding: '0 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13.5, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }} />
          </div>
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Email (login) *</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com"
              style={{ width: '100%', height: 40, padding: '0 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13.5, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }} />
          </div>
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Senha inicial *</label>
            <div style={{ position: 'relative' }}>
              <input type={showSenha ? 'text' : 'password'} value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} placeholder="Mínimo 6 caracteres"
                style={{ width: '100%', height: 40, padding: '0 36px 0 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13.5, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }} />
              <button type="button" onClick={() => setShowSenha(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 13 }}>{showSenha ? '🙈' : '👁'}</button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={criar} disabled={salvando}
            style={{ flex: 1, height: 42, background: pc.cor, color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {salvando ? <><FaSync style={{ animation: 'spin .7s linear infinite' }} /> Criando...</> : <><FaPlus /> Criar {pc.label}</>}
          </button>
          <button onClick={onClose} style={{ height: 42, padding: '0 20px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
═══════════════════════════════════════════════════════ */
export default function Usuarios() {
  const [busca,    setBusca]    = useState('');
  const [filtroPerfil, setFiltro] = useState<'todos'|'admin'|'professor'|'aluno'>('todos');
  const [showModal, setShowModal] = useState(false);
  const [modalSenha, setModalSenha] = useState<{ id: number; nome: string } | null>(null);
  const [msg, setMsg] = useState<{ tipo: 'ok'|'erro'; texto: string } | null>(null);
  const queryClient = useQueryClient();

  const { data: usuarios = [], isLoading: loadingU, refetch: refetchU } = useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const res = await fetch('/api/auth/listar-usuarios');
      return res.ok ? (await res.json()) as Usuario[] : [];
    },
    staleTime: 1000 * 60 * 1,
  });

  const { data: alunos = [], isLoading: loadingAl } = useQuery({
    queryKey: ['alunos-basico'],
    queryFn: async () => {
      const { data } = await supabase.from('Alunos').select('id, nomeCompleto, turma, fotoUrl').order('nomeCompleto');
      return (data || []) as AlunoRow[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: professores = [], isLoading: loadingTr } = useQuery({
    queryKey: ['professores-basico'],
    queryFn: async () => {
      const { data } = await supabase.from('Professores').select('id, nomeCompleto, especialidade, fotoUrl').order('nomeCompleto');
      return (data || []) as TreinRow[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const loading = loadingU || loadingAl || loadingTr;
  const carregar = useCallback(() => { queryClient.invalidateQueries({ queryKey: ['usuarios'] }); }, [queryClient]);

  const showMsg = (tipo: 'ok'|'erro', texto: string) => {
    setMsg({ tipo, texto });
    if (tipo === 'ok') setTimeout(() => setMsg(null), 6000);
  };

  const toggleAtivo = async (u: Usuario) => {
    await fetch('/api/auth/listar-usuarios', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: u.id, ativo: !u.ativo }) });
    carregar();
  };

  const excluir = async (u: Usuario) => {
    if (!confirm(`Excluir o acesso de "${u.nome}"?\n\nEsta ação não pode ser desfeita. O cadastro do aluno/professor permanece intacto.`)) return;
    await fetch('/api/auth/listar-usuarios', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: u.id }) });
    showMsg('ok', `Acesso de "${u.nome}" removido.`);
    carregar();
  };

  const alterarSenha = async (id: number, senha: string) => {
    const res = await fetch('/api/auth/listar-usuarios', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, senha }) });
    if (res.ok) { showMsg('ok', 'Senha alterada com sucesso!'); setModalSenha(null); }
    else showMsg('erro', 'Erro ao alterar senha.');
  };

  // Enriquece usuários com dados de aluno/professor
  const usuariosEnriquecidos = usuarios.map(u => {
    const aluno    = u.aluno_id     ? alunos.find(a => a.id === u.aluno_id)     : null;
    const professor = u.professor_id ? professores.find(t => t.id === u.professor_id) : null;
    return { ...u, aluno, professor };
  });

  const filtrados = usuariosEnriquecidos.filter(u => {
    const matchPerfil = filtroPerfil === 'todos' || u.perfil === filtroPerfil;
    const matchBusca  = !busca || u.nome.toLowerCase().includes(busca.toLowerCase()) || u.email.toLowerCase().includes(busca.toLowerCase());
    return matchPerfil && matchBusca;
  });

  const counts = {
    todos:     usuarios.length,
    admin:     usuarios.filter(u => u.perfil === 'admin').length,
    professor: usuarios.filter(u => u.perfil === 'professor').length,
    aluno:     usuarios.filter(u => u.perfil === 'aluno').length,
  };

  // Alunos sem login (para alerta)
  const alunoIdsComLogin = new Set(usuarios.filter(u => u.aluno_id).map(u => u.aluno_id));
  const alunosSemLogin = alunos.filter(a => !alunoIdsComLogin.has(a.id));

  return (
    <>
      <Head><title>Usuários — Zoe</title></Head>
      <Layout>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--nt-text-primary)', margin: 0 }}>Usuários do Sistema</h1>
              <p style={{ color: 'var(--nt-text-muted)', fontSize: 13, marginTop: 4 }}>
                Gerencie logins de acesso. Cada usuário é vinculado a um aluno ou professor cadastrado.
              </p>
            </div>
            <button onClick={() => setShowModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FF4403', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>
              <FaPlus /> Novo Usuário
            </button>
          </div>

          {/* Alerta alunos sem login */}
          {alunosSemLogin.length > 0 && (
            <div style={{ background: '#fff8e1', border: '1px solid #fbbf24', borderRadius: 10, padding: '12px 16px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
              <FaExclamationCircle style={{ color: '#d97706', flexShrink: 0, fontSize: 16 }} />
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>
                  {alunosSemLogin.length} aluno{alunosSemLogin.length > 1 ? 's' : ''} sem acesso ao sistema.
                </span>
                <span style={{ fontSize: 12.5, color: '#78350f', marginLeft: 8 }}>
                  Clique em "+ Novo Usuário" → perfil Aluno → vincule o aluno para criar o login.
                </span>
              </div>
            </div>
          )}

          {/* Msg feedback */}
          {msg && (
            <div style={{ background: msg.tipo === 'ok' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${msg.tipo === 'ok' ? '#86efac' : '#fecaca'}`, borderRadius: 9, padding: '11px 16px', marginBottom: 16, fontSize: 13, color: msg.tipo === 'ok' ? '#166534' : '#dc2626', display: 'flex', alignItems: 'center', gap: 10 }}>
              {msg.tipo === 'ok' ? <FaCheckCircle /> : <FaExclamationCircle />}
              <span style={{ flex: 1 }}>{msg.texto}</span>
              <button onClick={() => setMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 14 }}><FaTimes /></button>
            </div>
          )}

          {/* Cards de resumo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
            {([['todos','Todos','#374151','#f3f4f6'], ['admin','Admins','#FF4403','#fff2f0'], ['professor','Professores','#26bf94','#e6faf5'], ['aluno','Alunos','#4bc5e8','#edf8fd']] as const).map(([k, l, cor, bg]) => (
              <button key={k} onClick={() => setFiltro(k)}
                style={{ background: filtroPerfil === k ? bg : '#fff', border: `1.5px solid ${filtroPerfil === k ? cor : '#e5e7eb'}`, borderRadius: 10, padding: '12px 16px', cursor: 'pointer', textAlign: 'left', transition: 'all .15s' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: cor, lineHeight: 1 }}>{counts[k]}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>{l}</div>
              </button>
            ))}
          </div>

          {/* Busca */}
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <FaSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 13 }} />
            <input placeholder="Buscar por nome ou email..." value={busca} onChange={e => setBusca(e.target.value)}
              style={{ width: '100%', height: 40, paddingLeft: 36, paddingRight: 12, border: '1px solid var(--nt-border)', borderRadius: 8, fontSize: 13.5, color: 'var(--nt-text-primary)', fontFamily: 'inherit', outline: 'none', background: 'var(--nt-bg)', boxSizing: 'border-box' }} />
          </div>

          {/* Tabela */}
          <div style={{ background: 'var(--nt-surface)', borderRadius: 12, border: '1px solid var(--nt-border)', overflow: 'hidden' }}>
            {/* Cabeçalho */}
            <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 2fr 110px 100px 140px', gap: 12, padding: '10px 20px', background: 'var(--nt-bg)', borderBottom: '1px solid var(--nt-border)' }}>
              {['Usuário', 'Vínculo', 'Perfil', 'Status', 'Ações'].map(h => (
                <div key={h} style={{ fontSize: 11, fontWeight: 700, color: 'var(--nt-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</div>
              ))}
            </div>

            {loading ? (
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--nt-text-muted)', fontSize: 13 }}>Carregando...</div>
            ) : filtrados.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--nt-text-muted)', fontSize: 13 }}>Nenhum usuário encontrado.</div>
            ) : filtrados.map((u, i) => {
              const pc = P[u.perfil] || P.aluno;
              const vinculo = u.perfil === 'aluno' ? u.aluno : u.perfil === 'professor' ? u.professor : null;
              const foto = (vinculo as any)?.fotoUrl;
              const turmaOuEsp = u.perfil === 'aluno' ? (u.aluno as any)?.turma : (u.professor as any)?.especialidade;

              return (
                <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '2.5fr 2fr 110px 100px 140px', gap: 12, padding: '13px 20px', borderBottom: i < filtrados.length - 1 ? '1px solid var(--nt-border)' : 'none', alignItems: 'center', opacity: u.ativo ? 1 : 0.55, transition: 'background .1s', background: 'var(--nt-surface)' }}
                  onMouseEnter={e => (e.currentTarget as any).style.background = 'var(--nt-bg)'}
                  onMouseLeave={e => (e.currentTarget as any).style.background = 'var(--nt-surface)'}>

                  {/* Usuário */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <Avatar nome={u.nome} foto={foto} cor={pc.cor} bg={pc.bg} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--nt-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.nome}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--nt-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                    </div>
                  </div>

                  {/* Vínculo */}
                  <div style={{ minWidth: 0 }}>
                    {vinculo ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <FaLink style={{ color: pc.cor, fontSize: 10, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 12.5, color: 'var(--nt-text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(vinculo as any).nomeCompleto}</div>
                          {turmaOuEsp && <div style={{ fontSize: 11, color: pc.cor }}>{turmaOuEsp}</div>}
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#9ca3af' }}>
                        <FaUnlink style={{ fontSize: 10 }} />
                        <span style={{ fontSize: 12, fontStyle: 'italic' }}>{u.perfil === 'admin' ? 'Administrador' : 'Sem vínculo'}</span>
                      </div>
                    )}
                  </div>

                  {/* Perfil */}
                  <div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: pc.cor, background: pc.bg, padding: '4px 10px', borderRadius: 20 }}>
                      {pc.icon} {pc.label}
                    </span>
                  </div>

                  {/* Status */}
                  <div>
                    <button onClick={() => toggleAtivo(u)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: u.ativo ? '#16a34a' : '#9ca3af', background: u.ativo ? '#f0fdf4' : '#f9fafb', border: `1px solid ${u.ativo ? '#bbf7d0' : '#e5e7eb'}`, padding: '4px 10px', borderRadius: 20, cursor: 'pointer' }}>
                      {u.ativo ? <FaToggleOn style={{ fontSize: 13 }} /> : <FaToggleOff style={{ fontSize: 13 }} />}
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </button>
                  </div>

                  {/* Ações */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setModalSenha({ id: u.id, nome: u.nome })} title="Alterar senha"
                      style={{ display: 'flex', alignItems: 'center', gap: 4, height: 30, padding: '0 10px', background: 'var(--nt-bg)', border: '1px solid var(--nt-border)', borderRadius: 6, cursor: 'pointer', color: 'var(--nt-text-secondary)', fontSize: 11.5 }}>
                      <FaKey style={{ fontSize: 10 }} /> Senha
                    </button>
                    {u.perfil !== 'admin' && (
                      <button onClick={() => excluir(u)} title="Remover acesso"
                        style={{ display: 'flex', alignItems: 'center', height: 30, padding: '0 9px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', color: '#dc2626', fontSize: 12 }}>
                        <FaTrash />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legenda / explicação lógica */}
          <div style={{ marginTop: 20, background: 'var(--nt-surface)', borderRadius: 12, border: '1px solid var(--nt-border)', padding: '16px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--nt-text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.07em' }}>📋 Como funciona</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, fontSize: 12.5, color: 'var(--nt-text-secondary)', lineHeight: 1.6 }}>
              <div>
                <div style={{ fontWeight: 700, color: '#FF4403', marginBottom: 4 }}>👤 Tabela Usuários</div>
                Armazena logins de acesso (email + senha). É o que permite entrar no sistema. Um usuário aluno <em>deve</em> estar vinculado a um registro na tabela Alunos.
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#26bf94', marginBottom: 4 }}>📋 Tabela Alunos</div>
                Contém os dados completos do aluno (nome, turma, fotos, frequência…). Um aluno pode existir sem login — o admin cadastra primeiro o aluno, depois cria o login para ele acessar o portal.
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#4bc5e8', marginBottom: 4 }}>🔗 Vínculo aluno_id</div>
                Quando um usuário tem <code>aluno_id</code>, o portal exibe os dados daquele aluno. Se não tiver vínculo, o portal não sabe qual aluno mostrar — por isso é importante vincular.
              </div>
            </div>
          </div>
        </div>

        {/* Modais */}
        {showModal && (
          <ModalNovoUsuario alunos={alunos} professores={professores}
            onCriado={msg => { showMsg('ok', msg); setShowModal(false); carregar(); }}
            onClose={() => setShowModal(false)} />
        )}
        {modalSenha && (
          <ModalSenha nome={modalSenha.nome}
            onSalvar={s => alterarSenha(modalSenha.id, s)}
            onClose={() => setModalSenha(null)} />
        )}
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (!session || (session.user as any).perfil !== 'admin') {
    return { redirect: { destination: '/signIn', permanent: false } };
  }
  return { props: {} };
};
