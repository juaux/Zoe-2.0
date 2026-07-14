import Head from 'next/head';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { useQuery } from '@tanstack/react-query';
import CrachaCard from '../../components/ui/CrachaCard';

interface Aluno {
  id: number; nomeCompleto: string; turma?: string; fotoUrl?: string;
  matricula?: string; dataNascimento?: string; idade?: number | string;
  telefone?: string; email?: string; responsavel?: string; telefoneResponsavel?: string;
  sexo?: string; rg?: string; cpf?: string; endereco?: string; bairro?: string;
  cidade?: string; uf?: string; cep?: string; nomePai?: string; nomeMae?: string;
}
interface Reg { data: string; presenca: 'presente' | 'falta'; turma: string; }

function getMes() { return new Date().getMonth() + 1; }
function getAno() { return new Date().getFullYear(); }
function fmtData(d: string) { if (!d) return '—'; const [y, m, dia] = d.split('-'); return `${dia}/${m}/${y}`; }
function initials(n: string) { return n.split(' ').slice(0, 2).map(x => x[0]).join('').toUpperCase(); }
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MESES_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// Paleta do design
const P = {
  primary: '#0447e4',
  primCont: '#3663fd',
  onPrimCont: '#ffffff',
  secondary: '#1a3fc4',
  secCont: '#5b7fff',
  surface: '#f4f7ff',
  surfLow: '#eef1ff',
  surfHigh: '#dde3ff',
  surfHighest: '#c7d0ff',
  surfLowest: '#ffffff',
  outline: '#6b7280',
  outlineVar: '#c7d2fe',
  onSurface: '#1a1c1e',
  onSurfVar: '#3d4a65',
  error: '#ba1a1a',
  errCont: '#ffdad6',
};

function calcStreak(chamadas: Reg[]): number {
  const sorted = [...chamadas].filter(c => c.presenca === 'presente').sort((a, b) => b.data.localeCompare(a.data));
  if (!sorted.length) return 0;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const a = new Date(sorted[i - 1].data + 'T00:00:00');
    const b = new Date(sorted[i].data + 'T00:00:00');
    const diff = Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
    if (diff <= 7) streak++; else break;
  }
  return streak;
}

function InfoLinha({ label, value }: { label: string; value?: string | number }) {
  if (!value) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 8, padding: '10px 0', borderBottom: `1px solid ${P.surfHigh}` }}>
      <span style={{ fontSize: 10.5, fontWeight: 600, color: P.outline, textTransform: 'uppercase', letterSpacing: '0.06em', alignSelf: 'center' }}>{label}</span>
      <span style={{ fontSize: 13.5, color: P.onSurface, wordBreak: 'break-word' }}>{value}</span>
    </div>
  );
}

type Aba = 'frequencia' | 'historico' | 'dados' | 'cracha';

const ABAS_CONFIG = [
  { id: 'frequencia' as Aba, label: 'Frequência', icon: 'calendar_today' },
  { id: 'historico' as Aba, label: 'Histórico', icon: 'history' },
  { id: 'dados' as Aba, label: 'Meus Dados', icon: 'person' },
  { id: 'cracha' as Aba, label: 'Crachá', icon: 'badge' },
];

