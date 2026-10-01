import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CASHIER_DEFAULTS, hasPermission, homePath, normalizePermissions } from './permissions';

describe('user permissions', () => {
  it('admin always has every permission', () => {
    const permissions = normalizePermissions('ADMIN', { billing: false });
    assert.equal(permissions.billing, true);
    assert.equal(permissions.users, true);
    assert.equal(hasPermission({ role: 'ADMIN', permissions }, 'settings'), true);
  });

  it('cashier defaults to billing, invoices, products, transfers and suppliers', () => {
    const permissions = normalizePermissions('CASHIER', {});
    assert.deepEqual(permissions, CASHIER_DEFAULTS);
    assert.equal(permissions.voidInvoice, false);
    assert.equal(homePath({ role: 'CASHIER', permissions }), '/');
  });

  it('maps legacy deleteInvoice to voidInvoice', () => {
    const permissions = normalizePermissions('CASHIER', { deleteInvoice: true, cashInvoice: true });
    assert.equal(permissions.voidInvoice, true);
    assert.equal(permissions.billing, true);
  });
});
