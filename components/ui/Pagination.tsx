import React from 'react';

interface PaginationProps {
  page: number;
  totalPages: number;
  pageNumbers: (number | '...')[];
  pageInfo: string;
  hasPrev: boolean;
  hasNext: boolean;
  goTo: (p: number) => void;
  prev: () => void;
  next: () => void;
}

export function Pagination({
  page, totalPages, pageNumbers, pageInfo,
  hasPrev, hasNext, goTo, prev, next,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="nt-pagination">
      <span className="nt-pagination-info">{pageInfo}</span>
      <div className="nt-pagination-btns">
        <button className="nt-page-btn" onClick={prev} disabled={!hasPrev} title="Anterior">
          ‹
        </button>
        {pageNumbers.map((p, i) =>
          p === '...'
            ? <span key={`ellipsis-${i}`} style={{ padding: '0 4px', color: 'var(--nt-text-muted)', fontSize: 13 }}>…</span>
            : <button
                key={p}
                className={`nt-page-btn${page === p ? ' active' : ''}`}
                onClick={() => goTo(p)}
              >
                {p}
              </button>
        )}
        <button className="nt-page-btn" onClick={next} disabled={!hasNext} title="Próxima">
          ›
        </button>
      </div>
    </div>
  );
}
