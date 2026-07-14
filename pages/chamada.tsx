import Head from 'next/head';
import Layout from '../components/layout/Layout';
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FaCheckCircle, FaTimesCircle, FaUser, FaSave,
  FaClipboardList, FaChevronDown, FaCalendarAlt,
} from 'react-icons/fa';
import Toast from '../components/ui/Toast';

interface Aluno {
  id: number;
  nomeCompleto: string;
  turma?: string;
  fotoUrl?: string;
  foto?: string;
}

type Presenca = 'presente' | 'falta' | null;

interface RegistroChamada {
  id?: number;
  aluno_id: number;
  data: string;
  turma: string;
  presenca: 'presente' | 'falta';
  observacao?: string;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

function fmtData(d: string) {
  const [y, m, dia] = d.split('-');
  return `${dia}/${m}/${y}`;
}

// Turmas buscadas dinamicamente do Supabase

// ── query functions ───────────────────────────────────────────────────────────

async function fetchAlunos(turma: string): Promise<Aluno[]> {
  const { data, error } = await supabase
    .from('Alunos')
    .select('id, nomeCompleto, turma, fotoUrl')
    .eq('turma', turma)
    .order('nomeCompleto');
  if (error) throw new Error(error.message);
  return data || [];
}

async function fetchChamadaExistente(turma: string, data: string): Promise<Record<number, Presenca>> {
  const { data: registros } = await supabase
    .from('chamadas')
    .select('aluno_id, presenca')
    .eq('turma', turma)
    .eq('data', data);

  const mapa: Record<number, Presenca> = {};
  (registros || []).forEach((r: any) => { mapa[r.aluno_id] = r.presenca; });
  return mapa;
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ aluno, size = 40 }: { aluno: Aluno; size?: number }) {
  const src = aluno.fotoUrl || aluno.foto;
  const initials = aluno.nomeCompleto.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  if (src) {
    return <img src={src} alt={aluno.nomeCompleto} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', objectPosition: 'center top', flexShrink: 0, border: '2px solid var(--nt-border)' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: 'var(--nt-primary-pale)', color: 'var(--nt-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size * 0.33 }}>
      {initials}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Chamada() {
  const queryClient = useQueryClient();
  const [turmaSel, setTurmaSel] = useState('');

  // Buscar turmas reais do banco
  const { data: turmasDisponiveis = [] } = useQuery({
    queryKey: ['turmas-lista'],
    queryFn: async () => {
      const { data } = await supabase.from('Alunos').select('turma').not('turma', 'is', null);
      const unicas = [...new Set((data || []).map((a: any) => a.turma).filter(Boolean))].sort();
      return unicas as string[];
    },
  });
  const [dataSel, setDataSel] = useState(hoje());
  const [presencas, setPresencas] = useState<Record<number, Presenca>>({});
  const [obs, setObs] = useState<Record<number, string>>({});
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'warning' } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [chamadaSalva, setChamadaSalva] = useState(false);

  // Alunos da turma
  const { data: alunos = [], isLoading } = useQuery({
    queryKey: ['alunos-chamada', turmaSel],
    queryFn: () => fetchAlunos(turmaSel),
  });

  // Chamada já registrada nesse dia/turma
  const { data: chamadaExistente = {}, isLoading: loadingChamada } = useQuery({
    queryKey: ['chamada-existente', turmaSel, dataSel],
    queryFn: () => fetchChamadaExistente(turmaSel, dataSel),
  });

  // Seleciona a primeira turma automaticamente quando a lista carrega
  useEffect(() => {
    if (turmasDisponiveis.length > 0 && !turmaSel) {
      setTurmaSel(turmasDisponiveis[0]);
    }
  }, [turmasDisponiveis, turmaSel]);

  // Carrega presenças existentes quando a chamada do dia é buscada
  useEffect(() => {
    if (chamadaExistente && Object.keys(chamadaExistente).length > 0) {
      setPresencas(chamadaExistente);
      setChamadaSalva(true);
    } else {
      setChamadaSalva(false);
    }
  }, [chamadaExistente]);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => setToast({ message, type });

  // Marcar todos presentes
  const marcarTodos = (status: 'presente' | 'falta') => {
    const novo: Record<number, Presenca> = {};
    alunos.forEach(a => { novo[a.id] = status; });
    setPresencas(novo);
  };

  const toggle = (id: number, status: 'presente' | 'falta') => {
    setPresencas(prev => ({ ...prev, [id]: prev[id] === status ? null : status }));
  };

  // Estatísticas rápidas
  const totalPresentes = alunos.filter(a => presencas[a.id] === 'presente').length;
  const totalFaltas = alunos.filter(a => presencas[a.id] === 'falta').length;
  const totalNaoMarcado = alunos.filter(a => !presencas[a.id]).length;
  const pct = alunos.length > 0 ? Math.round((totalPresentes / alunos.length) * 100) : 0;

  // Salvar
  const salvarChamada = async () => {
    const naoMarcados = alunos.filter(a => !presencas[a.id]);
    if (naoMarcados.length > 0) {
      showToast(`${naoMarcados.length} aluno(s) sem marcação. Marque todos antes de salvar.`, 'warning');
      return;
    }
    setSalvando(true);
    try {
      // Upsert — se já existir registro para aluno+data+turma, atualiza
      const registros: RegistroChamada[] = alunos.map(a => ({
        aluno_id: a.id,
        data: dataSel,
        turma: turmaSel,
        presenca: presencas[a.id] as 'presente' | 'falta',
        observacao: obs[a.id] || undefined,
      }));

      const { error } = await supabase
        .from('chamadas')
        .upsert(registros, { onConflict: 'aluno_id,data,turma' });

      if (error) throw new Error(error.message);

      queryClient.invalidateQueries({ queryKey: ['chamada-existente', turmaSel, dataSel] });
      setChamadaSalva(true);
      showToast(`Chamada da ${turmaSel} salva com sucesso! ${totalPresentes} presentes, ${totalFaltas} faltas.`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao salvar chamada.', 'error');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <Head><title>Chamada — Zoe</title></Head>
      <Layout>
        <div className="nt-animate">

          {/* Header */}
          <div className="nt-page-header" style={{ marginBottom: 20 }}>
            <div>
              <h1 className="nt-page-title">Chamada</h1>
              <p className="nt-page-subtitle">Registre a presença dos alunos por turma</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="nt-card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '16px 20px', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              {/* Turma */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--nt-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Turma</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {turmasDisponiveis.map(t => (
                    <button
                      key={t}
                      onClick={() => { setTurmaSel(t); setPresencas({}); setChamadaSalva(false); }}
                      style={{
                        padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        border: turmaSel === t ? 'none' : '1px solid var(--nt-border)',
                        background: turmaSel === t ? 'var(--nt-primary)' : 'var(--nt-bg)',
                        color: turmaSel === t ? '#fff' : 'var(--nt-text-secondary)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {t.replace('Turma ', '')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--nt-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Data</label>
                <div style={{ position: 'relative' }}>
                  <FaCalendarAlt style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--nt-text-muted)', fontSize: 12, pointerEvents: 'none' }} />
                  <input
                    type="date"
                    value={dataSel}
                    onChange={e => { setDataSel(e.target.value); setPresencas({}); setChamadaSalva(false); }}
                    className="nt-input"
                    style={{ paddingLeft: 32, width: 160 }}
                  />
                </div>
              </div>

              {/* Ações rápidas */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--nt-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Marcar Todos</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => marcarTodos('presente')} className="nt-btn nt-btn-sm" style={{ background: '#e6faf5', color: '#16a34a', border: 'none', fontWeight: 600, gap: 6, display: 'flex', alignItems: 'center' }}>
                    <FaCheckCircle /> Todos Presentes
                  </button>
                  <button onClick={() => marcarTodos('falta')} className="nt-btn nt-btn-sm" style={{ background: '#fdf0ed', color: '#dc2626', border: 'none', fontWeight: 600, gap: 6, display: 'flex', alignItems: 'center' }}>
                    <FaTimesCircle /> Todos Faltaram
                  </button>
                </div>
              </div>

              {/* Status badge */}
              {chamadaSalva && (
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, background: '#e6faf5', color: '#16a34a', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                  <FaCheckCircle /> Chamada já registrada
                </div>
              )}
            </div>
          </div>

          {/* Stats rápidas */}
          {alunos.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Total', value: alunos.length, color: 'var(--nt-primary)', bg: 'var(--nt-primary-pale)' },
                { label: 'Presentes', value: totalPresentes, color: '#16a34a', bg: '#e6faf5' },
                { label: 'Faltas', value: totalFaltas, color: '#dc2626', bg: '#fdf0ed' },
                { label: '% Presença', value: `${pct}%`, color: pct >= 75 ? '#16a34a' : '#f5b849', bg: pct >= 75 ? '#e6faf5' : '#fff8e6' },
              ].map((s, i) => (
                <div key={i} style={{ background: 'var(--nt-surface)', borderRadius: 10, border: '1px solid var(--nt-border)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 8, background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15 }}>
                    {s.value}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--nt-text-muted)', fontWeight: 500 }}>{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Lista de alunos */}
          <div className="nt-card">
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--nt-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FaClipboardList style={{ color: 'var(--nt-primary)', fontSize: 14 }} />
                <span style={{ fontWeight: 700, fontSize: 14, fontFamily: 'Poppins, sans-serif' }}>
                  {turmaSel} — {fmtData(dataSel)}
                </span>
                <span style={{ fontSize: 11, color: 'var(--nt-text-muted)', background: 'var(--nt-bg)', padding: '2px 8px', borderRadius: 20 }}>
                  {alunos.length} aluno{alunos.length !== 1 ? 's' : ''}
                </span>
              </div>
              <button
                onClick={salvarChamada}
                disabled={salvando || alunos.length === 0}
                className="nt-btn nt-btn-primary nt-btn-sm"
                style={{ gap: 6, display: 'flex', alignItems: 'center' }}
              >
                <FaSave /> {salvando ? 'Salvando...' : 'Salvar Chamada'}
              </button>
            </div>

            {isLoading || loadingChamada ? (
              <div style={{ padding: 48, textAlign: 'center' }}>
                <div className="nt-spinner" style={{ margin: '0 auto 10px', width: 26, height: 26, borderWidth: 3 }} />
                <div style={{ fontSize: 13, color: 'var(--nt-text-muted)' }}>Carregando alunos...</div>
              </div>
            ) : alunos.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center' }}>
                <FaUser style={{ fontSize: 28, color: 'var(--nt-text-muted)', marginBottom: 10, opacity: 0.3 }} />
                <div style={{ fontSize: 13, color: 'var(--nt-text-muted)' }}>Nenhum aluno cadastrado nessa turma.</div>
              </div>
            ) : (
              <div>
                {alunos.map((aluno, i) => {
                  const status = presencas[aluno.id];
                  const presente = status === 'presente';
                  const falta = status === 'falta';

                  return (
                    <div
                      key={aluno.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '12px 20px',
                        borderBottom: i < alunos.length - 1 ? '1px solid var(--nt-border)' : 'none',
                        background: presente ? 'rgba(22,163,74,0.03)' : falta ? 'rgba(220,38,38,0.03)' : 'transparent',
                        transition: 'background 0.15s',
                      }}
                    >
                      {/* Número */}
                      <span style={{ width: 24, fontSize: 11, color: 'var(--nt-text-muted)', fontWeight: 600, flexShrink: 0, textAlign: 'right' }}>{i + 1}</span>

                      {/* Avatar */}
                      <Avatar aluno={aluno} size={36} />

                      {/* Nome */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--nt-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {aluno.nomeCompleto}
                        </div>
                        {obs[aluno.id] && (
                          <div style={{ fontSize: 11, color: 'var(--nt-text-muted)', marginTop: 2 }}>📝 {obs[aluno.id]}</div>
                        )}
                      </div>

                      {/* Observação */}
                      <input
                        type="text"
                        placeholder="Obs..."
                        value={obs[aluno.id] || ''}
                        onChange={e => setObs(prev => ({ ...prev, [aluno.id]: e.target.value }))}
                        className="nt-input"
                        style={{ width: 160, fontSize: 12, padding: '5px 10px', height: 32 }}
                      />

                      {/* Botões P / F */}
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => toggle(aluno.id, 'presente')}
                          style={{
                            width: 80, height: 34, borderRadius: 8, fontWeight: 700, fontSize: 12,
                            border: presente ? 'none' : '1.5px solid var(--nt-border)',
                            background: presente ? '#16a34a' : 'var(--nt-bg)',
                            color: presente ? '#fff' : 'var(--nt-text-muted)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                            transition: 'all 0.15s',
                          }}
                        >
                          <FaCheckCircle style={{ fontSize: 11 }} /> P
                        </button>
                        <button
                          onClick={() => toggle(aluno.id, 'falta')}
                          style={{
                            width: 80, height: 34, borderRadius: 8, fontWeight: 700, fontSize: 12,
                            border: falta ? 'none' : '1.5px solid var(--nt-border)',
                            background: falta ? '#dc2626' : 'var(--nt-bg)',
                            color: falta ? '#fff' : 'var(--nt-text-muted)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                            transition: 'all 0.15s',
                          }}
                        >
                          <FaTimesCircle style={{ fontSize: 11 }} /> F
                        </button>
                      </div>

                      {/* Status pill */}
                      <div style={{ width: 80, textAlign: 'center' }}>
                        {presente && <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', background: '#e6faf5', padding: '3px 10px', borderRadius: 20 }}>Presente</span>}
                        {falta && <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', background: '#fdf0ed', padding: '3px 10px', borderRadius: 20 }}>Falta</span>}
                        {!status && <span style={{ fontSize: 11, color: 'var(--nt-text-muted)' }}>—</span>}
                      </div>
                    </div>
                  );
                })}

                {/* Footer salvar */}
                <div style={{ padding: '14px 20px', borderTop: '1px solid var(--nt-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--nt-bg)' }}>
                  <div style={{ fontSize: 12.5, color: 'var(--nt-text-muted)' }}>
                    {totalNaoMarcado > 0
                      ? <span style={{ color: '#f5b849', fontWeight: 600 }}>⚠️ {totalNaoMarcado} aluno(s) sem marcação</span>
                      : <span style={{ color: '#16a34a', fontWeight: 600 }}>✅ Todos os alunos marcados</span>
                    }
                  </div>
                  <button
                    onClick={salvarChamada}
                    disabled={salvando || alunos.length === 0}
                    className="nt-btn nt-btn-primary"
                    style={{ gap: 8, display: 'flex', alignItems: 'center' }}
                  >
                    <FaSave /> {salvando ? 'Salvando...' : 'Salvar Chamada'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </Layout>
    </>
  );
}
