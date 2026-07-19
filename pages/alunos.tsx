import React, { useState, useEffect, useRef } from 'react';
import InputMask from 'react-input-mask';
import Layout from '../components/layout/Layout';
import { supabase } from '../supabaseClient';
import { FaCamera, FaSpinner, FaCheckCircle, FaExclamationCircle, FaTimes, FaUser } from 'react-icons/fa';
import { useCamposConfig } from '../hooks/useCamposConfig';

type FormData = {
  matricula: string; dataAtual: string; turma: string; nomeCompleto: string;
  dataNascimento: string; idade: string; rg: string; cpf: string;
  cep: string; endereco: string; bairro: string; cidade: string; uf: string;
  telefone: string; email: string; nomePai: string; nomeMae: string;
  responsavel: string; telefoneResponsavel: string; foto?: File | null;
  fotoUrl?: string; sexo: string;
};

const EMPTY: FormData = {
  matricula: '', dataAtual: new Date().toISOString().split('T')[0], turma: '',
  nomeCompleto: '', dataNascimento: '', idade: '', sexo: '', rg: '', cpf: '',
  cep: '', endereco: '', bairro: '', cidade: '', uf: '', telefone: '', email: '',
  nomePai: '', nomeMae: '', responsavel: '', telefoneResponsavel: '', foto: null, fotoUrl: '',
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function calcularIdade(dn: string): string {
  if (!dn) return '';
  let nascimento: Date;
  if (dn.includes('/')) {
    const [d, m, a] = dn.split('/');
    nascimento = new Date(+a, +m - 1, +d);
  } else {
    nascimento = new Date(dn);
  }
  if (isNaN(nascimento.getTime())) return '';
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mes = hoje.getMonth() - nascimento.getMonth();
  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) idade--;
  return idade >= 0 ? String(idade) : '';
}

