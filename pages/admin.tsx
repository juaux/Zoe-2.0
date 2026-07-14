import Head from 'next/head';
import Layout from '../components/layout/Layout';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import {
  FaCog, FaBookOpen, FaClipboardList, FaSave, FaPlus, FaTrash,
  FaEdit, FaTimes, FaCheck, FaToggleOn, FaToggleOff, FaExclamationCircle,
  FaCheckCircle, FaChalkboardTeacher, FaUserAlt, FaSyncAlt, FaUserTie, FaUserShield,
} from 'react-icons/fa';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────
interface CampoConfig {
  key: string;
  label: string;
  ativo: boolean;
  obrigatorio: boolean;
  editavel: boolean; // campos fixos não podem ser desligados
}

interface TurmaConfig {
  id?: number;
  nome: string;
  faixa_etaria: string;
  descricao: string;
  ativo: boolean;
}

interface SistemaConfig {
  nome_escola: string;
  subtitulo_escola: string;
  primary_color: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMPOS PADRÃO — Alunos
// ─────────────────────────────────────────────────────────────────────────────
const CAMPOS_ALUNOS_DEFAULT: CampoConfig[] = [
  // fixos — não podem ser desligados
  { key:'nomeCompleto',         label:'Nome Completo',          ativo:true, obrigatorio:true,  editavel:false },
  { key:'dataNascimento',       label:'Data de Nascimento',     ativo:true, obrigatorio:true,  editavel:false },
  { key:'turma',                label:'Turma / Categoria',      ativo:true, obrigatorio:true,  editavel:false },
  // opcionais
  { key:'sexo',                 label:'Sexo',                   ativo:true, obrigatorio:true,  editavel:true },
  { key:'rg',                   label:'RG',                     ativo:true, obrigatorio:true,  editavel:true },
  { key:'cpf',                  label:'CPF',                    ativo:true, obrigatorio:true,  editavel:true },
  { key:'telefone',             label:'Telefone',               ativo:true, obrigatorio:false, editavel:true },
  { key:'email',                label:'Email',                  ativo:true, obrigatorio:false, editavel:true },
  { key:'cep',                  label:'CEP',                    ativo:true, obrigatorio:true,  editavel:true },
  { key:'endereco',             label:'Endereço',               ativo:true, obrigatorio:false, editavel:true },
  { key:'bairro',               label:'Bairro',                 ativo:true, obrigatorio:false, editavel:true },
  { key:'cidade',               label:'Cidade',                 ativo:true, obrigatorio:false, editavel:true },
  { key:'uf',                   label:'UF',                     ativo:true, obrigatorio:false, editavel:true },
  { key:'nomePai',              label:'Nome do Pai',            ativo:true, obrigatorio:false, editavel:true },
  { key:'nomeMae',              label:'Nome da Mãe',            ativo:true, obrigatorio:false, editavel:true },
  { key:'responsavel',          label:'Responsável',            ativo:true, obrigatorio:false, editavel:true },
  { key:'telefoneResponsavel',  label:'Telefone do Responsável',ativo:true, obrigatorio:false, editavel:true },
  { key:'foto',                 label:'Foto',                   ativo:true, obrigatorio:false, editavel:true },
];

// ─────────────────────────────────────────────────────────────────────────────
// CAMPOS PADRÃO — Professores
// ─────────────────────────────────────────────────────────────────────────────
const CAMPOS_TREIN_DEFAULT: CampoConfig[] = [
  { key:'nomeCompleto',   label:'Nome Completo',       ativo:true, obrigatorio:true,  editavel:false },
  { key:'dataNascimento', label:'Data de Nascimento',  ativo:true, obrigatorio:true,  editavel:false },
  { key:'turma',          label:'Turma Responsável',   ativo:true, obrigatorio:true,  editavel:false },
  { key:'sexo',           label:'Sexo',                ativo:true, obrigatorio:true,  editavel:true },
  { key:'rg',             label:'RG',                  ativo:true, obrigatorio:true,  editavel:true },
  { key:'cpf',            label:'CPF',                 ativo:true, obrigatorio:true,  editavel:true },
  { key:'telefone',       label:'Telefone',            ativo:true, obrigatorio:false, editavel:true },
  { key:'email',          label:'Email',               ativo:true, obrigatorio:false, editavel:true },
  { key:'cep',            label:'CEP',                 ativo:true, obrigatorio:true,  editavel:true },
  { key:'endereco',       label:'Endereço',            ativo:true, obrigatorio:false, editavel:true },
  { key:'bairro',         label:'Bairro',              ativo:true, obrigatorio:false, editavel:true },
  { key:'cidade',         label:'Cidade',              ativo:true, obrigatorio:false, editavel:true },
  { key:'uf',             label:'UF',                  ativo:true, obrigatorio:false, editavel:true },
  { key:'especialidade',  label:'Especialidade',       ativo:true, obrigatorio:true,  editavel:true },
  { key:'formacao',       label:'Formação',            ativo:true, obrigatorio:true,  editavel:true },
  { key:'experiencia',    label:'Experiência',         ativo:true, obrigatorio:false, editavel:true },
  { key:'foto',           label:'Foto',                ativo:true, obrigatorio:false, editavel:true },
];

const SUBS_DEFAULT = [
  { nome:'Sub-7',  faixa_etaria:'5 a 7 anos',   descricao:'Iniciação, jogos lúdicos e coordenação motora.',        ativo:true },
  { nome:'Sub-9',  faixa_etaria:'7 a 9 anos',   descricao:'Fundamentos técnicos e tomada de decisão.',              ativo:true },
  { nome:'Sub-11', faixa_etaria:'9 a 11 anos',  descricao:'Técnica individual e jogo coletivo básico.',             ativo:true },
  { nome:'Sub-13', faixa_etaria:'11 a 13 anos', descricao:'Intensidade tática e posicionamento defensivo/ofensivo.',ativo:true },
  { nome:'Sub-15', faixa_etaria:'13 a 15 anos', descricao:'Alta performance, prevenção de lesões e estratégia.',    ativo:true },
];



// ─────────────────────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────────────────────
function Toast({ type, msg, onClose }: { type:'success'|'error'; msg:string; onClose:()=>void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position:'fixed', top:20, right:20, zIndex:9999, display:'flex', alignItems:'center', gap:10, padding:'12px 18px', borderRadius:10,
      background: type==='success'?'#e6faf5':'#fdf0ed',
      border:`1px solid ${type==='success'?'#26bf94':'#e6533c'}`,
      color: type==='success'?'#0d6e53':'#b83220',
      fontSize:13.5, fontWeight:500, boxShadow:'0 4px 20px rgba(0,0,0,0.12)', animation:'slideIn 0.2s ease' }}>
      {type==='success' ? <FaCheckCircle /> : <FaExclamationCircle />} {msg}
      <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', marginLeft:6, color:'inherit', fontSize:14 }}><FaTimes /></button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TOGGLE
// ─────────────────────────────────────────────────────────────────────────────
function Toggle({ on, onChange, disabled }: { on:boolean; onChange:(v:boolean)=>void; disabled?:boolean }) {
  return (
    <button onClick={() => !disabled && onChange(!on)} disabled={disabled}
      style={{ width:42, height:24, borderRadius:12, border:'none', cursor: disabled?'not-allowed':'pointer',
        background: on ? '#FF4403' : '#D1D5DB', position:'relative', transition:'background 0.2s', flexShrink:0, opacity: disabled?0.5:1 }}>
      <div style={{ position:'absolute', top:3, left: on?20:3, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 4px rgba(0,0,0,0.2)' }} />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SEÇÃO: CAMPOS DO CADASTRO
// ─────────────────────────────────────────────────────────────────────────────
function SecaoCampos({ tipo }: { tipo: 'alunos' | 'professores' }) {
  const storageKey = tipo === 'alunos' ? 'campos_alunos' : 'campos_professores';
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<'ok'|'erro'|null>(null);

  const salvarCampos = async (novosCampos: CampoConfig[]) => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch(`/api/configuracoes?chave=${storageKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novosCampos),
      });
      if (!res.ok) throw new Error();
      setCampos(novosCampos);
      setSaveMsg('ok');
    } catch {
      setSaveMsg('erro');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  };
  const defaults   = tipo === 'alunos' ? CAMPOS_ALUNOS_DEFAULT : CAMPOS_TREIN_DEFAULT;
  const titulo     = tipo === 'alunos' ? 'Campos do Cadastro de Alunos' : 'Campos do Cadastro de Professores';
  const [campos, setCampos] = useState<CampoConfig[]>(defaults);
  const [toast, setToast] = useState<{type:'success'|'error';msg:string}|null>(null);

  // Carrega configuração do Supabase na montagem
  useEffect(() => {
    fetch(`/api/configuracoes?chave=${storageKey}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (Array.isArray(data)) setCampos(data); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const grupos: Record<string, CampoConfig[]> = {
    'Dados Pessoais':   campos.filter(c => ['nomeCompleto','dataNascimento','sexo','turma','rg','cpf','telefone','email'].includes(c.key)),
    'Endereço':         campos.filter(c => ['cep','endereco','bairro','cidade','uf'].includes(c.key)),
    'Filiação':         campos.filter(c => ['nomePai','nomeMae','responsavel','telefoneResponsavel'].includes(c.key)),
    'Profissional':     campos.filter(c => ['especialidade','formacao','experiencia'].includes(c.key)),
    'Outros':           campos.filter(c => ['foto'].includes(c.key)),
  };

  const toggle = (key:string, field:'ativo'|'obrigatorio', val:boolean) => {
    setCampos(prev => prev.map(c => {
      if (c.key !== key) return c;
      if (!c.editavel) return c;
      if (field === 'ativo' && !val) return { ...c, ativo:false, obrigatorio:false };
      if (field === 'obrigatorio' && val) return { ...c, ativo:true, obrigatorio:true };
      return { ...c, [field]:val };
    }));
  };

  const salvar = async () => {
    await salvarCampos(campos);
    setToast({ type: saving ? 'error' : 'success', msg: saveMsg === 'ok' ? 'Configurações salvas!' : 'Erro ao salvar.' });
  };

  const resetar = async () => {
    await salvarCampos(defaults);
    setCampos(defaults);
    setToast({ type: 'success', msg: 'Configurações restauradas ao padrão.' });
  };

  return (
    <div>
      {toast && <Toast type={toast.type} msg={toast.msg} onClose={() => setToast(null)} />}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div>
          <h2 style={{ fontSize:17, fontWeight:800, fontFamily:'Poppins,sans-serif', color:'var(--nt-text-primary)', marginBottom:4 }}>{titulo}</h2>
          <p style={{ fontSize:13, color:'var(--nt-text-muted)' }}>Ative/desative campos e defina quais são obrigatórios</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={resetar} style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 16px', borderRadius:8, border:'1px solid var(--nt-border-md)', background:'transparent', color:'var(--nt-text-secondary)', fontSize:13, cursor:'pointer', fontFamily:'inherit', fontWeight:500 }}>
            <FaSyncAlt style={{ fontSize:11 }} /> Restaurar
          </button>
          <button onClick={salvar} style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px', borderRadius:8, border:'none', background:'var(--nt-primary)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            <FaSave style={{ fontSize:11 }} /> Salvar
          </button>
        </div>
      </div>

      {Object.entries(grupos).map(([grupo, lista]) => {
        if (lista.length === 0) return null;
        return (
          <div key={grupo} style={{ marginBottom:24 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--nt-primary)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10, paddingLeft:2 }}>{grupo}</div>
            <div style={{ background:'var(--nt-surface)', borderRadius:12, border:'1px solid var(--nt-border)', overflow:'hidden' }}>
              {lista.map((campo, i) => (
                <div key={campo.key} style={{ display:'flex', alignItems:'center', padding:'14px 20px', borderBottom: i<lista.length-1 ? '1px solid var(--nt-border)' : 'none', gap:16, transition:'background 0.15s' }}
                  onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='var(--nt-bg)'}
                  onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:600, color: campo.ativo ? 'var(--nt-text-primary)' : 'var(--nt-text-muted)' }}>{campo.label}</div>
                    {!campo.editavel && <div style={{ fontSize:11, color:'var(--nt-text-muted)', marginTop:2 }}>Campo fixo — obrigatório</div>}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:20 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <input type="checkbox" id={`obr-${tipo}-${campo.key}`} checked={campo.obrigatorio} disabled={!campo.editavel || !campo.ativo}
                        onChange={e => toggle(campo.key, 'obrigatorio', e.target.checked)}
                        style={{ width:15, height:15, accentColor:'#FF4403', cursor: campo.editavel?'pointer':'not-allowed' }} />
                      <label htmlFor={`obr-${tipo}-${campo.key}`} style={{ fontSize:13, color:'var(--nt-text-secondary)', cursor: campo.editavel?'pointer':'default', whiteSpace:'nowrap' }}>Obrigatório</label>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <Toggle on={campo.ativo} disabled={!campo.editavel} onChange={v => toggle(campo.key, 'ativo', v)} />
                      <span style={{ fontSize:12, color: campo.ativo?'var(--nt-text-secondary)':'var(--nt-text-muted)', minWidth:50 }}>{campo.ativo?'Ativo':'Inativo'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SEÇÃO: TURMAS
// ─────────────────────────────────────────────────────────────────────────────
function SecaoTurmas() {
  const [turmas, setTurmas] = useState<TurmaConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editIdx, setEditIdx] = useState<number|null>(null);
  const [editData, setEditData] = useState<Partial<TurmaConfig>>({});
  const [novaForm, setNovaForm] = useState({ nome:'', faixa_etaria:'', descricao:'' });
  const [showNova, setShowNova] = useState(false);
  const [toast, setToast] = useState<{type:'success'|'error';msg:string}|null>(null);

  const showToast = (type:'success'|'error', msg:string) => { setToast({type,msg}); setTimeout(()=>setToast(null),3000); };

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('Turmas').select('*').order('nome');
    if (!error) setTurmas(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const salvarEdicao = async (id: number) => {
    setSaving(true);
    const { error } = await supabase.from('Turmas').update(editData).eq('id', id);
    if (error) showToast('error', error.message);
    else { showToast('success', 'Turma atualizada!'); setEditIdx(null); load(); }
    setSaving(false);
  };

  const toggleAtivo = async (t: TurmaConfig) => {
    await supabase.from('Turmas').update({ ativo: !t.ativo }).eq('id', t.id);
    load();
  };

  const deletar = async (id: number) => {
    if (!confirm('Remover esta turma? Alunos vinculados perderão a turma.')) return;
    const { error } = await supabase.from('Turmas').delete().eq('id', id);
    error ? showToast('error', error.message) : showToast('success', 'Turma removida!');
    load();
  };

  const criarNova = async () => {
    if (!novaForm.nome) return showToast('error', 'Informe o nome da turma');
    setSaving(true);
    const { error } = await supabase.from('Turmas').insert([{ ...novaForm, ativo:true }]);
    if (error) showToast('error', error.message);
    else { showToast('success', 'Turma criada!'); setNovaForm({ nome:'', faixa_etaria:'', descricao:'' }); setShowNova(false); load(); }
    setSaving(false);
  };

  const criarPadrao = async () => {
    if (!confirm('Criar as 5 categorias Sub padrão? (Sub-7 a Sub-15)')) return;
    setSaving(true);
    for (const sub of SUBS_DEFAULT) {
      await supabase.from('Turmas').upsert([sub], { onConflict: 'nome' });
    }
    showToast('success', 'Categorias Sub padrão criadas!');
    setSaving(false); load();
  };

  const inp: React.CSSProperties = { width:'100%', height:36, padding:'0 10px', borderRadius:7, border:'1px solid var(--nt-border-md)', background:'var(--nt-surface)', color:'var(--nt-text-primary)', fontSize:13, fontFamily:'inherit' };

  return (
    <div>
      {toast && <Toast type={toast.type} msg={toast.msg} onClose={() => setToast(null)} />}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div>
          <h2 style={{ fontSize:17, fontWeight:800, fontFamily:'Poppins,sans-serif', color:'var(--nt-text-primary)', marginBottom:4 }}>Turmas / Categorias</h2>
          <p style={{ fontSize:13, color:'var(--nt-text-muted)' }}>Gerencie as categorias Sub diretamente no banco de dados</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={criarPadrao} disabled={saving} style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 16px', borderRadius:8, border:'1px solid var(--nt-border-md)', background:'transparent', color:'var(--nt-text-secondary)', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
            <FaSyncAlt style={{ fontSize:11 }} /> Criar Sub Padrão
          </button>
          <button onClick={() => setShowNova(true)} style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px', borderRadius:8, border:'none', background:'var(--nt-primary)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            <FaPlus style={{ fontSize:11 }} /> Nova Turma
          </button>
        </div>
      </div>

      {/* Form nova turma */}
      {showNova && (
        <div style={{ background:'var(--nt-surface)', borderRadius:12, border:'2px solid var(--nt-primary)', padding:20, marginBottom:16 }}>
          <div style={{ fontWeight:700, fontSize:14, color:'var(--nt-primary)', marginBottom:14 }}>➕ Nova Turma</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 2fr', gap:12, marginBottom:14 }}>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--nt-text-secondary)', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' }}>Nome *</label>
              <input value={novaForm.nome} onChange={e=>setNovaForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: Sub-9" style={inp} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--nt-text-secondary)', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' }}>Faixa Etária</label>
              <input value={novaForm.faixa_etaria} onChange={e=>setNovaForm(f=>({...f,faixa_etaria:e.target.value}))} placeholder="Ex: 7 a 9 anos" style={inp} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--nt-text-secondary)', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' }}>Descrição</label>
              <input value={novaForm.descricao} onChange={e=>setNovaForm(f=>({...f,descricao:e.target.value}))} placeholder="Objetivos da turma..." style={inp} />
            </div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={criarNova} disabled={saving} style={{ padding:'8px 20px', borderRadius:8, border:'none', background:'var(--nt-primary)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              {saving ? 'Salvando...' : 'Criar Turma'}
            </button>
            <button onClick={() => setShowNova(false)} style={{ padding:'8px 16px', borderRadius:8, border:'1px solid var(--nt-border-md)', background:'transparent', color:'var(--nt-text-secondary)', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de turmas */}
      <div style={{ background:'var(--nt-surface)', borderRadius:12, border:'1px solid var(--nt-border)', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ display:'grid', gridTemplateColumns:'120px 140px 1fr 80px 120px', gap:12, padding:'12px 20px', background:'var(--nt-bg)', borderBottom:'1px solid var(--nt-border)' }}>
          {['Nome','Faixa Etária','Descrição','Status','Ações'].map(h=>(
            <div key={h} style={{ fontSize:11, fontWeight:700, color:'var(--nt-text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</div>
          ))}
        </div>

        {loading ? (
          [1,2,3].map(i=>(
            <div key={i} style={{ display:'grid', gridTemplateColumns:'120px 140px 1fr 80px 120px', gap:12, padding:'14px 20px', borderBottom:'1px solid var(--nt-border)' }}>
              {[80,100,200,60,100].map((w,j)=><div key={j} style={{ height:14, width:w, background:'var(--nt-border)', borderRadius:4 }} />)}
            </div>
          ))
        ) : turmas.length === 0 ? (
          <div style={{ padding:'32px 20px', textAlign:'center', color:'var(--nt-text-muted)', fontSize:13 }}>
            Nenhuma turma. Use "Criar Sub Padrão" para criar as categorias padrão.
          </div>
        ) : turmas.map((t, i) => (
          <div key={t.id} style={{ display:'grid', gridTemplateColumns:'120px 140px 1fr 80px 120px', gap:12, padding:'14px 20px', borderBottom: i<turmas.length-1?'1px solid var(--nt-border)':'none', alignItems:'center', background: editIdx===i?'rgba(255,68,3,0.02)':'transparent' }}>
            {editIdx === i ? (
              <>
                <input value={editData.nome||''} onChange={e=>setEditData(d=>({...d,nome:e.target.value}))} style={inp} />
                <input value={editData.faixa_etaria||''} onChange={e=>setEditData(d=>({...d,faixa_etaria:e.target.value}))} style={inp} />
                <input value={editData.descricao||''} onChange={e=>setEditData(d=>({...d,descricao:e.target.value}))} style={inp} />
                <span style={{ fontSize:12, color:'var(--nt-text-muted)' }}>—</span>
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={()=>salvarEdicao(t.id!)} disabled={saving} style={{ width:30, height:30, borderRadius:7, border:'none', background:'#D1FAE5', color:'#10B981', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}><FaCheck /></button>
                  <button onClick={()=>setEditIdx(null)} style={{ width:30, height:30, borderRadius:7, border:'1px solid var(--nt-border-md)', background:'transparent', color:'var(--nt-text-muted)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}><FaTimes /></button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize:13.5, fontWeight:700, color:'var(--nt-text-primary)' }}>{t.nome}</div>
                <div style={{ fontSize:13, color:'var(--nt-text-secondary)' }}>{t.faixa_etaria||'—'}</div>
                <div style={{ fontSize:12.5, color:'var(--nt-text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.descricao||'—'}</div>
                <span style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20, background: t.ativo?'#D1FAE5':'#F3F4F6', color: t.ativo?'#065F46':'#6B7280', display:'inline-block' }}>
                  {t.ativo?'Ativa':'Inativa'}
                </span>
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={()=>{ setEditIdx(i); setEditData({nome:t.nome,faixa_etaria:t.faixa_etaria,descricao:t.descricao}); }} title="Editar"
                    style={{ width:30, height:30, borderRadius:7, border:'1px solid var(--nt-border-md)', background:'transparent', color:'var(--nt-text-muted)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}><FaEdit /></button>
                  <button onClick={()=>toggleAtivo(t)} title={t.ativo?'Desativar':'Ativar'}
                    style={{ width:30, height:30, borderRadius:7, border:'1px solid var(--nt-border-md)', background:'transparent', color: t.ativo?'#10B981':'#9CA3AF', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>
                    {t.ativo?<FaToggleOn />:<FaToggleOff />}
                  </button>
                  <button onClick={()=>deletar(t.id!)} title="Remover"
                    style={{ width:30, height:30, borderRadius:7, border:'1px solid var(--nt-border-md)', background:'transparent', color:'#EF4444', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}><FaTrash /></button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SEÇÃO: SISTEMA
// ─────────────────────────────────────────────────────────────────────────────
function SecaoSistema() {
  const DEFAULT_SIS: SistemaConfig = { nome_escola: 'Zoe', subtitulo_escola: 'Gestão Escolar', primary_color: '#FF4403' };
  const [config, setConfig] = useState<SistemaConfig>(DEFAULT_SIS);
  const [loadingSis, setLoadingSis] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{type:'success'|'error';msg:string}|null>(null);

  // Carrega do Supabase na montagem
  useEffect(() => {
    fetch('/api/configuracoes?chave=sistema')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data && typeof data === 'object') setConfig({ ...DEFAULT_SIS, ...data }); })
      .catch(() => {})
      .finally(() => setLoadingSis(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const salvar = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/configuracoes?chave=sistema', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error();
      document.documentElement.style.setProperty('--nt-primary', config.primary_color);
      setToast({ type: 'success', msg: 'Configurações do sistema salvas!' });
    } catch {
      setToast({ type: 'error', msg: 'Erro ao salvar. Tente novamente.' });
    } finally {
      setSaving(false);
    }
  };

  const inp: React.CSSProperties = { width:'100%', height:42, padding:'0 12px', borderRadius:8, border:'1px solid var(--nt-border-md)', background:'var(--nt-surface)', color:'var(--nt-text-primary)', fontSize:13.5, fontFamily:'inherit' };

  return (
    <div>
      {toast && <Toast type={toast.type} msg={toast.msg} onClose={()=>setToast(null)} />}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div>
          <h2 style={{ fontSize:17, fontWeight:800, fontFamily:'Poppins,sans-serif', color:'var(--nt-text-primary)', marginBottom:4 }}>Configurações do Sistema</h2>
          <p style={{ fontSize:13, color:'var(--nt-text-muted)' }}>Personalize o nome da escola e aparência</p>
        </div>
        <button onClick={salvar} style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 20px', borderRadius:8, border:'none', background:'var(--nt-primary)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
          <FaSave style={{ fontSize:11 }} /> {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      <div style={{ background:'var(--nt-surface)', borderRadius:12, border:'1px solid var(--nt-border)', padding:24 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          <div>
            <label style={{ display:'block', fontSize:11.5, fontWeight:600, color:'var(--nt-text-secondary)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>Nome da Escola</label>
            <input value={config.nome_escola} onChange={e=>setConfig(c=>({...c,nome_escola:e.target.value}))} style={inp} placeholder="Ex: Zoe" />
          </div>
          <div>
            <label style={{ display:'block', fontSize:11.5, fontWeight:600, color:'var(--nt-text-secondary)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>Subtítulo</label>
            <input value={config.subtitulo_escola} onChange={e=>setConfig(c=>({...c,subtitulo_escola:e.target.value}))} style={inp} placeholder="Ex: Gestão Escolar" />
          </div>
          <div>
            <label style={{ display:'block', fontSize:11.5, fontWeight:600, color:'var(--nt-text-secondary)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>Cor Principal</label>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <input type="color" value={config.primary_color} onChange={e=>setConfig(c=>({...c,primary_color:e.target.value}))}
                style={{ width:56, height:42, borderRadius:8, border:'1px solid var(--nt-border-md)', cursor:'pointer', padding:2 }} />
              <input value={config.primary_color} onChange={e=>setConfig(c=>({...c,primary_color:e.target.value}))} style={{ ...inp, flex:1 }} placeholder="#FF4403" />
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'flex-end' }}>
            <div style={{ width:'100%', height:42, borderRadius:8, background:config.primary_color, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:13 }}>
              Prévia da cor principal
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop:20, background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:10, padding:'14px 18px', fontSize:13, color:'#1E40AF', display:'flex', gap:10, alignItems:'flex-start' }}>
        <FaExclamationCircle style={{ marginTop:1, flexShrink:0, color:'#3B82F6' }} />
        <div>
          <strong>Configurações salvas no banco:</strong> Nome da escola, subtítulo e cor são sincronizados automaticamente entre todos os dispositivos e admins.
        </div>
      </div>
    </div>
  );
}

type Tab = 'turmas' | 'campos-alunos' | 'campos-trein' | 'sistema';

const TABS: { id: Tab; label: string; desc: string; icon: string }[] = [
  { id: 'turmas',        label: 'Turmas',               desc: 'Gerenciar turmas e categorias', icon: '🏫' },
  { id: 'campos-alunos', label: 'Campos de Alunos',    desc: 'Configurar campos do cadastro',  icon: '👤' },
  { id: 'campos-trein',  label: 'Campos de Professores', desc: 'Configurar campos do cadastro', icon: '🏋️' },
  { id: 'sistema',       label: 'Sistema',              desc: 'Configurações gerais',          icon: '⚙️' },
];

export default function Admin() {
  const [tab, setTab] = useState<Tab>('turmas');
  const active = TABS.find(t => t.id === tab)!;

  return (
    <>
      <Head><title>Administração — Zoe</title></Head>
      <Layout>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--nt-text-primary)', marginBottom: 4 }}>Administração</h1>
          <p style={{ fontSize: 13.5, color: 'var(--nt-text-secondary)' }}>Configurações gerais do sistema</p>
        </div>

        {/* Acesso rápido */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { href: '/usuarios', label: 'Usuários e Logins', desc: 'Criar e gerenciar logins', color: '#2563eb', bg: '#eff6ff', icon: '👤' },
            { href: '/relatorios', label: 'Relatórios', desc: 'Frequência e alertas', color: '#16a34a', bg: '#f0fdf4', icon: '📊' },
            { href: '/chamada', label: 'Fazer Chamada', desc: 'Registrar presença hoje', color: '#d97706', bg: '#fffbeb', icon: '📋' },
          ].map(item => (
            <a key={item.href} href={item.href}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: item.bg, border: `1px solid ${item.color}22`, borderRadius: 10, textDecoration: 'none', flex: 1, minWidth: 180, transition: 'all .12s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = item.color}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = `${item.color}22`}
            >
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: item.color }}>{item.label}</div>
                <div style={{ fontSize: 11.5, color: '#6b7280', marginTop: 1 }}>{item.desc}</div>
              </div>
            </a>
          ))}
        </div>

        <div style={{ display:'flex', gap:20, alignItems:'flex-start' }}>
          {/* Sidebar de abas */}
          <div style={{ width:220, flexShrink:0, background:'var(--nt-surface)', borderRadius:12, border:'1px solid var(--nt-border)', overflow:'hidden' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  width:'100%', display:'flex', alignItems:'center', gap:12,
                  padding:'12px 16px', background: tab===t.id ? '#FFF2F0' : 'transparent',
                  borderLeft: tab===t.id ? '3px solid #FF4403' : '3px solid transparent',
                  border:'none', cursor:'pointer', textAlign:'left',
                }}>
                <div style={{ width:34, height:34, borderRadius:8, background: tab===t.id?'#FF4403':'var(--nt-bg)', color: tab===t.id?'#fff':'var(--nt-text-muted)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>
                  {t.icon}
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight: tab===t.id?700:500, color: tab===t.id?'#FF4403':'var(--nt-text-primary)' }}>{t.label}</div>
                  <div style={{ fontSize:11, color:'var(--nt-text-muted)', marginTop:1 }}>{t.desc}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Conteúdo */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ background:'var(--nt-surface)', borderRadius:12, border:'1px solid var(--nt-border)', padding:'6px 20px 16px', marginBottom:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 0' }}>
                <div style={{ width:36, height:36, borderRadius:8, background:'#FF4403', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>{active.icon}</div>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:'var(--nt-text-primary)' }}>{active.label}</div>
                  <div style={{ fontSize:12.5, color:'var(--nt-text-secondary)' }}>{active.desc}</div>
                </div>
              </div>
            </div>

            {tab === 'turmas'        && <SecaoTurmas />}
            {tab === 'campos-alunos' && <SecaoCampos tipo="alunos" />}
            {tab === 'campos-trein'  && <SecaoCampos tipo="professores" />}
            {tab === 'sistema'       && <SecaoSistema />}
          </div>
        </div>
      </Layout>
    </>
  );
}
