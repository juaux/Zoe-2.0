import { GetServerSideProps } from 'next';
import { getSession } from 'next-auth/react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../components/layout/Layout';
import { useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useAlunos, useTurmas, useProfessores } from '../hooks/useSupabaseQuery';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FaUserAlt, FaChalkboardTeacher, FaBookOpen,
  FaClipboardList, FaChevronRight, FaUserPlus, FaCalendarAlt,
  FaExclamationTriangle, FaCheckCircle, FaTimesCircle,
  FaIdCard, FaBell, FaCheck, FaTimes, FaChartBar,
  FaClock, FaTrophy, FaUserShield, FaEnvelope, FaLock,
  FaDumbbell, FaLayerGroup, FaFileAlt,
} from 'react-icons/fa';

interface Aluno { id: number; nomeCompleto: string; turma?: string; dataNascimento?: string; fotoUrl?: string; created_at?: string; }
interface Professor { id: number; nomeCompleto: string; turma?: string; fotoUrl?: string; }
interface Chamada { aluno_id: number; presenca: 'presente' | 'falta'; turma: string; data: string; }
interface ChamadaMes { aluno_id: number; presenca: string; data: string; turma?: string; }
interface CrachaSol { id: number; aluno_id: number; aluno_nome: string; motivo: string; status: string; criado_em: string; }
interface Turma { id: number; nome: string; }
interface HorarioTurma { id: number; turma: string; dia_semana: string; hora_inicio: string; hora_fim: string; }

