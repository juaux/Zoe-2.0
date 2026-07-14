import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: 220, padding: 32, textAlign: 'center', gap: 12,
        }}>
          <div style={{ fontSize: 32 }}>⚠️</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--nt-text-primary)' }}>
            Algo deu errado
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--nt-text-muted)', maxWidth: 320 }}>
            {this.state.error?.message || 'Erro inesperado. Tente recarregar a página.'}
          </div>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            style={{
              marginTop: 8, padding: '8px 18px', borderRadius: 8, border: 'none',
              background: 'var(--nt-primary)', color: '#fff', fontSize: 13,
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/** HOC helper — envolve qualquer componente com ErrorBoundary */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  return function WrappedWithBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
