import Image from 'next/image';

export interface CrachaAluno {
  id: number;
  nomeCompleto: string;
  turma?: string;
  matricula?: string;
  fotoUrl?: string;
  foto?: string;
}

export default function CrachaCard({ aluno }: { aluno: CrachaAluno }) {
  const src = aluno.fotoUrl || aluno.foto;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(origin + '/aluno/' + aluno.id)}&bgcolor=ffffff&color=111827&margin=3`;

  return (
    <div style={{
      width: 240,
      background: '#fff',
      borderRadius: 18,
      overflow: 'hidden',
      boxShadow: '0 20px 56px rgba(0,0,0,.22)',
      fontFamily: 'Inter, sans-serif',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid #e5e7eb',
    }}>
      {/* Clip topo */}
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8, paddingBottom: 2 }}>
        <div style={{ width: 36, height: 10, background: '#9ca3af', borderRadius: '4px 4px 0 0' }} />
      </div>

      {/* Cabeçalho — logo à esquerda, nome ao lado */}
      <div style={{
        background: 'linear-gradient(135deg, #FF4403, #d93600)',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 9,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
        }}>
          <Image
            src="/logo.png"
            width={26}
            height={26}
            alt="Zoe"
            style={{ objectFit: 'contain' }}
          />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#fff', letterSpacing: '.08em', lineHeight: 1.2 }}>
            ZOE
          </div>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,.82)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
            Sistema de Gestão Escolar
          </div>
        </div>
      </div>

      {/* Foto com recuo + borda */}
      <div style={{ padding: '10px 10px 0 10px', background: '#fff' }}>
        <div style={{
          width: '100%',
          height: 220,
          borderRadius: 10,
          overflow: 'hidden',
          position: 'relative',
          background: '#e5e7eb',
          border: '2.5px solid #d1d5db',
          boxSizing: 'border-box',
        }}>
          {src ? (
            <img
              src={src}
              alt={aluno.nomeCompleto}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '130%',
                objectFit: 'cover',
                objectPosition: 'center 15%',
              }}
            />
          ) : (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span style={{ fontSize: 11, color: '#d1d5db' }}>Sem foto</span>
            </div>
          )}
        </div>
      </div>

      {/* Dados: nome + turma + matrícula à esq · QR à dir */}
      <div style={{
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        borderTop: '1px solid #f3f4f6',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', lineHeight: 1.3, marginBottom: 3 }}>
            {aluno.nomeCompleto}
          </div>
          {aluno.turma && (
            <div style={{ fontSize: 10, fontWeight: 700, color: '#FF4403', marginBottom: 3 }}>
              {aluno.turma}
            </div>
          )}
          <div style={{ fontSize: 10, color: '#6b7280' }}>
            Matrícula{' '}
            <span style={{ fontWeight: 600, color: '#374151' }}>
              {aluno.matricula || '—'}
            </span>
          </div>
        </div>

        {/* QR */}
        <div style={{
          width: 54,
          height: 54,
          background: '#fff',
          border: '1px solid #e5e7eb',
          padding: 3,
          borderRadius: 6,
          flexShrink: 0,
        }}>
          <img src={qrUrl} alt="QR Code" style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>
      </div>
    </div>
  );
}
