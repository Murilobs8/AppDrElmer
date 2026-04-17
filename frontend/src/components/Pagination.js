import React, { useState, useMemo, useEffect } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';

/**
 * Hook de paginação client-side. Retorna página atual, total, lista paginada
 * e funções para navegar. Reset automático da página quando total muda.
 */
export function usePagination(items, pageSize = 100) {
  const [page, setPage] = useState(1);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Volta para página 1 quando a lista filtrada encolhe abaixo da página atual
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return { page, setPage, totalPages, total, paginated, pageSize };
}

/**
 * Componente visual de controle de paginação com ◀ 1 2 3 ... ▶
 */
export function PaginationBar({ page, setPage, totalPages, total, pageSize, label = 'itens' }) {
  if (total <= pageSize) return null; // nada a paginar
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  // Janela de páginas
  const win = 5;
  let first = Math.max(1, page - Math.floor(win / 2));
  let last = Math.min(totalPages, first + win - 1);
  first = Math.max(1, last - win + 1);
  const pages = [];
  for (let i = first; i <= last; i++) pages.push(i);

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-[#E5E3DB] dark:border-[#2A3530] bg-[#F4F3F0] dark:bg-[#141C18] rounded-b-lg" data-testid="pagination-bar">
      <span className="text-xs text-[#7A8780]">
        Mostrando <strong>{start}–{end}</strong> de <strong>{total}</strong> {label}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="p-1.5 rounded-lg border border-[#E5E3DB] dark:border-[#2A3530] text-[#1B2620] dark:text-[#E5E3DB] disabled:opacity-40 hover:bg-white dark:hover:bg-[#1B2620] transition-colors"
          data-testid="pagination-prev"
        >
          <CaretLeft size={14} />
        </button>
        {first > 1 && (
          <>
            <button onClick={() => setPage(1)} className="w-8 h-8 rounded-lg text-sm text-[#1B2620] dark:text-[#E5E3DB] hover:bg-white dark:hover:bg-[#1B2620]">1</button>
            {first > 2 && <span className="px-1 text-[#7A8780]">…</span>}
          </>
        )}
        {pages.map(p => (
          <button
            key={p}
            onClick={() => setPage(p)}
            className={`w-8 h-8 rounded-lg text-sm transition-colors ${p === page ? 'bg-[#4A6741] text-white font-semibold' : 'text-[#1B2620] dark:text-[#E5E3DB] hover:bg-white dark:hover:bg-[#1B2620]'}`}
            data-testid={`pagination-page-${p}`}
          >
            {p}
          </button>
        ))}
        {last < totalPages && (
          <>
            {last < totalPages - 1 && <span className="px-1 text-[#7A8780]">…</span>}
            <button onClick={() => setPage(totalPages)} className="w-8 h-8 rounded-lg text-sm text-[#1B2620] dark:text-[#E5E3DB] hover:bg-white dark:hover:bg-[#1B2620]">{totalPages}</button>
          </>
        )}
        <button
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="p-1.5 rounded-lg border border-[#E5E3DB] dark:border-[#2A3530] text-[#1B2620] dark:text-[#E5E3DB] disabled:opacity-40 hover:bg-white dark:hover:bg-[#1B2620] transition-colors"
          data-testid="pagination-next"
        >
          <CaretRight size={14} />
        </button>
      </div>
    </div>
  );
}
