export type CashCutTotals = {
  key: 'cut10' | 'cut13' | 'cut16' | 'close';
  invoiceCount: number;
  voided: number;
  total: number;
  cash: number;
  card: number;
  profit: number;
};

export type SalesReport = {
  date: string;
  count: number;
  voided: number;
  creditCount: number;
  creditTotal: number;
  total: number;
  cash: number;
  card: number;
  profit: number;
  cuts?: CashCutTotals[];
  openingAmount?: number;
  expectedCash?: number;
  countedCash?: number | null;
  difference?: number | null;
  shiftExpectedCash?: number;
  shiftCountedCash?: number | null;
  shiftDifference?: number | null;
  openedAt?: string | null;
  closedAt?: string | null;
  shiftClosedAt?: string | null;
  expenses?: number;
  salesMinusExpenses?: number;
  invoices: Array<{
    id: number;
    number: number;
    clientName: string;
    cashierName: string;
    total: string | number;
    status: string;
    paymentMethod: string;
    cashAmount: number | string;
    cardAmount: number | string;
  }>;
};

export type StockReport = {
  count: number;
  lowStockCount: number;
  lowStock: Array<{ id: number; sku: string; name: string; stock: string | number; minQty: number }>;
};

export type CashReport = {
  date: string;
  count: number;
  income: number;
  card: number;
  operatingExpense: number;
  returnExpense: number;
  net: number;
  rows: Array<{
    id: number;
    userName: string | null;
    invoiceNumber: string | null;
    income: string | number;
    operatingExpense: string | number;
    returnExpense: string | number;
    card: string | number;
    cardAuth: string | null;
    notes?: string | null;
  }>;
};

export type DashboardDay = {
  date: string;
  cash: number;
  credit: number;
  profit: number;
  invoices: number;
  cashPay: number;
  cardPay: number;
};

export type ExpiredProductRow = {
  id: number;
  sku: string;
  productName: string;
  lot: string;
  expiresAt: string;
  status: 'expired' | 'today' | 'upcoming';
  quantity: number;
  remaining: number;
  stock: number;
  unit: string;
  destination: string;
  supplier: string;
  intakeDate: string;
  documentNumber: string;
};

export type DashboardReport = {
  days: number;
  todaySales: number;
  cashTotal: number;
  creditTotal: number;
  receivable: number;
  productCount: number;
  lowStockCount: number;
  expiredCount: number;
  expiredFrom: string;
  expiredTo: string;
  expiredProducts: ExpiredProductRow[];
  salesByDay: DashboardDay[];
  mix: Array<{ name: string; value: number }>;
  paymentMix: { cash: number; card: number; credit: number };
  stockHealth: { ok: number; low: number };
  topProducts: Array<{ name: string; quantity: number; amount: number }>;
};

export type ReceivableInvoice = {
  id: number;
  number: number;
  clientId: number | null;
  clientName: string;
  date: string;
  dueDate: string | null;
  total: number;
  advance: number;
  balance: number;
  cashierName: string;
};

export type ReceivablesReport = {
  totalBalance: number;
  invoiceCount: number;
  clients: Array<{
    clientName: string;
    invoices: number;
    total: number;
    advance: number;
    balance: number;
  }>;
  invoices: ReceivableInvoice[];
};

export type PayableRow = {
  id: number;
  supplier: string;
  concept: string;
  invoiceNumber: string;
  purchaseOrder: string;
  purchasedAt: string;
  dueAt: string;
  status: string;
  balance: number;
};

export type PayablesReport = {
  totalBalance: number;
  count: number;
  suppliers: Array<{ supplier: string; invoices: number; balance: number }>;
  rows: PayableRow[];
};

export type InventoryRow = {
  id: number;
  sku: string;
  name: string;
  unit: string | null;
  unitsPerBox: number;
  stock: number;
  dispatchQty: number;
  warehouseQty: number;
  minQty: number;
  boxes: number;
  loose: number;
  unitCost: number;
  unitSale: number;
  costAmount: number;
  saleAmount: number;
  profitAmount: number;
};

export type InventoryReport = {
  count: number;
  totalStock: number;
  totalCost: number;
  totalSale: number;
  totalProfit: number;
  page: number;
  pageSize: number;
  pageCount: number;
  products: InventoryRow[];
};

export type SalesLineRow = {
  id: number;
  number: number;
  clientName: string;
  sku: string;
  productName: string;
  brand: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
  profit: number;
  paymentMethod: string;
  cashAmount: number;
  cardAmount: number;
  cashierName: string;
  date: string;
};

export type SalesLinesReport = {
  from: string;
  to: string;
  lineCount: number;
  invoiceCount: number;
  totalQty: number;
  totalSale: number;
  totalProfit: number;
  expenses?: number;
  salesMinusExpenses?: number;
  marginPct: number;
  page: number;
  pageSize: number;
  pageCount: number;
  rows: SalesLineRow[];
};

export type InvoiceReportItem = {
  sku: string;
  productName: string;
  quantity: number;
};

export type InvoiceReportRow = {
  id: number;
  number: number;
  clientName: string;
  items: InvoiceReportItem[];
  total: number;
  profit: number;
  paymentMethod: string;
  status: string;
  date: string;
  cashierName: string;
  cashAmount: number;
  cardAmount: number;
};

export type InvoicesListReport = {
  from: string;
  to: string;
  count: number;
  paidCount: number;
  voidedCount: number;
  creditCount: number;
  totalSale: number;
  totalProfit: number;
  expenses?: number;
  salesMinusExpenses?: number;
  cashTotal: number;
  cardTotal: number;
  creditTotal: number;
  avgTicket: number;
  page: number;
  pageSize: number;
  pageCount: number;
  rows: InvoiceReportRow[];
};

export type ExpiredProductsReport = {
  from: string;
  to: string;
  count: number;
  productCount: number;
  expiredCount: number;
  totalQty: number;
  page: number;
  pageSize: number;
  pageCount: number;
  rows: ExpiredProductRow[];
};
