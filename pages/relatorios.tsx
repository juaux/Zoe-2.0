import Head from 'next/head';
import Layout from '../components/layout/Layout';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { GetServerSideProps } from 'next';
import { getSession } from 'next-auth/react';
import {
  FaChartBar, FaExclamationTriangle, FaDownload, FaUsers,
  FaCheckCircle, FaTimesCircle, FaCalendarAlt, FaFilter,
  FaUserAlt, FaClipboardList, FaTrophy, FaSyncAlt,
} from 'react-icons/fa';

// ── helpers ──────────────────────────────────────────────────────────────────
function getMesAtual() { return new Date().getMonth() + 1; }
function getAnoAtual() { return new Date().getFullYear(); }
function nomeMes(m: number) {
  return ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
          'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][m - 1];
}
function pctColor(p: number) {
  if (p >= 75) return '#16a34a';
  if (p >= 50) return '#d97706';
  return '#dc2626';
}
function pctBg(p: number) {
  if (p >= 75) return '#f0fdf4';
  if (p >= 50) return '#fffbeb';
  return '#fef2f2';
}
function exportCSV(rows: any[], filename: string) {
  const keys = Object.keys(rows[0] || {});
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => `"${String(r[k] ?? '').replace(/"/g,'""')}"`).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename + '.csv'; a.click();
  URL.revokeObjectURL(url);
}

interface Aluno { id: number; nomeCompleto: string; turma?: string; dataNascimento?: string; }
interface ChamadaRow { aluno_id: number; presenca: string; data: string; turma: string; }

type Tab = 'geral' | 'alertas' | 'turmas' | 'historico';

