import Head from 'next/head';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';

type Presenca = 'presente' | 'falta' | null;
interface Aluno { id: number; nomeCompleto: string; turma?: string; fotoUrl?: string; matricula?: string; }
interface HistReg { data: string; presenca: 'presente' | 'falta'; aluno_id: number; }
interface Professor {
  id: number; nomeCompleto: string; especialidade?: string; formacao?: string;
  turma?: string; telefone?: string; email?: string; fotoUrl?: string; foto?: string;
  matricula?: string; experiencia?: number;
}

function hoje() { return new Date().toISOString().slice(0, 10); }
function getMes() { return new Date().getMonth() + 1; }
function getAno() { return new Date().getFullYear(); }
function fmtData(d: string) { if (!d) return '—'; const [y, m, dia] = d.split('-'); return `${dia}/${m}/${y}`; }
function initials(n: string) { return n.split(' ').slice(0, 2).map(x => x[0]).join('').toUpperCase(); }
function ultimoDiaMes(ano: number, mes: number) { return new Date(ano, mes, 0).toISOString().slice(0, 10); }
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Paleta do design
const P = {
  primary: '#006b56',
  primaryCont: '#2bb696',
  onPrimary: '#ffffff',
  onPrimCont: '#004133',
  secondary: '#a63646',
  secondCont: '#ff7987',
  surface: '#f9f9ff',
  surfLow: '#f0f3ff',
  surfHigh: '#dee8ff',
  surfHighest: '#d9e3f9',
  surfLowest: '#ffffff',
  outline: '#6d7a74',
  outlineVar: '#bccac3',
  onSurface: '#121c2c',
  onSurfVar: '#3d4a45',
  error: '#ba1a1a',
};

function Avatar({ url, nome, size = 40 }: { url?: string; nome: string; size?: number }) {
  if (url) return <img src={url} alt={nome} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', objectPosition: 'center top', flexShrink: 0 }} />;
  return <div style={{ width: size, height: size, borderRadius: '50%', background: P.surfHigh, color: P.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size * .33, flexShrink: 0 }}>{initials(nome)}</div>;
}

