import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useQueryClient } from '@tanstack/react-query';
import InputMask from 'react-input-mask';
import Layout from '../components/layout/Layout';
import { supabase } from '../supabaseClient';
import { FaCamera, FaSpinner, FaCheckCircle, FaExclamationCircle, FaTimes, FaUser, FaSearch, FaTrash, FaEdit, FaPlus } from 'react-icons/fa';
import { useCamposConfig } from '../hooks/useCamposConfig';
import { useProfessores } from '../hooks/useSupabaseQuery';

type FormData = {
  matricula: string; dataAtual: string; turma: string; nomeCompleto: string;
  dataNascimento: string; idade: string; rg: string; cpf: string;
  cep: string; endereco: string; bairro: string; cidade: string; uf: string;
  telefone: string; email: string; especialidade: string; formacao: string;
  experiencia: string; foto?: File | null; fotoUrl?: string; sexo: string;
};

const EMPTY: FormData = {
  matricula: '', dataAtual: new Date().toISOString().split('T')[0], turma: '',
  nomeCompleto: '', dataNascimento: '', idade: '', sexo: '', rg: '', cpf: '',
  cep: '', endereco: '', bairro: '', cidade: '', uf: '', telefone: '', email: '',
  especialidade: '', formacao: '', experiencia: '', foto: null, fotoUrl: '',
};

function calcularIdade(dn: string): string {
  if (!dn) return '';
  let nascimento: Date;
  if (dn.includes('/')) { const [d,m,a] = dn.split('/'); nascimento = new Date(+a,+m-1,+d); }
  else { nascimento = new Date(dn); }
  if (isNaN(nascimento.getTime())) return '';
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mes = hoje.getMonth() - nascimento.getMonth();
  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) idade--;
  return idade >= 0 ? String(idade) : '';
}

function converterDataBanco(data: string): string {
  if (data.includes('/')) { const [d,m,a] = data.split('/'); return `${a}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`; }
  return data;
}

function converterDataExibicao(data: string): string {
  if (!data) return '';
  if (data.includes('/')) return data;
  const [a, m, d] = data.split('-');
  if (!a || !m || !d) return '';
  return `${d}/${m}/${a}`;
}

const inp: React.CSSProperties = { width:'100%', height:40, padding:'0 12px', fontSize:13.5, border:'1px solid var(--nt-border-md)', borderRadius:8, background:'var(--nt-surface)', color:'var(--nt-text-primary)', outline:'none', fontFamily:'inherit', transition:'border-color 0.15s' };
const inpErr: React.CSSProperties = { ...inp, borderColor:'var(--nt-danger)' };
const sel: React.CSSProperties = { ...inp, cursor:'pointer' };
const selErr: React.CSSProperties = { ...sel, borderColor:'var(--nt-danger)' };
const ro: React.CSSProperties = { ...inp, background:'var(--nt-bg)', color:'var(--nt-text-muted)', cursor:'default' };
const ta: React.CSSProperties = { ...inp, height:80, padding:'10px 12px', resize:'vertical' };