function converterDataBanco(data: string): string {
  if (data.includes('/')) {
    const [d, m, a] = data.split('/');
    return `${a}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }
  return data;
}

function converterDataExibicao(data: string): string {
  if (!data) return '';
  if (data.includes('/')) return data;
  const [a, m, d] = data.split('-');
  if (!a || !m || !d) return '';
  return `${d}/${m}/${a}`;
}

// ── Field component ────────────────────────────────────────────────────────────
const Field = ({ label, error, children, half, third, full }: {
  label: string; error?: string; children: React.ReactNode;
  half?: boolean; third?: boolean; full?: boolean;
}) => (
  <div style={{ gridColumn: full ? '1/-1' : half ? 'span 2' : third ? 'span 1' : 'span 1' }}>
    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--nt-text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {label}
    </label>
    {children}
    {error && <span style={{ fontSize: 11, color: 'var(--nt-danger)', marginTop: 3, display: 'block' }}>{error}</span>}
  </div>
);

const inputStyle: React.CSSProperties = {
  width: '100%', height: 40, padding: '0 12px', fontSize: 13.5,
  border: '1px solid var(--nt-border-md)', borderRadius: 8,
  background: 'var(--nt-surface)', color: 'var(--nt-text-primary)',
  outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s',
};

const inputErrStyle: React.CSSProperties = { ...inputStyle, borderColor: 'var(--nt-danger)' };
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };
const selectErrStyle: React.CSSProperties = { ...selectStyle, borderColor: 'var(--nt-danger)' };
const readonlyStyle: React.CSSProperties = { ...inputStyle, background: 'var(--nt-bg)', color: 'var(--nt-text-muted)', cursor: 'default' };

// ── Main ───────────────────────────────────────────────────────────────────────
export default function Alunos() {
  const [form, setForm] = useState<FormData>({ ...EMPTY });
  const [turmas, setTurmas] = useState<{ id: number; nome: string }[]>([]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── Config de campos do Admin ────────────────────────────────────────────────
  const { isAtivo, isObrigatorio, getLabel } = useCamposConfig('alunos');

  useEffect(() => {
    const r = Math.floor(100000 + Math.random() * 900000);
    setForm(f => ({ ...f, matricula: `DI${r}` }));
    supabase.from('Cursos').select('id, curso').then(({ data }) => setTurmas((data || []).map((c: any) => ({ id: c.id, nome: c.curso }))));
  }, []);

  const set = (name: string, value: string) => {
    setForm(f => {
      const next = { ...f, [name]: value };
      if (name === 'dataNascimento') next.idade = calcularIdade(value);
      return next;
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    set(name, value);
    if (name === 'cep') {
      const digits = value.replace(/\D/g, '');
      if (digits.length === 8) {
        setLoadingCep(true);
        fetch(`https://viacep.com.br/ws/${digits}/json/`)
          .then(r => r.json())
          .then(d => {
            if (!d.erro) setForm(f => ({ ...f, endereco: d.logradouro || '', bairro: d.bairro || '', cidade: d.localidade || '', uf: d.uf || '' }));
            setLoadingCep(false);
          })
          .catch(() => setLoadingCep(false));
      }
    }
  };

  const blur = (name: string) => setTouched(t => ({ ...t, [name]: true }));

  const validate = () => {
    const e: string[] = [];
    // campos fixos — sempre obrigatórios
    if (!form.nomeCompleto)   e.push('Nome Completo é obrigatório');
    if (!form.dataNascimento) e.push('Data de Nascimento é obrigatória');
    if (!form.turma)          e.push('Selecione um curso');
    // campos configuráveis — só valida se ativo E obrigatório
    const opcionais: { key: keyof FormData; msg: string }[] = [
      { key: 'sexo',    msg: 'Selecione o sexo' },
      { key: 'rg',      msg: 'RG é obrigatório' },
      { key: 'cpf',     msg: 'CPF é obrigatório' },
      { key: 'cep',     msg: 'CEP é obrigatório' },
      { key: 'telefone',msg: `${getLabel('telefone','Telefone')} é obrigatório` },
      { key: 'email',   msg: `${getLabel('email','Email')} é obrigatório` },
      { key: 'endereco',msg: `${getLabel('endereco','Endereço')} é obrigatório` },
      { key: 'bairro',  msg: `${getLabel('bairro','Bairro')} é obrigatório` },
      { key: 'cidade',  msg: `${getLabel('cidade','Cidade')} é obrigatória` },
      { key: 'uf',      msg: `${getLabel('uf','UF')} é obrigatório` },
      { key: 'nomePai', msg: `${getLabel('nomePai','Nome do Pai')} é obrigatório` },
      { key: 'nomeMae', msg: `${getLabel('nomeMae','Nome da Mãe')} é obrigatório` },
      { key: 'responsavel',         msg: `${getLabel('responsavel','Responsável')} é obrigatório` },
      { key: 'telefoneResponsavel', msg: `${getLabel('telefoneResponsavel','Tel. Responsável')} é obrigatório` },
    ];
    for (const { key, msg } of opcionais) {
      if (isAtivo(key) && isObrigatorio(key) && !form[key]) e.push(msg);
    }
    setErrors(e);
    return e;
  };

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const erros = validate();
    if (erros.length > 0) return;
    setLoading(true);
    try {
      let fotoUrl = form.fotoUrl || '';
      if (form.foto) {
        const ext = form.foto.name.split('.').pop()?.toLowerCase() || 'jpg';
        const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg';
        const path = `fotos/${form.matricula}_${Date.now()}.${safeExt}`;
        const { error: upErr } = await supabase.storage.from('alunos-fotos').upload(path, form.foto, { upsert: true, contentType: form.foto.type });
        if (upErr) {
          console.error('Erro upload foto:', upErr);
          showToast('error', `Erro ao enviar foto: ${upErr.message}`);
          setLoading(false);
          return;
        }
        const { data: urlData } = supabase.storage.from('alunos-fotos').getPublicUrl(path);
        // Salvar URL limpa no banco (sem cache-buster) — a exibição adiciona ?t= se necessário
        fotoUrl = urlData.publicUrl || '';
      }
      const payload = {
        matricula: form.matricula, dataAtual: form.dataAtual, turma: form.turma,
        nomeCompleto: form.nomeCompleto, dataNascimento: converterDataBanco(form.dataNascimento),
        idade: form.idade, sexo: form.sexo, rg: form.rg, cpf: form.cpf,
        cep: form.cep, endereco: form.endereco, bairro: form.bairro, cidade: form.cidade,
        uf: form.uf, telefone: form.telefone, email: form.email, nomePai: form.nomePai,
        nomeMae: form.nomeMae, responsavel: form.responsavel,
        telefoneResponsavel: form.telefoneResponsavel, fotoUrl,
      };
      const { error: insErr } = await supabase.from('Alunos').insert([payload]);
      if (insErr) {
        if (insErr.message.includes('cpf_key') || insErr.message.includes('Alunos_cpf_key')) {
          throw new Error('CPF já cadastrado. Verifique se este aluno já está no sistema.');
        }
        if (insErr.message.includes('matricula')) {
          throw new Error('Matrícula já cadastrada. Tente gerar uma nova matrícula.');
        }
        throw new Error(insErr.message);
      }
      showToast('success', 'Aluno cadastrado com sucesso!');
      const r = Math.floor(100000 + Math.random() * 900000);
      setForm({ ...EMPTY, matricula: `DI${r}` });
      setTouched({});
      setErrors([]);
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  };

  // ── Camera ──────────────────────────────────────────────────────────────────
  const openCamera = async () => {
    setShowCamera(true); setCameraLoading(true);
    try {
      // Tenta câmera traseira no mobile, frontal como fallback
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Timeout de segurança: se onloadedmetadata não disparar em 3s, libera mesmo assim
        const safetyTimer = setTimeout(() => { setCameraLoading(false); }, 3000);
        const onReady = () => {
          clearTimeout(safetyTimer);
          videoRef.current?.play().catch(() => {});
          setCameraLoading(false);
        };
        videoRef.current.onloadedmetadata = onReady;
        videoRef.current.oncanplay = onReady;
      }
    } catch { setShowCamera(false); setCameraLoading(false); alert('Câmera não disponível ou permissão negada.'); }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current; const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (blob) {
        const file = new File([blob], `foto_${Date.now()}.png`, { type: 'image/png' });
        setForm(f => ({ ...f, foto: file }));
      }
      setShowCamera(false); stopCamera();
    }, 'image/png', 0.9);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  const err = (name: string) => touched[name] && !(form as any)[name] ? 'Campo obrigatório' : undefined;

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px 14px',
  };

  return (
    <Layout>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 18px', borderRadius: 10,
          background: toast.type === 'success' ? '#e6faf5' : '#fdf0ed',
          border: `1px solid ${toast.type === 'success' ? '#26bf94' : '#e6533c'}`,
          color: toast.type === 'success' ? '#0d6e53' : '#b83220',
          fontSize: 13.5, fontWeight: 500, boxShadow: 'var(--shadow-md)',
          animation: 'slideIn 0.2s ease',
        }}>
          {toast.type === 'success' ? <FaCheckCircle /> : <FaExclamationCircle />}
          {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Poppins, sans-serif', color: 'var(--nt-text-primary)', marginBottom: 4 }}>
            Cadastrar Aluno
          </h1>
          <p style={{ fontSize: 13, color: 'var(--nt-text-muted)' }}>Preencha os dados para matricular um novo aluno</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Seção: Dados da Matrícula */}
          <div style={{ background: 'var(--nt-surface)', borderRadius: 12, border: '1px solid var(--nt-border)', padding: '20px 24px', marginBottom: 16 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--nt-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FaUser style={{ fontSize: 11 }} /> Dados da Matrícula
            </h2>
            <div style={gridStyle}>
              <Field label="Matrícula">
                <input value={form.matricula} readOnly style={readonlyStyle} />
              </Field>
              <Field label="Data de Cadastro">
                <input value={form.dataAtual} readOnly style={readonlyStyle} />
              </Field>
              <Field label="Curso *" error={touched.turma && !form.turma ? 'Selecione um curso' : undefined} half>
                <select name="turma" value={form.turma}
                  onChange={handleChange} onBlur={() => blur('turma')}
                  style={touched.turma && !form.turma ? selectErrStyle : selectStyle}>
                  <option value="">Selecione um curso</option>
                  {turmas.map(t => <option key={t.id} value={t.nome}>{t.nome}</option>)}
                </select>
              </Field>
            </div>
          </div>

          {/* Seção: Dados Pessoais */}
          <div style={{ background: 'var(--nt-surface)', borderRadius: 12, border: '1px solid var(--nt-border)', padding: '20px 24px', marginBottom: 16 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--nt-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
              Dados Pessoais
            </h2>
            <div style={gridStyle}>
              <Field label={`${getLabel('nomeCompleto','Nome Completo')} *`} error={err('nomeCompleto')} full>
                <input name="nomeCompleto" value={form.nomeCompleto}
                  onChange={handleChange} onBlur={() => blur('nomeCompleto')}
                  style={err('nomeCompleto') ? inputErrStyle : inputStyle}
                  placeholder="Nome completo do aluno" />
              </Field>

              <Field label={`${getLabel('dataNascimento','Data de Nascimento')} *`} error={err('dataNascimento')}>
                <InputMask mask="99/99/9999" value={form.dataNascimento}
                  onChange={handleChange} onBlur={() => blur('dataNascimento')}>
                  {(p: any) => <input {...p} name="dataNascimento" placeholder="DD/MM/AAAA"
                    style={err('dataNascimento') ? inputErrStyle : inputStyle} />}
                </InputMask>
              </Field>

              <Field label="Idade">
                <input value={form.idade} readOnly style={readonlyStyle} placeholder="Auto" />
              </Field>

              {isAtivo('sexo') && (
                <Field label={`${getLabel('sexo','Sexo')}${isObrigatorio('sexo') ? ' *' : ''}`}
                  error={touched.sexo && isObrigatorio('sexo') && !form.sexo ? 'Selecione o sexo' : undefined}>
                  <select name="sexo" value={form.sexo}
                    onChange={handleChange} onBlur={() => blur('sexo')}
                    style={touched.sexo && isObrigatorio('sexo') && !form.sexo ? selectErrStyle : selectStyle}>
                    <option value="">Selecione</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                  </select>
                </Field>
              )}

              {isAtivo('rg') && (
                <Field label={`${getLabel('rg','RG')}${isObrigatorio('rg') ? ' *' : ''}`} error={isObrigatorio('rg') ? err('rg') : undefined}>
                  <InputMask mask="99.999.999-9" value={form.rg}
                    onChange={handleChange} onBlur={() => blur('rg')}>
                    {(p: any) => <input {...p} name="rg" style={isObrigatorio('rg') && err('rg') ? inputErrStyle : inputStyle} />}
                  </InputMask>
                </Field>
              )}

              {isAtivo('cpf') && (
                <Field label={`${getLabel('cpf','CPF')}${isObrigatorio('cpf') ? ' *' : ''}`} error={isObrigatorio('cpf') ? err('cpf') : undefined}>
                  <InputMask mask="999.999.999-99" value={form.cpf}
                    onChange={handleChange} onBlur={() => blur('cpf')}>
                    {(p: any) => <input {...p} name="cpf" style={isObrigatorio('cpf') && err('cpf') ? inputErrStyle : inputStyle} />}
                  </InputMask>
                </Field>
              )}

              {isAtivo('telefone') && (
                <Field label={`${getLabel('telefone','Telefone')}${isObrigatorio('telefone') ? ' *' : ''}`}>
                  <InputMask mask="(99) 99999-9999" value={form.telefone} onChange={handleChange}>
                    {(p: any) => <input {...p} name="telefone" style={inputStyle} />}
                  </InputMask>
                </Field>
              )}

              {isAtivo('email') && (
                <Field label={`${getLabel('email','Email')}${isObrigatorio('email') ? ' *' : ''}`}>
                  <input name="email" type="email" value={form.email}
                    onChange={handleChange} style={inputStyle} placeholder="email@exemplo.com" />
                </Field>
              )}
            </div>
          </div>

          {/* Seção: Endereço — só exibe se ao menos um campo de endereço estiver ativo */}
          {(isAtivo('cep') || isAtivo('endereco') || isAtivo('bairro') || isAtivo('cidade') || isAtivo('uf')) && (
          <div style={{ background: 'var(--nt-surface)', borderRadius: 12, border: '1px solid var(--nt-border)', padding: '20px 24px', marginBottom: 16 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--nt-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
              Endereço
            </h2>
            <div style={gridStyle}>
              {isAtivo('cep') && (
                <Field label={loadingCep ? 'CEP — buscando...' : `${getLabel('cep','CEP')}${isObrigatorio('cep') ? ' *' : ''}`}
                  error={isObrigatorio('cep') ? err('cep') : undefined}>
                  <InputMask mask="99999-999" value={form.cep}
                    onChange={handleChange} onBlur={() => blur('cep')}>
                    {(p: any) => <input {...p} name="cep" style={isObrigatorio('cep') && err('cep') ? inputErrStyle : inputStyle} placeholder="00000-000" />}
                  </InputMask>
                </Field>
              )}

              {isAtivo('endereco') && (
                <Field label={`${getLabel('endereco','Endereço')}${isObrigatorio('endereco') ? ' *' : ''}`} half>
                  <input name="endereco" value={form.endereco} onChange={handleChange} style={inputStyle} placeholder="Preenchido pelo CEP" />
                </Field>
              )}

              {isAtivo('bairro') && (
                <Field label={`${getLabel('bairro','Bairro')}${isObrigatorio('bairro') ? ' *' : ''}`}>
                  <input name="bairro" value={form.bairro} onChange={handleChange} style={inputStyle} />
                </Field>
              )}

              {isAtivo('cidade') && (
                <Field label={`${getLabel('cidade','Cidade')}${isObrigatorio('cidade') ? ' *' : ''}`} half>
                  <input name="cidade" value={form.cidade} onChange={handleChange} style={inputStyle} />
                </Field>
              )}

              {isAtivo('uf') && (
                <Field label={`${getLabel('uf','UF')}${isObrigatorio('uf') ? ' *' : ''}`}>
                  <input name="uf" value={form.uf} onChange={handleChange} style={inputStyle} maxLength={2} placeholder="BA" />
                </Field>
              )}
            </div>
          </div>
          )}

          {/* Seção: Filiação e Responsável */}
          {(isAtivo('nomePai') || isAtivo('nomeMae') || isAtivo('responsavel') || isAtivo('telefoneResponsavel')) && (
          <div style={{ background: 'var(--nt-surface)', borderRadius: 12, border: '1px solid var(--nt-border)', padding: '20px 24px', marginBottom: 16 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--nt-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
              Filiação e Responsável
            </h2>
            <div style={gridStyle}>
              {isAtivo('nomePai') && (
                <Field label={`${getLabel('nomePai','Nome do Pai')}${isObrigatorio('nomePai') ? ' *' : ''}`} half>
                  <input name="nomePai" value={form.nomePai} onChange={handleChange} style={inputStyle} />
                </Field>
              )}
              {isAtivo('nomeMae') && (
                <Field label={`${getLabel('nomeMae','Nome da Mãe')}${isObrigatorio('nomeMae') ? ' *' : ''}`} half>
                  <input name="nomeMae" value={form.nomeMae} onChange={handleChange} style={inputStyle} />
                </Field>
              )}
              {isAtivo('responsavel') && (
                <Field label={`${getLabel('responsavel','Responsável')}${isObrigatorio('responsavel') ? ' *' : ''}`} half>
                  <input name="responsavel" value={form.responsavel} onChange={handleChange} style={inputStyle} />
                </Field>
              )}
              {isAtivo('telefoneResponsavel') && (
                <Field label={`${getLabel('telefoneResponsavel','Telefone do Responsável')}${isObrigatorio('telefoneResponsavel') ? ' *' : ''}`} half>
                  <InputMask mask="(99) 99999-9999" value={form.telefoneResponsavel} onChange={handleChange}>
                    {(p: any) => <input {...p} name="telefoneResponsavel" style={inputStyle} />}
                  </InputMask>
                </Field>
              )}
            </div>
          </div>
          )}

          {/* Seção: Foto */}
          {isAtivo('foto') && (
          <div style={{ background: 'var(--nt-surface)', borderRadius: 12, border: '1px solid var(--nt-border)', padding: '20px 24px', marginBottom: 20 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--nt-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
              Foto do Aluno
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Preview */}
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--nt-bg)', border: '2px dashed var(--nt-border-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                {form.foto
                  ? <img src={URL.createObjectURL(form.foto)} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
                  : <FaUser style={{ fontSize: 24, color: 'var(--nt-text-muted)' }} />}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={openCamera}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 8, border: '1px solid var(--nt-border-md)', background: 'var(--nt-bg)', color: 'var(--nt-text-secondary)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                  <FaCamera style={{ fontSize: 12 }} /> Tirar Foto
                </button>
                <label style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 8, border: '1px solid var(--nt-border-md)', background: 'var(--nt-bg)', color: 'var(--nt-text-secondary)', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
                  Selecionar Arquivo
                  <input type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => e.target.files?.[0] && setForm(f => ({ ...f, foto: e.target.files![0] }))} />
                </label>
              </div>
              {form.foto && <span style={{ fontSize: 12, color: 'var(--nt-text-muted)' }}>✓ {form.foto.name}</span>}
            </div>
          </div>
          )}

          {/* Submit */}
          <div style={{ position: 'sticky', bottom: 0, background: 'var(--nt-surface)', padding: '12px 0 4px', marginTop: 8, zIndex: 10 }}>
            {errors.length > 0 && (
              <div style={{ background: '#fdf0ed', border: '1px solid var(--nt-danger)', borderRadius: 10, padding: '14px 18px', marginBottom: 12 }}>
                <div style={{ fontWeight: 700, color: 'var(--nt-danger)', fontSize: 13, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FaExclamationCircle /> Corrija os campos antes de continuar:
                </div>
                <ul style={{ paddingLeft: 18, margin: 0 }}>
                  {errors.map((e, i) => <li key={i} style={{ fontSize: 13, color: '#b83220', marginBottom: 3 }}>{e}</li>)}
                </ul>
              </div>
            )}
            <button type="submit" disabled={loading}
              style={{
                width: '100%', height: 50, borderRadius: 10, border: 'none',
                background: loading ? 'var(--nt-text-muted)' : 'var(--nt-primary)',
                color: '#fff', fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'background 0.15s',
                boxShadow: '0 -2px 12px rgba(22,163,74,0.15)',
                touchAction: 'manipulation',
              }}>
              {loading ? <><FaSpinner style={{ animation: 'spin 0.8s linear infinite' }} /> Cadastrando...</> : 'Cadastrar Aluno'}
            </button>
          </div>
        </form>
      </div>

      {/* Modal câmera */}
      {showCamera && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--nt-surface)', borderRadius: 16, width: '90%', maxWidth: 480, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--nt-text-primary)' }}>Tirar Foto</h3>
              <button onClick={() => { setShowCamera(false); stopCamera(); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--nt-text-muted)', fontSize: 18 }}>
                <FaTimes />
              </button>
            </div>
            <div style={{ position: 'relative', width: '100%', minHeight: 220, borderRadius: 10, overflow: 'hidden', background: '#111' }}>
              <video ref={videoRef} autoPlay playsInline muted
                style={{ width: '100%', display: 'block', borderRadius: 10, minHeight: 220, objectFit: 'cover' }} />
              {cameraLoading && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'rgba(0,0,0,0.7)', borderRadius: 10 }}>
                  <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <span style={{ color: '#fff', fontSize: 13 }}>Iniciando câmera...</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={capturePhoto} disabled={cameraLoading}
                style={{ flex: 1, height: 42, borderRadius: 8, border: 'none', background: 'var(--nt-primary)', color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                📸 Capturar
              </button>
              <button onClick={() => { setShowCamera(false); stopCamera(); }}
                style={{ flex: 1, height: 42, borderRadius: 8, border: '1px solid var(--nt-border-md)', background: 'transparent', color: 'var(--nt-text-secondary)', fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        input:focus, select:focus { border-color: var(--nt-primary) !important; box-shadow: 0 0 0 3px rgba(22,163,74,0.1); }
      `}</style>
    </Layout>
  );
}
