import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_UTILITY_PERCENT,
  applyIntakeBoxes,
  applyIntakeQuantity,
  intakeBoxesFromQty,
  intakeQtyFromBoxes,
  intakeTotal,
  lineAmount,
  lineProfit,
  markupPercent,
  recalcIntakePricing,
  remainingBalance,
  salePriceFromMarkup,
  splitPack,
  totalUsd,
  unitCostFromBox,
  packSaleQty,
  canSplitPackSale,
  inferSoldByUnit,
  changeDue,
  tenderKind,
  addCalendarMonths,
  expiryWindow,
  expiryStatus,
  allocateLotRemainings,
  consumeDispatchFirst,
  writeOffFullBoxes,
  voidRestoreSplit,
  existenceQty,
  intakeDestination,
  salePriceChanged,
  productDispatchQty,
  productBins,
  inventoryLineValue,
  sumInventoryValues,
  nextIntakeBins,
  catalogPricesAfterIntake,
  higherSalePrice,
  isHigherSalePrice,
  splitSaleByPrice,
  isOutOfStock,
  EXPIRY_ALERT_MONTHS,
} from './index';

describe('FarmaPlusV2 formulas vs restored SQL data', () => {
  it('Importe = Precio × Cantidad (DETALLE 675873005027)', () => {
    assert.equal(lineAmount(7, 10), 70);
  });

  it('Ganancia = (Precio − PrecioUnidad) × Cantidad', () => {
    assert.equal(lineProfit(7, 5.9, 10), 11);
  });

  it('Porcentaje is markup on cost, not margin on sale', () => {
    const markup = markupPercent(7, 5.9);
    assert.equal(markup, 18.64);
    const marginOnSale = round2(((7 - 5.9) / 7) * 100);
    assert.notEqual(markup, marginOnSale);
  });

  it('PrecioUnidad = PrecioCompra / UnidadesCaja (PRODUCTOS 7431007750606)', () => {
    assert.equal(unitCostFromBox(774.99, 30), 25.83);
  });

  it('PrecioVenta1 ≈ round(PrecioUnidad × 1.20)', () => {
    assert.equal(salePriceFromMarkup(25.83, DEFAULT_UTILITY_PERCENT), 31);
    assert.equal(salePriceFromMarkup(13.26, 20), 16);
    assert.equal(salePriceFromMarkup(8, 25), 10);
  });

  it('Unidades a ingresar = Cajas × Unidades/caja (Cystone 10 × 100)', () => {
    assert.equal(intakeQtyFromBoxes(10, 100), 1000);
    assert.equal(intakeQtyFromBoxes(1, 100), 100);
    assert.equal(intakeQtyFromBoxes(10, 0), 10);
    assert.equal(intakeBoxesFromQty(1000, 100), 10);
    assert.equal(applyIntakeBoxes({ boxes: 10, unitsPerBox: 100, quantity: 0 }).quantity, 1000);
    assert.equal(applyIntakeQuantity({ boxes: 1, unitsPerBox: 30, quantity: 26 }).boxes, 0.87);
    assert.equal(applyIntakeQuantity({ boxes: 1, unitsPerBox: 30, quantity: 26 }).quantity, 26);
    assert.equal(recalcIntakePricing({
      costPrice: 1440.6, unitsPerBox: 30, unitCost: 48.02, salePrice1: 58, salePrice2: 58,
      utilityPercent: 20, quantity: 26, amount: 0,
    }, false).amount, 1248.52);
  });

  it('Total ingreso = PrecioUnidad × CantidadEntrada (RAPIDOL)', () => {
    assert.equal(intakeTotal(13.26, 48), 636.48);
  });

  it('Total USD is display-only division by tipo de cambio', () => {
    assert.equal(totalUsd(70, 36.2), 1.93);
  });

  it('POS change and credit remaining never go negative', () => {
    assert.equal(changeDue(100, 70), 30);
    assert.equal(changeDue(50, 70), 0);
    assert.equal(remainingBalance(70, 20), 50);
    assert.equal(remainingBalance(70, 80), 0);
  });

  it('Contado tender is card when only tarjeta was received', () => {
    assert.equal(tenderKind(0, 270), 'card');
    assert.equal(tenderKind(270, 0), 'cash');
    assert.equal(tenderKind(100, 170), 'mixed');
    assert.equal(tenderKind(0, 270, 'Credito'), 'credit');
  });

  it('Diamel bottle of 30: unit cost from box purchase, pack sale deducts 30', () => {
    assert.equal(unitCostFromBox(228, 30), 7.6);
    assert.equal(packSaleQty(30, true), 30);
    assert.equal(packSaleQty(1, true), 1);
    assert.equal(packSaleQty(30, false), 1);
    assert.equal(canSplitPackSale(30, true), true);
    assert.equal(canSplitPackSale(30, false), false);
    assert.equal(lineProfit(9, 7.6, 30), 42);
    assert.equal(lineProfit(9, 7.6, 60), 84);
  });

  it('infers unit sale when P1 is a piece price, pack sale when P1 is the bottle', () => {
    assert.equal(inferSoldByUnit({ salePrice: 9, unitCost: 7.6, costPrice: 228, unitsPerBox: 30 }), true);
    assert.equal(inferSoldByUnit({ salePrice: 72, unitCost: 6, costPrice: 60.01, unitsPerBox: 10 }), false);
    assert.equal(inferSoldByUnit({ salePrice: 10, unitCost: 10, costPrice: 10, unitsPerBox: 1 }), false);
  });

  it('splitPack shows boxes times units-per-box plus leftover units', () => {
    assert.deepEqual(splitPack(48, 12), { boxes: 4, loose: 0, packLabel: '4 x 12' });
    assert.deepEqual(splitPack(50, 12), { boxes: 4, loose: 2, packLabel: '4 x 12 + 2' });
    assert.deepEqual(splitPack(7, 0), { boxes: 0, loose: 7, packLabel: '7' });
  });

  it('writeOffFullBoxes removes complete packs and keeps leftover units', () => {
    const cystone = writeOffFullBoxes(750, 0, 100, 3);
    assert.equal(cystone.ok, true);
    if (cystone.ok) {
      assert.equal(cystone.units, 300);
      assert.equal(cystone.dispatchQty, 450);
      assert.equal(cystone.nextPack.boxes, 4);
      assert.equal(cystone.nextPack.loose, 50);
    }
    const diamel = writeOffFullBoxes(90, 29, 30, 2);
    assert.equal(diamel.ok, true);
    if (diamel.ok) {
      assert.equal(diamel.units, 60);
      assert.equal(diamel.fromDispatch, 60);
      assert.equal(diamel.fromWarehouse, 0);
      assert.equal(diamel.dispatchQty, 30);
      assert.equal(diamel.warehouseQty, 29);
      assert.equal(diamel.nextPack.loose, 29);
    }
    assert.equal(writeOffFullBoxes(50, 0, 12, 5).ok, false);
    assert.equal(writeOffFullBoxes(50, 0, 12, 0).ok, false);
  });

  it('Intake line recalc derives unit cost, P1, and amount from cost', () => {
    const next = recalcIntakePricing({
      costPrice: 774.99,
      unitsPerBox: 30,
      unitCost: 0,
      salePrice1: 0,
      salePrice2: 0,
      utilityPercent: DEFAULT_UTILITY_PERCENT,
      quantity: 2,
      amount: 0,
    });
    assert.equal(next.unitCost, 25.83);
    assert.equal(next.salePrice1, 31);
    assert.equal(next.salePrice2, 31);
    assert.equal(next.amount, 51.66);
  });

  it('price change sends new intake to warehouse and keeps previous dispatch', () => {
    assert.equal(intakeDestination(11, 11), 'dispatch');
    assert.equal(intakeDestination(11, 13), 'warehouse');
    assert.equal(salePriceChanged(2.5, 2.5), false);
    assert.equal(existenceQty(11, 10), 21);
    assert.equal(productDispatchQty(11, 0), 11);
    assert.equal(productDispatchQty(11, 11), 11);
    assert.equal(productDispatchQty(21, 0, 10), 11);
    assert.deepEqual(productBins(11, 0, 0), { dispatch: 11, warehouse: 0, existence: 11 });
    const valued = inventoryLineValue({
      stock: 10, dispatchQty: 10, warehouseQty: 5, costPrice: 300, unitPrice: 10,
      unitsPerBox: 30, salePrice1: 12, salePrice2: 14,
    });
    assert.equal(valued.existence, 15);
    assert.equal(valued.unitCost, 10);
    assert.equal(valued.unitSale, 14);
    assert.equal(valued.costAmount, 150);
    assert.equal(valued.saleAmount, 210);
    assert.equal(valued.profitAmount, 60);
    assert.deepEqual(sumInventoryValues([valued, valued]), {
      existence: 30, costAmount: 300, saleAmount: 420, profitAmount: 120,
    });
    assert.deepEqual(nextIntakeBins(1000, 0, 1000, 'warehouse'), { dispatch: 1000, warehouse: 1000, existence: 2000 });
    assert.deepEqual(nextIntakeBins(1000, 0, 1000, 'dispatch'), { dispatch: 2000, warehouse: 0, existence: 2000 });
    const sold = consumeDispatchFirst(11, 10, 13);
    assert.equal(sold.fromDispatch, 11);
    assert.equal(sold.fromWarehouse, 2);
    assert.equal(sold.dispatchQty, 0);
    assert.equal(sold.warehouseQty, 8);
    assert.deepEqual(catalogPricesAfterIntake(2.5, 3), { destination: 'warehouse', salePrice1: 2.5, salePrice2: 3 });
    assert.deepEqual(catalogPricesAfterIntake(2, 3), { destination: 'warehouse', salePrice1: 2, salePrice2: 3 });
    assert.deepEqual(catalogPricesAfterIntake(2, 2), { destination: 'dispatch', salePrice1: 2, salePrice2: 2 });
    assert.deepEqual(catalogPricesAfterIntake(2.5, 2.5), { destination: 'dispatch', salePrice1: 2.5, salePrice2: 2.5 });
    assert.equal(higherSalePrice(2.5, 3), 3);
    assert.equal(isHigherSalePrice(3, 2.5, 3), true);
    assert.equal(isHigherSalePrice(2.5, 2.5, 3), false);
    assert.deepEqual(splitSaleByPrice(11, 10, 13, 2.5, 3), [
      { bin: 'dispatch', quantity: 13, price: 3 },
    ]);
    assert.deepEqual(splitSaleByPrice(10, 10, 13, 2.5, 3), [
      { bin: 'dispatch', quantity: 13, price: 3 },
    ]);
    assert.equal(isOutOfStock(0), true);
    assert.equal(isOutOfStock(0.00), true);
    assert.equal(isOutOfStock(2), false);
    assert.deepEqual(voidRestoreSplit({ quantity: 13, fromDispatch: 11, fromWarehouse: 2 }), {
      fromDispatch: 11,
      fromWarehouse: 2,
    });
    assert.deepEqual(voidRestoreSplit({ quantity: 10, fromDispatch: 0, fromWarehouse: 0 }), {
      fromDispatch: 10,
      fromWarehouse: 0,
    });
    assert.deepEqual(voidRestoreSplit({ quantity: 10, unitPrice: 3, salePrice1: 2.5, salePrice2: 3 }), {
      fromDispatch: 0,
      fromWarehouse: 10,
    });
  });

  it('FEFO keeps leftover of the older lot and does not overwrite a newer expiration', () => {
    const lots = allocateLotRemainings(
      [
        { id: 1, quantity: 100, expiresAt: '2026-06-16' },
        { id: 2, quantity: 1000, expiresAt: '2027-01-10' },
      ],
      1050,
    );
    assert.equal(lots[0].remaining, 50);
    assert.equal(lots[1].remaining, 1000);
    assert.equal(lots[0].expiresAt, '2026-06-16');
    assert.equal(lots[1].expiresAt, '2027-01-10');
  });

  it('expiry window looks 3 months back from the as-of date', () => {
    assert.equal(EXPIRY_ALERT_MONTHS, 3);
    assert.equal(addCalendarMonths('2026-09-16', -3), '2026-06-16');
    assert.deepEqual(expiryWindow('2026-09-16'), { from: '2026-06-16', to: '2026-09-16' });
    assert.equal(expiryStatus('2026-06-01', '2026-09-16'), 'expired');
    assert.equal(expiryStatus('2026-09-16', '2026-09-16'), 'today');
    assert.equal(expiryStatus('2026-10-01', '2026-09-16'), 'upcoming');
  });
});

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