const Field = ({ label, error, children, col }: { label:string; error?:string; children:React.ReactNode; col?:string }) => (
  <div style={{ gridColumn: col }}>
    <label style={{ display:'block', fontSize:11.5, fontWeight:600, color:'var(--nt-text-secondary)', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</label>
    {children}
    {error && <span style={{ fontSize:11, color:'var(--nt-danger)', marginTop:3, display:'block' }}>{error}</span>}
  </div>
);

const Section = ({ title, children }: { title:string; children:React.ReactNode }) => (
  <div style={{ background:'var(--nt-surface)', borderRadius:12, border:'1px solid var(--nt-border)', padding:'20px 24px', marginBottom:16 }}>
    <h2 style={{ fontSize:13, fontWeight:700, color:'var(--nt-primary)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:16 }}>{title}</h2>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'16px 14px' }}>
      {children}
    </div>
  </div>
);

export default function Professores() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const tab: 'cadastro' | 'lista' = router.query.tab === 'lista' ? 'lista' : 'cadastro';
  const [editId, setEditId] = useState<number | null>(null);
  const [busca, setBusca] = useState('');
  const [excluindoId, setExcluindoId] = useState<number | null>(null);
  const { data: professoresList = [], isLoading: loadingLista } = useProfessores();

  const [form, setForm] = useState<FormData>({ ...EMPTY });
  const [turmas, setTurmas] = useState<{ id:number; nome:string }[]>([]);
  const [touched, setTouched] = useState<Record<string,boolean>>({});
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [toast, setToast] = useState<{ type:'success'|'error'; msg:string }|null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const r = Math.floor(100000 + Math.random() * 900000);
    setForm(f => ({ ...f, matricula: `DO${r}` }));
    supabase.from('Turmas').select('id, nome').then(({ data }) => setTurmas(data || []));
  }, []);

  const set = (name: string, value: string) => setForm(f => {
    const next = { ...f, [name]: value };
    if (name === 'dataNascimento') next.idade = calcularIdade(value);
    return next;
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    set(name, value);
    if (name === 'cep') {
      const digits = value.replace(/\D/g,'');
      if (digits.length === 8) {
        setLoadingCep(true);
        fetch(`https://viacep.com.br/ws/${digits}/json/`)
          .then(r => r.json())
          .then(d => { if (!d.erro) setForm(f => ({ ...f, endereco:d.logradouro||'', bairro:d.bairro||'', cidade:d.localidade||'', uf:d.uf||'' })); setLoadingCep(false); })
          .catch(() => setLoadingCep(false));
      }
    }
  };

  const blur = (name: string) => setTouched(t => ({ ...t, [name]:true }));
  const err = (name: string) => touched[name] && !(form as any)[name] ? 'Campo obrigatório' : undefined;

  const showToast = (type: 'success'|'error', msg: string) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };

  const irPara = (novaTab: 'cadastro' | 'lista') => {
    router.push({ pathname: '/professores', query: { tab: novaTab } }, undefined, { shallow: true });
  };

  const startEdit = (row: any) => {
    setForm({
      matricula: row.matricula || '', dataAtual: new Date().toISOString().split('T')[0],
      turma: row.turma || '', nomeCompleto: row.nomeCompleto || '',
      dataNascimento: converterDataExibicao(row.dataNascimento || ''),
      idade: row.idade ? String(row.idade) : calcularIdade(converterDataExibicao(row.dataNascimento || '')),
      sexo: row.sexo || '', rg: row.rg || '', cpf: row.cpf || '',
      cep: row.cep || '', endereco: row.endereco || '', bairro: row.bairro || '',
      cidade: row.cidade || '', uf: row.uf || '', telefone: row.telefone || '',
      email: row.email || '', especialidade: row.especialidade || '', formacao: row.formacao || '',
      experiencia: row.experiencia || '', foto: null, fotoUrl: row.fotoUrl || '',
    });
    setEditId(row.id);
    setTouched({});
    setErrors([]);
    irPara('cadastro');
  };

  const cancelarEdicao = () => {
    const r = Math.floor(100000 + Math.random() * 900000);
    setForm({ ...EMPTY, matricula: `DO${r}` });
    setEditId(null);
    setTouched({});
    setErrors([]);
  };

  const handleDelete = async (row: any) => {
    if (!confirm(`Excluir o professor "${row.nomeCompleto}"? Essa ação não pode ser desfeita.`)) return;
    setExcluindoId(row.id);
    const { error } = await supabase.from('Professores').delete().eq('id', row.id);
    setExcluindoId(null);
    if (error) {
      showToast('error', `Erro ao excluir: ${error.message}`);
      return;
    }
    showToast('success', 'Professor excluído com sucesso!');
    queryClient.invalidateQueries({ queryKey: ['professores'] });
  };

  const professoresFiltrados = (professoresList as any[]).filter(t => {
    const q = busca.trim().toLowerCase();
    if (!q) return true;
    return (t.nomeCompleto || '').toLowerCase().includes(q)
      || (t.matricula || '').toLowerCase().includes(q)
      || (t.especialidade || '').toLowerCase().includes(q);
  });


  // ── Config de campos do Admin ────────────────────────────────────────────────
  const { isAtivo, isObrigatorio, getLabel } = useCamposConfig('professores');

  const validate = () => {
    const e: string[] = [];
    // campos fixos — sempre obrigatórios
    if (!form.nomeCompleto)   e.push('Nome Completo é obrigatório');
    if (!form.dataNascimento) e.push('Data de Nascimento é obrigatória');
    if (!form.turma)          e.push('Selecione uma turma');
    // campos configuráveis
    const opcionais: { key: keyof FormData; msg: string }[] = [
      { key: 'sexo',         msg: 'Selecione o sexo' },
      { key: 'rg',           msg: 'RG é obrigatório' },
      { key: 'cpf',          msg: 'CPF é obrigatório' },
      { key: 'cep',          msg: 'CEP é obrigatório' },
      { key: 'especialidade',msg: `${getLabel('especialidade','Especialidade')} é obrigatória` },
      { key: 'formacao',     msg: `${getLabel('formacao','Formação')} é obrigatória` },
      { key: 'telefone',     msg: `${getLabel('telefone','Telefone')} é obrigatório` },
      { key: 'email',        msg: `${getLabel('email','Email')} é obrigatório` },
      { key: 'endereco',     msg: `${getLabel('endereco','Endereço')} é obrigatório` },
      { key: 'bairro',       msg: `${getLabel('bairro','Bairro')} é obrigatório` },
      { key: 'cidade',       msg: `${getLabel('cidade','Cidade')} é obrigatória` },
      { key: 'uf',           msg: `${getLabel('uf','UF')} é obrigatório` },
    ];
    for (const { key, msg } of opcionais) {
      if (isAtivo(key) && isObrigatorio(key) && !form[key]) e.push(msg);
    }
    setErrors(e); return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const erros = validate();
    if (erros.length > 0) return;
    setLoading(true);
    try {
      let fotoUrl = form.fotoUrl || '';
      if (form.foto) {
        const ext = form.foto.name.split('.').pop();
        const path = `fotos/${form.matricula}.${ext}`;
        const { error: upErr } = await supabase.storage.from('professores-fotos').upload(path, form.foto, { upsert:true });
        if (upErr) throw new Error(upErr.message);
        const { data: urlData } = supabase.storage.from('professores-fotos').getPublicUrl(path);
        fotoUrl = urlData.publicUrl;
      }
      const payload = {
        matricula: form.matricula, dataAtual: form.dataAtual, turma: form.turma,
        nomeCompleto: form.nomeCompleto, dataNascimento: converterDataBanco(form.dataNascimento),
        idade: form.idade, sexo: form.sexo, rg: form.rg, cpf: form.cpf,
        cep: form.cep, endereco: form.endereco, bairro: form.bairro, cidade: form.cidade,
        uf: form.uf, telefone: form.telefone, email: form.email,
        especialidade: form.especialidade, formacao: form.formacao,
        experiencia: form.experiencia, fotoUrl,
      };
      if (editId) {
        const { error: updErr } = await supabase.from('Professores').update(payload).eq('id', editId);
        if (updErr) throw new Error(updErr.message);
        showToast('success', 'Professor atualizado com sucesso!');
        queryClient.invalidateQueries({ queryKey: ['professores'] });
        cancelarEdicao();
        irPara('lista');
        setLoading(false);
        return;
      }
      const { error: insErr } = await supabase.from('Professores').insert([payload]);
      if (insErr) throw new Error(insErr.message);
      showToast('success', 'Professor cadastrado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['professores'] });
      const r = Math.floor(100000 + Math.random() * 900000);
      setForm({ ...EMPTY, matricula:`DO${r}` });
      setTouched({}); setErrors([]);
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao cadastrar');
    } finally { setLoading(false); }
  };

  const openCamera = async () => {
    setShowCamera(true); setCameraLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'user' } });
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.onloadedmetadata = () => { videoRef.current?.play(); setCameraLoading(false); }; }
    } catch { setShowCamera(false); setCameraLoading(false); alert('Câmera não disponível'); }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) { (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop()); videoRef.current.srcObject = null; }
  };

  const capturePhoto = () => {
    const video = videoRef.current; const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video,0,0);
    canvas.toBlob(blob => {
      if (blob) { const file = new File([blob],`foto_${Date.now()}.png`,{ type:'image/png' }); setForm(f => ({ ...f, foto:file })); }
      setShowCamera(false); stopCamera();
    },'image/png',0.9);
  };

  return (
    <Layout>
      {toast && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:9999, display:'flex', alignItems:'center', gap:10, padding:'12px 18px', borderRadius:10, background: toast.type==='success'?'#e6faf5':'#fdf0ed', border:`1px solid ${toast.type==='success'?'#26bf94':'#e6533c'}`, color: toast.type==='success'?'#0d6e53':'#b83220', fontSize:13.5, fontWeight:500, boxShadow:'var(--shadow-md)', animation:'slideIn 0.2s ease' }}>
          {toast.type==='success' ? <FaCheckCircle /> : <FaExclamationCircle />} {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: tab === 'lista' ? 1100 : 960, margin:'0 auto' }}>
        <div style={{ marginBottom:20 }}>
          <h1 style={{ fontSize:22, fontWeight:700, fontFamily:'Poppins, sans-serif', color:'var(--nt-text-primary)', marginBottom:4 }}>
            {tab === 'lista' ? 'Lista de Professores' : editId ? 'Editar Professor' : 'Cadastrar Professor'}
          </h1>
          <p style={{ fontSize:13, color:'var(--nt-text-muted)' }}>
            {tab === 'lista' ? 'Veja, edite ou remova professores cadastrados' : 'Preencha os dados para cadastrar um novo professor'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--nt-border)' }}>
          <button onClick={() => { cancelarEdicao(); irPara('cadastro'); }} type="button" style={{
            padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit',
            color: tab === 'cadastro' ? 'var(--nt-primary)' : 'var(--nt-text-muted)',
            borderBottom: tab === 'cadastro' ? '2px solid var(--nt-primary)' : '2px solid transparent',
            display: 'flex', alignItems: 'center', gap: 6,
          }}><FaPlus style={{ fontSize: 11 }} /> {editId ? 'Editar Professor' : 'Cadastrar Professor'}</button>
          <button onClick={() => irPara('lista')} type="button" style={{
            padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit',
            color: tab === 'lista' ? 'var(--nt-primary)' : 'var(--nt-text-muted)',
            borderBottom: tab === 'lista' ? '2px solid var(--nt-primary)' : '2px solid transparent',
            display: 'flex', alignItems: 'center', gap: 6,
          }}><FaUser style={{ fontSize: 11 }} /> Lista de Professores</button>
        </div>

        {tab === 'lista' ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, background: 'var(--nt-surface)', border: '1px solid var(--nt-border)', borderRadius: 10, padding: '0 14px', height: 44, maxWidth: 360 }}>
              <FaSearch style={{ fontSize: 13, color: 'var(--nt-text-muted)' }} />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome, matrícula ou especialidade..."
                style={{ border: 'none', outline: 'none', background: 'none', fontSize: 13.5, flex: 1, color: 'var(--nt-text-primary)', fontFamily: 'inherit' }} />
            </div>

            {loadingLista ? (
              <div style={{ textAlign: 'center', padding: 60, color: 'var(--nt-text-muted)', fontSize: 13.5 }}>
                <FaSpinner style={{ animation: 'spin 0.8s linear infinite', fontSize: 20, marginBottom: 8 }} /><br />Carregando professores...
              </div>
            ) : professoresFiltrados.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: 'var(--nt-text-muted)', fontSize: 13.5, background: 'var(--nt-surface)', borderRadius: 12, border: '1px solid var(--nt-border)' }}>
                {busca ? 'Nenhum professor encontrado para essa busca.' : 'Nenhum professor cadastrado ainda.'}
              </div>
            ) : (
              <div style={{ background: 'var(--nt-surface)', borderRadius: 12, border: '1px solid var(--nt-border)', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '52px 2fr 1fr 1fr 90px', gap: 12, padding: '12px 18px', fontSize: 11, fontWeight: 700, color: 'var(--nt-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--nt-border)' }}>
                  <span></span><span>Nome</span><span>Especialidade</span><span>Matrícula</span><span style={{ textAlign: 'right' }}>Ações</span>
                </div>
                {professoresFiltrados.map((t: any) => (
                  <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '52px 2fr 1fr 1fr 90px', gap: 12, padding: '10px 18px', alignItems: 'center', borderBottom: '1px solid var(--nt-border)', fontSize: 13.5 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: 'var(--nt-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {t.fotoUrl
                        ? <img src={t.fotoUrl} alt={t.nomeCompleto} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
                        : <FaUser style={{ fontSize: 14, color: 'var(--nt-text-muted)' }} />}
                    </div>
                    <span style={{ fontWeight: 600, color: 'var(--nt-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.nomeCompleto}</span>
                    <span style={{ color: 'var(--nt-text-secondary)' }}>{t.especialidade || '—'}</span>
                    <span style={{ color: 'var(--nt-text-secondary)' }}>{t.matricula || '—'}</span>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button onClick={() => startEdit(t)} title="Editar" type="button" style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid var(--nt-border)', background: 'var(--nt-bg)', color: 'var(--nt-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FaEdit style={{ fontSize: 12 }} />
                      </button>
                      <button onClick={() => handleDelete(t)} disabled={excluindoId === t.id} title="Excluir" type="button" style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid var(--nt-danger)', background: 'transparent', color: 'var(--nt-danger)', cursor: excluindoId === t.id ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {excluindoId === t.id ? <FaSpinner style={{ fontSize: 11, animation: 'spin 0.8s linear infinite' }} /> : <FaTrash style={{ fontSize: 11 }} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
        <form onSubmit={handleSubmit}>
          <Section title="Dados da Matrícula">
            <Field label="Matrícula"><input value={form.matricula} readOnly style={ro} /></Field>
            <Field label="Data de Cadastro"><input value={form.dataAtual} readOnly style={ro} /></Field>
            <Field label="Turma *" error={touched.turma && !form.turma ? 'Selecione uma turma' : undefined} col="span 2">
              <select name="turma" value={form.turma} onChange={handleChange} onBlur={() => blur('turma')} style={touched.turma && !form.turma ? selErr : sel}>
                <option value="">Selecione uma turma</option>
                {turmas.map(t => <option key={t.id} value={t.nome}>{t.nome}</option>)}
              </select>
            </Field>
          </Section>

          <Section title="Dados Pessoais">
            <Field label={`${getLabel('nomeCompleto','Nome Completo')} *`} error={err('nomeCompleto')} col="1/-1">
              <input name="nomeCompleto" value={form.nomeCompleto} onChange={handleChange} onBlur={() => blur('nomeCompleto')} style={err('nomeCompleto') ? inpErr : inp} placeholder="Nome completo" />
            </Field>
            <Field label={`${getLabel('dataNascimento','Data de Nascimento')} *`} error={err('dataNascimento')}>
              <InputMask mask="99/99/9999" value={form.dataNascimento} onChange={handleChange} onBlur={() => blur('dataNascimento')}>
                {(p:any) => <input {...p} name="dataNascimento" placeholder="DD/MM/AAAA" style={err('dataNascimento') ? inpErr : inp} />}
              </InputMask>
            </Field>
            <Field label="Idade"><input value={form.idade} readOnly style={ro} placeholder="Auto" /></Field>
            {isAtivo('sexo') && (
              <Field label={`${getLabel('sexo','Sexo')}${isObrigatorio('sexo') ? ' *' : ''}`}
                error={touched.sexo && isObrigatorio('sexo') && !form.sexo ? 'Selecione' : undefined}>
                <select name="sexo" value={form.sexo} onChange={handleChange} onBlur={() => blur('sexo')} style={touched.sexo && isObrigatorio('sexo') && !form.sexo ? selErr : sel}>
                  <option value="">Selecione</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                </select>
              </Field>
            )}
            {isAtivo('rg') && (
              <Field label={`${getLabel('rg','RG')}${isObrigatorio('rg') ? ' *' : ''}`} error={isObrigatorio('rg') ? err('rg') : undefined}>
                <InputMask mask="99.999.999-9" value={form.rg} onChange={handleChange} onBlur={() => blur('rg')}>
                  {(p:any) => <input {...p} name="rg" style={isObrigatorio('rg') && err('rg') ? inpErr : inp} />}
                </InputMask>
              </Field>
            )}
            {isAtivo('cpf') && (
              <Field label={`${getLabel('cpf','CPF')}${isObrigatorio('cpf') ? ' *' : ''}`} error={isObrigatorio('cpf') ? err('cpf') : undefined}>
                <InputMask mask="999.999.999-99" value={form.cpf} onChange={handleChange} onBlur={() => blur('cpf')}>
                  {(p:any) => <input {...p} name="cpf" style={isObrigatorio('cpf') && err('cpf') ? inpErr : inp} />}
                </InputMask>
              </Field>
            )}
            {isAtivo('telefone') && (
              <Field label={`${getLabel('telefone','Telefone')}${isObrigatorio('telefone') ? ' *' : ''}`}>
                <InputMask mask="(99) 99999-9999" value={form.telefone} onChange={handleChange}>
                  {(p:any) => <input {...p} name="telefone" style={inp} />}
                </InputMask>
              </Field>
            )}
            {isAtivo('email') && (
              <Field label={`${getLabel('email','Email')}${isObrigatorio('email') ? ' *' : ''}`} col="span 3">
                <input name="email" type="email" value={form.email} onChange={handleChange} style={inp} placeholder="email@exemplo.com" />
              </Field>
            )}
          </Section>

          {(isAtivo('especialidade') || isAtivo('formacao') || isAtivo('experiencia')) && (
          <Section title="Formação Profissional">
            {isAtivo('especialidade') && (
              <Field label={`${getLabel('especialidade','Especialidade')}${isObrigatorio('especialidade') ? ' *' : ''}`}
                error={isObrigatorio('especialidade') ? err('especialidade') : undefined} col="span 2">
                <input name="especialidade" value={form.especialidade} onChange={handleChange} onBlur={() => blur('especialidade')}
                  style={isObrigatorio('especialidade') && err('especialidade') ? inpErr : inp} placeholder="Ex: Matemática, História..." />
              </Field>
            )}
            {isAtivo('formacao') && (
              <Field label={`${getLabel('formacao','Formação')}${isObrigatorio('formacao') ? ' *' : ''}`}
                error={isObrigatorio('formacao') ? err('formacao') : undefined} col="span 2">
                <input name="formacao" value={form.formacao} onChange={handleChange} onBlur={() => blur('formacao')}
                  style={isObrigatorio('formacao') && err('formacao') ? inpErr : inp} placeholder="Ex: Ed. Física, CREF..." />
              </Field>
            )}
            {isAtivo('experiencia') && (
              <Field label={`${getLabel('experiencia','Experiência')}${isObrigatorio('experiencia') ? ' *' : ''}`} col="1/-1">
                <textarea name="experiencia" value={form.experiencia} onChange={handleChange} style={ta} placeholder="Descreva a experiência profissional..." />
              </Field>
            )}
          </Section>
          )}

          {(isAtivo('cep') || isAtivo('endereco') || isAtivo('bairro') || isAtivo('cidade') || isAtivo('uf')) && (
          <Section title="Endereço">
            {isAtivo('cep') && (
              <Field label={loadingCep ? 'CEP — buscando...' : `${getLabel('cep','CEP')}${isObrigatorio('cep') ? ' *' : ''}`}
                error={isObrigatorio('cep') ? err('cep') : undefined}>
                <InputMask mask="99999-999" value={form.cep} onChange={handleChange} onBlur={() => blur('cep')}>
                  {(p:any) => <input {...p} name="cep" placeholder="00000-000" style={isObrigatorio('cep') && err('cep') ? inpErr : inp} />}
                </InputMask>
              </Field>
            )}
            {isAtivo('endereco') && (
              <Field label={`${getLabel('endereco','Endereço')}${isObrigatorio('endereco') ? ' *' : ''}`} col="span 2">
                <input name="endereco" value={form.endereco} onChange={handleChange} style={inp} placeholder="Preenchido pelo CEP" />
              </Field>
            )}
            {isAtivo('bairro') && (
              <Field label={`${getLabel('bairro','Bairro')}${isObrigatorio('bairro') ? ' *' : ''}`}>
                <input name="bairro" value={form.bairro} onChange={handleChange} style={inp} />
              </Field>
            )}
            {isAtivo('cidade') && (
              <Field label={`${getLabel('cidade','Cidade')}${isObrigatorio('cidade') ? ' *' : ''}`} col="span 2">
                <input name="cidade" value={form.cidade} onChange={handleChange} style={inp} />
              </Field>
            )}
            {isAtivo('uf') && (
              <Field label={`${getLabel('uf','UF')}${isObrigatorio('uf') ? ' *' : ''}`}>
                <input name="uf" value={form.uf} onChange={handleChange} style={inp} maxLength={2} placeholder="BA" />
              </Field>
            )}
          </Section>
          )}

          {/* Foto */}
          {isAtivo('foto') && (
          <div style={{ background:'var(--nt-surface)', borderRadius:12, border:'1px solid var(--nt-border)', padding:'20px 24px', marginBottom:20 }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:'var(--nt-primary)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:16 }}>Foto do Professor</h2>
            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
              <div style={{ width:72, height:72, borderRadius:'50%', background:'var(--nt-bg)', border:'2px dashed var(--nt-border-md)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, overflow:'hidden' }}>
                {form.foto ? <img src={URL.createObjectURL(form.foto)} alt="preview" style={{ width:'100%', height:'100%', objectFit: 'cover', objectPosition: 'center top' }} /> : <FaUser style={{ fontSize:24, color:'var(--nt-text-muted)' }} />}
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button type="button" onClick={openCamera} style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 16px', borderRadius:8, border:'1px solid var(--nt-border-md)', background:'var(--nt-bg)', color:'var(--nt-text-secondary)', fontSize:13, cursor:'pointer', fontFamily:'inherit', fontWeight:500 }}>
                  <FaCamera style={{ fontSize:12 }} /> Tirar Foto
                </button>
                <label style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 16px', borderRadius:8, border:'1px solid var(--nt-border-md)', background:'var(--nt-bg)', color:'var(--nt-text-secondary)', fontSize:13, cursor:'pointer', fontWeight:500 }}>
                  Selecionar Arquivo
                  <input type="file" accept="image/*" style={{ display:'none' }} onChange={e => e.target.files?.[0] && setForm(f => ({ ...f, foto:e.target.files![0] }))} />
                </label>
              </div>
              {form.foto && <span style={{ fontSize:12, color:'var(--nt-text-muted)' }}>✓ {form.foto.name}</span>}
            </div>
          </div>
          )}

          {errors.length > 0 && (
            <div style={{ background:'#fdf0ed', border:'1px solid var(--nt-danger)', borderRadius:10, padding:'14px 18px', marginBottom:16 }}>
              <div style={{ fontWeight:700, color:'var(--nt-danger)', fontSize:13, marginBottom:6, display:'flex', alignItems:'center', gap:8 }}>
                <FaExclamationCircle /> Corrija os campos antes de continuar:
              </div>
              <ul style={{ paddingLeft:18, margin:0 }}>
                {errors.map((e,i) => <li key={i} style={{ fontSize:13, color:'#b83220', marginBottom:3 }}>{e}</li>)}
              </ul>
            </div>
          )}

          {editId && (
            <button type="button" onClick={() => { cancelarEdicao(); irPara('lista'); }}
              style={{ width: '100%', height: 40, borderRadius: 10, border: '1px solid var(--nt-border)', background: 'var(--nt-surface)', color: 'var(--nt-text-secondary)', fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', marginBottom: 10 }}>
              Cancelar edição
            </button>
          )}
          <button type="submit" disabled={loading} style={{ width:'100%', height:46, borderRadius:10, border:'none', background: loading?'var(--nt-text-muted)':'var(--nt-primary)', color:'#fff', fontSize:14.5, fontWeight:700, fontFamily:'inherit', cursor: loading?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'background 0.15s' }}>
            {loading
              ? <><FaSpinner style={{ animation:'spin 0.8s linear infinite' }} /> {editId ? 'Salvando...' : 'Cadastrando...'}</>
              : editId ? 'Salvar Alterações' : 'Cadastrar Professor'}
          </button>
        </form>
        )}
      </div>

      {showCamera && (
        <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'var(--nt-surface)', borderRadius:16, width:'90%', maxWidth:480, padding:24 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h3 style={{ fontSize:15, fontWeight:700, color:'var(--nt-text-primary)' }}>Tirar Foto</h3>
              <button onClick={() => { setShowCamera(false); stopCamera(); }} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--nt-text-muted)', fontSize:18 }}><FaTimes /></button>
            </div>
            {cameraLoading ? <div style={{ textAlign:'center', padding:'40px 0', color:'var(--nt-text-muted)', fontSize:13 }}>Iniciando câmera...</div>
              : <video ref={videoRef} autoPlay playsInline muted style={{ width:'100%', borderRadius:10, transform:'scaleX(-1)' }} />}
            <div style={{ display:'flex', gap:10, marginTop:16 }}>
              <button onClick={capturePhoto} disabled={cameraLoading} style={{ flex:1, height:42, borderRadius:8, border:'none', background:'var(--nt-primary)', color:'#fff', fontSize:13.5, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>📸 Capturar</button>
              <button onClick={() => { setShowCamera(false); stopCamera(); }} style={{ flex:1, height:42, borderRadius:8, border:'1px solid var(--nt-border-md)', background:'transparent', color:'var(--nt-text-secondary)', fontSize:13.5, cursor:'pointer', fontFamily:'inherit' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} style={{ display:'none' }} />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { transform: translateX(20px); opacity:0; } to { transform: translateX(0); opacity:1; } }
        input:focus, select:focus, textarea:focus { border-color: var(--nt-primary) !important; box-shadow: 0 0 0 3px rgba(255,68,3,0.1); }
      `}</style>
    </Layout>
  );
}
