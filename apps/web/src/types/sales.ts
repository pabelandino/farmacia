export type CreditInvoice = {
  id: number;
  number: number;
  clientName: string;
  date: string;
  dueDate: string | null;
  total: string | number;
  advanceAmount: string | number;
  cashierName: string;
};

export type RecentInvoiceItem = {
  sku: string;
  productName: string;
  quantity: number | string;
};

export type RecentInvoiceRow = {
  id: number;
  number: number;
  clientName: string;
  cashierName?: string;
  paymentMethod: string;
  status: string;
  date: string;
  total: number | string;
  cashAmount: number | string;
  cardAmount: number | string;
  items: RecentInvoiceItem[];
};

export type InvoiceDetail = {
  id: number;
  number: number;
  clientName: string;
  cashierName: string;
  paymentMethod: string;
  date: string;
  total: number | string;
  cashAmount: number | string;
  cardAmount: number | string;
  advanceAmount: number | string;
  items: Array<{
    sku: string;
    productName: string;
    quantity: number | string;
    unitPrice: number | string;
  }>;
};

export type RecentInvoicesPage = {
  page: number;
  pageSize: number;
  pageCount: number;
  count: number;
  rows: RecentInvoiceRow[];
};
