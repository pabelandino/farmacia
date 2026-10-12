export {
  CASHIER_DEFAULTS,
  PERMISSION_KEYS,
  allPermissions,
  hasAnyPermission,
  hasPermission,
  homePath,
  normalizePermissions,
} from './permissions';
export type { PermissionKey, PermissionMap } from './permissions';

/** WinForms FarmaPlusV2 pricing and stock formulas. */

export function roundMoney(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** Importe = Precio × Cantidad */
export function lineAmount(price: number, quantity: number): number {
  return roundMoney(price * quantity);
}

/** Total USD = Total C$ / tipo de cambio (display only). */
export function totalUsd(totalCs: number, exchangeRate: number): number {
  if (!exchangeRate) return 0;
  return roundMoney(totalCs / exchangeRate);
}

/** Ganancia = (Precio − PrecioUnidad) × Cantidad */
export function lineProfit(salePrice: number, unitCost: number, quantity: number): number {
  return roundMoney((salePrice - unitCost) * quantity);
}

/**
 * Markup on cost, matching DETALLE_VENTAS.Porcentaje:
 * (Precio − PrecioUnidad) / PrecioUnidad × 100
 */
export function markupPercent(salePrice: number, unitCost: number): number {
  if (unitCost <= 0) return 0;
  return roundMoney(((salePrice - unitCost) / unitCost) * 100);
}

/** PrecioUnidad = PrecioCompra / UnidadesCaja */
export function unitCostFromBox(purchasePrice: number, unitsPerBox: number): number {
  const units = unitsPerBox > 0 ? unitsPerBox : 1;
  return roundMoney(purchasePrice / units);
}

/** Unidades a ingresar = Cajas a ingresar × Unidades/caja */
export function intakeQtyFromBoxes(boxes: number, unitsPerBox: number): number {
  const perBox = Number(unitsPerBox) > 0 ? Number(unitsPerBox) : 1;
  return roundMoney((Number(boxes) || 0) * perBox);
}

/** Reverse of intakeQtyFromBoxes when reopening a saved intake line. */
export function intakeBoxesFromQty(quantity: number, unitsPerBox: number): number {
  const perBox = Number(unitsPerBox) > 0 ? Number(unitsPerBox) : 1;
  return roundMoney((Number(quantity) || 0) / perBox);
}

export function applyIntakeBoxes<T extends { boxes: number; unitsPerBox: number; quantity: number }>(line: T): T {
  return { ...line, quantity: intakeQtyFromBoxes(line.boxes, line.unitsPerBox) };
}

/** When Unidades a ingresar is typed, keep boxes in sync: Cajas = Unidades / Unidades/caja. */
export function applyIntakeQuantity<T extends { boxes: number; unitsPerBox: number; quantity: number }>(line: T): T {
  return { ...line, boxes: intakeBoxesFromQty(line.quantity, line.unitsPerBox) };
}

/**
 * Qty to add when the cashier picks one box/bottle.
 * Unit-sale products (Diamel): the bottle contains N pieces, so qty = N.
 * Pack-only products: the bottle is the sale unit, so qty = 1.
 */
export function packSaleQty(unitsPerBox: number, soldByUnit = false): number {
  if (!soldByUnit) return 1;
  const perBox = Math.floor(Number(unitsPerBox) || 0);
  return perBox > 1 ? perBox : 1;
}

export function canSplitPackSale(unitsPerBox: number, soldByUnit: boolean): boolean {
  return soldByUnit && packSaleQty(unitsPerBox, true) > 1;
}

/**
 * Infer whether P1 is a per-piece price (closer to PrecioUnidad)
 * or a whole-box/bottle price (closer to PrecioCompra / pack equivalent).
 */
export function inferSoldByUnit(input: {
  salePrice: number;
  unitCost: number;
  costPrice: number;
  unitsPerBox: number;
}): boolean {
  const perBox = Math.floor(Number(input.unitsPerBox) || 0);
  if (perBox <= 1) return false;
  const sale = Number(input.salePrice) || 0;
  const unit = Number(input.unitCost) || 0;
  const box = Number(input.costPrice) || 0;
  if (sale <= 0) return false;
  const packEquiv = unit > 0 ? unit * perBox : box;
  const distUnit = Math.abs(sale - unit);
  const distPack = Math.abs(sale - packEquiv);
  const distBox = Math.abs(sale - box);
  return distUnit < distPack && distUnit <= distBox;
}

/** Total ingreso = PrecioUnidad × CantidadEntrada */
export function intakeTotal(unitCost: number, quantity: number): number {
  return roundMoney(unitCost * quantity);
}

/** PrecioVenta ≈ round(PrecioUnidad × (1 + utilidad%)) */
export function salePriceFromMarkup(unitCost: number, utilityPercent: number): number {
  return Math.round(unitCost * (1 + utilityPercent / 100));
}

export const DEFAULT_UTILITY_PERCENT = 20;

/** Windows Creación de Productos default % Utilidad. */
export const DEFAULT_PRODUCT_UTILITY_PERCENT = 30;

/** Markup choices on the new-product form (10, 15, … 100). */
export const UTILITY_PERCENT_OPTIONS = Array.from({ length: 19 }, (_, i) => 10 + i * 5);

/** Windows UM dropdown on Creación de Productos. */
export const PRODUCT_UNITS = ['Unidad', 'Frasco', 'Tabletas', 'Ampollas', 'Cápsulas'] as const;

/**
 * Dispatch to show/sell: prefer Despacho. If it is 0, treat stock as
 * Existencia (legacy) and subtract Bodega, otherwise use stock as dispatch.
 */
export function productDispatchQty(stock: number, dispatchQty: number, warehouseQty = 0): number {
  const dispatch = Number(dispatchQty) || 0;
  if (dispatch > 0) return dispatch;
  const warehouse = Number(warehouseQty) || 0;
  const total = Number(stock) || 0;
  if (warehouse > 0 && total >= warehouse) return Number((total - warehouse).toFixed(2));
  return total;
}

/** Cambio = max(recibido − total, 0). Display helper matching POS cash+card. */
export function changeDue(received: number, total: number): number {
  return Math.max(received - total, 0);
}

/** How a Contado sale was tendered. Credit invoices stay 'credit'. */
export type TenderKind = 'cash' | 'card' | 'mixed' | 'credit';

export function tenderKind(cashAmount: number, cardAmount: number, paymentMethod?: string): TenderKind {
  if (paymentMethod === 'Credito') return 'credit';
  const cash = Number(cashAmount) > 0.009;
  const card = Number(cardAmount) > 0.009;
  if (cash && card) return 'mixed';
  if (card) return 'card';
  return 'cash';
}

/** Saldo crédito = max(total − adelanto, 0). */
export function remainingBalance(total: number, advance: number): number {
  return Math.max(total - advance, 0);
}

export type IntakePricingFields = {
  costPrice: number;
  unitsPerBox: number;
  unitCost: number;
  salePrice1: number;
  salePrice2: number;
  utilityPercent: number;
  quantity: number;
  amount: number;
};

/**
 * Recalculate unit cost, sale prices, and line amount for an intake row.
 * When fromCost is true, PrecioUnidad and P1 come from cost + markup.
 */
export function recalcIntakePricing<T extends IntakePricingFields>(line: T, fromCost = true): T {
  const unitCost = fromCost ? unitCostFromBox(line.costPrice, line.unitsPerBox) : line.unitCost;
  const salePrice1 = fromCost ? salePriceFromMarkup(unitCost, line.utilityPercent) : line.salePrice1;
  const salePrice2 = fromCost ? salePrice1 : line.salePrice2;
  return { ...line, unitCost, salePrice1, salePrice2, amount: intakeTotal(unitCost, line.quantity) };
}

/** Alert window for expired / near-expiry lots (intake Vencimiento). */
export const EXPIRY_ALERT_MONTHS = 3;

/** Pharmacy calendar. Docker/Node default to UTC; 18:00 here is already the next UTC day. */
export const BUSINESS_TIME_ZONE = 'America/Managua';

export function calendarDateIso(at = new Date(), timeZone = BUSINESS_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || '00';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function calendarHour(at = new Date(), timeZone = BUSINESS_TIME_ZONE): number {
  const hour = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(at).find((part) => part.type === 'hour')?.value;
  return Number(hour || 0);
}

export function calendarTimeHm(at = new Date(), timeZone = BUSINESS_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || '00';
  return `${get('hour')}:${get('minute')}`;
}

export const CASH_CUT_KEYS = ['cut10', 'cut13', 'cut16', 'close'] as const;
export type CashCutKey = (typeof CASH_CUT_KEYS)[number];

/** Automatic drawer cuts in America/Managua. Close covers 16:00 through closing (~19:00–19:30). */
export const CASH_CUT_DEFS: ReadonlyArray<{ key: CashCutKey; endHour: number }> = [
  { key: 'cut10', endHour: 10 },
  { key: 'cut13', endHour: 13 },
  { key: 'cut16', endHour: 16 },
  { key: 'close', endHour: 24 },
];

export function cashCutKeyByHour(hour: number): CashCutKey {
  if (hour < 10) return 'cut10';
  if (hour < 13) return 'cut13';
  if (hour < 16) return 'cut16';
  return 'close';
}

/** After the 4:00 cashier change, later sales belong to the final cut. */
export function cashCutKeyForInvoice(hour: number, createdAtMs: number, shiftClosedAtMs?: number | null): CashCutKey {
  if (shiftClosedAtMs != null && createdAtMs <= shiftClosedAtMs) {
    if (hour < 10) return 'cut10';
    if (hour < 13) return 'cut13';
    return 'cut16';
  }
  if (shiftClosedAtMs != null && createdAtMs > shiftClosedAtMs) return 'close';
  return cashCutKeyByHour(hour);
}

/** Sale amount that should stay in the drawer (total minus card). */
export function cashSaleAmount(total: number, cardAmount: number): number {
  return roundMoney(Math.max(0, Number(total || 0) - Number(cardAmount || 0)));
}

export function expectedDrawerCash(
  openingAmount: number,
  cashSales: number,
  operatingExpense = 0,
  returns = 0,
): number {
  return roundMoney(Number(openingAmount || 0) + Number(cashSales || 0) - Number(operatingExpense || 0) - Number(returns || 0));
}

export function drawerDifference(countedCash: number, expectedCash: number): number {
  return roundMoney(Number(countedCash || 0) - Number(expectedCash || 0));
}

/** Paid invoice total after subtracting cash expenses. */
export function salesMinusExpenses(sales: number, expenses: number): number {
  return roundMoney(Number(sales || 0) - Number(expenses || 0));
}

export type CashCutTotals = {
  key: CashCutKey;
  invoiceCount: number;
  voided: number;
  total: number;
  cash: number;
  card: number;
  profit: number;
};

export function emptyCashCuts(): Record<CashCutKey, CashCutTotals> {
  return {
    cut10: { key: 'cut10', invoiceCount: 0, voided: 0, total: 0, cash: 0, card: 0, profit: 0 },
    cut13: { key: 'cut13', invoiceCount: 0, voided: 0, total: 0, cash: 0, card: 0, profit: 0 },
    cut16: { key: 'cut16', invoiceCount: 0, voided: 0, total: 0, cash: 0, card: 0, profit: 0 },
    close: { key: 'close', invoiceCount: 0, voided: 0, total: 0, cash: 0, card: 0, profit: 0 },
  };
}

export function addInvoiceToCashCutByKey(
  cuts: Record<CashCutKey, CashCutTotals>,
  key: CashCutKey,
  invoice: { status: string; total: number; cardAmount: number; profit: number },
) {
  const cut = cuts[key];
  if (invoice.status === 'VOID') {
    cut.voided += 1;
    return cut;
  }
  if (invoice.status !== 'PAID') return cut;
  cut.invoiceCount += 1;
  cut.total = roundMoney(cut.total + Number(invoice.total || 0));
  cut.card = roundMoney(cut.card + Number(invoice.cardAmount || 0));
  cut.cash = roundMoney(cut.cash + cashSaleAmount(invoice.total, invoice.cardAmount));
  cut.profit = roundMoney(cut.profit + Number(invoice.profit || 0));
  return cut;
}

export function addInvoiceToCashCut(
  cuts: Record<CashCutKey, CashCutTotals>,
  hour: number,
  invoice: { status: string; total: number; cardAmount: number; profit: number },
) {
  return addInvoiceToCashCutByKey(cuts, cashCutKeyByHour(hour), invoice);
}

/** Midnight UTC of a YYYY-MM-DD (or of "today" in the pharmacy zone) for Prisma @db.Date. */
export function calendarDateUtc(value?: string | Date, timeZone = BUSINESS_TIME_ZONE): Date {
  const iso = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)
    ? value.slice(0, 10)
    : calendarDateIso(value instanceof Date ? value : new Date(), timeZone);
  return new Date(`${iso}T00:00:00.000Z`);
}

/** Shift an ISO date (YYYY-MM-DD) by whole calendar months in UTC. */
export function addCalendarMonths(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  const utc = new Date(Date.UTC(year, month - 1 + months, day));
  return utc.toISOString().slice(0, 10);
}

/** Default report range: from 3 months ago through today. */
export function expiryWindow(asOfIso: string, months = EXPIRY_ALERT_MONTHS) {
  return {
    from: addCalendarMonths(asOfIso, -months),
    to: asOfIso,
  };
}

export type ExpiryStatus = 'expired' | 'today' | 'upcoming';

export function expiryStatus(expiresAtIso: string, asOfIso: string): ExpiryStatus {
  if (expiresAtIso < asOfIso) return 'expired';
  if (expiresAtIso === asOfIso) return 'today';
  return 'upcoming';
}

export type LotQty = {
  id: number;
  quantity: number;
  expiresAt: string | null;
};

/** FEFO: sales consume the oldest expiration first. remainingStock is current physical stock. */
export function allocateLotRemainings<T extends LotQty>(lots: readonly T[], remainingStock: number): Array<T & { remaining: number }> {
  const received = lots.reduce((sum, lot) => sum + (Number(lot.quantity) || 0), 0);
  let toConsume = Math.max(0, received - Math.max(0, Number(remainingStock) || 0));
  const ordered = [...lots].sort((a, b) => {
    if (!a.expiresAt && !b.expiresAt) return a.id - b.id;
    if (!a.expiresAt) return 1;
    if (!b.expiresAt) return -1;
    if (a.expiresAt !== b.expiresAt) return a.expiresAt < b.expiresAt ? -1 : 1;
    return a.id - b.id;
  });
  return ordered.map((lot) => {
    const qty = Number(lot.quantity) || 0;
    const consumed = Math.min(qty, toConsume);
    toConsume -= consumed;
    return { ...lot, remaining: Number((qty - consumed).toFixed(2)) };
  });
}

/** True when the new sale price differs from the previous one. */
export function salePriceChanged(previousPrice: number, nextPrice: number): boolean {
  return Math.abs((Number(previousPrice) || 0) - (Number(nextPrice) || 0)) > 0.009;
}

/**
 * Same P2 as previous P1: new units join dispatch.
 * Different P2: new units go to warehouse and dispatch stays as-is.
 */
export function intakeDestination(previousPrice: number, nextPrice: number): 'dispatch' | 'warehouse' {
  return salePriceChanged(previousPrice, nextPrice) ? 'warehouse' : 'dispatch';
}

/** Physical existence = dispatch stock + warehouse. */
export function existenceQty(stock: number, warehouseQty: number): number {
  return Number(((Number(stock) || 0) + (Number(warehouseQty) || 0)).toFixed(2));
}

/** What on-hand stock cost vs what it would sell for (higher of P1/P2). */
export function inventoryLineValue(input: {
  stock: number;
  dispatchQty: number;
  warehouseQty: number;
  costPrice: number;
  unitPrice: number;
  unitsPerBox: number;
  salePrice1: number;
  salePrice2: number;
}) {
  const bins = productBins(input.stock, input.dispatchQty, input.warehouseQty);
  const unitCost = Number(input.costPrice) > 0
    ? unitCostFromBox(input.costPrice, input.unitsPerBox || 1)
    : Number(input.unitPrice) || 0;
  const unitSale = higherSalePrice(Number(input.salePrice1), Number(input.salePrice2));
  return {
    existence: bins.existence,
    unitCost: roundMoney(unitCost),
    unitSale: roundMoney(unitSale),
    costAmount: lineAmount(unitCost, bins.existence),
    saleAmount: lineAmount(unitSale, bins.existence),
    profitAmount: lineProfit(unitSale, unitCost, bins.existence),
  };
}

export function sumInventoryValues(lines: ReadonlyArray<{ existence: number; costAmount: number; saleAmount: number; profitAmount: number }>) {
  return lines.reduce(
    (acc, line) => ({
      existence: roundMoney(acc.existence + line.existence),
      costAmount: roundMoney(acc.costAmount + line.costAmount),
      saleAmount: roundMoney(acc.saleAmount + line.saleAmount),
      profitAmount: roundMoney(acc.profitAmount + line.profitAmount),
    }),
    { existence: 0, costAmount: 0, saleAmount: 0, profitAmount: 0 },
  );
}

export function productBins(stock: number, dispatchQty: number, warehouseQty: number) {
  const warehouse = Number(warehouseQty) || 0;
  const dispatch = productDispatchQty(stock, dispatchQty, warehouse);
  return { dispatch, warehouse, existence: existenceQty(dispatch, warehouse) };
}

/**
 * Empty counter restocks from warehouse. If dispatch is 0 and bodega has
 * units, those units become dispatch so the shelf is not left empty.
 */
export function replenishDispatchFromWarehouse(dispatchQty: number, warehouseQty: number) {
  const dispatch = Math.max(0, Number(dispatchQty) || 0);
  const warehouse = Math.max(0, Number(warehouseQty) || 0);
  if (dispatch > 0.009 || warehouse <= 0.009) {
    return {
      dispatchQty: Number(dispatch.toFixed(2)),
      warehouseQty: Number(warehouse.toFixed(2)),
      moved: 0,
    };
  }
  return {
    dispatchQty: Number(warehouse.toFixed(2)),
    warehouseQty: 0,
    moved: Number(warehouse.toFixed(2)),
  };
}

/** Persist shape: stock tracks dispatch after an optional warehouse pull. */
export function stockFieldsFromBins(dispatchQty: number, warehouseQty: number) {
  const bins = replenishDispatchFromWarehouse(dispatchQty, warehouseQty);
  return {
    stock: bins.dispatchQty,
    dispatchQty: bins.dispatchQty,
    warehouseQty: bins.warehouseQty,
  };
}

/** After an intake: existence is always next dispatch + next warehouse. */
export function nextIntakeBins(
  dispatchQty: number,
  warehouseQty: number,
  quantity: number,
  destination: 'dispatch' | 'warehouse',
) {
  const qty = Number(quantity) || 0;
  const dispatch = Number(dispatchQty) || 0;
  const warehouse = Number(warehouseQty) || 0;
  const nextDispatch = destination === 'warehouse' ? dispatch : dispatch + qty;
  const nextWarehouse = destination === 'warehouse' ? warehouse + qty : warehouse;
  const bins = replenishDispatchFromWarehouse(nextDispatch, nextWarehouse);
  return {
    dispatch: bins.dispatchQty,
    warehouse: bins.warehouseQty,
    existence: existenceQty(bins.dispatchQty, bins.warehouseQty),
  };
}

/** Sales consume dispatch first, then warehouse. */
export function consumeDispatchFirst(dispatchQty: number, warehouseQty: number, sold: number) {
  const qty = Math.max(0, Number(sold) || 0);
  const dispatch = Math.max(0, Number(dispatchQty) || 0);
  const warehouse = Math.max(0, Number(warehouseQty) || 0);
  const fromDispatch = Math.min(dispatch, qty);
  const fromWarehouse = Math.min(warehouse, qty - fromDispatch);
  const leftover = replenishDispatchFromWarehouse(
    dispatch - fromDispatch,
    warehouse - fromWarehouse,
  );
  return {
    fromDispatch,
    fromWarehouse,
    dispatchQty: leftover.dispatchQty,
    warehouseQty: leftover.warehouseQty,
    movedToDispatch: leftover.moved,
  };
}

/**
 * Qty to put back on void. Prefer the split stored at sale time.
 * Legacy lines without a split go to dispatch, unless the line price matches warehouse P2.
 */
export function voidRestoreSplit(input: {
  quantity: number;
  fromDispatch?: number | null;
  fromWarehouse?: number | null;
  unitPrice?: number;
  salePrice1?: number;
  salePrice2?: number;
}) {
  const storedDispatch = Math.max(0, Number(input.fromDispatch) || 0);
  const storedWarehouse = Math.max(0, Number(input.fromWarehouse) || 0);
  if (storedDispatch + storedWarehouse > 0.009) {
    return { fromDispatch: storedDispatch, fromWarehouse: storedWarehouse };
  }
  const qty = Math.max(0, Number(input.quantity) || 0);
  const p1 = Number(input.salePrice1) || 0;
  const p2 = Number(input.salePrice2) || 0;
  const price = Number(input.unitPrice) || 0;
  const warehousePriced = p2 > 0 && Math.abs(p1 - p2) > 0.009 && Math.abs(price - p2) <= 0.009;
  if (warehousePriced) return { fromDispatch: 0, fromWarehouse: qty };
  return { fromDispatch: qty, fromWarehouse: 0 };
}

export type SaleBin = 'dispatch' | 'warehouse';

export type PricedSaleShare = {
  bin: SaleBin;
  quantity: number;
  price: number;
};

/** After a price-change intake, the catalog keeps P1 on dispatch and stores P2 as the new warehouse price. */
export function catalogPricesAfterIntake(previousPrice: number, nextPrice: number) {
  const destination = intakeDestination(previousPrice, nextPrice);
  const salePrice2 = Number(nextPrice) || 0;
  return {
    destination,
    salePrice1: destination === 'warehouse' ? Number(previousPrice) || 0 : salePrice2,
    salePrice2,
  };
}

export function higherSalePrice(salePrice1: number, salePrice2: number): number {
  return Math.max(Number(salePrice1) || 0, Number(salePrice2) || 0);
}

export function isHigherSalePrice(price: number, salePrice1: number, salePrice2: number): boolean {
  const value = Number(price) || 0;
  return value > 0 && Math.abs(value - higherSalePrice(salePrice1, salePrice2)) <= 0.009;
}

export function binSalePrice(bin: SaleBin, salePrice1: number, salePrice2: number): number {
  const p1 = Number(salePrice1) || 0;
  const p2 = Number(salePrice2) || p1;
  return bin === 'warehouse' ? p2 : p1;
}

function mergeSamePriceShares(shares: PricedSaleShare[]): PricedSaleShare[] {
  if (shares.length < 2) return shares;
  if (salePriceChanged(shares[0].price, shares[1].price)) return shares;
  return [{
    bin: shares[0].bin,
    quantity: Number((shares[0].quantity + shares[1].quantity).toFixed(2)),
    price: shares[0].price,
  }];
}

/**
 * Dispatch still consumes first, then warehouse, but the billed price is always
 * the higher of P1 and P2.
 */
export function splitSaleByPrice(
  dispatchQty: number,
  warehouseQty: number,
  sold: number,
  salePrice1: number,
  salePrice2: number,
): PricedSaleShare[] {
  const split = consumeDispatchFirst(dispatchQty, warehouseQty, sold);
  const price = higherSalePrice(salePrice1, salePrice2);
  const shares: PricedSaleShare[] = [];
  if (split.fromDispatch > 0) {
    shares.push({ bin: 'dispatch', quantity: split.fromDispatch, price });
  }
  if (split.fromWarehouse > 0) {
    shares.push({ bin: 'warehouse', quantity: split.fromWarehouse, price });
  }
  return mergeSamePriceShares(shares);
}

export function isOutOfStock(existence: number): boolean {
  return (Number(existence) || 0) <= 0.009;
}

/** Split stock into boxes × units-per-box plus leftover units. */
export function splitPack(stock: number, unitsPerBox: number) {
  const qty = Number(stock) || 0;
  const perBox = Number(unitsPerBox) || 0;
  if (perBox <= 0) {
    return { boxes: 0, loose: qty, packLabel: String(qty) };
  }
  const boxes = Math.floor(qty / perBox);
  const loose = Number((qty - boxes * perBox).toFixed(2));
  return {
    boxes,
    loose,
    packLabel: loose ? `${boxes} x ${perBox} + ${loose}` : `${boxes} x ${perBox}`,
  };
}

/** Write off complete boxes only; leftover units in an open pack stay in stock. */
export function writeOffFullBoxes(
  dispatchQty: number,
  warehouseQty: number,
  unitsPerBox: number,
  boxes: number,
) {
  const perBox = Number(unitsPerBox) > 0 ? Number(unitsPerBox) : 1;
  const existence = existenceQty(dispatchQty, warehouseQty);
  const pack = splitPack(existence, perBox);
  const requested = Math.max(0, Math.floor(Number(boxes) || 0));
  if (requested < 1) {
    return { ok: false as const, error: 'boxesRequired' as const, pack, units: 0 };
  }
  if (requested > pack.boxes) {
    return { ok: false as const, error: 'tooManyBoxes' as const, pack, units: 0 };
  }
  const units = requested * perBox;
  const next = consumeDispatchFirst(dispatchQty, warehouseQty, units);
  return {
    ok: true as const,
    pack,
    nextPack: splitPack(existenceQty(next.dispatchQty, next.warehouseQty), perBox),
    boxes: requested,
    units,
    fromDispatch: next.fromDispatch,
    fromWarehouse: next.fromWarehouse,
    dispatchQty: next.dispatchQty,
    warehouseQty: next.warehouseQty,
  };
}

/** Set existence to a physical count. Writes off (existencia − remaining), dispatch first. */
export function writeOffToRemaining(
  dispatchQty: number,
  warehouseQty: number,
  remaining: number,
  unitsPerBox = 1,
) {
  const perBox = Number(unitsPerBox) > 0 ? Number(unitsPerBox) : 1;
  const existence = existenceQty(dispatchQty, warehouseQty);
  const pack = splitPack(existence, perBox);
  const target = Math.max(0, Number(remaining) || 0);
  if (target > existence + 0.009) {
    return { ok: false as const, error: 'remainingTooHigh' as const, pack, units: 0 };
  }
  const units = Number((existence - target).toFixed(2));
  if (units <= 0.009) {
    return { ok: false as const, error: 'nothingToAdjust' as const, pack, units: 0 };
  }
  const next = consumeDispatchFirst(dispatchQty, warehouseQty, units);
  return {
    ok: true as const,
    pack,
    nextPack: splitPack(existenceQty(next.dispatchQty, next.warehouseQty), perBox),
    boxes: 0,
    units,
    remaining: Number(target.toFixed(2)),
    fromDispatch: next.fromDispatch,
    fromWarehouse: next.fromWarehouse,
    dispatchQty: next.dispatchQty,
    warehouseQty: next.warehouseQty,
  };
}

/**
 * Intake after an optional physical count: write off (existencia − remaining),
 * then add the new quantity with the existing destination rule.
 */
export function applyIntakeWithRemaining(
  dispatchQty: number,
  warehouseQty: number,
  quantity: number,
  destination: 'dispatch' | 'warehouse',
  remaining?: number | null,
  unitsPerBox = 1,
) {
  const existence = existenceQty(dispatchQty, warehouseQty);
  const hasRemaining = remaining != null && Number.isFinite(Number(remaining));
  if (hasRemaining && Number(remaining) > existence + 0.009) {
    return { ok: false as const, error: 'remainingTooHigh' as const };
  }
  const adjust = hasRemaining
    ? writeOffToRemaining(dispatchQty, warehouseQty, Number(remaining), unitsPerBox)
    : { ok: false as const, error: 'nothingToAdjust' as const };
  const afterDispatch = adjust.ok ? adjust.dispatchQty : Number(dispatchQty) || 0;
  const afterWarehouse = adjust.ok ? adjust.warehouseQty : Number(warehouseQty) || 0;
  return {
    ok: true as const,
    wroteOff: adjust.ok ? adjust.units : 0,
    remaining: adjust.ok ? adjust.remaining : existence,
    fromDispatch: adjust.ok ? adjust.fromDispatch : 0,
    fromWarehouse: adjust.ok ? adjust.fromWarehouse : 0,
    afterAdjust: {
      dispatch: afterDispatch,
      warehouse: afterWarehouse,
      existence: existenceQty(afterDispatch, afterWarehouse),
    },
    bins: nextIntakeBins(afterDispatch, afterWarehouse, quantity, destination),
  };
}

