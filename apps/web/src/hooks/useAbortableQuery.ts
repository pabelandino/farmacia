import { useEffect, useState } from 'react';
import { api } from '../api/client';

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function useAbortableQuery<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void api<T>(path, { signal: controller.signal })
      .then((row) => {
        if (!controller.signal.aborted) setData(row);
      })
      .catch((err) => {
        if (controller.signal.aborted || isAbortError(err)) return;
        setError(err instanceof Error ? err.message : 'No se pudo cargar el reporte');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [path]);

  return { data, loading, error, setData };
}
