import { PermissionKey } from '@farmaplus/domain';
import { LABELS } from './labels';

export type AppNavItem = {
  to: string;
  label: string;
  permission: PermissionKey;
  end?: boolean;
  match?: string[];
};

export const APP_LINKS: AppNavItem[] = [
  { to: '/', label: LABELS.billing, permission: 'billing', end: true, match: ['/', '/credito'] },
  { to: '/reportes/facturas', label: LABELS.invoicesNav, permission: 'invoices' },
  { to: '/productos', label: LABELS.products, permission: 'products' },
  { to: '/traslados', label: LABELS.transfers, permission: 'transfers' },
  { to: '/proveedores', label: LABELS.suppliers, permission: 'suppliers' },
  { to: '/dashboard', label: LABELS.dashboard, permission: 'dashboard' },
  { to: '/ingresos', label: LABELS.intakes, permission: 'intakes' },
  { to: '/bajas', label: LABELS.writeOffs, permission: 'writeOffs' },
  { to: '/caja', label: LABELS.cashDrawer, permission: 'cash' },
  { to: '/clientes', label: LABELS.clients, permission: 'clients' },
  { to: '/reportes', label: LABELS.reports, permission: 'reports' },
  { to: '/usuarios', label: LABELS.users, permission: 'users' },
  { to: '/configuracion', label: LABELS.settings, permission: 'settings' },
];

export const BILLING_TABS: Array<{ to: string; label: string; end?: boolean }> = [
  { to: '/', label: LABELS.cashSale, end: true },
  { to: '/credito', label: LABELS.credit },
];

export const REPORT_ITEMS = [
  { to: '/reportes/ventas', title: 'salesDay', description: 'salesDayDesc' },
  { to: '/reportes/detalle-ventas', title: 'salesReport', description: 'salesReportDesc' },
  { to: '/reportes/facturas', title: 'invoicesReport', description: 'invoicesReportDesc' },
  { to: '/reportes/inventario', title: 'inventory', description: 'inventoryDesc' },
  { to: '/reportes/vencidos', title: 'expiredProducts', description: 'expiredProductsDesc' },
  { to: '/reportes/cxc', title: 'receivables', description: 'receivablesDesc' },
  { to: '/reportes/cxp', title: 'payables', description: 'payablesDesc' },
] as const;
