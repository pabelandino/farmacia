import { useMemo, useState } from 'react';
import { lineAmount, splitSaleByPrice } from '@farmaplus/domain';
import { CartLine, Product, cartLineKey } from '../types/catalog';
import { toNumber } from '../utils/numbers';

function linesForProduct(product: Product, quantity: number): CartLine[] {
  const p1 = toNumber(product.salePrice1);
  const p2 = toNumber(product.salePrice2) || p1;
  return splitSaleByPrice(
    toNumber(product.dispatchQty),
    toNumber(product.warehouseQty),
    quantity,
    p1,
    p2,
  ).map((share) => ({
    ...product,
    quantity: share.quantity,
    price: share.price,
    bin: share.bin,
  }));
}

export function useInvoiceCart() {
  const [cart, setCart] = useState<CartLine[]>([]);

  const total = useMemo(
    () => cart.reduce((sum, line) => sum + lineAmount(line.price, line.quantity), 0),
    [cart],
  );

  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  function replaceProduct(current: CartLine[], product: Product, quantity: number): CartLine[] {
    const firstIndex = current.findIndex((line) => line.id === product.id);
    const others = current.filter((line) => line.id !== product.id);
    if (quantity < 1) return others;
    const next = linesForProduct(product, quantity);
    if (firstIndex < 0) return [...others, ...next];
    return [...others.slice(0, firstIndex), ...next, ...others.slice(firstIndex)];
  }

  function addProduct(product: Product, quantity = 1) {
    const qty = Number.isFinite(quantity) && quantity >= 1 ? quantity : 1;
    setCart((current) => {
      const already = current.filter((line) => line.id === product.id).reduce((sum, line) => sum + line.quantity, 0);
      return replaceProduct(current, product, already + qty);
    });
  }

  function updateQty(lineKey: string, quantity: number) {
    if (!Number.isFinite(quantity) || quantity < 1) return;
    setCart((current) => {
      const target = current.find((line) => cartLineKey(line) === lineKey);
      if (!target) return current;
      const others = current.filter((line) => line.id === target.id && cartLineKey(line) !== lineKey);
      const totalQty = others.reduce((sum, line) => sum + line.quantity, 0) + quantity;
      return replaceProduct(current, target, totalQty);
    });
  }

  function removeLine(lineKey: string) {
    setCart((current) => current.filter((line) => cartLineKey(line) !== lineKey));
  }

  function clearCart() {
    setCart([]);
  }

  return { cart, total, itemCount, addProduct, updateQty, removeLine, clearCart };
}
