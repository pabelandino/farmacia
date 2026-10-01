/** Coerce API decimal/string values to a number. Not a pricing formula. */
export function toNumber(value: string | number | undefined) {
  return Number(value || 0);
}

/** Totals and money like 1,273.00 */
export function formatMoney(value: number) {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Whole counts like 3,412 */
export function formatCount(value: number) {
  return value.toLocaleString('en-US');
}

export function formatQty(value: number) {
  return Number.isInteger(value) ? formatCount(value) : formatMoney(value);
}