export default function PortalProfessor() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const qc = useQueryClient();

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/signIn');
    if (status === 'authenticated') {
      const p = (session?.user as any)?.perfil;
      if (p === 'admin') router.push('/chamada');
      if (p === 'aluno') router.push('/aluno');
    }
  }, [status, session]);

  const [aba, setAba] = useState<'chamada' | 'turmas' | 'historico' | 'relatorio'>('chamada');
  const [turmaSel, setTurmaSel] = useState('');
  const [dataSel, setDataSel] = useState(hoje());
  const [presencas, setPresencas] = useState<Record<number, Presenca>>({});
  const [salvando, setSalvando] = useState(false);
  const [toast, setToast] = useState('');
  const [mesSel, setMesSel] = useState(getMes());
  const [anoSel, setAnoSel] = useState(getAno());
  const [turmaHist, setTurmaHist] = useState('');

  const nome = session?.user?.name || 'Professor';
  const professorId = (session?.user as any)?.professorId;
  const perfil = (session?.user as any)?.perfil;
  const isAdmin = perfil === 'admin';

  const { data: professorData } = useQuery<Professor | null>({
    queryKey: ['professor-perfil', professorId],
    queryFn: async () => {
      if (!professorId) return null;
      const { data } = await supabase.from('Professores').select('*').eq('id', professorId).single();
      return data as Professor;
    },
    enabled: !!professorId,
  });

  const { data: turmas = [] } = useQuery<string[]>({
    queryKey: ['turmas-t', isAdmin, professorData?.turma],
    queryFn: async () => {
      if (professorData?.turma) {
        return professorData.turma.split(',').map((t: string) => t.trim()).filter(Boolean).sort();
      }
      const { data } = await supabase.from('Alunos').select('turma').not('turma', 'is', null);
      return [...new Set((data || []).map((a: any) => a.turma).filter(Boolean))].sort() as string[];
    },
    enabled: isAdmin || professorData !== undefined,
  });

  useEffect(() => {
    if (turmas.length && !turmaSel) { setTurmaSel(turmas[0]); setTurmaHist(turmas[0]); }
  }, [turmas]);

  const { data: alunos = [], isLoading: loadAlunos } = useQuery<Aluno[]>({
    queryKey: ['alunos-t', turmaSel],
    queryFn: async () => {
      if (!turmaSel) return [];
      const { data } = await supabase.from('Alunos').select('id,nomeCompleto,turma,fotoUrl,matricula').eq('turma', turmaSel).order('nomeCompleto');
      return (data || []) as Aluno[];
    },
    enabled: !!turmaSel,
  });

  const { data: chamadaData } = useQuery({
    queryKey: ['chamada-t', turmaSel, dataSel],
    queryFn: async () => {
      if (!turmaSel) return {};
      const { data } = await supabase.from('chamadas').select('aluno_id,presenca').eq('turma', turmaSel).eq('data', dataSel);
      const m: Record<number, Presenca> = {};
      (data || []).forEach((r: any) => { m[r.aluno_id] = r.presenca; });
      return m;
    },
    enabled: !!turmaSel,
  });

  useEffect(() => { if (chamadaData) setPresencas(chamadaData as Record<number, Presenca>); }, [chamadaData]);

  const { data: historico = [] } = useQuery<HistReg[]>({
    queryKey: ['hist-t', turmaHist, mesSel, anoSel],
    queryFn: async () => {
      if (!turmaHist) return [];
      const ini = `${anoSel}-${String(mesSel).padStart(2, '0')}-01`;
      const fim = ultimoDiaMes(anoSel, mesSel);
      const { data } = await supabase.from('chamadas').select('data,presenca,aluno_id').eq('turma', turmaHist).gte('data', ini).lte('data', fim).order('data');
      return (data || []) as HistReg[];
    },
    enabled: !!turmaHist,
  });

  const { data: alunosHist = [] } = useQuery<Aluno[]>({
    queryKey: ['alunos-hist', turmaHist],
    queryFn: async () => {
      if (!turmaHist) return [];
      const { data } = await supabase.from('Alunos').select('id,nomeCompleto').eq('turma', turmaHist).order('nomeCompleto');
      return (data || []) as Aluno[];
    },
    enabled: !!turmaHist,
  });

  const diasUnicos = [...new Set(historico.map(h => h.data))].sort();
  const statsPorAluno = alunosHist.map(a => {
    const regs = historico.filter(h => h.aluno_id === a.id);
    const p = regs.filter(r => r.presenca === 'presente').length;
    const f = regs.filter(r => r.presenca === 'falta').length;
    const pct = regs.length > 0 ? Math.round(p / regs.length * 100) : null;
    return { ...a, presentes: p, faltas: f, pct, regs };
  });

  const toggle = (id: number, s: 'presente' | 'falta') =>
    setPresencas(prev => ({ ...prev, [id]: prev[id] === s ? null : s }));

  const marcarTodos = (s: 'presente' | 'falta') => {
    const n: Record<number, Presenca> = {};
    alunos.forEach(a => { n[a.id] = s; });
    setPresencas(n);
  };

  const salvar = async () => {
    const sem = alunos.filter(a => !presencas[a.id]);
    if (sem.length) { showToast(`⚠️ ${sem.length} aluno(s) sem marcação`); return; }
    setSalvando(true);
    const { error } = await supabase.from('chamadas').upsert(
      alunos.map(a => ({ aluno_id: a.id, data: dataSel, turma: turmaSel, presenca: presencas[a.id] })),
      { onConflict: 'aluno_id,data,turma' }
    );
    setSalvando(false);
    if (error) showToast('❌ Erro ao salvar');
    else { showToast(`✅ Chamada salva! ${alunos.filter(a => presencas[a.id] === 'presente').length}P · ${alunos.filter(a => presencas[a.id] === 'falta').length}F`); qc.invalidateQueries({ queryKey: ['hist-t'] }); }
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const presentes = alunos.filter(a => presencas[a.id] === 'presente').length;
  const faltas = alunos.filter(a => presencas[a.id] === 'falta').length;
  const semMarcacao = alunos.filter(a => !presencas[a.id]).length;
  const nomeExib = professorData?.nomeCompleto || nome;
  const fotoTopo = professorData?.fotoUrl || professorData?.foto;

  if (status === 'loading') return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: P.surface }}>
      <div style={{ width: 32, height: 32, border: `3px solid ${P.primaryCont}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── NAV ITEMS ─────────────────────────────────────────────────────────────
  const ABAS = [
    { id: 'chamada' as const, label: 'Chamada', icon: 'assignment' },
    { id: 'turmas' as const, label: 'Turmas', icon: 'groups' },
    { id: 'historico' as const, label: 'Histórico', icon: 'calendar_today' },
    { id: 'relatorio' as const, label: 'Relatório', icon: 'bar_chart' },
  ];

  return (
    <>
      <Head>
        <title>Portal do Professor — Zoe</title>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&family=Inter:wght@400;600&family=Manrope:wght@600;700&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:${P.surface};font-family:Inter,sans-serif;}
        .material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;display:inline-block;line-height:1;font-family:'Material Symbols Outlined';}
        .tp-wrap{display:flex;flex-direction:column;height:100vh;height:100dvh;overflow:hidden;background:${P.surface};}
        /* TOP NAV */
        .tp-topnav{position:sticky;top:0;z-index:50;display:flex;justify-content:space-between;align-items:center;padding:0 40px;height:64px;background:${P.surfLowest};box-shadow:0 4px 20px rgba(0,0,0,.05);flex-shrink:0;}
        /* SIDE NAV */
        .tp-sidenav{display:none;}
        /* CONTENT */
        .tp-body{display:flex;flex:1;overflow:hidden;min-height:0;}
        .tp-main{flex:1;overflow-y:auto;padding:24px 40px 80px;min-height:0;}
        .tp-inner{max-width:1200px;margin:0 auto;display:flex;flex-direction:column;gap:20px;}
        /* BOTTOM NAV */
        .tp-botnav{display:none;}
        /* STATS GRID */
        .tp-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
        /* HERO */
        .tp-hero{position:relative;overflow:hidden;border-radius:12px;background:${P.primaryCont};padding:24px;color:${P.onPrimCont};box-shadow:0 4px 20px rgba(0,0,0,.07);display:flex;flex-direction:row;align-items:center;gap:24px;}
        /* CONTROLS */
        .tp-controls{background:${P.surfLowest};padding:16px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.05);border:1px solid ${P.outlineVar}30;display:flex;flex-direction:row;align-items:flex-end;justify-content:space-between;gap:14px;flex-wrap:wrap;}
        /* ATTENDANCE CARD */
        .att-card{padding:20px 24px;display:flex;flex-direction:row;align-items:center;gap:24px;border-bottom:1px solid ${P.outlineVar}30;transition:transform .2s ease,box-shadow .2s ease;}
        .att-card:hover{transform:translateY(-1px);box-shadow:0 4px 20px rgba(0,0,0,.06);}
        /* BTN P/F */
        .btn-p{width:56px;height:56px;border-radius:10px;border:2px solid ${P.primaryCont};color:${P.primary};background:transparent;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;transition:all .15s;font-family:Manrope,sans-serif;}
        .btn-p.active,.btn-p:hover{background:${P.primary};color:#fff;border-color:${P.primary};}
        .btn-f{width:56px;height:56px;border-radius:10px;border:2px solid ${P.outlineVar};color:${P.outline};background:transparent;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;transition:all .15s;font-family:Manrope,sans-serif;}
        .btn-f.active,.btn-f:hover{background:${P.secondary};color:#fff;border-color:${P.secondary};}
        /* SIDE NAV DESKTOP */
        @media(min-width:1024px){
          .tp-topnav{padding:0 40px;}
          .tp-sidenav{display:flex;flex-direction:column;width:256px;padding:24px;background:${P.surfLowest};border-right:1px solid ${P.outlineVar};flex-shrink:0;overflow-y:auto;}
          .tp-main{padding:24px 40px 32px;}
          .tp-botnav{display:none;}
        }
        /* MOBILE */
        @media(max-width:767px){
          .tp-topnav{padding:0 16px;height:56px;}
          .tp-main{padding:14px 12px 80px;}
          .tp-stats{grid-template-columns:repeat(2,1fr);gap:8px;}
          .tp-hero{flex-direction:column;text-align:center;padding:18px;}
          .tp-controls{flex-direction:column;gap:10px;}
          .att-card{flex-direction:column;align-items:flex-start;gap:14px;padding:16px;}
          .tp-botnav{display:flex;position:fixed;bottom:0;left:0;width:100%;background:${P.surfLowest};justify-content:space-around;align-items:center;height:60px;box-shadow:0 -4px 20px rgba(0,0,0,.05);z-index:50;padding-bottom:env(safe-area-inset-bottom);}
        }
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      <div className="tp-wrap">

        {/* ── TOP NAV ── */}
        <header className="tp-topnav">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: 'Manrope,sans-serif', fontWeight: 700, fontSize: 22, color: P.primary, letterSpacing: '-.02em' }}>Zoe</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', border: `1px solid ${P.outlineVar}`, flexShrink: 0 }}>
              {fotoTopo
                ? <img src={fotoTopo} alt={nomeExib} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
                : <div style={{ width: '100%', height: '100%', background: P.primaryCont, color: P.onPrimCont, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{initials(nomeExib)}</div>}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: P.onSurface }}>{nomeExib.split(' ')[0]}</span>
            <button onClick={() => signOut({ callbackUrl: '/signIn' })} style={{ marginLeft: 4, padding: '6px 12px', border: `1px solid ${P.outlineVar}`, borderRadius: 8, background: 'transparent', color: P.outline, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>logout</span>
              <span className="hide-xs">Sair</span>
            </button>
          </div>
        </header>

        <div className="tp-body">

          {/* ── SIDE NAV (desktop) ── */}
          <aside className="tp-sidenav">
            <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 10 }}>
              <img
                src="/logoverd.png"
                alt="Zoe"
                style={{ height: 180, width: 180, objectFit: 'contain' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />            </div>
            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {ABAS.map(a => (
                <button key={a.id} onClick={() => setAba(a.id)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: aba === a.id ? P.primaryCont : 'transparent', color: aba === a.id ? P.onPrimCont : P.onSurfVar, fontSize: 15, fontWeight: aba === a.id ? 600 : 400, transition: 'all .15s', textAlign: 'left' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{a.icon}</span>
                  {a.label}
                </button>
              ))}
            </nav>
            <button onClick={salvar} disabled={salvando || !alunos.length || aba !== 'chamada'} style={{ marginTop: 'auto', background: P.primary, color: '#fff', padding: '12px 20px', borderRadius: 10, border: 'none', fontFamily: 'Manrope,sans-serif', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: aba !== 'chamada' ? .4 : 1, transition: 'all .15s' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>save</span>
              Salvar Chamada
            </button>
          </aside>

          {/* ── MAIN ── */}
          <main className="tp-main">
            <div className="tp-inner">

              {/* HERO */}
              <section className="tp-hero">
                <div style={{ position: 'absolute', top: 0, right: 0, width: 200, height: '100%', opacity: .08, pointerEvents: 'none' }}>
                  <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%' }} xmlns="http://www.w3.org/2000/svg">
                    <path d="M47.5,-51.2C60.7,-43.8,70.1,-28.9,74.1,-12.3C78.1,4.3,76.6,22.6,67.6,35.9C58.6,49.2,42.1,57.5,25.4,62.8C8.7,68.2,-8.1,70.5,-23.4,65.8C-38.7,61.1,-52.4,49.3,-61.1,34.8C-69.8,20.3,-73.4,3.1,-69.5,-12.3C-65.6,-27.7,-54.2,-41.4,-41,-48.8C-27.7,-56.3,-13.9,-57.6,1,-58.8C15.8,-60,34.2,-58.7,47.5,-51.2Z" fill="#fff" transform="translate(100 100)" />
                  </svg>
                </div>
                <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', border: '3px solid rgba(255,255,255,.4)', flexShrink: 0 }}>
                  {fotoTopo
                    ? <img src={fotoTopo} alt={nomeExib} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
                    : <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 26, color: P.onPrimCont }}>{initials(nomeExib)}</div>}
                </div>
                <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                  <div style={{ fontFamily: 'Manrope,sans-serif', fontWeight: 700, fontSize: 28, lineHeight: 1.2, color: P.onPrimCont }}>{nomeExib}</div>
                  {professorData?.matricula && <div style={{ fontSize: 13, opacity: .85, marginTop: 3, color: P.onPrimCont }}>Matrícula: {professorData.matricula}</div>}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    {turmas.length > 0 && turmas.map(t => <span key={t} style={{ background: 'rgba(255,255,255,.15)', padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: P.onPrimCont }}>{t}</span>)}
                  </div>
                </div>
              </section>

              {/* TABS mobile/tablet */}
              <div style={{ display: 'flex', gap: 4, background: P.surfLowest, borderRadius: 10, padding: 4, border: `1px solid ${P.outlineVar}`, width: 'fit-content', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }} className="tp-tabs-mobile">
                {ABAS.map(a => (
                  <button key={a.id} onClick={() => setAba(a.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: aba === a.id ? P.primary : 'transparent', color: aba === a.id ? '#fff' : P.outline, transition: 'all .15s' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{a.icon}</span>
                    {a.label}
                  </button>
                ))}
              </div>

              {/* ── ABA CHAMADA ── */}
              {aba === 'chamada' && <>

                {/* STATS */}
                <section className="tp-stats">
                  {[
                    { label: 'Total', val: alunos.length, sub: 'Alunos na turma', dot: P.primaryCont, valColor: P.primary },
                    { label: 'Presentes', val: presentes, sub: 'Confirmados hoje', dot: P.primary, valColor: P.primary },
                    { label: 'Faltas', val: faltas, sub: 'Ausências registradas', dot: P.secondary, valColor: P.secondary },
                    { label: 'Sem Marcar', val: semMarcacao, sub: 'Pendente chamada', dot: P.outlineVar, valColor: P.onSurface },
                  ].map(s => (
                    <div key={s.label} style={{ background: P.surfLowest, padding: 14, borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,.05)', border: `1px solid ${P.outlineVar}30` }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: P.onSurfVar, textTransform: 'uppercase', letterSpacing: '.05em' }}>{s.label}</span>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
                      </div>
                      <div style={{ fontFamily: 'Manrope,sans-serif', fontWeight: 700, fontSize: 30, color: s.valColor, lineHeight: 1 }}>{s.val}</div>
                      <div style={{ fontSize: 11, color: P.outline, marginTop: 4 }}>{s.sub}</div>
                    </div>
                  ))}
                </section>

                {/* CONTROLS */}
                <section className="tp-controls">
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 14, flex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: P.onSurfVar, textTransform: 'uppercase', letterSpacing: '.05em' }}>Turma</label>
                      <select value={turmaSel} onChange={e => { setTurmaSel(e.target.value); setPresencas({}); }} style={{ background: P.surfLow, border: `1px solid ${P.outlineVar}`, borderRadius: 8, padding: '8px 14px', fontSize: 14, color: P.onSurface, fontFamily: 'Inter,sans-serif', outline: 'none', cursor: 'pointer' }}>
                        {turmas.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: P.onSurfVar, textTransform: 'uppercase', letterSpacing: '.05em' }}>Data</label>
                      <div style={{ position: 'relative' }}>
                        <span className="material-symbols-outlined" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: P.outline, pointerEvents: 'none' }}>calendar_month</span>
                        <input type="date" value={dataSel} onChange={e => { setDataSel(e.target.value); setPresencas({}); }} style={{ background: P.surfLow, border: `1px solid ${P.outlineVar}`, borderRadius: 8, padding: '8px 14px 8px 34px', fontSize: 14, color: P.onSurface, fontFamily: 'Inter,sans-serif', outline: 'none' }} />
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => marcarTodos('presente')} style={{ background: `${P.primary}18`, color: P.primary, padding: '8px 18px', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all .2s' }}>Todos P</button>
                    <button onClick={() => marcarTodos('falta')} style={{ background: `${P.secondary}18`, color: P.secondary, padding: '8px 18px', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all .2s' }}>Todos F</button>
                  </div>
                </section>

                {/* LISTA */}
                <section style={{ background: P.surfLowest, borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,.05)', border: `1px solid ${P.outlineVar}30`, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 24px', borderBottom: `1px solid ${P.outlineVar}30`, background: '#f9fafe', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'Manrope,sans-serif', fontWeight: 600, fontSize: 17, color: P.onSurface }}>Lista de Presença</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: P.outline }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>info</span>
                      <span style={{ fontSize: 11 }}>Clique P ou F para marcar</span>
                    </div>
                  </div>

                  {loadAlunos ? (
                    <div style={{ padding: 40, textAlign: 'center', color: P.outline }}><div style={{ width: 24, height: 24, border: `2px solid ${P.primaryCont}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto' }} /></div>
                  ) : !alunos.length ? (
                    <div style={{ padding: 48, textAlign: 'center', color: P.outline, fontSize: 14 }}>{turmaSel ? 'Nenhum aluno nessa turma.' : 'Selecione uma turma.'}</div>
                  ) : (
                    <div>
                      {alunos.map((a, i) => {
                        const s = presencas[a.id];
                        return (
                          <div key={a.id} className="att-card" style={{ borderBottom: i < alunos.length - 1 ? `1px solid ${P.outlineVar}30` : 'none', background: s === 'presente' ? `${P.primary}05` : s === 'falta' ? `${P.secondary}05` : P.surfLowest }}>
                            <div style={{ width: 60, height: 60, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: `2px solid ${P.primaryCont}` }}>
                              {a.fotoUrl
                                ? <img src={a.fotoUrl} alt={a.nomeCompleto} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
                                : <div style={{ width: '100%', height: '100%', background: P.surfHigh, color: P.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18 }}>{initials(a.nomeCompleto)}</div>}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontFamily: 'Manrope,sans-serif', fontWeight: 600, fontSize: 16, color: P.onSurface, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.nomeCompleto}</div>
                              <div style={{ fontSize: 13, color: P.outline, marginTop: 2 }}>{a.turma || turmaSel}</div>
                              {a.matricula && <span style={{ display: 'inline-block', marginTop: 4, background: P.surfHigh, color: P.onSurfVar, padding: '1px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>Mat: {a.matricula}</span>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                              <button className={`btn-p${s === 'presente' ? ' active' : ''}`} onClick={() => toggle(a.id, 'presente')}>
                                <span style={{ fontFamily: 'Manrope,sans-serif', fontWeight: 700, fontSize: 20, lineHeight: 1 }}>P</span>
                                <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>Presença</span>
                              </button>
                              <button className={`btn-f${s === 'falta' ? ' active' : ''}`} onClick={() => toggle(a.id, 'falta')}>
                                <span style={{ fontFamily: 'Manrope,sans-serif', fontWeight: 700, fontSize: 20, lineHeight: 1 }}>F</span>
                                <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>Falta</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* SALVAR */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={salvar} disabled={salvando || !alunos.length} style={{ display: 'flex', alignItems: 'center', gap: 10, background: P.primary, color: '#fff', padding: '14px 28px', borderRadius: 12, border: 'none', fontFamily: 'Manrope,sans-serif', fontWeight: 600, fontSize: 15, cursor: 'pointer', boxShadow: `0 8px 24px ${P.primary}40`, transition: 'all .15s', opacity: salvando ? .7 : 1 }}>
                    <span className="material-symbols-outlined">save</span>
                    {salvando ? 'Salvando...' : 'Salvar Chamada'}
                  </button>
                </div>
              </>}

              {/* ── ABA TURMAS ── */}
              {aba === 'turmas' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
                  {turmas.map(t => <TurmaCard key={t} turma={t} onChamada={() => { setTurmaSel(t); setAba('chamada'); }} />)}
                </div>
              )}

              {/* ── ABA HISTÓRICO ── */}
              {aba === 'historico' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ background: P.surfLowest, borderRadius: 10, border: `1px solid ${P.outlineVar}`, padding: '14px 18px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: P.onSurfVar, textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 5 }}>Turma</label>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {turmas.map(t => (
                          <button key={t} onClick={() => setTurmaHist(t)} style={{ padding: '5px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: turmaHist === t ? P.primary : P.surfLow, color: turmaHist === t ? '#fff' : P.onSurface }}>{t}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: P.onSurfVar, textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 5 }}>Período</label>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        <select value={anoSel} onChange={e => setAnoSel(Number(e.target.value))} style={{ height: 34, padding: '0 10px', border: `1px solid ${P.outlineVar}`, borderRadius: 8, fontSize: 13, background: P.surfLow, fontFamily: 'Inter,sans-serif', outline: 'none' }}>
                          {[2024, 2025, 2026].map(y => <option key={y}>{y}</option>)}
                        </select>
                        {MESES.map((m, i) => (
                          <button key={i} onClick={() => setMesSel(i + 1)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none', background: mesSel === i + 1 ? P.primary : P.surfLow, color: mesSel === i + 1 ? '#fff' : P.onSurface }}>{m}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ background: P.surfLowest, borderRadius: 10, border: `1px solid ${P.outlineVar}`, overflow: 'auto' }}>
                    <div style={{ padding: '12px 18px', borderBottom: `1px solid ${P.outlineVar}30`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'Manrope,sans-serif', fontWeight: 600, fontSize: 16, color: P.onSurface }}>{MESES[mesSel - 1]} {anoSel} · {turmaHist}</span>
                      <span style={{ fontSize: 12, color: P.outline }}>{diasUnicos.length} aula(s)</span>
                    </div>
                    {alunosHist.length === 0 ? (
                      <div style={{ padding: 40, textAlign: 'center', color: P.outline, fontSize: 14 }}>Selecione uma turma.</div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
                        <thead>
                          <tr style={{ background: P.surfLow, borderBottom: `1px solid ${P.outlineVar}30` }}>
                            <th style={{ padding: '10px 18px', fontSize: 11, fontWeight: 600, color: P.onSurfVar, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '.05em' }}>Aluno</th>
                            <th style={{ padding: '10px 8px', fontSize: 11, fontWeight: 600, color: P.onSurfVar, textAlign: 'center' }}>P</th>
                            <th style={{ padding: '10px 8px', fontSize: 11, fontWeight: 600, color: P.onSurfVar, textAlign: 'center' }}>F</th>
                            <th style={{ padding: '10px 8px', fontSize: 11, fontWeight: 600, color: P.onSurfVar, textAlign: 'center' }}>%</th>
                            {diasUnicos.map(d => (
                              <th key={d} style={{ padding: '8px 5px', fontSize: 9.5, fontWeight: 600, color: P.onSurfVar, textAlign: 'center', whiteSpace: 'nowrap' }}>{fmtData(d).slice(0, 5)}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {statsPorAluno.map((a, i) => (
                            <tr key={a.id} style={{ borderBottom: i < alunosHist.length - 1 ? `1px solid ${P.outlineVar}20` : 'none', background: i % 2 === 0 ? P.surfLowest : P.surface }}>
                              <td style={{ padding: '10px 18px', fontSize: 13, fontWeight: 500, color: P.onSurface }}>{a.nomeCompleto}</td>
                              <td style={{ padding: '10px 8px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: P.primary }}>{a.presentes}</td>
                              <td style={{ padding: '10px 8px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: P.secondary }}>{a.faltas}</td>
                              <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                {a.pct !== null
                                  ? <span style={{ fontSize: 11, fontWeight: 700, color: a.pct >= 75 ? P.primary : a.pct >= 50 ? '#d97706' : P.secondary, background: a.pct >= 75 ? `${P.primary}15` : a.pct >= 50 ? '#fef3c7' : `${P.secondary}15`, padding: '2px 8px', borderRadius: 20 }}>{a.pct}%</span>
                                  : <span style={{ color: P.outlineVar }}>—</span>}
                              </td>
                              {diasUnicos.map(d => {
                                const reg = a.regs.find((r: any) => r.data === d);
                                return (
                                  <td key={d} style={{ padding: 5, textAlign: 'center' }}>
                                    {reg?.presenca === 'presente' && <span style={{ color: P.primary, fontSize: 13 }}>✓</span>}
                                    {reg?.presenca === 'falta' && <span style={{ color: P.secondary, fontSize: 13 }}>✗</span>}
                                    {!reg && <span style={{ color: P.outlineVar, fontSize: 10 }}>·</span>}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* ── ABA RELATÓRIO ── */}
              {aba === 'relatorio' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ background: P.surfLowest, borderRadius: 10, border: `1px solid ${P.outlineVar}`, padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <select value={anoSel} onChange={e => setAnoSel(Number(e.target.value))} style={{ height: 32, padding: '0 10px', border: `1px solid ${P.outlineVar}`, borderRadius: 8, fontSize: 13, background: P.surfLow, fontFamily: 'Inter,sans-serif', outline: 'none' }}>
                      {[2024, 2025, 2026].map(y => <option key={y}>{y}</option>)}
                    </select>
                    {MESES.map((m, i) => (
                      <button key={i} onClick={() => setMesSel(i + 1)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: 'none', background: mesSel === i + 1 ? P.primary : P.surfLow, color: mesSel === i + 1 ? '#fff' : P.onSurface }}>{m}</button>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
                    {turmas.map(t => <RelatorioCard key={t} turma={t} mesSel={mesSel} anoSel={anoSel} />)}
                  </div>
                </div>
              )}

            </div>
          </main>
        </div>

        {/* ── BOTTOM NAV (mobile) ── */}
        <nav className="tp-botnav">
          {ABAS.map(a => (
            <button key={a.id} onClick={() => setAba(a.id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, padding: '6px 0', border: 'none', background: 'transparent', cursor: 'pointer', color: aba === a.id ? P.primary : P.outline, fontSize: 10, fontWeight: aba === a.id ? 600 : 400 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: aba === a.id ? P.primary : P.outline }}>{a.icon}</span>
              {a.label}
            </button>
          ))}
        </nav>

      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 76, left: '50%', transform: 'translateX(-50%)', background: '#1f2937', color: '#fff', padding: '10px 22px', borderRadius: 10, fontSize: 13, fontWeight: 500, zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,.2)', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}
    </>
  );
}

function TurmaCard({ turma, onChamada }: { turma: string; onChamada: () => void }) {
  const P_local = { primary: '#006b56', primaryCont: '#2bb696', onPrimCont: '#004133', surfLowest: '#ffffff', surfHigh: '#dee8ff', outline: '#6d7a74', outlineVar: '#bccac3', onSurface: '#121c2c' };
  const { data: total = 0 } = useQuery({ queryKey: ['tc-total', turma], queryFn: async () => { const { count } = await supabase.from('Alunos').select('id', { count: 'exact', head: true }).eq('turma', turma); return count || 0; } });
  const { data: alunos = [] } = useQuery({ queryKey: ['tc-alunos', turma], queryFn: async () => { const { data } = await supabase.from('Alunos').select('id,nomeCompleto,fotoUrl').eq('turma', turma).limit(5); return data || []; } });
  return (
    <div style={{ background: P_local.surfLowest, borderRadius: 12, border: `1px solid ${P_local.outlineVar}`, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,.05)' }}>
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${P_local.outlineVar}30`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${P_local.primaryCont}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: P_local.primary }}>groups</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Manrope,sans-serif', fontWeight: 600, fontSize: 15, color: P_local.onSurface }}>{turma}</div>
          <div style={{ fontSize: 12, color: P_local.outline }}>{total} aluno{total !== 1 ? 's' : ''}</div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 600, background: `${P_local.primaryCont}20`, color: P_local.primary, padding: '2px 10px', borderRadius: 20, textTransform: 'uppercase' }}>Ativa</span>
      </div>
      <div style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', marginBottom: 12 }}>
          {(alunos as any[]).slice(0, 5).map((a: any, i: number) => (
            <div key={a.id} style={{ marginLeft: i > 0 ? -8 : 0, zIndex: 5 - i }}>
              {a.fotoUrl ? <img src={a.fotoUrl} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', objectPosition: 'center top', border: '2px solid #fff' }} alt={a.nomeCompleto} />
                : <div style={{ width: 28, height: 28, borderRadius: '50%', background: P_local.surfHigh, color: P_local.primary, border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>{a.nomeCompleto[0]}</div>}
            </div>
          ))}
          {(total as number) > 5 && <div style={{ width: 28, height: 28, borderRadius: '50%', background: P_local.outlineVar, color: '#fff', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, marginLeft: -8 }}>+{(total as number) - 5}</div>}
        </div>
        <button onClick={onChamada} style={{ width: '100%', padding: '8px', border: `1px solid ${P_local.outlineVar}`, borderRadius: 8, background: P_local.surfLowest, color: P_local.onSurface, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: P_local.primary }}>assignment</span>
          Fazer chamada
        </button>
      </div>
    </div>
  );
}

function RelatorioCard({ turma, mesSel, anoSel }: { turma: string; mesSel: number; anoSel: number }) {
  const P_local = { primary: '#006b56', secondary: '#a63646', surfLowest: '#ffffff', outlineVar: '#bccac3', outline: '#6d7a74', onSurface: '#121c2c' };
  const ini = `${anoSel}-${String(mesSel).padStart(2, '0')}-01`;
  const fim = new Date(anoSel, mesSel, 0).toISOString().slice(0, 10);
  const { data: chamadas = [] } = useQuery({ queryKey: ['rel', turma, mesSel, anoSel], queryFn: async () => { const { data } = await supabase.from('chamadas').select('presenca').eq('turma', turma).gte('data', ini).lte('data', fim); return data || []; } });
  const p = (chamadas as any[]).filter((c: any) => c.presenca === 'presente').length;
  const f = (chamadas as any[]).filter((c: any) => c.presenca === 'falta').length;
  const pct = chamadas.length > 0 ? Math.round(p / chamadas.length * 100) : null;
  return (
    <div style={{ background: P_local.surfLowest, borderRadius: 12, border: `1px solid ${P_local.outlineVar}`, padding: '18px 20px', boxShadow: '0 4px 20px rgba(0,0,0,.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 20, color: P_local.primary }}>groups</span>
        <span style={{ fontFamily: 'Manrope,sans-serif', fontWeight: 600, fontSize: 15, color: P_local.onSurface }}>{turma}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div style={{ textAlign: 'center', padding: '10px', background: '#f0fdf4', borderRadius: 8 }}><div style={{ fontSize: 22, fontWeight: 700, color: P_local.primary, fontFamily: 'Manrope,sans-serif' }}>{p}</div><div style={{ fontSize: 11, color: P_local.outline }}>Presenças</div></div>
        <div style={{ textAlign: 'center', padding: '10px', background: '#fef2f2', borderRadius: 8 }}><div style={{ fontSize: 22, fontWeight: 700, color: P_local.secondary, fontFamily: 'Manrope,sans-serif' }}>{f}</div><div style={{ fontSize: 11, color: P_local.outline }}>Faltas</div></div>
      </div>
      {pct !== null && <>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
          <span style={{ color: P_local.outline }}>Taxa de presença</span>
          <span style={{ fontWeight: 700, color: pct >= 75 ? P_local.primary : pct >= 50 ? '#d97706' : P_local.secondary }}>{pct}%</span>
        </div>
        <div style={{ height: 5, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: pct >= 75 ? P_local.primary : pct >= 50 ? '#d97706' : P_local.secondary, borderRadius: 3 }} />
        </div>
      </>}
      {pct === null && <div style={{ fontSize: 12, color: P_local.outlineVar, textAlign: 'center' }}>Sem registros neste mês</div>}
    </div>
  );
}
