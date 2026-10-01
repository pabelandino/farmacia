import { changeDue, lineAmount, remainingBalance, tenderKind, totalUsd } from '@farmaplus/domain';
import { LABELS } from '../constants/labels';
import { dateOnly } from '../utils/dates';
import { toNumber } from '../utils/numbers';
import { CartLine } from './catalog';
import { InvoiceDetail } from './sales';

export type ReceiptCompany = {
  name: string;
  address: string | null;
  phone: string | null;
  ruc?: string | null;
  line1?: string | null;
  line2?: string | null;
};

export type ReceiptLine = {
  name: string;
  sku: string;
  quantity: number;
  price: number;
  amount: number;
};

export type ReceiptData = {
  clientName: string;
  invoiceNumber: number | string;
  paymentMode: string;
  cashier: string;
  date: string;
  lines: ReceiptLine[];
  itemCount: number;
  totalUsd: number;
  totalCs: number;
  receivedCs?: number;
  changeCs?: number;
  advanceCs?: number;
  balanceCs?: number;
};

export function cartToReceiptLines(cart: CartLine[]): ReceiptLine[] {
  return cart.map((line) => ({
    name: line.name,
    sku: line.sku,
    quantity: line.quantity,
    price: line.price,
    amount: line.price * line.quantity,
  }));
}

export function paymentModeLabel(cashAmount: number, cardAmount: number, paymentMethod?: string) {
  const kind = tenderKind(cashAmount, cardAmount, paymentMethod);
  if (kind === 'credit') return LABELS.credit;
  if (kind === 'card') return LABELS.card;
  if (kind === 'mixed') return LABELS.cashAndCard;
  return LABELS.cash;
}

export function invoiceToReceipt(invoice: InvoiceDetail, rate: number): ReceiptData {
  const cash = toNumber(invoice.cashAmount);
  const card = toNumber(invoice.cardAmount);
  const total = toNumber(invoice.total);
  const advance = toNumber(invoice.advanceAmount);
  const credit = invoice.paymentMethod === 'Credito';
  const lines = invoice.items.map((item) => {
    const quantity = toNumber(item.quantity);
    const price = toNumber(item.unitPrice);
    return {
      name: item.productName,
      sku: item.sku,
      quantity,
      price,
      amount: lineAmount(price, quantity),
    };
  });
  return {
    clientName: invoice.clientName || LABELS.genericClient,
    invoiceNumber: invoice.number,
    paymentMode: paymentModeLabel(cash, card, invoice.paymentMethod),
    cashier: invoice.cashierName || '',
    date: dateOnly(String(invoice.date)),
    lines,
    itemCount: lines.length,
    totalUsd: totalUsd(total, rate),
    totalCs: total,
    receivedCs: credit ? undefined : cash + card,
    changeCs: credit ? undefined : changeDue(cash + card, total),
    advanceCs: credit ? advance : undefined,
    balanceCs: credit ? remainingBalance(total, advance) : undefined,
  };
}
