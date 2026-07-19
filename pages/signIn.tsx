import { signIn, getSession } from 'next-auth/react';
import React, { useState } from 'react';
import Head from 'next/head';
import { GetServerSideProps } from 'next';

type Perfil = 'admin' | 'professor' | 'aluno';

const PERFIS = [
  { key: 'admin'     as Perfil, label: 'Administração', desc: 'Diretoria e gestão', cor: '#16A34A', bg: '#F0FDF4' },
  { key: 'professor' as Perfil, label: 'Professor',     desc: 'Acesso às turmas',  cor: '#26bf94', bg: '#e6faf5' },
  { key: 'aluno'     as Perfil, label: 'Aluno / Pai',   desc: 'Acompanhamento',    cor: '#4ADE80', bg: '#F0FDF4' },
];

export default function SignIn() {
  const [perfil, setPerfil]        = useState<Perfil>('admin');
  const [email, setEmail]          = useState('');
  const [senha, setSenha]          = useState('');
  const [mostrarSenha, setMostrar] = useState(false);
  const [loading, setLoading]      = useState(false);
  const [erro, setErro]            = useState('');

  const p = PERFIS.find(x => x.key === perfil)!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro('');
    const res = await signIn('credentials', {
      redirect: false,
      email: email.trim().toLowerCase(),
      password: senha,
      perfil,
    });
    if (res?.error) {
      setErro('Email ou senha incorretos para este perfil.');
      setLoading(false);
    } else {
      if (perfil === 'professor') window.location.href = '/professor';
      else if (perfil === 'aluno') window.location.href = '/aluno';
      else window.location.href = '/';
    }
  };

  return (
    <>
      <Head><title>Entrar — Zoe</title></Head>
      <div className="nt-auth-bg">

        {/* ── Painel esquerdo (oculto no mobile) ── */}
        <div className="nt-auth-panel">
          <div style={{ position: 'absolute', width: 280, height: 280, borderRadius: '50%', background: 'rgba(22,163,74,0.07)', bottom: -60, right: -60 }} />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 52 }}>
            <div style={{ width: 110, height: 110, overflow: 'hidden', marginBottom: 14, boxShadow: '0 8px 32px rgba(22,163,74,0.45)', flexShrink: 0 }}>
              <img src="/logo.png" style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Zoe" />
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '0.05em', textAlign: 'center' }}>ZOE</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 4 }}>Sistema de Gestão</div>
          </div>

          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1.25, marginBottom: 16 }}>
            Educação que<br />transforma<br />
            <span style={{ color: '#4ADE80' }}>dentro e fora</span><br />
            da sala de aula.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13.5, lineHeight: 1.7, maxWidth: 300 }}>
            Gerencie alunos, professores e turmas com eficiência.
          </p>

          <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['Cadastro completo de alunos e professores', 'Organização por turmas e categorias', 'Chamada e controle de frequência'].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(22,163,74,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: '#16A34A', fontSize: 9, fontWeight: 700 }}>✓</span>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12.5 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Formulário ── */}
        <div className="nt-auth-form-area">
          <div className="nt-auth-card">

            {/* Logo visível só no mobile */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }} className="nt-auth-mobile-logo">
              <div style={{ width: 120, height: 120, overflow: 'hidden', borderRadius: 12, marginBottom: 8 }}>
                <img src="/logo.png" style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Zoe" />
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#1a1a2e', letterSpacing: '0.03em' }}>ZOE</div>
              <div style={{ fontSize: 11, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>Sistema de Gestão</div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Acessar o sistema</h1>
              <p style={{ fontSize: 13.5, color: '#6b7280' }}>Selecione seu perfil e entre com suas credenciais</p>
            </div>

            {erro && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#dc2626' }}>
                {erro}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Perfil de acesso</label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={perfil}
                    onChange={e => { setPerfil(e.target.value as Perfil); setErro(''); }}
                    style={{ width: '100%', height: 44, padding: '0 36px 0 14px', border: `2px solid ${p.cor}`, borderRadius: 8, fontSize: 14, fontWeight: 600, color: p.cor, background: p.bg, fontFamily: 'inherit', outline: 'none', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', boxSizing: 'border-box', transition: 'all 0.2s' }}
                  >
                    {PERFIS.map(x => (
                      <option key={x.key} value={x.key} style={{ color: '#111827', background: '#fff', fontWeight: 400 }}>
                        {x.label} — {x.desc}
                      </option>
                    ))}
                  </select>
                  <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: p.cor, fontSize: 10, fontWeight: 700 }}>▼</div>
                </div>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Email</label>
                  <input
                    type="email" placeholder="seu@email.com" value={email}
                    onChange={e => setEmail(e.target.value)} required autoComplete="email"
                    style={{ width: '100%', height: 44, padding: '0 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 15, color: '#111827', fontFamily: 'inherit', outline: 'none', background: '#f9fafb', boxSizing: 'border-box' }}
                    onFocus={e => (e.target.style.borderColor = p.cor)}
                    onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Senha</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={mostrarSenha ? 'text' : 'password'} placeholder="Sua senha" value={senha}
                      onChange={e => setSenha(e.target.value)} required autoComplete="current-password"
                      style={{ width: '100%', height: 44, padding: '0 44px 0 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 15, color: '#111827', fontFamily: 'inherit', outline: 'none', background: '#f9fafb', boxSizing: 'border-box' }}
                      onFocus={e => (e.target.style.borderColor = p.cor)}
                      onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
                    />
                    <button type="button" onClick={() => setMostrar(v => !v)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16, padding: 0, display: 'flex', alignItems: 'center' }}>
                      {mostrarSenha ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  style={{ height: 46, background: p.cor, color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, opacity: loading ? 0.75 : 1, transition: 'opacity 0.15s', touchAction: 'manipulation' }}>
                  {loading
                    ? <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Entrando...</>
                    : 'Entrar →'}
                </button>
              </form>

              <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 3 }}>Acesso admin padrão:</div>
                <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'monospace' }}>admin@zoe.com</div>
                <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'monospace' }}>senha: admin123</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .nt-auth-mobile-logo { display: none; }
        @media (max-width: 860px) {
          .nt-auth-mobile-logo { display: flex !important; }
        }
      `}</style>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getSession(ctx);
  if (session) {
    const perfil = (session.user as any)?.perfil;
    const dest = perfil === 'professor' ? '/professor' : perfil === 'aluno' ? '/aluno' : '/';
    return { redirect: { destination: dest, permanent: false } };
  }
  return { props: {} };
};