export default function PortalAluno() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/signIn');
    if (status === 'authenticated') {
      const p = (session?.user as any)?.perfil;
      if (p === 'admin') router.push('/');
      if (p === 'professor') router.push('/professor');
    }
  }, [status, session, router]);

  const [aba, setAba] = useState<Aba>('frequencia');
  const [mesSel, setMes] = useState(getMes());
  const [anoSel, setAno] = useState(getAno());
  const [solicitando, setSolicitando] = useState(false);
  const [solicitacaoOk, setSolicitacaoOk] = useState(false);
  const [solicitacaoErro, setSolicitacaoErro] = useState('');
  const motivoRef = useRef<HTMLTextAreaElement>(null);

  const alunoId = (session?.user as any)?.alunoId;
  const userName = session?.user?.name || 'Aluno';

  const { data: aluno } = useQuery({
    queryKey: ['aluno-p', alunoId],
    queryFn: async () => {
      if (!alunoId) return null;
      const { data } = await supabase.from('Alunos').select('*').eq('id', alunoId).single();
      return data as Aluno;
    },
    enabled: !!alunoId,
  });

  const { data: chamadas = [] } = useQuery<Reg[]>({
    queryKey: ['cham-aluno', alunoId, mesSel, anoSel],
    queryFn: async () => {
      if (!alunoId) return [];
      const ini = `${anoSel}-${String(mesSel).padStart(2, '0')}-01`;
      const fim = new Date(anoSel, mesSel, 0).toISOString().slice(0, 10);
      const { data } = await supabase.from('chamadas').select('data,presenca,turma').eq('aluno_id', alunoId).gte('data', ini).lte('data', fim).order('data');
      return (data || []) as Reg[];
    },
    enabled: !!alunoId,
  });

  const { data: historico = [] } = useQuery<Reg[]>({
    queryKey: ['hist-aluno', alunoId, anoSel],
    queryFn: async () => {
      if (!alunoId) return [];
      const { data } = await supabase.from('chamadas').select('data,presenca,turma').eq('aluno_id', alunoId).gte('data', `${anoSel}-01-01`).lte('data', `${anoSel}-12-31`);
      return (data || []) as Reg[];
    },
    enabled: !!alunoId,
  });

  const presentes = chamadas.filter(c => c.presenca === 'presente').length;
  const faltas = chamadas.filter(c => c.presenca === 'falta').length;
  const total = chamadas.length;
  const pct = total > 0 ? Math.round(presentes / total * 100) : null;
  const streak = calcStreak(historico);

  const totalPresAno = historico.filter(h => h.presenca === 'presente').length;
  const totalAulasAno = historico.length;
  const pctAno = totalAulasAno > 0 ? Math.round(totalPresAno / totalAulasAno * 100) : null;

  const resumoAnual = MESES.map((m, i) => {
    const mes = i + 1;
    const regs = historico.filter(h => { const d = new Date(h.data + 'T00:00:00'); return (d.getMonth() + 1) === mes; });
    const p = regs.filter(r => r.presenca === 'presente').length;
    const t = regs.length;
    return { mes: m, p, total: t, pct: t > 0 ? Math.round(p / t * 100) : null };
  });

  // calendário
  const primeiroDia = new Date(anoSel, mesSel - 1, 1).getDay();
  const diasNoMes = new Date(anoSel, mesSel, 0).getDate();
  const hoje = new Date();
  const mapaCal: Record<number, 'presente' | 'falta'> = {};
  chamadas.forEach(c => { const d = new Date(c.data + 'T00:00:00'); mapaCal[d.getDate()] = c.presenca; });
  const calCells: (number | null)[] = [];
  for (let i = 0; i < primeiroDia; i++) calCells.push(null);
  for (let i = 1; i <= diasNoMes; i++) calCells.push(i);
  while (calCells.length % 7 !== 0) calCells.push(null);

  const dicas = ['Pequenas consistências diárias levam a grandes conquistas!', 'Cada aula é um passo rumo ao seu melhor desempenho.', 'A disciplina de hoje é a vitória de amanhã.', 'Compareça, participe e evolua. Você consegue!'];
  const dica = dicas[new Date().getDate() % dicas.length];

  const nomeExib = aluno?.nomeCompleto || userName;
  const primeiroNome = nomeExib.split(' ')[0];
  const foto = aluno?.fotoUrl;

  if (status === 'loading') return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: P.surface }}>
      <div style={{ width: 32, height: 32, border: `3px solid ${P.primCont}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <>
      <Head>
        <title>Portal do Aluno — Zoe</title>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:${P.surface};font-family:Manrope,sans-serif;}
        .material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;vertical-align:middle;font-family:'Material Symbols Outlined';}
        .ap-wrap{display:flex;height:100vh;height:100dvh;overflow:hidden;}
        /* SIDEBAR desktop */
        .ap-sidebar{display:none;}
        /* MAIN */
        .ap-main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-height:0;}
        .ap-topbar{display:flex;justify-content:space-between;align-items:center;padding:0 16px;height:64px;background:${P.surfLowest};border-bottom:1px solid ${P.surfHighest};flex-shrink:0;position:sticky;top:0;z-index:40;}
        .ap-content{flex:1;overflow-y:auto;min-height:0;}
        .ap-inner{padding:16px 16px 100px;max-width:1200px;margin:0 auto;}
        /* BOTTOM NAV */
        .ap-botnav{display:flex;position:fixed;bottom:0;left:0;width:100%;background:${P.surfLowest};border-top:1px solid ${P.surfHighest};justify-content:space-around;align-items:center;height:62px;z-index:50;padding-bottom:env(safe-area-inset-bottom);}
        /* HERO */
        .ap-hero{position:relative;overflow:hidden;border-radius:12px;margin-bottom:20px;box-shadow:0 4px 20px rgba(0,0,0,.1);}
        /* GRID */
        .ap-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;}
        .ap-two-col{display:grid;grid-template-columns:1fr;gap:16px;}
        .custom-card{background:${P.surfLowest};border:1px solid ${P.surfHighest};box-shadow:0 4px 20px rgba(0,0,0,.04);border-radius:12px;padding:20px;transition:transform .2s;}
        .custom-card:hover{transform:translateY(-2px);}
        .no-scrollbar::-webkit-scrollbar{display:none;}
        .no-scrollbar{-ms-overflow-style:none;scrollbar-width:none;}
        /* DESKTOP */
        @media(min-width:768px){
          .ap-sidebar{display:flex;flex-direction:column;width:280px;background:${P.surfLowest};border-right:1px solid ${P.surfHighest};flex-shrink:0;padding:24px 0;overflow-y:auto;}
          .ap-topbar{display:none;}
          .ap-botnav{display:none;}
          .ap-inner{padding:32px 40px;}
          .ap-two-col{grid-template-columns:2fr 1fr;}
          .ap-stats{gap:16px;}
        }
        @media(max-width:480px){
          .ap-stats{grid-template-columns:repeat(3,1fr);gap:8px;}
        }
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      <div className="ap-wrap">

        {/* ── SIDEBAR (desktop) ── */}
        <aside className="ap-sidebar">
          <div style={{ padding: '0 24px 24px', borderBottom: `1px solid ${P.surfHighest}`, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <img src="/logoaz.png" alt="Zoe" style={{ height: 190, objectFit: 'contain' }} />
            </div>
          </div>
          <nav style={{ flex: 1, padding: '8px 8px' }}>
            {ABAS_CONFIG.map(a => (
              <button key={a.id} onClick={() => setAba(a.id)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: aba === a.id ? P.primCont : 'transparent', color: aba === a.id ? P.onPrimCont : P.onSurfVar, fontSize: 15, fontWeight: aba === a.id ? 700 : 400, transition: 'all .15s', width: '100%', textAlign: 'left', marginBottom: 2 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{a.icon}</span>
                {a.label}
              </button>
            ))}
          </nav>
          <div style={{ padding: '16px 24px', borderTop: `1px solid ${P.surfHighest}` }}>
            <button onClick={() => signOut({ callbackUrl: '/signIn' })} style={{ display: 'flex', alignItems: 'center', gap: 8, color: P.error, fontWeight: 700, fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
              SAIR
            </button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <div className="ap-main">

          {/* Top bar (mobile) */}
          <header className="ap-topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src="/logoaz.png" alt="Zoe" style={{ height: 36, objectFit: 'contain' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', border: `1px solid ${P.outlineVar}` }}>
                {foto
                  ? <img src={foto} alt={nomeExib} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
                  : <div style={{ width: '100%', height: '100%', background: P.primCont, color: P.onPrimCont, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>{initials(nomeExib)}</div>}
              </div>
              <button onClick={() => signOut({ callbackUrl: '/signIn' })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: P.outline, display: 'flex', alignItems: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
              </button>
            </div>
          </header>

          {/* Scrollable content */}
          <div className="ap-content">
            <div className="ap-inner">

              {/* ── HERO BANNER ── */}
              <section className="ap-hero">
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #0447e4f0 0%, #3663fdcc 100%)', zIndex: 1 }} />
                <div style={{ position: 'absolute', top: 0, right: 0, width: 200, height: '100%', opacity: .08, pointerEvents: 'none', zIndex: 1 }}>
                  <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%' }} xmlns="http://www.w3.org/2000/svg">
                    <path d="M47.5,-51.2C60.7,-43.8,70.1,-28.9,74.1,-12.3C78.1,4.3,76.6,22.6,67.6,35.9C58.6,49.2,42.1,57.5,25.4,62.8C8.7,68.2,-8.1,70.5,-23.4,65.8C-38.7,61.1,-52.4,49.3,-61.1,34.8C-69.8,20.3,-73.4,3.1,-69.5,-12.3C-65.6,-27.7,-54.2,-41.4,-41,-48.8C-27.7,-56.3,-13.9,-57.6,1,-58.8C15.8,-60,34.2,-58.7,47.5,-51.2Z" fill="#fff" transform="translate(100 100)" />
                  </svg>
                </div>
                <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 24, padding: 24, color: '#fff' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', border: '3px solid rgba(255,255,255,.4)', flexShrink: 0 }}>
                    {foto
                      ? <img src={foto} alt={nomeExib} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
                      : <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, color: '#fff' }}>{initials(nomeExib)}</div>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Manrope,sans-serif', fontWeight: 700, fontSize: 28, lineHeight: 1.2, color: '#fff' }}>{nomeExib}</div>
                    {aluno?.matricula && (
                      <div style={{ fontSize: 13, opacity: .85, marginTop: 3, color: '#fff' }}>Matrícula: {aluno.matricula}</div>
                    )}
                    {aluno?.turma && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                        <span style={{ background: 'rgba(255,255,255,.15)', padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: '#fff' }}>{aluno.turma}</span>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* ── ABA FREQUENCIA ── */}
              {aba === 'frequencia' && <>

                {/* Seletor ano/mês */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: P.surfHigh, padding: 4, borderRadius: 12, width: 'fit-content' }}>
                    {[2024, 2025, 2026].map(y => (
                      <button key={y} onClick={() => setAno(y)} style={{ padding: '6px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', background: anoSel === y ? P.surfLowest : 'transparent', color: anoSel === y ? P.primary : P.onSurfVar, boxShadow: anoSel === y ? '0 2px 8px rgba(0,0,0,.08)' : 'none', transition: 'all .15s' }}>{y}</button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 4 }} className="no-scrollbar">
                    {MESES.map((m, i) => (
                      <button key={i} onClick={() => setMes(i + 1)} style={{ flexShrink: 0, padding: '6px 14px', fontWeight: 700, fontSize: 11, letterSpacing: '.05em', textTransform: 'uppercase', border: 'none', borderBottom: `2px solid ${mesSel === i + 1 ? P.primary : 'transparent'}`, background: 'transparent', color: mesSel === i + 1 ? P.primary : P.onSurfVar, cursor: 'pointer', transition: 'all .15s' }}>{m}</button>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <section className="ap-stats">
                  <div className="custom-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 14 }}>
                    <span className="material-symbols-outlined" style={{ color: P.primary, fontSize: 28, marginBottom: 6 }}>menu_book</span>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: P.onSurfVar, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Aulas</div>
                    <div style={{ fontWeight: 800, fontSize: 28, color: P.onSurface }}>{total}</div>
                  </div>
                  <div className="custom-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 14, borderLeft: `4px solid ${P.primCont}` }}>
                    <span className="material-symbols-outlined" style={{ color: P.primCont, fontSize: 28, marginBottom: 6 }}>task_alt</span>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: P.onSurfVar, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Presenças</div>
                    <div style={{ fontWeight: 800, fontSize: 28, color: P.primary }}>{presentes}</div>
                  </div>
                  <div className="custom-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 14, borderLeft: `4px solid ${P.error}50` }}>
                    <span className="material-symbols-outlined" style={{ color: P.error, fontSize: 28, marginBottom: 6 }}>cancel</span>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: P.onSurfVar, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Faltas</div>
                    <div style={{ fontWeight: 800, fontSize: 28, color: P.error }}>{String(faltas).padStart(2, '0')}</div>
                  </div>
                </section>

                {/* Two column */}
                <div className="ap-two-col">

                  {/* LEFT: lista de registros */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="custom-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ fontWeight: 600, fontSize: 17, color: P.onSurface }}>Registros de Presença</h3>
                        {pct !== null && (
                          <span style={{ fontSize: 12, fontWeight: 700, color: pct >= 75 ? P.primary : pct >= 50 ? '#d97706' : P.error, background: pct >= 75 ? `${P.primary}15` : pct >= 50 ? '#fef3c7' : `${P.error}15`, padding: '3px 10px', borderRadius: 999 }}>{pct}% presença</span>
                        )}
                      </div>
                      {chamadas.length === 0 ? (
                        <div style={{ padding: '32px 0', textAlign: 'center', color: P.outline, fontSize: 14 }}>Nenhum registro neste mês.</div>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ borderBottom: `1px solid ${P.surfHighest}` }}>
                              <tr>
                                {['Data', 'Status', 'Turma'].map(h => (
                                  <th key={h} style={{ padding: '8px 4px', fontSize: 10, fontWeight: 700, color: P.outline, textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {chamadas.map((c, i) => (
                                <tr key={i} style={{ borderBottom: `1px solid ${P.surfLow}`, transition: 'background .1s' }}>
                                  <td style={{ padding: '14px 4px', fontWeight: 600, fontSize: 14 }}>{fmtData(c.data)}</td>
                                  <td style={{ padding: '14px 4px' }}>
                                    {c.presenca === 'presente'
                                      ? <span style={{ padding: '3px 12px', borderRadius: 999, background: `${P.primary}18`, color: P.primary, fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Presente</span>
                                      : <span style={{ padding: '3px 12px', borderRadius: 999, background: `${P.error}18`, color: P.error, fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Falta</span>}
                                  </td>
                                  <td style={{ padding: '14px 4px', fontSize: 13, color: P.onSurfVar }}>{c.turma}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Streak card */}
                    {streak > 0 && (
                      <div className="custom-card" style={{ background: `linear-gradient(135deg,${P.primary},${P.primCont})`, border: 'none', color: '#fff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 32 }}>local_fire_department</span>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 22 }}>{streak} aulas seguidas</div>
                            <div style={{ opacity: .85, fontSize: 13 }}>Continue assim! Você está em uma sequência incrível 🏆</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* RIGHT: calendário + ID card */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* Calendário */}
                    <div className="custom-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ fontWeight: 600, fontSize: 16, color: P.onSurface }}>Mapa de Frequência</h3>
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: P.onSurfVar, textTransform: 'uppercase', letterSpacing: '.05em' }}>{MESES_FULL[mesSel - 1]} {anoSel}</span>
                      </div>
                      {/* Dias da semana */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, textAlign: 'center', marginBottom: 4 }}>
                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                          <div key={i} style={{ fontSize: 9.5, fontWeight: 700, color: P.outline, textTransform: 'uppercase', paddingBottom: 6 }}>{d}</div>
                        ))}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
                        {calCells.map((dia, i) => {
                          if (!dia) return <div key={i} />;
                          const s = mapaCal[dia];
                          const isHj = hoje.getDate() === dia && hoje.getMonth() + 1 === mesSel && hoje.getFullYear() === anoSel;
                          return (
                            <div key={i} style={{ padding: '8px 0', textAlign: 'center', borderRadius: 8, fontSize: 12, fontWeight: s ? 700 : 400, background: s === 'presente' ? P.primCont : s === 'falta' ? `${P.error}30` : isHj ? P.primary : P.surfHigh, color: s === 'presente' ? P.onPrimCont : s === 'falta' ? P.error : isHj ? '#fff' : P.onSurface, position: 'relative', cursor: 'default', boxShadow: s ? '0 2px 6px rgba(0,0,0,.08)' : 'none' }}>
                              {dia}
                              {s === 'presente' && <div style={{ position: 'absolute', bottom: 2, right: 2, fontSize: 7 }}>✓</div>}
                              {s === 'falta' && <div style={{ position: 'absolute', bottom: 2, right: 2, fontSize: 7 }}>✗</div>}
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${P.surfHighest}`, display: 'flex', gap: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: P.primCont, display: 'inline-block' }} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: P.onSurfVar }}>Presente</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: `${P.error}50`, display: 'inline-block' }} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: P.onSurfVar }}>Falta</span>
                        </div>
                      </div>
                    </div>

                    {/* Dica do dia */}
                    <div className="custom-card" style={{ background: P.secondary, color: '#fff', border: 'none' }}>
                      <h4 style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>Dica do Dia 🚀</h4>
                      <p style={{ fontSize: 13, opacity: .92, lineHeight: 1.6, marginBottom: 14 }}>{dica}</p>
                    </div>
                  </div>
                </div>
              </>}

              {/* ── ABA HISTÓRICO ── */}
              {aba === 'historico' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                    {[2024, 2025, 2026].map(y => (
                      <button key={y} onClick={() => setAno(y)} style={{ padding: '6px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', background: anoSel === y ? P.primary : P.surfHigh, color: anoSel === y ? '#fff' : P.onSurface }}>{y}</button>
                    ))}
                  </div>

                  {/* Resumo anual */}
                  {pctAno !== null && (
                    <div className="custom-card" style={{ background: `linear-gradient(135deg,${P.primary},${P.primCont})`, color: '#fff', border: 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 11, opacity: .8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Frequência Anual {anoSel}</div>
                          <div style={{ fontWeight: 800, fontSize: 36 }}>{pctAno}%</div>
                        </div>
                        <div style={{ textAlign: 'right', opacity: .85 }}>
                          <div style={{ fontSize: 13 }}>{totalPresAno} presenças</div>
                          <div style={{ fontSize: 13 }}>{totalAulasAno - totalPresAno} faltas</div>
                          <div style={{ fontSize: 13 }}>{totalAulasAno} total</div>
                        </div>
                      </div>
                      <div style={{ height: 6, background: 'rgba(255,255,255,.25)', borderRadius: 3 }}>
                        <div style={{ height: '100%', width: `${pctAno}%`, background: '#fff', borderRadius: 3 }} />
                      </div>
                      {pctAno < 75 && <div style={{ marginTop: 10, fontSize: 12, opacity: .9 }}>⚠️ Frequência abaixo de 75% — atenção!</div>}
                      {pctAno >= 75 && <div style={{ marginTop: 10, fontSize: 12, opacity: .9 }}>✅ Frequência regular — continue assim!</div>}
                    </div>
                  )}

                  {/* Gráfico mensal */}
                  <div className="custom-card">
                    <h3 style={{ fontWeight: 600, fontSize: 16, color: P.onSurface, marginBottom: 16 }}>Presença por Mês</h3>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 100, overflow: 'hidden' }}>
                      {resumoAnual.map((m, i) => {
                        const h = m.pct !== null ? Math.max(m.pct, 4) : 4;
                        const cor = m.pct === null ? P.surfHigh : m.pct >= 75 ? P.primary : m.pct >= 50 ? '#f59e0b' : P.error;
                        return (
                          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            <div style={{ fontSize: 8.5, fontWeight: 700, color: m.pct === null ? P.outlineVar : P.onSurfVar }}>{m.pct !== null ? `${m.pct}%` : ''}</div>
                            <div style={{ width: '100%', height: `${h}%`, minHeight: 4, background: cor, borderRadius: '3px 3px 0 0', transition: 'height .5s' }} />
                            <div style={{ fontSize: 9, color: P.outline }}>{m.mes}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── ABA DADOS ── */}
              {aba === 'dados' && aluno && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="custom-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, paddingBottom: 20, borderBottom: `1px solid ${P.surfHigh}` }}>
                      <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', border: `3px solid ${P.primCont}`, flexShrink: 0 }}>
                        {foto
                          ? <img src={foto} alt={nomeExib} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
                          : <div style={{ width: '100%', height: '100%', background: P.primCont, color: P.onPrimCont, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 22 }}>{initials(nomeExib)}</div>}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 20, color: P.onSurface }}>{nomeExib}</div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                          {aluno.turma && <span style={{ background: `${P.primary}15`, color: P.primary, padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{aluno.turma}</span>}
                          {aluno.matricula && <span style={{ background: P.surfHigh, color: P.onSurfVar, padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>Mat. {aluno.matricula}</span>}
                        </div>
                      </div>
                    </div>
                    <InfoLinha label="Matrícula" value={aluno.matricula} />
                    <InfoLinha label="Turma" value={aluno.turma} />
                    <InfoLinha label="Nascimento" value={aluno.dataNascimento ? fmtData(aluno.dataNascimento) : undefined} />
                    <InfoLinha label="Idade" value={aluno.idade ? `${aluno.idade} anos` : undefined} />
                    <InfoLinha label="Sexo" value={aluno.sexo} />
                    <InfoLinha label="Telefone" value={aluno.telefone} />
                    <InfoLinha label="Email" value={aluno.email} />
                    <InfoLinha label="Responsável" value={aluno.responsavel} />
                    <InfoLinha label="Tel. Resp." value={aluno.telefoneResponsavel} />
                    <InfoLinha label="Endereço" value={aluno.endereco} />
                    <InfoLinha label="Bairro" value={aluno.bairro} />
                    <InfoLinha label="Cidade/UF" value={aluno.cidade ? `${aluno.cidade}${aluno.uf ? ' / ' + aluno.uf : ''}` : undefined} />
                  </div>
                </div>
              )}

              {/* ── ABA CRACHÁ ── */}
              {aba === 'cracha' && aluno && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                  <CrachaCard aluno={aluno} />
                </div>
              )}

            </div>
          </div>

          {/* ── BOTTOM NAV (mobile) ── */}
          <nav className="ap-botnav">
            {ABAS_CONFIG.map(a => {
              const active = aba === a.id;
              return (
                <button key={a.id} onClick={() => setAba(a.id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '6px 0', border: 'none', cursor: 'pointer', background: active ? `${P.primCont}30` : 'transparent', borderRadius: 10, color: active ? P.onPrimCont : P.onSurfVar, transition: 'all .15s', margin: '0 4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 22, color: active ? P.primary : P.onSurfVar }}>{a.icon}</span>
                  <span style={{ fontSize: 10, fontWeight: active ? 700 : 400 }}>{a.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
