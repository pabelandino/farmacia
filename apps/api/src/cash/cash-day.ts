import {
  addInvoiceToCashCutByKey,
  calendarHour,
  calendarTimeHm,
  CASH_CUT_KEYS,
  cashCutKeyForInvoice,
  cashSaleAmount,
  drawerDifference,
  emptyCashCuts,
  expectedDrawerCash,
} from '@farmaplus/domain';

type InvoiceLike = {
  id: number;
  number: number;
  clientName: string;
  cashierName: string;
  total: unknown;
  cashAmount: unknown;
  cardAmount: unknown;
  profit: unknown;
  status: string;
  paymentMethod: string;
  createdAt: Date;
};

export type SessionLike = {
  openingAmount?: unknown;
  countedCash?: unknown;
  countedCard?: unknown;
  expectedCash?: unknown;
  difference?: unknown;
  openedAt?: Date | null;
  openedBy?: string | null;
  closedAt?: Date | null;
  closedBy?: string | null;
  notes?: string | null;
  shiftClosedAt?: Date | null;
  shiftClosedBy?: string | null;
  shiftCountedCash?: unknown;
  shiftCountedCard?: unknown;
  shiftExpectedCash?: unknown;
  shiftDifference?: unknown;
  shiftCut?: unknown;
  finalCut?: unknown;
} | null;

export function summarizeCashDay(
  invoices: InvoiceLike[],
  session: SessionLike,
  expenses: { operatingExpense: number; returnExpense: number },
) {
  const cuts = emptyCashCuts();
  const details = {
    cut10: [] as ReturnType<typeof invoiceRow>[],
    cut13: [] as ReturnType<typeof invoiceRow>[],
    cut16: [] as ReturnType<typeof invoiceRow>[],
    close: [] as ReturnType<typeof invoiceRow>[],
  };
  const closedAt = session?.closedAt ? new Date(session.closedAt) : null;
  const shiftClosedAt = session?.shiftClosedAt ? new Date(session.shiftClosedAt) : null;
  const shiftClosedMs = shiftClosedAt?.getTime() ?? null;
  const inDrawer = invoices.filter((invoice) => !closedAt || invoice.createdAt.getTime() <= closedAt.getTime());
  for (const invoice of inDrawer) {
    const key = cashCutKeyForInvoice(calendarHour(invoice.createdAt), invoice.createdAt.getTime(), shiftClosedMs);
    addInvoiceToCashCutByKey(cuts, key, {
      status: invoice.status,
      total: Number(invoice.total),
      cardAmount: Number(invoice.cardAmount),
      profit: Number(invoice.profit),
    });
    details[key].push(invoiceRow(invoice));
  }

  const frozenShift = parseCut(session?.shiftCut);
  if (frozenShift) cuts.cut16 = { ...cuts.cut16, ...frozenShift, key: 'cut16' };
  const frozenFinal = parseCut(session?.finalCut);
  if (frozenFinal) cuts.close = { ...cuts.close, ...frozenFinal, key: 'close' };

  const paid = inDrawer.filter((invoice) => invoice.status === 'PAID');
  const morningPaid = shiftClosedAt
    ? paid.filter((invoice) => invoice.createdAt.getTime() <= shiftClosedAt.getTime())
    : paid;
  const afternoonPaid = shiftClosedAt
    ? paid.filter((invoice) => invoice.createdAt.getTime() > shiftClosedAt.getTime())
    : [];
  const morningSales = morningPaid.reduce((sum, invoice) => sum + cashSaleAmount(Number(invoice.total), Number(invoice.cardAmount)), 0);
  const afternoonSales = afternoonPaid.reduce((sum, invoice) => sum + cashSaleAmount(Number(invoice.total), Number(invoice.cardAmount)), 0);
  const allSales = paid.reduce((sum, invoice) => sum + cashSaleAmount(Number(invoice.total), Number(invoice.cardAmount)), 0);
  const openingAmount = Number(session?.openingAmount || 0);
  const shiftExpectedCash = session?.shiftExpectedCash != null
    ? Number(session.shiftExpectedCash)
    : expectedDrawerCash(openingAmount, morningSales, expenses.operatingExpense, expenses.returnExpense);
  const shiftCountedCash = session?.shiftCountedCash == null ? null : Number(session.shiftCountedCash);
  const shiftDifference = session?.shiftDifference == null && shiftCountedCash == null
    ? null
    : Number(session?.shiftDifference ?? drawerDifference(shiftCountedCash ?? 0, shiftExpectedCash));
  const expectedCash = shiftClosedAt
    ? expectedDrawerCash(shiftCountedCash ?? 0, afternoonSales, 0, 0)
    : expectedDrawerCash(openingAmount, allSales, expenses.operatingExpense, expenses.returnExpense);
  const countedCash = session?.countedCash == null ? null : Number(session.countedCash);
  const difference = countedCash == null ? null : drawerDifference(countedCash, expectedCash);
  return {
    cuts: CASH_CUT_KEYS.map((key) => cuts[key]),
    details,
    openingAmount,
    cashSales: Number(allSales.toFixed(2)),
    expectedCash,
    countedCash,
    countedCard: session?.countedCard == null ? null : Number(session.countedCard),
    difference,
    shiftExpectedCash,
    shiftCountedCash,
    shiftCountedCard: session?.shiftCountedCard == null ? null : Number(session.shiftCountedCard),
    shiftDifference,
    openedAt: session?.openedAt || null,
    openedBy: session?.openedBy || null,
    closedAt: session?.closedAt || null,
    closedBy: session?.closedBy || null,
    shiftClosedAt: session?.shiftClosedAt || null,
    shiftClosedBy: session?.shiftClosedBy || null,
    notes: session?.notes || null,
  };
}

function parseCut(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  return {
    invoiceCount: Number(row.invoiceCount || 0),
    voided: Number(row.voided || 0),
    total: Number(row.total || 0),
    cash: Number(row.cash || 0),
    card: Number(row.card || 0),
    profit: Number(row.profit || 0),
  };
}

function invoiceRow(invoice: InvoiceLike) {
  return {
    id: invoice.id,
    number: invoice.number,
    clientName: invoice.clientName,
    cashierName: invoice.cashierName,
    total: Number(invoice.total),
    cashAmount: Number(invoice.cashAmount),
    cardAmount: Number(invoice.cardAmount),
    profit: Number(invoice.profit),
    status: invoice.status,
    paymentMethod: invoice.paymentMethod,
    time: calendarTimeHm(invoice.createdAt),
  };
}
