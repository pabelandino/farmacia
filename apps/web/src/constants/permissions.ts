import { PermissionKey } from '@farmaplus/domain';
import { LABELS } from './labels';
import { AppNavItem } from './nav';

export const PERMISSION_FIELDS: Array<{ key: PermissionKey; label: keyof typeof LABELS }> = [
  { key: 'billing', label: 'permissionBilling' },
  { key: 'invoices', label: 'permissionInvoices' },
  { key: 'products', label: 'permissionProducts' },
  { key: 'transfers', label: 'permissionTransfers' },
  { key: 'suppliers', label: 'permissionSuppliers' },
  { key: 'voidInvoice', label: 'permissionVoidInvoice' },
  { key: 'dashboard', label: 'permissionDashboard' },
  { key: 'intakes', label: 'permissionIntakes' },
  { key: 'writeOffs', label: 'permissionWriteOffs' },
  { key: 'cash', label: 'permissionCash' },
  { key: 'clients', label: 'permissionClients' },
  { key: 'reports', label: 'permissionReports' },
  { key: 'settings', label: 'permissionSettings' },
  { key: 'users', label: 'permissionUsers' },
];

export function visibleNavItems(items: AppNavItem[], has: (key: PermissionKey) => boolean) {
  return items.filter((item) => {
    if (!has(item.permission)) return false;
    if (item.permission === 'invoices' && has('reports')) return false;
    return true;
  });
}
