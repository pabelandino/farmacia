export const PERMISSION_KEYS = [
  'billing',
  'invoices',
  'products',
  'editProducts',
  'transfers',
  'suppliers',
  'voidInvoice',
  'dashboard',
  'intakes',
  'writeOffs',
  'expenses',
  'cash',
  'clients',
  'reports',
  'settings',
  'users',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export type PermissionMap = Record<PermissionKey, boolean>;

export const CASHIER_DEFAULTS: PermissionMap = {
  billing: true,
  invoices: true,
  products: true,
  editProducts: false,
  transfers: true,
  suppliers: true,
  voidInvoice: false,
  dashboard: false,
  intakes: false,
  writeOffs: false,
  expenses: false,
  cash: true,
  clients: false,
  reports: false,
  settings: false,
  users: false,
};

function flag(value: unknown) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

export function allPermissions(enabled: boolean): PermissionMap {
  return Object.fromEntries(PERMISSION_KEYS.map((key) => [key, enabled])) as PermissionMap;
}

export function normalizePermissions(role: string | undefined, raw: unknown): PermissionMap {
  if (role === 'ADMIN') return allPermissions(true);
  const src = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
  const next: PermissionMap = { ...CASHIER_DEFAULTS };
  for (const key of PERMISSION_KEYS) {
    if (key in src) next[key] = flag(src[key]);
  }
  if (!('billing' in src)) next.billing = flag(src.cashInvoice) || flag(src.creditInvoice) || next.billing;
  if (!('voidInvoice' in src) && 'deleteInvoice' in src) next.voidInvoice = flag(src.deleteInvoice);
  if (!('products' in src) && flag(src.productSearch)) next.products = true;
  if (!('cash' in src) && flag(src.cashOpen)) next.cash = true;
  return next;
}

export function hasPermission(
  user: { role?: string; permissions?: Partial<PermissionMap> } | null | undefined,
  key: PermissionKey,
) {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  return user.permissions?.[key] === true;
}

export function hasAnyPermission(
  user: { role?: string; permissions?: Partial<PermissionMap> } | null | undefined,
  keys: PermissionKey[],
) {
  return keys.some((key) => hasPermission(user, key));
}

export function homePath(user: { role?: string; permissions?: Partial<PermissionMap> } | null | undefined) {
  const routes: Array<[PermissionKey, string]> = [
    ['billing', '/'],
    ['voidInvoice', '/anular'],
    ['invoices', '/reportes/facturas'],
    ['products', '/productos'],
    ['transfers', '/traslados'],
    ['suppliers', '/proveedores'],
    ['dashboard', '/dashboard'],
    ['intakes', '/ingresos'],
    ['writeOffs', '/bajas'],
    ['expenses', '/egresos'],
    ['cash', '/caja'],
    ['clients', '/clientes'],
    ['reports', '/reportes'],
    ['settings', '/configuracion'],
    ['users', '/usuarios'],
  ];
  const match = routes.find(([key]) => hasPermission(user, key));
  return match?.[1] || '/login';
}
