import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { ProductLookups } from '../types/catalog';

const emptyLookups: ProductLookups = { brands: [], categories: [] };

export function useProductLookups() {
  const [lookups, setLookups] = useState<ProductLookups>(emptyLookups);

  useEffect(() => {
    api<ProductLookups>('/api/products/lookups').then(setLookups).catch(() => undefined);
  }, []);

  function remember(kind: keyof ProductLookups, value: string) {
    const next = value.trim();
    if (!next) return;
    setLookups((current) => {
      if (current[kind].includes(next)) return current;
      return { ...current, [kind]: [...current[kind], next].sort((a, b) => a.localeCompare(b)) };
    });
  }

  async function addLookup(kind: keyof ProductLookups, name: string) {
    const saved = await api<{ name: string }>(`/api/products/${kind}`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    remember(kind, saved.name);
    return saved.name;
  }

  return { lookups, remember, addLookup };
}
