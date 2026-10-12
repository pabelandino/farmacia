import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { consumeDispatchFirst } from '@farmaplus/domain';
import { Product } from '../types/catalog';
import { toNumber } from '../utils/numbers';
import { useDebouncedValue } from './useDebouncedValue';

export function useProductSearch(query: string, options?: { take?: number; skipEmpty?: boolean }) {
  const take = options?.take ?? 50;
  const skipEmpty = options?.skipEmpty ?? false;
  const debouncedQuery = useDebouncedValue(query);
  const [products, setProducts] = useState<Product[]>([]);

  const reload = useCallback(() => {
    if (skipEmpty && !debouncedQuery) {
      setProducts([]);
      return Promise.resolve([]);
    }
    const q = debouncedQuery ? `&q=${encodeURIComponent(String(debouncedQuery))}` : '';
    return api<{ items: Product[] }>(`/api/products?take=${take}${q}`).then((data) => {
      setProducts(data.items);
      return data.items;
    });
  }, [debouncedQuery, take, skipEmpty]);

  useEffect(() => {
    void reload();
  }, [reload]);

  function applySale(items: Array<{ productId: number; quantity: number }>) {
    const soldByProduct = new Map<number, number>();
    for (const item of items) {
      soldByProduct.set(item.productId, (soldByProduct.get(item.productId) || 0) + item.quantity);
    }
    setProducts((current) =>
      current.map((product) => {
        const soldQty = soldByProduct.get(product.id);
        if (!soldQty) return product;
        const split = consumeDispatchFirst(toNumber(product.dispatchQty), toNumber(product.warehouseQty), soldQty);
        return {
          ...product,
          stock: split.dispatchQty,
          dispatchQty: split.dispatchQty,
          warehouseQty: split.warehouseQty,
        };
      }),
    );
  }

  return { products, setProducts, reload, applySale };
}
