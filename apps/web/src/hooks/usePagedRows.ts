import { useEffect, useMemo, useState } from 'react';
import { PAGE_SIZE } from '../constants/pagination';

export function usePagedRows<T>(rows: readonly T[], resetKey?: string | number) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const paged = useMemo(
    () => rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE),
    [rows, current],
  );

  return { page: current, pageCount, setPage, rows: paged };
}