export default function Relatorios() {
  const router = useRouter();
  const tabParam = router.query.tab as Tab | undefined;

  const [tab, setTab]         = useState<Tab>('geral');
  const [mes, setMes]         = useState(getMesAtual());
  const [ano, setAno]         = useState(getAnoAtual());
  const [filterTurma, setFilterTurma] = useState('');

  // sync tab com query param
  useEffect(() => {
    if (tabParam && ['geral','alertas','turmas','historico'].includes(tabParam)) {
      setTab(tabParam);
    }
  }, [tabParam]);

  const inicio = `${ano}-${String(mes).padStart(2,'0')}-01`;
  const fim    = `${ano}-${String(mes).padStart(2,'0')}-31`;

  const { data: alunos = [], isLoading: loadingAlunos } = useQuery({
    queryKey: ['relatorios-alunos'],
    queryFn: async () => {
      const { data } = await supabase.from('Alunos').select('id, nomeCompleto, turma, dataNascimento').order('nomeCompleto');
      return (data || []) as Aluno[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: chamadas = [], isLoading: loadingChamadas } = useQuery({
    queryKey: ['relatorios-chamadas', mes, ano],
    queryFn: async () => {
      const { data } = await supabase.from('chamadas').select('aluno_id, presenca, data, turma').gte('data', inicio).lte('data', fim);
      return (data || []) as ChamadaRow[];
    },
    staleTime: 1000 * 60 * 2,
  });

  const { data: turmasRaw = [] } = useQuery({
    queryKey: ['turmas-nomes'],
    queryFn: async () => {
      const { data } = await supabase.from('Turmas').select('nome').eq('ativo', true).order('nome');
      return data || [];
    },
    staleTime: 1000 * 60 * 10,
  });
  const turmas = turmasRaw.map((t: any) => t.nome);
  const loading = loadingAlunos || loadingChamadas;

  // ── cálculos ──────────────────────────────────────────────────────────────
  const alunosFiltrados = useMemo(() =>
    filterTurma ? alunos.filter(a => a.turma === filterTurma) : alunos,
    [alunos, filterTurma]
  );

  const statsAluno = useMemo(() => {
    return alunosFiltrados.map(a => {
      const rows = chamadas.filter(c => c.aluno_id === a.id);
      const total     = rows.length;
      const presentes = rows.filter(c => c.presenca === 'presente').length;
      const faltas    = rows.filter(c => c.presenca === 'falta').length;
      const pct       = total > 0 ? Math.round((presentes / total) * 100) : null;

      // maior sequência de presenças
      let streak = 0, maxStreak = 0, cur = 0;
      const sorted = [...rows].sort((a, b) => a.data.localeCompare(b.data));
      sorted.forEach(r => { if (r.presenca === 'presente') { cur++; maxStreak = Math.max(maxStreak, cur); } else cur = 0; });

      return { ...a, total, presentes, faltas, pct, maxStreak };
    });
  }, [alunosFiltrados, chamadas]);

  const alertas = useMemo(() =>
    statsAluno.filter(a => a.pct !== null && a.pct < 75).sort((a, b) => (a.pct ?? 100) - (b.pct ?? 100)),
    [statsAluno]
  );

  const statsTurma = useMemo(() => {
    const listaT = filterTurma ? [filterTurma] : turmas;
    return listaT.map(t => {
      const alunosT = alunos.filter(a => a.turma === t);
      const rows    = chamadas.filter(c => c.turma === t);
      const dias    = [...new Set(rows.map(r => r.data))].length;
      const presT   = rows.filter(c => c.presenca === 'presente').length;
      const faltT   = rows.filter(c => c.presenca === 'falta').length;
      const total   = presT + faltT;
      const pct     = total > 0 ? Math.round(presT / total * 100) : null;
      return { turma: t, alunos: alunosT.length, dias, presentes: presT, faltas: faltT, pct };
    });
  }, [alunos, chamadas, turmas, filterTurma]);

  // ── dias com chamada no mês ───────────────────────────────────────────────
  const diasComChamada = useMemo(() =>
    [...new Set(chamadas.map(c => c.data))].sort(), [chamadas]
  );

  // ── totais gerais ────────────────────────────────────────────────────────
  const totalPresencas = chamadas.filter(c => c.presenca === 'presente').length;
  const totalFaltas    = chamadas.filter(c => c.presenca === 'falta').length;
  const totalReg       = totalPresencas + totalFaltas;
  const pctGeral       = totalReg > 0 ? Math.round(totalPresencas / totalReg * 100) : null;

  // ── export ───────────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = statsAluno.map(a => ({
      Nome: a.nomeCompleto,
      Turma: a.turma || '—',
      'Aulas registradas': a.total,
      Presenças: a.presentes,
      Faltas: a.faltas,
      '% Frequência': a.pct !== null ? `${a.pct}%` : '—',
      'Maior sequência': a.maxStreak,
      Status: a.pct === null ? 'Sem registro' : a.pct >= 75 ? 'Regular' : a.pct >= 50 ? 'Atenção' : 'Crítico',
    }));
    exportCSV(rows, `frequencia_${nomeMes(mes)}_${ano}`);
  };

  // ── UI ───────────────────────────────────────────────────────────────────
  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'geral',     label: 'Visão Geral',    icon: <FaChartBar /> },
    { id: 'alertas',   label: `Alertas${alertas.length > 0 ? ` (${alertas.length})` : ''}`, icon: <FaExclamationTriangle /> },
    { id: 'turmas',    label: 'Por Turma',      icon: <FaUsers /> },
    { id: 'historico', label: 'Por Aluno',      icon: <FaUserAlt /> },
  ];

  const meses = Array.from({ length: 12 }, (_, i) => ({ val: i + 1, label: nomeMes(i + 1) }));
  const anos  = [getAnoAtual() - 1, getAnoAtual()];

  return (
    <>
      <Head><title>Relatórios — Zoe</title></Head>
      <Layout>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--nt-text-primary)', margin: 0 }}>Relatórios de Frequência</h1>
              <p style={{ fontSize: 13, color: 'var(--nt-text-muted)', margin: '3px 0 0' }}>{nomeMes(mes)} {ano}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Filtro mês/ano */}
              <select value={mes} onChange={e => setMes(Number(e.target.value))}
                style={{ height: 36, padding: '0 10px', border: '1px solid var(--nt-border)', borderRadius: 8, fontSize: 13, color: 'var(--nt-text-primary)', fontFamily: 'inherit', outline: 'none', background: 'var(--nt-surface)', cursor: 'pointer' }}>
                {meses.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
              </select>
              <select value={ano} onChange={e => setAno(Number(e.target.value))}
                style={{ height: 36, padding: '0 10px', border: '1px solid var(--nt-border)', borderRadius: 8, fontSize: 13, color: 'var(--nt-text-primary)', fontFamily: 'inherit', outline: 'none', background: 'var(--nt-surface)', cursor: 'pointer' }}>
                {anos.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <select value={filterTurma} onChange={e => setFilterTurma(e.target.value)}
                style={{ height: 36, padding: '0 10px', border: '1px solid var(--nt-border)', borderRadius: 8, fontSize: 13, color: 'var(--nt-text-primary)', fontFamily: 'inherit', outline: 'none', background: 'var(--nt-surface)', cursor: 'pointer' }}>
                <option value="">Todas as turmas</option>
                {turmas.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <button onClick={handleExport}
                style={{ height: 36, padding: '0 14px', background: 'var(--nt-primary)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'inherit' }}>
                <FaDownload style={{ fontSize: 11 }} /> Exportar CSV
              </button>
            </div>
          </div>

          {/* KPIs gerais */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {[
              { label: 'Alunos',        val: alunosFiltrados.length, icon: <FaUserAlt />,       color: '#FF4403', bg: '#fff2f0' },
              { label: 'Dias de aula',  val: diasComChamada.length,  icon: <FaCalendarAlt />,   color: '#4bc5e8', bg: '#edf8fd' },
              { label: 'Presenças',     val: totalPresencas,         icon: <FaCheckCircle />,   color: '#16a34a', bg: '#f0fdf4' },
              { label: 'Faltas',        val: totalFaltas,            icon: <FaTimesCircle />,   color: '#dc2626', bg: '#fef2f2' },
              { label: 'Freq. geral',   val: pctGeral !== null ? `${pctGeral}%` : '—', icon: <FaChartBar />, color: pctGeral !== null ? pctColor(pctGeral) : '#9ca3af', bg: pctGeral !== null ? pctBg(pctGeral) : '#f9fafb' },
              { label: 'Em alerta',     val: alertas.length,         icon: <FaExclamationTriangle />, color: '#d97706', bg: '#fffbeb' },
            ].map(k => (
              <div key={k.label} style={{ background: 'var(--nt-surface)', borderRadius: 12, border: '1px solid var(--nt-border)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: k.bg, color: k.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{k.icon}</div>
                <div>
                  {loading
                    ? <div style={{ width: 36, height: 18, background: 'var(--nt-border)', borderRadius: 4, marginBottom: 4 }} />
                    : <div style={{ fontSize: 20, fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.val}</div>
                  }
                  <div style={{ fontSize: 11.5, color: 'var(--nt-text-muted)', marginTop: 3 }}>{k.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--nt-border)', overflowX: 'auto' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === t.id ? 600 : 400, color: tab === t.id ? 'var(--nt-primary)' : 'var(--nt-text-muted)', borderBottom: tab === t.id ? '2px solid var(--nt-primary)' : '2px solid transparent', marginBottom: -1, whiteSpace: 'nowrap', fontFamily: 'inherit', transition: 'color .12s' }}>
                <span style={{ fontSize: 12 }}>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--nt-text-muted)' }}>
              <FaSyncAlt style={{ fontSize: 22, animation: 'spin 1s linear infinite', marginBottom: 10 }} />
              <div>Carregando dados...</div>
            </div>
          ) : (
            <>
              {/* ── VISÃO GERAL ── */}
              {tab === 'geral' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14 }}>
                  {/* Calendário de chamadas */}
                  <div style={{ background: 'var(--nt-surface)', borderRadius: 12, border: '1px solid var(--nt-border)', padding: '16px 20px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--nt-text-primary)', marginBottom: 12 }}>Dias com chamada — {nomeMes(mes)}</div>
                    {diasComChamada.length === 0 ? (
                      <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--nt-text-muted)', fontSize: 13 }}>Nenhuma chamada registrada neste mês.</div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {diasComChamada.map(d => {
                          const dia = new Date(d + 'T12:00:00').getDate();
                          const rows = chamadas.filter(c => c.data === d);
                          const pres = rows.filter(c => c.presenca === 'presente').length;
                          const tot  = rows.length;
                          const p    = tot > 0 ? Math.round(pres / tot * 100) : 0;
                          return (
                            <div key={d} title={`${dia}/${mes} — ${pres}/${tot} (${p}%)`}
                              style={{ width: 44, height: 52, borderRadius: 8, background: pctBg(p), border: `1px solid ${pctColor(p)}30`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: pctColor(p) }}>{String(dia).padStart(2,'0')}</span>
                              <span style={{ fontSize: 9, color: pctColor(p), fontWeight: 600 }}>{p}%</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Top 5 melhores frequências */}
                  <div style={{ background: 'var(--nt-surface)', borderRadius: 12, border: '1px solid var(--nt-border)', padding: '16px 18px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--nt-text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
                      <FaTrophy style={{ color: '#f5b849' }} /> Top 5 Frequência
                    </div>
                    {statsAluno.filter(a => a.pct !== null).sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0)).slice(0, 5).map((a, i) => (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 4 ? '1px solid var(--nt-border)' : 'none' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: ['#f5b849','#9ca3af','#cd7f32','#9ca3af','#9ca3af'][i], width: 18, textAlign: 'center', flexShrink: 0 }}>#{i+1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--nt-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.nomeCompleto.split(' ')[0]} {a.nomeCompleto.split(' ').slice(-1)[0]}</div>
                          <div style={{ fontSize: 11, color: 'var(--nt-text-muted)' }}>{a.turma || '—'}</div>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: pctColor(a.pct!), background: pctBg(a.pct!), padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>{a.pct}%</span>
                      </div>
                    ))}
                    {statsAluno.filter(a => a.pct !== null).length === 0 && (
                      <div style={{ fontSize: 13, color: 'var(--nt-text-muted)', textAlign: 'center', padding: '20px 0' }}>Sem dados</div>
                    )}
                  </div>
                </div>
              )}

              {/* ── ALERTAS ── */}
              {tab === 'alertas' && (
                <div style={{ background: 'var(--nt-surface)', borderRadius: 12, border: '1px solid var(--nt-border)', overflow: 'hidden' }}>
                  <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--nt-border)', background: '#fffbeb', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FaExclamationTriangle style={{ color: '#d97706', fontSize: 14 }} />
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: '#92400e' }}>
                        {alertas.length === 0 ? 'Nenhum alerta' : `${alertas.length} aluno${alertas.length > 1 ? 's' : ''} abaixo de 75% de frequência`}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#b45309', marginTop: 1 }}>Frequência mínima recomendada: 75%</div>
                    </div>
                  </div>
                  {alertas.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--nt-text-muted)', fontSize: 13 }}>
                      <FaCheckCircle style={{ fontSize: 28, color: '#16a34a', opacity: .4, marginBottom: 8 }} />
                      <div>Todos os alunos estão com frequência regular!</div>
                    </div>
                  ) : alertas.map((a, i) => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', borderBottom: i < alertas.length - 1 ? '1px solid var(--nt-border)' : 'none', background: i % 2 === 0 ? 'var(--nt-surface)' : 'var(--nt-bg)' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: pctBg(a.pct!), color: pctColor(a.pct!), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                        {a.nomeCompleto.split(' ').slice(0,2).map(x => x[0]).join('').toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--nt-text-primary)' }}>{a.nomeCompleto}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--nt-text-muted)', marginTop: 2 }}>{a.turma || 'Sem turma'} · {a.presentes} presenças · {a.faltas} faltas de {a.total} aulas</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: pctColor(a.pct!) }}>{a.pct}%</div>
                        <div style={{ fontSize: 10.5, fontWeight: 600, color: pctColor(a.pct!), marginTop: 2 }}>
                          {a.pct! < 50 ? '⚠ CRÍTICO' : '⚠ ATENÇÃO'}
                        </div>
                      </div>
                      <div style={{ width: 80 }}>
                        <div style={{ height: 6, background: 'var(--nt-border)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${a.pct}%`, height: '100%', background: pctColor(a.pct!), borderRadius: 3 }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── POR TURMA ── */}
              {tab === 'turmas' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {statsTurma.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--nt-text-muted)', fontSize: 13 }}>Sem turmas cadastradas.</div>
                  ) : statsTurma.map(t => (
                    <div key={t.turma} style={{ background: 'var(--nt-surface)', borderRadius: 12, border: '1px solid var(--nt-border)', padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--nt-text-primary)' }}>{t.turma}</div>
                          <div style={{ fontSize: 12, color: 'var(--nt-text-muted)', marginTop: 2 }}>{t.alunos} alunos · {t.dias} dias de aula</div>
                        </div>
                        <span style={{ fontSize: 22, fontWeight: 800, color: t.pct !== null ? pctColor(t.pct) : '#9ca3af' }}>
                          {t.pct !== null ? `${t.pct}%` : '—'}
                        </span>
                      </div>
                      {t.pct !== null && (
                        <div style={{ height: 8, background: 'var(--nt-border)', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
                          <div style={{ width: `${t.pct}%`, height: '100%', background: pctColor(t.pct), borderRadius: 4, transition: 'width .8s' }} />
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, color: 'var(--nt-text-muted)' }}>Presenças:</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}>{t.presentes}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <span style={{ fontSize: 12, color: 'var(--nt-text-muted)' }}>Faltas:</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#dc2626' }}>{t.faltas}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <span style={{ fontSize: 12, color: 'var(--nt-text-muted)' }}>Total registros:</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--nt-text-primary)' }}>{t.presentes + t.faltas}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── POR ALUNO ── */}
              {tab === 'historico' && (
                <div style={{ background: 'var(--nt-surface)', borderRadius: 12, border: '1px solid var(--nt-border)', overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                      <thead>
                        <tr style={{ background: 'var(--nt-bg)', borderBottom: '1px solid var(--nt-border)' }}>
                          {['Aluno','Turma','Aulas','Presenças','Faltas','Frequência','Status'].map(h => (
                            <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: 'var(--nt-text-muted)', textTransform: 'uppercase', letterSpacing: '.07em', textAlign: h === 'Aluno' ? 'left' : 'center' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {statsAluno.map((a, i) => (
                          <tr key={a.id} style={{ borderBottom: '1px solid var(--nt-border)', background: i % 2 === 0 ? 'var(--nt-surface)' : 'var(--nt-bg)' }}>
                            <td style={{ padding: '11px 14px' }}>
                              <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--nt-text-primary)' }}>{a.nomeCompleto}</div>
                            </td>
                            <td style={{ padding: '11px 14px', textAlign: 'center', fontSize: 12.5, color: 'var(--nt-text-muted)' }}>{a.turma || '—'}</td>
                            <td style={{ padding: '11px 14px', textAlign: 'center', fontSize: 13, fontWeight: 500, color: 'var(--nt-text-primary)' }}>{a.total}</td>
                            <td style={{ padding: '11px 14px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#16a34a' }}>{a.presentes}</td>
                            <td style={{ padding: '11px 14px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#dc2626' }}>{a.faltas}</td>
                            <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                              {a.pct !== null ? (
                                <span style={{ fontSize: 13, fontWeight: 700, color: pctColor(a.pct), background: pctBg(a.pct), padding: '3px 10px', borderRadius: 20 }}>{a.pct}%</span>
                              ) : <span style={{ fontSize: 12, color: 'var(--nt-text-muted)' }}>—</span>}
                            </td>
                            <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                              {a.pct === null
                                ? <span style={{ fontSize: 11, color: 'var(--nt-text-muted)' }}>Sem registro</span>
                                : a.pct >= 75
                                  ? <span style={{ fontSize: 11, fontWeight: 600, color: '#16a34a', background: '#f0fdf4', padding: '2px 8px', borderRadius: 20 }}>Regular</span>
                                  : a.pct >= 50
                                    ? <span style={{ fontSize: 11, fontWeight: 600, color: '#d97706', background: '#fffbeb', padding: '2px 8px', borderRadius: 20 }}>Atenção</span>
                                    : <span style={{ fontSize: 11, fontWeight: 600, color: '#dc2626', background: '#fef2f2', padding: '2px 8px', borderRadius: 20 }}>Crítico</span>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Layout>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getSession(ctx);
  if (!session) return { redirect: { destination: '/signIn', permanent: false } };
  return { props: {} };
};
