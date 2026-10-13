import { CashCutTotals } from './reports';

export type CashCutInvoice = {
  id: number;
  number: number;
  clientName: string;
  cashierName: string;
  total: number;
  cashAmount: number;
  cardAmount: number;
  profit: number;
  status: string;
  paymentMethod: string;
  time: string;
};

export type CashDay = {
  date: string;
  session: {
    id: number;
    openedAt: string | null;
    openedBy: string | null;
    openingAmount: string | number;
    closedAt: string | null;
    closedBy: string | null;
    countedCash: string | number | null;
    countedCard: string | number | null;
    expectedCash: string | number | null;
    difference: string | number | null;
    notes: string | null;
    shiftClosedAt: string | null;
    shiftClosedBy: string | null;
    shiftCountedCash: string | number | null;
    shiftCountedCard: string | number | null;
    shiftExpectedCash: string | number | null;
    shiftDifference: string | number | null;
  } | null;
  cuts: CashCutTotals[];
  details: {
    cut10: CashCutInvoice[];
    cut13: CashCutInvoice[];
    cut16: CashCutInvoice[];
    close: CashCutInvoice[];
  };
  openingAmount: number;
  cashSales: number;
  expectedCash: number;
  countedCash: number | null;
  countedCard: number | null;
  difference: number | null;
  openedAt: string | null;
  openedBy: string | null;
  closedAt: string | null;
  closedBy: string | null;
  shiftExpectedCash: number;
  shiftCountedCash: number | null;
  shiftCountedCard: number | null;
  shiftDifference: number | null;
  shiftClosedAt: string | null;
  shiftClosedBy: string | null;
  notes: string | null;
  movements: {
    count: number;
    income: number;
    card: number;
    operatingExpense: number;
    returnExpense: number;
    net: number;
  };
};
