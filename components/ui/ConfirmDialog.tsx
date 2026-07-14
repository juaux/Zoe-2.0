import React from 'react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar',
  onConfirm, onCancel, variant = 'danger',
}) => {
  const confirmBg = variant === 'danger' ? '#dc2626' : '#FF4403';

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.55)',
        zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--nt-surface)',
          borderRadius: 14,
          width: 360,
          maxWidth: '90vw',
          padding: '24px 24px 20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* Título */}
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--nt-text-primary)', marginBottom: 10 }}>
          {title}
        </div>

        {/* Mensagem */}
        <p style={{ fontSize: 14, color: 'var(--nt-text-secondary)', lineHeight: 1.6, margin: '0 0 20px' }}>
          {message}
        </p>

        {/* Botões */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 18px', borderRadius: 8,
              border: '1px solid var(--nt-border)',
              background: 'transparent',
              color: 'var(--nt-text-secondary)',
              fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 18px', borderRadius: 8,
              border: 'none',
              background: confirmBg,
              color: '#fff',
              fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
