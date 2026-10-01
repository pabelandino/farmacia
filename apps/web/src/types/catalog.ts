export type Product = {
  id: number;
  sku: string;
  name: string;
  generic?: string | null;
  brand: string | null;
  line?: string | null;
  unit?: string | null;
  costPrice?: string | number;
  unitPrice: string | number;
  salePrice1: string | number;
  salePrice2?: string | number;
  stock: string | number;
  dispatchQty?: string | number;
  warehouseQty?: string | number;
  unitsPerBox?: number;
  soldByUnit?: boolean;
  supplier: string | null;
  minQty?: number;
  maxQty?: number;
};

export type ProductLookups = {
  brands: string[];
  categories: string[];
};

export type Client = {
  id: number;
  code?: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  cell?: string | null;
  nationalId?: string | null;
};

export type CartLine = Product & { quantity: number; price: number; bin: 'dispatch' | 'warehouse' };

export function cartLineKey(line: Pick<CartLine, 'id' | 'bin'>): string {
  return `${line.id}:${line.bin}`;
}
