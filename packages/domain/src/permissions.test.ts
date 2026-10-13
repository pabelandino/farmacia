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

  it('cashier defaults to billing, invoices, products, transfers, suppliers and cash', () => {
    const permissions = normalizePermissions('CASHIER', {});
    assert.deepEqual(permissions, CASHIER_DEFAULTS);
    assert.equal(permissions.voidInvoice, false);
    assert.equal(permissions.cash, true);
    assert.equal(permissions.editProducts, false);
    assert.equal(homePath({ role: 'CASHIER', permissions }), '/');
  });

  it('editProducts is independent from viewing the catalog', () => {
    const viewer = normalizePermissions('CASHIER', { products: true, editProducts: false });
    assert.equal(viewer.products, true);
    assert.equal(viewer.editProducts, false);
    assert.equal(hasPermission({ role: 'CASHIER', permissions: viewer }, 'editProducts'), false);
    const editor = normalizePermissions('CASHIER', { products: true, editProducts: true });
    assert.equal(hasPermission({ role: 'CASHIER', permissions: editor }, 'editProducts'), true);
  });

  it('legacy productSearch false does not hide the products page', () => {
    const permissions = normalizePermissions('CASHIER', { productSearch: false, cashOpen: false });
    assert.equal(permissions.products, true);
    assert.equal(permissions.cash, true);
  });

  it('maps legacy deleteInvoice to voidInvoice', () => {
    const permissions = normalizePermissions('CASHIER', { deleteInvoice: true, cashInvoice: true });
    assert.equal(permissions.voidInvoice, true);
    assert.equal(permissions.billing, true);
  });

  it('voidInvoice opens the dedicated void page, not reports', () => {
    const permissions = normalizePermissions('CASHIER', {
      billing: false,
      invoices: false,
      products: false,
      transfers: false,
      suppliers: false,
      voidInvoice: true,
    });
    assert.equal(homePath({ role: 'CASHIER', permissions }), '/anular');
  });
});
