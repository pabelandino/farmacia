import { LabelKey } from './labels';

export type TableColumn = LabelKey | { key: LabelKey; className?: string };

export function columnKey(column: TableColumn): LabelKey {
  return typeof column === 'string' ? column : column.key;
}

export function columnClass(column: TableColumn): string {
  return typeof column === 'string' ? '' : column.className ?? '';
}

export const CASH_DETAIL_COLUMNS = [
  'user',
  'invoice',
  'income',
  'card',
  'operatingExpense',
  'returns',
  'auth',
] as const satisfies readonly TableColumn[];

export const CASH_STAT_KEYS = [
  'movements',
  'income',
  'card',
  'expenses',
  'net',
] as const satisfies readonly LabelKey[];

export const CREDIT_LIST_COLUMNS = [
  'invoice',
  'client',
  'date',
  'dueDate',
  'total',
  'advance',
  'balance',
  'cashier',
  { key: 'actions', className: 'no-print' },
] as const satisfies readonly TableColumn[];

export const CREDIT_LINE_COLUMNS = [
  'invoice',
  'client',
  'sku',
  'product',
  'brand',
  'qty',
  'price',
  'amount',
  'percent',
  { key: 'actions', className: 'no-print' },
] as const satisfies readonly TableColumn[];

export const POS_LINE_COLUMNS = [
  'product',
  'qty',
  'price',
  'amount',
  'actions',
] as const satisfies readonly TableColumn[];

export const POS_RECENT_COLUMNS = [
  'invoice',
  'product',
  'qty',
  'total',
  'payment',
  'status',
  'date',
  { key: 'actions', className: 'no-print' },
] as const satisfies readonly TableColumn[];

export const PRODUCT_PICKER_COLUMNS = [
  { key: 'sku', className: 'w-[12%]' },
  { key: 'product', className: 'w-[21%]' },
  { key: 'generic', className: 'w-[17%]' },
  { key: 'brand', className: 'w-[12%]' },
  { key: 'existence', className: 'w-[7%]' },
  { key: 'dispatch', className: 'w-[7%]' },
  { key: 'price1', className: 'w-[7%]' },
  { key: 'price2', className: 'w-[7%]' },
  { key: 'actions', className: 'w-[10%]' },
] as const satisfies readonly TableColumn[];

export const PRODUCT_LIST_COLUMNS = [
  'sku',
  'product',
  'generic',
  'brand',
  'category',
  'price1',
  'price2',
  'stock',
  'minShort',
] as const satisfies readonly TableColumn[];

export const CLIENT_LIST_COLUMNS = [
  'sku',
  'name',
  'address',
  'phone',
  'nationalId',
] as const satisfies readonly TableColumn[];

export const SALES_DAY_COLUMNS = [
  'invoice',
  'client',
  'cashier',
  'type',
  'status',
  'total',
  'actions',
] as const satisfies readonly TableColumn[];

export const LOW_STOCK_COLUMNS = [
  'sku',
  'product',
  'stock',
  'minimum',
] as const satisfies readonly TableColumn[];

export const INTAKE_PRODUCT_COLUMNS = [
  'sku',
  'product',
  'existence',
  'dispatch',
  'warehouse',
] as const satisfies readonly TableColumn[];

export const INTAKE_LINE_COLUMNS = [
  'sku',
  'product',
  'qty',
  'lot',
  'expiresAt',
  'cost',
  'unit',
  'price1',
  'price2',
  'total',
  'destination',
  'actions',
] as const satisfies readonly TableColumn[];

export const INTAKE_EXISTING_LOT_COLUMNS = [
  'lot',
  'expiresAt',
  'status',
  'qty',
  'remainingQty',
] as const satisfies readonly TableColumn[];

export const INTAKE_LIST_COLUMNS = [
  'id',
  'document',
  'supplier',
  'product',
  'date',
  'total',
] as const satisfies readonly TableColumn[];

export const SETTINGS_COUNT_COLUMNS = ['table', 'records'] as const satisfies readonly TableColumn[];

export const INVENTORY_COLUMNS = [
  'sku',
  'product',
  'unit',
  'unitsPerBox',
  'boxes',
  'loose',
  'stock',
  'dispatch',
  'warehouse',
  'minShort',
  'unitCost',
  'unitSale',
  'costSubtotal',
  'saleSubtotal',
  'profitSubtotal',
] as const satisfies readonly TableColumn[];

export const RECEIVABLE_COLUMNS = [
  'client',
  'invoice',
  'date',
  'dueDate',
  'total',
  'advance',
  'balance',
  'actions',
] as const satisfies readonly TableColumn[];

export const RECEIVABLE_CLIENT_COLUMNS = [
  'client',
  'invoiceCount',
  'total',
  'advance',
  'balance',
] as const satisfies readonly TableColumn[];

export const PAYABLE_COLUMNS = [
  'supplier',
  'invoice',
  'concept',
  'purchaseOrder',
  'date',
  'dueDate',
  'status',
  'balance',
] as const satisfies readonly TableColumn[];

export const PAYABLE_SUPPLIER_COLUMNS = [
  'supplier',
  'invoiceCount',
  'balance',
] as const satisfies readonly TableColumn[];

export const SALES_LINES_COLUMNS = [
  'invoice',
  'client',
  'sku',
  'product',
  'brand',
  'qty',
  'price',
  'amount',
  'profitAmount',
  'payment',
  'cashier',
  'date',
] as const satisfies readonly TableColumn[];

export const INVOICE_REPORT_COLUMNS = [
  'invoice',
  'client',
  'product',
  'qty',
  'total',
  'profitAmount',
  'payment',
  'status',
  'date',
  'cashier',
  { key: 'actions', className: 'no-print' },
] as const satisfies readonly TableColumn[];

export const EXPIRED_PRODUCT_COLUMNS = [
  'sku',
  'product',
  'lot',
  'expiresAt',
  'status',
  'qty',
  'remainingQty',
  'stock',
  'supplier',
  'document',
  'date',
] as const satisfies readonly TableColumn[];

export const EXPIRED_DASHBOARD_COLUMNS = [
  'sku',
  'product',
  'lot',
  'expiresAt',
  'status',
  'remainingQty',
] as const satisfies readonly TableColumn[];

export const USER_LIST_COLUMNS = [
  'user',
  'sku',
  'role',
  'permissions',
  'status',
  { key: 'actions', className: 'no-print' },
] as const satisfies readonly TableColumn[];

export const SUPPLIER_LIST_COLUMNS = [
  'name',
  'contact',
  'phone',
  'address',
  'email',
] as const satisfies readonly TableColumn[];

export const TRANSFER_LIST_COLUMNS = [
  'date',
  'sku',
  'product',
  'origin',
  'destination',
  'qty',
  'sender',
  'receiver',
  'writeOffReason',
] as const satisfies readonly TableColumn[];

export const WRITE_OFF_COLUMNS = [
  'date',
  'sku',
  'product',
  'boxes',
  'qty',
  'writeOffReason',
  'user',
] as const satisfies readonly TableColumn[];

