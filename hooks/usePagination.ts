/**
 * hooks/usePagination.ts
 * Hook de paginação reutilizável para listas locais (dados já em memória).
 *
 * USO:
 *   const { page, pageData, totalPages, goTo, prev, next, pageInfo } = usePagination(alunos, 20);
 */

import { useState, useMemo } from 'react';

export function usePagination<T>(data: T[], pageSize = 20) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));

  // Reset para página 1 quando os dados mudarem (ex: novo filtro)
  const pageData = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    return data.slice(start, start + pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, page, pageSize, totalPages]);

  const goTo  = (p: number) => setPage(Math.max(1, Math.min(p, totalPages)));
  const prev  = () => goTo(page - 1);
  const next  = () => goTo(page + 1);
  const reset = () => setPage(1);

  const start = data.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, data.length);

  const pageInfo = `${start}–${end} de ${data.length}`;

  // Gera array de botões de página (ex: [1, 2, '...', 8, 9, 10])
  const pageNumbers = useMemo((): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  }, [page, totalPages]);

  return {
    page,
    pageData,
    totalPages,
    pageNumbers,
    pageInfo,
    goTo,
    prev,
    next,
    reset,
    hasPrev: page > 1,
    hasNext: page < totalPages,
  };
}
