import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
}

/** Bloco shimmer genérico */
export function Skeleton({ width = '100%', height = 14, borderRadius = 6, style }: SkeletonProps) {
  return (
    <div
      className="nt-skeleton"
      style={{ width, height, borderRadius, ...style }}
    />
  );
}

/** Linha de tabela com avatar + 2 textos */
export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--nt-border)' }}>
      <Skeleton width={36} height={36} borderRadius="50%" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Skeleton width="45%" height={12} />
        <Skeleton width="30%" height={10} />
      </div>
      {Array.from({ length: cols - 1 }).map((_, i) => (
        <Skeleton key={i} width={60} height={10} style={{ flexShrink: 0 }} />
      ))}
    </div>
  );
}

/** Card KPI shimmer */
export function SkeletonKpi() {
  return (
    <div style={{ background: 'var(--nt-surface)', borderRadius: 12, border: '1px solid var(--nt-border)', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <Skeleton width={44} height={44} borderRadius={10} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Skeleton width="50%" height={20} />
        <Skeleton width="70%" height={11} />
      </div>
    </div>
  );
}

/** Lista de linhas para tabela */
export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} cols={cols} />
      ))}
    </div>
  );
}

/** Card genérico shimmer */
export function SkeletonCard({ lines = 3, height = 120 }: { lines?: number; height?: number }) {
  return (
    <div style={{ background: 'var(--nt-surface)', borderRadius: 12, border: '1px solid var(--nt-border)', padding: '18px 20px', height, display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === 0 ? '60%' : i === lines - 1 ? '40%' : '80%'} height={i === 0 ? 16 : 11} />
      ))}
    </div>
  );
}
