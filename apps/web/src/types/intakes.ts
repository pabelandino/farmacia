export type IntakeLine = {
  productId?: number;
  sku: string;
  productName: string;
  generic: string;
  brand: string;
  line: string;
  unit: string;
  boxes: number;
  quantity: number;
  costPrice: number;
  unitsPerBox: number;
  unitCost: number;
  salePrice1: number;
  salePrice2: number;
  utilityPercent: number;
  lot: string;
  expiresAt: string;
  destination: 'dispatch' | 'warehouse';
  amount: number;
  physicalRemaining?: number;
};

export type ProductLot = {
  id: number;
  lot: string;
  expiresAt: string | null;
  quantity: number;
  remaining: number;
  documentNumber: string;
  intakeDate: string;
};

export type ProductLots = {
  productId: number;
  sku: string;
  name: string;
  stock: number;
  lots: ProductLot[];
};

export type Intake = {
  id: number;
  documentNumber: string;
  purchaseOrder: string | null;
  billedAs: string;
  supplier: string;
  date: string;
  total: string | number;
  lines: IntakeLine[];
};
