import React, { useEffect } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
}

const icons: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

const colors: Record<ToastType, { bg: string; border: string; color: string }> = {
  success: { bg: 'var(--success-light)', border: '#A7F3D0', color: '#065F46' },
  error:   { bg: 'var(--danger-light)',  border: '#FECACA', color: '#991B1B' },
  warning: { bg: 'var(--warning-light)', border: '#FDE68A', color: '#92400E' },
  info:    { bg: 'var(--info-light)',    border: '#BFDBFE', color: '#1E40AF' },
};

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose, duration = 3500 }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const c = colors[type];
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 999,
      background: c.bg, border: `1px solid ${c.border}`, color: c.color,
      borderRadius: 'var(--radius-lg)', padding: '14px 18px',
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: 'var(--shadow-xl)',
      maxWidth: 380, minWidth: 260,
      animation: 'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
      fontFamily: 'inherit',
    }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: c.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
        {icons[type]}
      </div>
      <span style={{ fontSize: '0.875rem', fontWeight: 500, flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.color, opacity: 0.6, fontSize: '1rem', padding: 0, display: 'flex', alignItems: 'center' }}>✕</button>
    </div>
  );
};

export default Toast;