// helpers
function hoje() { return new Date().toISOString().slice(0, 10); }
function getMes() { return new Date().getMonth() + 1; }
function getAno() { return new Date().getFullYear(); }
function getDia() { return new Date().getDate(); }
function getSemana() {
  const d = new Date(); const day = d.getDay();
  const mon = new Date(d); mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return { ini: mon.toISOString().slice(0,10), fim: sun.toISOString().slice(0,10) };
}
function initials(n: string) { return n.split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase(); }
function fmtDia(d: string) { const dt = new Date(d+'T00:00:00'); return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}`; }
function isHoje(d: string) { const dt = new Date(d+'T00:00:00'); return dt.getDate()===getDia() && (dt.getMonth()+1)===getMes(); }
function diaSemana() { const d = new Date().toLocaleString('pt-BR',{weekday:'long'}); return d[0].toUpperCase()+d.slice(1); }
function diaSemanaDB() {
  const dias = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  return dias[new Date().getDay()];
}
function saudacao() { const h = new Date().getHours(); if (h<12) return 'Bom dia'; if (h<18) return 'Boa tarde'; return 'Boa noite'; }
function pctColor(p: number) { if (p>=75) return '#16a34a'; if (p>=50) return '#d97706'; return '#dc2626'; }
function pctBg(p: number) { if (p>=75) return '#f0fdf4'; if (p>=50) return '#fffbeb'; return '#fef2f2'; }

function KpiCard({ icon, value, label, sub, color, bg, loading, href }: { icon: React.ReactNode; value: number|string; label: string; sub?: string; color: string; bg: string; loading: boolean; href?: string; }) {
  const content = (
    <div style={{ background:'var(--nt-surface)', borderRadius:12, border:'1px solid var(--nt-border)', padding:'18px 20px', display:'flex', alignItems:'center', gap:14, transition:'border-color .15s', cursor: href ? 'pointer' : 'default' }}>
      <div style={{ width:44, height:44, borderRadius:10, background:bg, color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, flexShrink:0 }}>{icon}</div>
      <div style={{ flex:1, minWidth:0 }}>
        {loading
          ? <div style={{ width:40, height:22, background:'var(--nt-border)', borderRadius:4, marginBottom:4 }} />
          : <div style={{ fontSize:22, fontWeight:700, color:'var(--nt-text-primary)', lineHeight:1.1 }}>{value}</div>
        }
        <div style={{ fontSize:12.5, color:'var(--nt-text-secondary)', marginTop:2 }}>{label}</div>
        {sub && <div style={{ fontSize:11, color:'var(--nt-text-muted)', marginTop:1 }}>{sub}</div>}
      </div>
      {href && <FaChevronRight style={{ fontSize:10, color:'var(--nt-text-muted)', flexShrink:0 }} />}
    </div>
  );
  if (href) return <Link href={href} style={{ textDecoration:'none' }}>{content}</Link>;
  return content;
}

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
      <div style={{ fontSize:12, fontWeight:700, color:'var(--nt-text-muted)', textTransform:'uppercase', letterSpacing:'0.1em' }}>{children}</div>
      {action}
    </div>
  );
}

function AlunoAvatar({ a, size=30 }: { a: Aluno; size?: number }) {
  if (a.fotoUrl) return <img src={a.fotoUrl} alt={a.nomeCompleto} style={{ width:size, height:size, borderRadius:'50%', objectFit: 'cover', objectPosition: 'center top', flexShrink:0 }} />;
  return <div style={{ width:size, height:size, borderRadius:'50%', background:'var(--nt-primary-pale)', color:'var(--nt-primary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.33, fontWeight:600, flexShrink:0 }}>{initials(a.nomeCompleto)}</div>;
}

export default function Home() {
  const [resolvendo, setResolvendo] = useState<number|null>(null);
  const queryClient = useQueryClient();

  // ── React Query hooks (cache automático) ──
  const { data: alunosRaw = [], isLoading: loadingAlunos } = useAlunos();
  const { data: professoresRaw = [], isLoading: loadingTrein } = useProfessores();
  const { data: turmasList = [] } = useTurmas();

  // Chamada de hoje
  const { data: chamadaHoje = [], isLoading: loadingChamada } = useQuery({
    queryKey: ['chamada-hoje', hoje()],
    queryFn: async () => {
      const { data } = await supabase
        .from('chamadas').select('aluno_id, presenca, turma, data').eq('data', hoje());
      return (data || []) as Chamada[];
    },
    staleTime: 1000 * 60 * 2,
  });

  // Chamada do mês
  const mesIni = `${getAno()}-${String(getMes()).padStart(2,'0')}-01`;
  const mesFim = `${getAno()}-${String(getMes()).padStart(2,'0')}-31`;
  const { data: chamadaMes = [] } = useQuery({
    queryKey: ['chamada-mes', getMes(), getAno()],
    queryFn: async () => {
      const { data } = await supabase
        .from('chamadas').select('aluno_id, presenca, data, turma').gte('data', mesIni).lte('data', mesFim);
      return (data || []) as ChamadaMes[];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Solicitações de crachá pendentes
  const { data: solicitacoes = [] } = useQuery({
    queryKey: ['cracha-solicitacoes'],
    queryFn: async () => {
      const r = await fetch('/api/cracha-solicitacoes');
      const all: CrachaSol[] = r.ok ? await r.json() : [];
      return all.filter(s => s.status === 'pendente');
    },
    staleTime: 1000 * 60 * 1,
  });

  // Horários de turma de hoje
  const { data: horariosHoje = [] } = useQuery({
    queryKey: ['horarios-hoje', diaSemanaDB()],
    queryFn: async () => {
      const { data } = await supabase
        .from('horarios_turma')
        .select('id, turma, dia_semana, hora_inicio, hora_fim')
        .eq('dia_semana', diaSemanaDB());
      return (data || []) as HorarioTurma[];
    },
    staleTime: 1000 * 60 * 10,
  });

  // Últimas matrículas (5 mais recentes de verdade, direto do banco)
  const { data: ultimasMatriculas = [], isLoading: loadingUltimos } = useQuery({
    queryKey: ['ultimas-matriculas'],
    queryFn: async () => {
      const { data } = await supabase
        .from('Alunos')
        .select('id, nomeCompleto, turma, fotoUrl, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      return (data || []) as Aluno[];
    },
    staleTime: 1000 * 60 * 2,
  });

  // Matrículas deste mês
  const { data: matriculasMes = 0 } = useQuery({
    queryKey: ['matriculas-mes', getMes(), getAno()],
    queryFn: async () => {
      const ini = `${getAno()}-${String(getMes()).padStart(2,'0')}-01`;
      const { count } = await supabase
        .from('Alunos')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', ini);
      return count || 0;
    },
    staleTime: 1000 * 60 * 5,
  });

  const alunos: Aluno[] = alunosRaw as Aluno[];
  const professoresList: Professor[] = professoresRaw as Professor[];
  const professores = professoresList.length;
  const loading = loadingAlunos || loadingTrein;
  const ultimos5 = ultimasMatriculas;

  // ── cálculos ──
  const totalAlunos    = alunos.length;
  const nomeMes        = new Date().toLocaleString('pt-BR',{month:'long'});
  const semana         = getSemana();

  // aniversariantes da SEMANA
  const anivSemana = useMemo(() => alunos.filter(a => {
    if (!a.dataNascimento) return false;
    const dt = new Date(a.dataNascimento+'T00:00:00');
    const ano = new Date().getFullYear();
    const thisYear = `${ano}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
    return thisYear >= semana.ini && thisYear <= semana.fim;
  }), [alunos, semana]);

  // aniversariantes do mês (fallback se semana vazia)
  const anivMes = useMemo(() => alunos
    .filter(a=>a.dataNascimento && (new Date(a.dataNascimento+'T00:00:00').getMonth()+1)===getMes())
    .map(a=>({...a,_dia:new Date(a.dataNascimento!+'T00:00:00').getDate()}))
    .sort((a:any,b:any)=>{ const af=a._dia>=getDia()?a._dia-getDia():100+a._dia; const bf=b._dia>=getDia()?b._dia-getDia():100+b._dia; return af-bf; })
    .slice(0,6)
  , [alunos]);

  const anivShow = anivSemana.length > 0 ? anivSemana : anivMes;
  const anivLabel = anivSemana.length > 0 ? 'Esta semana' : nomeMes[0].toUpperCase()+nomeMes.slice(1);

  // distribuição por turma
  const dist: Record<string,number> = {};
  alunos.forEach(a=>{ if (a.turma) dist[a.turma]=(dist[a.turma]||0)+1; });

  // frequência hoje
  const presentes      = chamadaHoje.filter(c=>c.presenca==='presente').length;
  const faltas         = chamadaHoje.filter(c=>c.presenca==='falta').length;
  const chamadaFeita   = chamadaHoje.length > 0;
  const pctPresenca    = chamadaHoje.length > 0 ? Math.round(presentes/chamadaHoje.length*100) : 0;
  const idsComChamada  = new Set(chamadaHoje.map(c=>c.aluno_id));
  const semChamadaHoje = alunos.filter(a=>!idsComChamada.has(a.id));

  // turmas que fizeram chamada hoje
  const turmasFizeramChamada = new Set(chamadaHoje.map(c=>c.turma));
  const turmasSemChamada     = turmasList.filter(t=>!turmasFizeramChamada.has(t.nome));

  // turmas que TÊM aula hoje (segundo horarios_turma); se não houver cadastro, mostra todas
  const nomesComHorarioHoje = new Set(horariosHoje.map(h=>h.turma));
  const turmasHoje = horariosHoje.length > 0
    ? turmasList.filter(t=>nomesComHorarioHoje.has(t.nome))
    : turmasList;
  const horarioPorTurma = (nome: string) => horariosHoje.find(h=>h.turma===nome);

  // professor(es) responsável(eis) por turma
  const professoresPorTurma = (nome: string) => professoresList.filter(t=>t.turma===nome);

  // presença consolidada do dia (só turmas que tiveram chamada hoje)
  const presentesHoje    = chamadaHoje.filter(c=>c.presenca==='presente').length;
  const faltasHojeTotal  = chamadaHoje.filter(c=>c.presenca==='falta').length;
  const totalChamadaHoje = chamadaHoje.length;
  const pctPresencaHoje  = totalChamadaHoje > 0 ? Math.round(presentesHoje/totalChamadaHoje*100) : 0;
  const turmasPendentesHoje = turmasHoje.filter(t=>!turmasFizeramChamada.has(t.nome));

  // frequência do mês por turma (para o mini gráfico)
  const freqPorTurma = useMemo(() => {
    return turmasList.map(t => {
      const rows = chamadaMes.filter((c:any)=>c.turma===t.nome);
      const total = rows.length;
      const pres  = rows.filter((c:any)=>c.presenca==='presente').length;
      const pct   = total>0 ? Math.round(pres/total*100) : 0;
      return { nome: t.nome, pct, total };
    }).filter(t=>t.total>0);
  }, [turmasList, chamadaMes]);

  // alertas de frequência do mês (abaixo de 75%)
  const alertasFreq = useMemo(() => {
    return alunos.map(a => {
      const rows = chamadaMes.filter(c=>c.aluno_id===a.id);
      const total = rows.length;
      const pres  = rows.filter(c=>c.presenca==='presente').length;
      const pct   = total>0 ? Math.round(pres/total*100) : null;
      return { ...a, pct, total, pres };
    }).filter(a=>a.pct!==null && a.pct<75).sort((a,b)=>(a.pct??100)-(b.pct??100)).slice(0,5);
  }, [alunos, chamadaMes]);

  const TURMA_CORES = ['#16A34A','#26bf94','#4bc5e8','#f5b849','#8b5cf6','#ec4899'];

  return (
    <>
      <Head><title>Dashboard — Zoe</title></Head>
      <Layout>
        <div style={{ display:'flex', flexDirection:'column', gap:24 }}>

          {/* Header com breadcrumb */}
          <div className="nt-dash-header" style={{ alignItems:'flex-end' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12.5, color:'var(--nt-text-muted)', marginBottom:6 }}>
                <span>Home</span><span>/</span><span style={{ color:'var(--nt-primary)', fontWeight:700 }}>Dashboard</span>
              </div>
              <div style={{ fontSize:26, fontWeight:700, color:'var(--nt-text-primary)', letterSpacing:'-0.02em' }}>{saudacao()} 👋</div>
              <div style={{ fontSize:13, color:'var(--nt-text-secondary)', marginTop:4 }}>{diaSemana()}, {new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})}</div>
            </div>
            <div className="nt-dash-header-btns">
              <Link href="/professor" style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 20px', background:'var(--nt-primary)', color:'#fff', borderRadius:10, fontSize:13, fontWeight:700, textDecoration:'none', boxShadow:'0 4px 14px rgba(22,163,74,.25)' }}>
                <FaClipboardList style={{ fontSize:13 }} /> Lançar Chamada
              </Link>
              <Link href="/alunos" style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 20px', background:'#fff', color:'var(--nt-primary)', border:'1.5px solid var(--nt-primary)', borderRadius:10, fontSize:13, fontWeight:700, textDecoration:'none' }}>
                <FaUserPlus style={{ fontSize:13 }} /> Cadastrar Aluno
              </Link>
              <Link href="/relatorios" style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 20px', background:'var(--nt-bg)', color:'var(--nt-text-secondary)', borderRadius:10, fontSize:13, fontWeight:700, textDecoration:'none' }}>
                <FaFileAlt style={{ fontSize:13 }} /> Relatórios
              </Link>
            </div>
          </div>

          {/* Métricas (bento grid) */}
          <div className="nt-kpi-grid">
            {[
              { icon:<FaUserAlt />,            value: totalAlunos,        label:'Alunos',      sub:`+${matriculasMes} este mês`,          color:'var(--nt-primary)', href:'/alunos' },
              { icon:<FaDumbbell />,           value: professores,        label:'Professores', sub:'Equipe ativa',                        color:'#5c6182',           href:'/professores' },
              { icon:<FaLayerGroup />,         value: turmasList.length,  label:'Cursos',      sub:'Horários ativos',                     color:'#5c6182',           href:'/cursos' },
              { icon:<FaExclamationTriangle />,value: alertasFreq.length, label:'Alertas',     sub:'Frequência < 75%',                    color:'var(--nt-danger)',  href:'/relatorios?tab=alertas' },
            ].map((m,i)=>(
              <Link key={i} href={m.href} style={{ textDecoration:'none' }}>
                <div style={{ background:'#fff', padding:'20px 22px', borderRadius:14, boxShadow:'0 1px 3px rgba(20,20,43,.06)', borderLeft:`4px solid ${m.color}`, display:'flex', justifyContent:'space-between', alignItems:'flex-start', transition:'transform .15s, box-shadow .15s', cursor:'pointer' }}
                  onMouseEnter={e=>{ (e.currentTarget as HTMLDivElement).style.transform='translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow='0 10px 25px -5px rgba(22,163,74,.12)'; }}
                  onMouseLeave={e=>{ (e.currentTarget as HTMLDivElement).style.transform='translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow='0 1px 3px rgba(20,20,43,.06)'; }}
                >
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--nt-text-muted)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:8 }}>{m.label}</div>
                    {loading
                      ? <div style={{ width:40, height:24, background:'var(--nt-border)', borderRadius:4 }} />
                      : <div style={{ fontSize:26, fontWeight:800, color: i===3 ? 'var(--nt-danger)' : 'var(--nt-text-primary)' }}>{m.value}</div>
                    }
                    <div style={{ fontSize:11.5, color: i===3 ? 'var(--nt-danger)' : 'var(--nt-text-secondary)', fontWeight:i===3||i===0?700:400, marginTop:4 }}>{m.sub}</div>
                  </div>
                  <div style={{ width:42, height:42, borderRadius:10, background:`${m.color}1a`, color:m.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, flexShrink:0 }}>{m.icon}</div>
                </div>
              </Link>
            ))}
          </div>

          {/* Banner solicitações crachá */}
          {solicitacoes.length > 0 && (
            <div style={{ background:'var(--nt-surface)', borderRadius:14, border:'2px solid #fcd34d', overflow:'hidden' }}>
              <div style={{ padding:'11px 18px', background:'#fffbeb', borderBottom:'1px solid #fde68a', display:'flex', alignItems:'center', gap:10 }}>
                <FaBell style={{ color:'#d97706' }} />
                <span style={{ fontSize:13.5, fontWeight:600, color:'#92400e' }}>{solicitacoes.length} solicitação(ões) de 2ª via de crachá pendente(s)</span>
              </div>
              {solicitacoes.map((s,i) => (
                <div key={s.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 18px', borderBottom:i<solicitacoes.length-1?'1px solid #fef9c3':'none' }}>
                  <div style={{ width:32,height:32,borderRadius:'50%',background:'#fef3c7',color:'#92400e',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,flexShrink:0 }}>{s.aluno_nome.split(' ').slice(0,2).map((x:string)=>x[0]).join('').toUpperCase()}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:'var(--nt-text-primary)' }}>{s.aluno_nome}</div>
                    <div style={{ fontSize:11.5, color:'var(--nt-text-muted)' }}>Motivo: {s.motivo} · {new Date(s.criado_em).toLocaleDateString('pt-BR')}</div>
                  </div>
                  <div style={{ display:'flex', gap:6, flexShrink:0 }} className="nt-sol-actions">
                    <button disabled={resolvendo===s.id} onClick={async()=>{ setResolvendo(s.id); await fetch('/api/cracha-solicitacoes',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:s.id,status:'resolvido'})}); queryClient.invalidateQueries({queryKey:['cracha-solicitacoes']}); setResolvendo(null); }}
                      style={{ display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:7,border:'none',background:'#dcfce7',color:'#16a34a',fontSize:12,fontWeight:600,cursor:'pointer' }}><FaCheck style={{fontSize:10}}/> Resolvido</button>
                    <button disabled={resolvendo===s.id} onClick={async()=>{ setResolvendo(s.id); await fetch('/api/cracha-solicitacoes',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:s.id,status:'cancelado'})}); queryClient.invalidateQueries({queryKey:['cracha-solicitacoes']}); setResolvendo(null); }}
                      style={{ display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:7,border:'none',background:'#fee2e2',color:'#dc2626',fontSize:12,fontWeight:600,cursor:'pointer' }}><FaTimes style={{fontSize:10}}/> Cancelar</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Banner de presença consolidada do dia */}
          {totalChamadaHoje > 0 && (
            <div style={{ background:'#fff', borderRadius:14, boxShadow:'0 1px 3px rgba(20,20,43,.06)', padding:'18px 22px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, flexWrap:'wrap', gap:8 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--nt-text-primary)' }}>
                  Hoje: {presentesHoje} presentes de {totalChamadaHoje} alunos que tiveram aula
                </div>
                <div style={{ display:'flex', gap:14, fontSize:12, color:'var(--nt-text-secondary)' }}>
                  <span><FaCheckCircle style={{ color:'#16a34a', marginRight:4 }} />{presentesHoje} presentes</span>
                  <span><FaTimesCircle style={{ color:'var(--nt-danger)', marginRight:4 }} />{faltasHojeTotal} faltas</span>
                </div>
              </div>
              <div style={{ width:'100%', height:8, background:'var(--nt-bg)', borderRadius:99, overflow:'hidden' }}>
                <div style={{ width:`${pctPresencaHoje}%`, height:'100%', background:pctColor(pctPresencaHoje), borderRadius:99, transition:'width .3s' }} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
                <span style={{ fontSize:11.5, fontWeight:700, color:pctColor(pctPresencaHoje) }}>{pctPresencaHoje}% de presença</span>
                {turmasPendentesHoje.length > 0 && (
                  <span style={{ fontSize:11.5, color:'var(--nt-text-muted)' }}>{turmasPendentesHoje.length} turma(s) ainda sem chamada hoje</span>
                )}
              </div>
            </div>
          )}

          {/* Grid principal: 8 / 4 */}
          <div className="nt-dash-grid-2col">

            {/* ── Coluna esquerda (8) ── */}
            <div style={{ display:'flex', flexDirection:'column', gap:24 }}>

              {/* Chamadas do Dia */}
              <section style={{ background:'#fff', borderRadius:14, boxShadow:'0 1px 3px rgba(20,20,43,.06)', overflow:'hidden' }}>
                <div style={{ padding:'16px 22px', borderBottom:'1px solid var(--nt-border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <FaClipboardList style={{ color:'var(--nt-primary)', fontSize:15 }} />
                    <h3 style={{ fontSize:16, fontWeight:700, color:'var(--nt-text-primary)' }}>Chamadas do Dia</h3>
                  </div>
                  <Link href="/professor" style={{ fontSize:13, color:'var(--nt-primary)', fontWeight:600, textDecoration:'none' }}>Ver todas as turmas</Link>
                </div>
                <div style={{ padding:18, display:'flex', flexDirection:'column', gap:10 }}>
                  {loadingChamada ? (
                    [1,2,3].map(i=>(
                      <div key={i} style={{ height:64, background:'var(--nt-bg)', borderRadius:10 }} />
                    ))
                  ) : turmasHoje.length === 0 ? (
                    <div style={{ padding:24, textAlign:'center', fontSize:12.5, color:'var(--nt-text-muted)' }}>
                      {horariosHoje.length === 0 ? 'Nenhuma turma cadastrada.' : `Nenhuma turma tem aula hoje (${diaSemanaDB()}).`}
                    </div>
                  ) : turmasHoje.map((t,i) => {
                    const reg = chamadaHoje.filter(c=>c.turma===t.nome);
                    const feita = reg.length > 0;
                    const p = reg.filter(c=>c.presenca==='presente').length;
                    const horario = horarioPorTurma(t.nome);
                    const respList = professoresPorTurma(t.nome);
                    return (
                      <Link key={t.id} href="/professor" style={{ textDecoration:'none' }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', background:'var(--nt-bg)', borderRadius:10, border:'1px solid transparent', transition:'border-color .15s', gap:12, flexWrap:'wrap' }}
                          onMouseEnter={e=>{ (e.currentTarget as HTMLDivElement).style.borderColor='rgba(22,163,74,.2)'; }}
                          onMouseLeave={e=>{ (e.currentTarget as HTMLDivElement).style.borderColor='transparent'; }}
                        >
                          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                            <div style={{ width:44, height:44, background:'#fff', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:TURMA_CORES[i%TURMA_CORES.length], boxShadow:'0 1px 3px rgba(20,20,43,.08)', fontSize:13 }}>{t.nome.slice(0,3).toUpperCase()}</div>
                            <div>
                              <h4 style={{ fontSize:14, fontWeight:600, color:'var(--nt-text-primary)' }}>{t.nome}</h4>
                              <p style={{ fontSize:12, color:'var(--nt-text-muted)' }}>
                                {feita ? `${p} presentes · ${reg.length-p} faltas` : 'Aguardando lançamento'}
                                {horario && <> · <FaClock style={{ fontSize:9, marginBottom:-1 }} /> {horario.hora_inicio.slice(0,5)}–{horario.hora_fim.slice(0,5)}</>}
                              </p>
                              {respList.length > 0 && (
                                <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:6 }}>
                                  <div style={{ display:'flex' }}>
                                    {respList.slice(0,3).map((r,ri)=>(
                                      <div key={r.id} title={r.nomeCompleto} style={{ width:20, height:20, borderRadius:'50%', marginLeft: ri>0?-6:0, border:'1.5px solid #fff', overflow:'hidden', background:'var(--nt-primary-pale)', color:'var(--nt-primary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:700 }}>
                                        {r.fotoUrl ? <img src={r.fotoUrl} alt={r.nomeCompleto} style={{ width:'100%', height:'100%', objectFit: 'cover', objectPosition: 'center top' }} /> : initials(r.nomeCompleto)}
                                      </div>
                                    ))}
                                  </div>
                                  <span style={{ fontSize:10.5, color:'var(--nt-text-muted)' }}>{respList.map(r=>r.nomeCompleto.split(' ')[0]).join(', ')}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                            <div style={{ textAlign:'right' }}>
                              <p style={{ fontSize:11, color:'var(--nt-text-muted)' }}>Status</p>
                              <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700, background: feita ? '#dcfce7' : '#ffedd5', color: feita ? '#15803d' : '#c2410c' }}>
                                {feita ? 'Realizada' : 'Pendente'}
                              </span>
                            </div>
                            {feita
                              ? <FaChevronRight style={{ color:'var(--nt-text-muted)' }} />
                              : <span style={{ background:'var(--nt-primary)', color:'#fff', padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:700 }}>Lançar</span>
                            }
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>

              {/* Frequência por turma no mês */}
              <section style={{ background:'#fff', borderRadius:14, boxShadow:'0 1px 3px rgba(20,20,43,.06)', overflow:'hidden' }}>
                <div style={{ padding:'16px 22px', borderBottom:'1px solid var(--nt-border)', display:'flex', alignItems:'center', gap:8 }}>
                  <FaChartBar style={{ color:'var(--nt-primary)', fontSize:14 }} />
                  <h3 style={{ fontSize:16, fontWeight:700, color:'var(--nt-text-primary)' }}>Frequência por Curso · {nomeMes[0].toUpperCase()+nomeMes.slice(1)}</h3>
                </div>
                <div style={{ padding:'18px 22px', display:'flex', flexDirection:'column', gap:14 }}>
                  {loading ? (
                    [1,2,3].map(i=><div key={i} style={{ height:14, background:'var(--nt-border)', borderRadius:4 }} />)
                  ) : freqPorTurma.length === 0 ? (
                    <div style={{ padding:'10px 0', textAlign:'center', fontSize:12.5, color:'var(--nt-text-muted)' }}>Sem chamadas registradas neste mês ainda.</div>
                  ) : freqPorTurma.map(t=>(
                    <div key={t.nome}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                        <span style={{ fontSize:12.5, fontWeight:600, color:'var(--nt-text-primary)' }}>{t.nome}</span>
                        <span style={{ fontSize:12, fontWeight:700, color:pctColor(t.pct) }}>{t.pct}%</span>
                      </div>
                      <div style={{ width:'100%', height:7, background:'var(--nt-bg)', borderRadius:99, overflow:'hidden' }}>
                        <div style={{ width:`${t.pct}%`, height:'100%', background:pctColor(t.pct), borderRadius:99 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Alertas de Atenção */}
              <section style={{ background:'#fff', borderRadius:14, boxShadow:'0 1px 3px rgba(20,20,43,.06)', overflow:'hidden' }}>
                <div style={{ padding:'16px 22px', borderBottom:'1px solid var(--nt-border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <FaExclamationTriangle style={{ color:'var(--nt-danger)', fontSize:14 }} />
                    <h3 style={{ fontSize:16, fontWeight:700, color:'var(--nt-text-primary)' }}>Alertas de Atenção</h3>
                  </div>
                  {alertasFreq.length > 0 && <span style={{ background:'#fee2e2', color:'var(--nt-danger)', fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:5, textTransform:'uppercase' }}>Urgente</span>}
                </div>
                <div style={{ padding:'8px 22px 18px' }}>
                  {loading ? (
                    <div style={{ padding:'16px 0' }}>
                      {[1,2,3].map(i=><div key={i} style={{ height:14, background:'var(--nt-border)', borderRadius:4, marginBottom:10 }} />)}
                    </div>
                  ) : alertasFreq.length === 0 ? (
                    <div style={{ padding:'20px 0', display:'flex', alignItems:'center', gap:10 }}>
                      <FaCheckCircle style={{ color:'#16a34a', fontSize:18 }} />
                      <span style={{ fontSize:13, color:'var(--nt-text-muted)' }}>Todos os alunos com frequência regular ✓</span>
                    </div>
                  ) : (
                    <table style={{ width:'100%', borderCollapse:'collapse' }}>
                      <thead>
                        <tr style={{ textAlign:'left', fontSize:11, color:'var(--nt-text-muted)', borderBottom:'1px solid var(--nt-border)' }}>
                          <th style={{ paddingBottom:10, fontWeight:700 }}>ALUNO</th>
                          <th style={{ paddingBottom:10, fontWeight:700 }}>TURMA</th>
                          <th style={{ paddingBottom:10, fontWeight:700, textAlign:'center' }}>FREQUÊNCIA</th>
                          <th style={{ paddingBottom:10, fontWeight:700, textAlign:'right' }}>AÇÃO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alertasFreq.map((a,i)=>(
                          <tr key={a.id} style={{ borderBottom: i<alertasFreq.length-1 ? '1px solid var(--nt-border)' : 'none' }}>
                            <td style={{ padding:'12px 0' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                <AlunoAvatar a={a} size={30} />
                                <span style={{ fontSize:13, fontWeight:600, color:'var(--nt-text-primary)' }}>{a.nomeCompleto}</span>
                              </div>
                            </td>
                            <td style={{ padding:'12px 0', fontSize:13, color:'var(--nt-text-secondary)' }}>{a.turma||'—'}</td>
                            <td style={{ padding:'12px 0', textAlign:'center' }}>
                              <span style={{ color:'var(--nt-danger)', fontWeight:800, fontSize:13.5 }}>{a.pct}%</span>
                            </td>
                            <td style={{ padding:'12px 0', textAlign:'right' }}>
                              <button style={{ background:'none', border:'none', color:'var(--nt-primary)', cursor:'pointer', padding:8, borderRadius:8 }} title="Contatar responsável">
                                <FaEnvelope />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>
            </div>

            {/* ── Coluna direita (4) ── */}
            <div style={{ display:'flex', flexDirection:'column', gap:24 }}>

              {/* Últimas Matrículas */}
              <section style={{ background:'#fff', borderRadius:14, boxShadow:'0 1px 3px rgba(20,20,43,.06)', overflow:'hidden' }}>
                <div style={{ padding:'16px 22px', borderBottom:'1px solid var(--nt-border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <h3 style={{ fontSize:16, fontWeight:700, color:'var(--nt-text-primary)' }}>Últimas Matrículas</h3>
                  {matriculasMes > 0 && (
                    <span style={{ fontSize:10.5, fontWeight:700, background:'var(--nt-primary-pale)', color:'var(--nt-primary)', padding:'3px 9px', borderRadius:6 }}>+{matriculasMes} este mês</span>
                  )}
                </div>
                <div style={{ padding:10 }}>
                  {loadingUltimos
                    ? [1,2,3].map(i=>(<div key={i} style={{ display:'flex',gap:10,padding:'10px 8px' }}><div style={{ width:30,height:30,borderRadius:10,background:'var(--nt-border)',flexShrink:0 }}/><div style={{ flex:1 }}><div style={{ width:'55%',height:10,background:'var(--nt-border)',borderRadius:3,marginBottom:5 }}/><div style={{ width:'35%',height:9,background:'var(--nt-border)',borderRadius:3 }}/></div></div>))
                    : ultimos5.length===0
                      ? <div style={{ padding:24, textAlign:'center', fontSize:12.5, color:'var(--nt-text-muted)' }}>Nenhum aluno cadastrado.</div>
                      : ultimos5.map((a)=>(
                        <div key={a.id} style={{ display:'flex',alignItems:'center',gap:12,padding:'8px',borderRadius:10, cursor:'pointer', transition:'background .15s' }}
                          onMouseEnter={e=>{ (e.currentTarget as HTMLDivElement).style.background='var(--nt-bg)'; }}
                          onMouseLeave={e=>{ (e.currentTarget as HTMLDivElement).style.background='transparent'; }}
                        >
                          <div style={{ width:48, height:48, borderRadius:12, overflow:'hidden', flexShrink:0, border:'2px solid transparent' }}>
                            <AlunoAvatar a={a} size={48} />
                          </div>
                          <div style={{ flex:1,minWidth:0 }}>
                            <div style={{ fontSize:13.5,color:'var(--nt-text-primary)',fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{a.nomeCompleto}</div>
                            <div style={{ fontSize:11.5,color:'var(--nt-text-muted)' }}>{a.turma||'Sem turma'}</div>
                          </div>
                          <span style={{ fontSize:9.5,fontWeight:700,background:'var(--nt-primary-pale)',color:'var(--nt-primary)',padding:'2px 8px',borderRadius:5,flexShrink:0,textTransform:'uppercase' }}>Novo</span>
                        </div>
                      ))
                  }
                </div>
                <div style={{ padding:'10px 22px', borderTop:'1px solid var(--nt-border)' }}>
                  <Link href="/alunos" style={{ display:'block', width:'100%', textAlign:'center', padding:'9px 0', color:'var(--nt-primary)', fontWeight:700, fontSize:13, textDecoration:'none', borderRadius:8 }}>Ver Histórico Completo</Link>
                </div>
              </section>

              {/* Aniversariantes */}
              <section style={{ background:'var(--nt-primary)', borderRadius:14, boxShadow:'0 8px 24px rgba(22,163,74,.18)', padding:22, color:'#fff', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', bottom:-40, right:-40, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,.08)', pointerEvents:'none' }} />
                <div style={{ position:'absolute', top:-30, left:-30, width:110, height:110, borderRadius:'50%', background:'rgba(255,255,255,.05)', pointerEvents:'none' }} />
                <div style={{ position:'relative', zIndex:1 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:18 }}>🎂</span>
                      <h3 style={{ fontSize:16, fontWeight:700 }}>Aniversariantes</h3>
                    </div>
                    <span style={{ background:'rgba(255,255,255,.2)', padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:700 }}>{anivLabel}</span>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {loading ? (
                      [1,2].map(i=><div key={i} style={{ height:56, background:'rgba(255,255,255,.1)', borderRadius:10 }} />)
                    ) : anivShow.length === 0 ? (
                      <p style={{ opacity:.8, fontSize:12.5, fontStyle:'italic', textAlign:'center', padding:'10px 0' }}>Nenhum aniversariante esta semana.</p>
                    ) : (anivShow as any[]).slice(0,4).map((a:any)=>{
                      const hj = isHoje(a.dataNascimento!);
                      return (
                        <div key={a.id} style={{ display:'flex', alignItems:'center', gap:12, background:'rgba(255,255,255,.1)', padding:10, borderRadius:10, border:'1px solid rgba(255,255,255,.1)' }}>
                          <div style={{ width:38, height:38, borderRadius:'50%', flexShrink:0, border:'2px solid rgba(255,255,255,.5)', overflow:'hidden' }}>
                            <AlunoAvatar a={a} size={34} />
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ fontWeight:700, fontSize:13, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.nomeCompleto.split(' ')[0]} {a.nomeCompleto.split(' ').slice(-1)[0]}</p>
                            <p style={{ opacity:.75, fontSize:11.5 }}>{hj ? `Hoje 🎉` : fmtDia(a.dataNascimento!)} · {a.turma||'—'}</p>
                          </div>
                          <button style={{ marginLeft:'auto', width:30, height:30, background: hj ? '#fff' : 'rgba(255,255,255,.2)', color: hj ? 'var(--nt-primary)' : '#fff', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', border:'none', flexShrink:0, fontSize:12 }}>
                            {hj ? '🎉' : <FaEnvelope />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* Acesso Rápido */}
              <section style={{ background:'var(--nt-text-primary)', borderRadius:14, padding:22, boxShadow:'0 4px 16px rgba(20,20,43,.16)' }}>
                <h4 style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'rgba(255,255,255,.5)', marginBottom:14 }}>Acesso Rápido</h4>
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  {[
                    { href:'/relatorios',  label:'Relatórios e Desempenho', icon:<FaChartBar /> },
                    { href:'/usuarios',    label:'Usuários e Logins',       icon:<FaUserShield /> },
                    { href:'/alunos?tab=lista',      label:'Lista de Alunos',         icon:<FaUserAlt /> },
                    { href:'/professores?tab=lista', label:'Professores',             icon:<FaDumbbell /> },
                    { href:'/cursos',      label:'Cursos',                  icon:<FaLayerGroup /> },
                  ].map(item=>(
                    <Link key={item.href} href={item.href}
                      style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 8px',borderRadius:8,textDecoration:'none',transition:'background .15s' }}
                      onMouseEnter={e=>{ (e.currentTarget as HTMLAnchorElement).style.background='rgba(255,255,255,.08)'; }}
                      onMouseLeave={e=>{ (e.currentTarget as HTMLAnchorElement).style.background='transparent'; }}
                    >
                      <span style={{ fontSize:14, color:'var(--nt-primary-light)' }}>{item.icon}</span>
                      <span style={{ flex:1, fontSize:13, fontWeight:600, color:'#fff' }}>{item.label}</span>
                      <FaChevronRight style={{ fontSize:9, color:'rgba(255,255,255,.3)' }} />
                    </Link>
                  ))}
                </div>
              </section>

            </div>
          </div>
        </div>

        <style jsx>{`
          .nt-dash-grid-2col { display:grid; grid-template-columns:2fr 1fr; gap:24px; align-items:start; }
          @media (max-width:1100px) { .nt-dash-grid-2col { grid-template-columns:1fr; } }
        `}</style>
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getSession(ctx);
  if (!session) return { redirect: { destination: '/signIn', permanent: false } };
  return { props: {} };
};
