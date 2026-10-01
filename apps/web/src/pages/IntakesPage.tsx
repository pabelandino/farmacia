import { FormEvent, useEffect, useMemo, useState } from 'react';
import { allocateLotRemainings, applyIntakeBoxes, applyIntakeQuantity, applyIntakeWithRemaining, DEFAULT_UTILITY_PERCENT, existenceQty, intakeBoxesFromQty, intakeDestination, isHigherSalePrice, markupPercent, productBins, recalcIntakePricing, splitPack, unitCostFromBox } from '@farmaplus/domain';
import { api } from '../api/client';
import { DateInput } from '../components/DateInput';
import { ExistingLotsPanel } from '../components/ExistingLotsPanel';
import { Field } from '../components/Field';
import { ProductCreateModal, NewProductDraft } from '../components/ProductCreateModal';
import { CatalogPicker } from '../components/CatalogPicker';
import { Pagination } from '../components/Pagination';
import { Panel } from '../components/Panel';
import { StatusMessage } from '../components/StatusMessage';
import { SubmitButton } from '../components/SubmitButton';
import { TableHead } from '../components/TableHead';
import { TableWrap } from '../components/TableWrap';
import { higherPriceClass, inputClass, tableClass, tdClass } from '../components/formClasses';
import { destinationLabel, LABELS } from '../constants/labels';
import { INTAKE_LINE_COLUMNS, INTAKE_LIST_COLUMNS, INTAKE_PRODUCT_COLUMNS } from '../constants/tables';
import { useFeedback } from '../hooks/useFeedback';
import { usePagedRows } from '../hooks/usePagedRows';
import { useProductLookups } from '../hooks/useProductLookups';
import { useProductSearch } from '../hooks/useProductSearch';
import { Product } from '../types/catalog';
import { Intake, IntakeLine, ProductLot, ProductLots } from '../types/intakes';
import { dateOnly, formatReportDate, todayIso } from '../utils/dates';
import { formatMoney, formatQty, toNumber } from '../utils/numbers';

const emptyLine = (): IntakeLine => ({
  sku: '', productName: '', generic: '', brand: '', line: '', unit: 'Unidad', boxes: 1, quantity: 1, costPrice: 0,
  unitsPerBox: 1, unitCost: 0, salePrice1: 0, salePrice2: 0, utilityPercent: DEFAULT_UTILITY_PERCENT,
  lot: '', expiresAt: '', destination: 'dispatch', amount: 0,
});

function withSalePrices(line: IntakeLine, salePrice2: number): IntakeLine {
  return { ...line, salePrice2, destination: intakeDestination(line.salePrice1, salePrice2) };
}

function binsPreview(bins: { existence: number; dispatch: number; warehouse: number }) {
  return `${LABELS.existence} ${bins.existence.toFixed(2)} · ${LABELS.dispatch} ${bins.dispatch.toFixed(2)} · ${LABELS.warehouse} ${bins.warehouse.toFixed(2)}`;
}

function hydrateIntakeLine(line: IntakeLine): IntakeLine {
  const unitsPerBox = toNumber(line.unitsPerBox) || 1;
  const quantity = toNumber(line.quantity);
  return {
    ...line,
    generic: line.generic || '',
    brand: line.brand || '',
    line: line.line || '',
    unit: line.unit || 'Unidad',
    lot: line.lot || '',
    expiresAt: line.expiresAt ? dateOnly(line.expiresAt) : '',
    destination: line.destination === 'warehouse' ? 'warehouse' : 'dispatch',
    quantity,
    costPrice: toNumber(line.costPrice),
    unitCost: toNumber(line.unitCost),
    salePrice1: toNumber(line.salePrice1),
    salePrice2: toNumber(line.salePrice2),
    utilityPercent: toNumber(line.utilityPercent),
    amount: toNumber(line.amount),
    unitsPerBox,
    boxes: intakeBoxesFromQty(quantity, unitsPerBox),
    physicalRemaining: line.physicalRemaining,
  };
}

function remainingToSend(remaining: number | undefined, existence: number) {
  if (remaining == null || !Number.isFinite(remaining)) return undefined;
  if (Math.abs(remaining - existence) <= 0.009) return undefined;
  return remaining;
}

function intakeProductNames(intake: Intake) {
  const names: string[] = [];
  for (const line of intake.lines || []) {
    const name = line.productName?.trim();
    if (name && !names.includes(name)) names.push(name);
  }
  return names.join(', ');
}

function withIntakeBoxes(line: IntakeLine, boxes: number, unitsPerBox = line.unitsPerBox) {
  const perBoxChanged = unitsPerBox !== line.unitsPerBox;
  const priced = recalcIntakePricing(applyIntakeBoxes({ ...line, boxes, unitsPerBox }), perBoxChanged);
  const salePrice2 = perBoxChanged ? priced.salePrice1 : line.salePrice2;
  return withSalePrices({ ...priced, salePrice1: line.salePrice1 }, salePrice2);
}

function withIntakeQuantity(line: IntakeLine, quantity: number) {
  const priced = recalcIntakePricing(applyIntakeQuantity({ ...line, quantity }), false);
  return withSalePrices({ ...priced, salePrice1: line.salePrice1 }, line.salePrice2);
}

export default function IntakesPage() {
  const today = todayIso();
  const [documentNumber, setDocumentNumber] = useState('');
  const [purchaseOrder, setPurchaseOrder] = useState('');
  const [billedAs, setBilledAs] = useState('Entrada');
  const [supplier, setSupplier] = useState('');
  const [date, setDate] = useState(today);
  const [query, setQuery] = useState('');
  const { products, setProducts } = useProductSearch(query, { take: 20, skipEmpty: true });
  const { lookups, remember, addLookup } = useProductLookups();
  const [draft, setDraft] = useState<IntakeLine>(emptyLine());
  const [existingLots, setExistingLots] = useState<ProductLot[]>([]);
  const [bins, setBins] = useState({ dispatch: 0, warehouse: 0 });
  const [lines, setLines] = useState<IntakeLine[]>([]);
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchDoc, setSearchDoc] = useState('');
  const { message, error, setMessage, setError, toastSuccess, toastWarning, catchError } = useFeedback();
  const [saving, setSaving] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [addingBrand, setAddingBrand] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingLineIndex, setEditingLineIndex] = useState<number | null>(null);
  const total = useMemo(() => lines.reduce((sum, line) => sum + line.amount, 0), [lines]);
  const pagedIntakes = usePagedRows(intakes, searchDoc);

  function loadList(q = searchDoc) {
    api<Intake[]>(`/api/intakes${q ? `?q=${encodeURIComponent(q)}` : ''}`).then(setIntakes);
  }
  useEffect(() => { loadList(); }, []);

  async function addCatalog(kind: 'brands' | 'categories', name: string) {
    if (kind === 'brands') setAddingBrand(true);
    else setAddingCategory(true);
    try {
      await addLookup(kind, name);
    } catch (err) {
      catchError(err, kind === 'brands' ? 'No se pudo agregar la marca' : 'No se pudo agregar la categoría');
      throw err;
    } finally {
      setAddingBrand(false);
      setAddingCategory(false);
    }
  }

  function loadLineContext(productId?: number) {
    setExistingLots([]);
    setBins({ dispatch: 0, warehouse: 0 });
    if (!productId) return;
    void api<Product>(`/api/products/${productId}`)
      .then((product) => {
        const next = productBins(toNumber(product.stock), toNumber(product.dispatchQty), toNumber(product.warehouseQty));
        setBins({ dispatch: next.dispatch, warehouse: next.warehouse });
      })
      .catch(() => undefined);
    void api<ProductLots>(`/api/products/${productId}/lots`)
      .then((data) => setExistingLots(data.lots))
      .catch(() => setExistingLots([]));
  }

  function applyPickedProduct(product: Product) {
    const unitsPerBox = product.unitsPerBox || 1;
    const unitCost = toNumber(product.unitPrice) || unitCostFromBox(toNumber(product.costPrice), unitsPerBox);
    const sale1 = toNumber(product.salePrice1);
    const nextBins = productBins(toNumber(product.stock), toNumber(product.dispatchQty), toNumber(product.warehouseQty));
    setDraft({
      ...withSalePrices(recalcIntakePricing(applyIntakeBoxes({
        ...emptyLine(), productId: product.id, sku: product.sku, productName: product.name,
        generic: product.generic || '', brand: product.brand || '', line: product.line || '',
        unit: product.unit || 'Unidad', boxes: 1, costPrice: toNumber(product.costPrice), unitsPerBox,
        unitCost, salePrice1: sale1, salePrice2: sale1,
        utilityPercent: markupPercent(sale1, unitCost) || DEFAULT_UTILITY_PERCENT,
      }), false), sale1),
      physicalRemaining: nextBins.existence,
    });
    setBins({ dispatch: nextBins.dispatch, warehouse: nextBins.warehouse });
    if (!supplier && product.supplier) setSupplier(product.supplier);
    setQuery('');
    setProducts([]);
    setExistingLots([]);
    void api<ProductLots>(`/api/products/${product.id}/lots`)
      .then((data) => setExistingLots(data.lots))
      .catch(() => setExistingLots([]));
  }

  function pickProduct(product: Product) {
    applyPickedProduct(product);
    void api<Product>(`/api/products/${product.id}`)
      .then((fresh) => {
        const next = productBins(toNumber(fresh.stock), toNumber(fresh.dispatchQty), toNumber(fresh.warehouseQty));
        setBins({ dispatch: next.dispatch, warehouse: next.warehouse });
      })
      .catch(() => undefined);
  }

  async function saveNewProduct(draftProduct: NewProductDraft) {
    setCreatingProduct(true);
    try {
      const saved = await api<Product>('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          sku: draftProduct.sku,
          name: draftProduct.name,
          generic: draftProduct.generic || undefined,
          brand: draftProduct.brand.trim() || undefined,
          line: draftProduct.line.trim() || undefined,
          unit: draftProduct.unit,
          supplier: draftProduct.supplier || undefined,
          costPrice: draftProduct.costPrice,
          unitPrice: unitCostFromBox(draftProduct.costPrice, draftProduct.unitsPerBox || 1),
          salePrice1: draftProduct.salePrice1,
          salePrice2: draftProduct.salePrice2 || draftProduct.salePrice1,
          stock: draftProduct.dispatchQty,
          dispatchQty: draftProduct.dispatchQty,
          warehouseQty: draftProduct.warehouseQty,
          minQty: draftProduct.minQty,
          maxQty: draftProduct.maxQty,
          unitsPerBox: draftProduct.unitsPerBox,
        }),
      });
      remember('brands', draftProduct.brand);
      remember('categories', draftProduct.line);
      setShowProductModal(false);
      applyPickedProduct(saved);
    } catch (err) {
      catchError(err, 'No se pudo crear el producto');
    } finally {
      setCreatingProduct(false);
    }
  }

  function addLine(event: FormEvent) {
    event.preventDefault();
    if ((!draft.sku && !draft.productId) || !draft.productName || draft.quantity <= 0) return;
    const existence = existenceQty(bins.dispatch, bins.warehouse);
    const remaining = remainingToSend(draft.physicalRemaining, existence);
    if (remaining != null && remaining > existence + 0.009) {
      toastWarning(LABELS.intakeRemainingTooHigh);
      return;
    }
    remember('brands', draft.brand);
    remember('categories', draft.line);
    const nextLine = { ...recalcIntakePricing(draft, false), physicalRemaining: remaining };
    setLines((current) => (
      editingLineIndex == null
        ? [...current, nextLine]
        : current.map((line, index) => (index === editingLineIndex ? nextLine : line))
    ));
    setEditingLineIndex(null);
    setDraft(emptyLine());
    setExistingLots([]);
    setBins({ dispatch: 0, warehouse: 0 });
  }

  function beginEditLine(index: number) {
    const nextLines = editingLineIndex == null
      ? lines
      : lines.map((row, i) => (i === editingLineIndex ? recalcIntakePricing(draft, false) : row));
    const line = nextLines[index];
    if (!line) return;
    if (editingLineIndex != null) setLines(nextLines);
    setDraft(hydrateIntakeLine(line));
    setEditingLineIndex(index);
    loadLineContext(line.productId);
  }

  function removeLine(index: number) {
    setLines((current) => current.filter((_, i) => i !== index));
    if (editingLineIndex === index) {
      setDraft(emptyLine());
      setEditingLineIndex(null);
      setExistingLots([]);
      setBins({ dispatch: 0, warehouse: 0 });
    } else if (editingLineIndex != null && editingLineIndex > index) {
      setEditingLineIndex(editingLineIndex - 1);
    }
  }

  function clearHeader() {
    setEditingId(null); setDocumentNumber(''); setPurchaseOrder(''); setBilledAs('Entrada');
    setSupplier(''); setDate(today); setLines([]); setDraft(emptyLine()); setExistingLots([]); setBins({ dispatch: 0, warehouse: 0 });
    setEditingLineIndex(null); setError(''); setMessage('');
  }

  async function save() {
    const pendingExistence = existenceQty(bins.dispatch, bins.warehouse);
    const pendingLines = editingLineIndex == null || ((!draft.sku && !draft.productId) || !draft.productName || draft.quantity <= 0)
      ? lines
      : lines.map((line, index) => (
        index === editingLineIndex
          ? { ...recalcIntakePricing(draft, false), physicalRemaining: remainingToSend(draft.physicalRemaining, pendingExistence) }
          : line
      ));
    if (!pendingLines.length || !supplier) {
      toastWarning('Indique proveedor y al menos una línea');
      return;
    }
    if (draft.physicalRemaining != null && draft.physicalRemaining > pendingExistence + 0.009) {
      toastWarning(LABELS.intakeRemainingTooHigh);
      return;
    }
    setSaving(true); setError('');
    try {
      const payload = {
        documentNumber,
        purchaseOrder,
        billedAs,
        supplier,
        date,
        lines: pendingLines.map((line) => ({
          ...line,
          expiresAt: line.expiresAt || undefined,
          physicalRemaining: line.physicalRemaining,
        })),
      };
      const saved = editingId
        ? await api<Intake>(`/api/intakes/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) })
        : await api<Intake>('/api/intakes', { method: 'POST', body: JSON.stringify(payload) });
      toastSuccess(`Ingreso ${saved.id} guardado. Total C$ ${formatMoney(toNumber(saved.total))}`);
      clearHeader();
      loadList();
    } catch (err) {
      catchError(err, 'No se pudo guardar el ingreso');
    } finally {
      setSaving(false);
    }
  }

  async function openIntake(id: number) {
    const intake = await api<Intake>(`/api/intakes/${id}`);
    setEditingId(intake.id);
    setDocumentNumber(intake.documentNumber);
    setPurchaseOrder(intake.purchaseOrder || '');
    setBilledAs(intake.billedAs);
    setSupplier(intake.supplier);
    setDate(dateOnly(intake.date));
    setLines(intake.lines.map(hydrateIntakeLine));
    setDraft(emptyLine());
    setEditingLineIndex(null);
    setExistingLots([]);
    setBins({ dispatch: 0, warehouse: 0 });
    setMessage(`Editando ingreso ${intake.id}`);
  }

  const existence = existenceQty(bins.dispatch, bins.warehouse);
  const loose = splitPack(existence, draft.unitsPerBox || 1).loose;
  const previewLots = allocateLotRemainings(existingLots, draft.physicalRemaining ?? existence);
  const intakePreview = draft.productId
    ? applyIntakeWithRemaining(
      bins.dispatch,
      bins.warehouse,
      draft.quantity,
      draft.destination,
      draft.physicalRemaining,
      draft.unitsPerBox,
    )
    : null;

  return (
    <div className="grid gap-4">
      <Panel title="Ingreso y registros de productos">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Facturado">
            <select className={inputClass} value={billedAs} onChange={(e) => setBilledAs(e.target.value)}>
              <option>Entrada</option><option>{LABELS.cashSale}</option><option>Credito</option>
            </select>
          </Field>
          <Field label="Num factura"><input className={inputClass} value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} /></Field>
          <Field label="Orden compra"><input className={inputClass} value={purchaseOrder} onChange={(e) => setPurchaseOrder(e.target.value)} /></Field>
          <Field label={LABELS.invoiceDate}><DateInput value={date} onChange={setDate} /></Field>
          <Field label={LABELS.supplier}><input className={inputClass} value={supplier} onChange={(e) => setSupplier(e.target.value)} /></Field>
        </div>
        <div className="mt-4">
          <div className="flex flex-wrap items-end gap-2">
            <Field label={LABELS.searchField}>
              <input
                className={`${inputClass} !max-w-xl`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  if (products[0]) pickProduct(products[0]);
                }}
                placeholder="Escriba para buscar"
              />
            </Field>
            <SubmitButton type="button" variant="blue" className="px-3 py-1.5" onClick={() => setShowProductModal(true)}>
              {LABELS.newProduct}
            </SubmitButton>
          </div>
          {products.length > 0 ? (
            <TableWrap className="mt-2 max-h-56 overflow-y-auto">
              <table className={tableClass}>
                <TableHead columns={INTAKE_PRODUCT_COLUMNS} sticky />
                <tbody>
                  {products.map((product) => {
                    const bins = productBins(toNumber(product.stock), toNumber(product.dispatchQty), toNumber(product.warehouseQty));
                    return (
                    <tr key={product.id} className="cursor-pointer hover:bg-slate-50" onClick={() => pickProduct(product)}>
                      <td className={tdClass}>{product.sku}</td>
                      <td className={tdClass}>{product.name}</td>
                      <td className={tdClass}>{bins.existence}</td>
                      <td className={tdClass}>{bins.dispatch}</td>
                      <td className={tdClass}>{bins.warehouse}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
          ) : null}
        </div>
        <form className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={addLine}>
          <Field label={LABELS.sku}><input className={inputClass} value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} /></Field>
          <Field label="Descripción"><input className={inputClass} value={draft.productName} onChange={(e) => setDraft({ ...draft, productName: e.target.value })} /></Field>
          <CatalogPicker
            label={LABELS.brandLab}
            value={draft.brand}
            options={lookups.brands}
            addLabel={LABELS.addBrand}
            modalTitle={LABELS.newBrand}
            fieldLabel={LABELS.brandName}
            saving={addingBrand}
            onChange={(brand) => setDraft({ ...draft, brand })}
            onAdd={(name) => addCatalog('brands', name)}
          />
          <CatalogPicker
            label={LABELS.category}
            value={draft.line}
            options={lookups.categories}
            addLabel={LABELS.addCategory}
            modalTitle={LABELS.newCategory}
            fieldLabel={LABELS.categoryName}
            saving={addingCategory}
            onChange={(line) => setDraft({ ...draft, line })}
            onAdd={(name) => addCatalog('categories', name)}
          />
          <Field label={LABELS.boxesToEnter}><input className={inputClass} type="number" min={0} value={draft.boxes} onChange={(e) => setDraft(withIntakeBoxes(draft, Number(e.target.value)))} /></Field>
          <Field label={LABELS.unitsPerBox}><input className={inputClass} type="number" min={1} value={draft.unitsPerBox} onChange={(e) => setDraft(withIntakeBoxes(draft, draft.boxes, Number(e.target.value)))} /></Field>
          <Field label={LABELS.unitsToEnter}><input className={inputClass} type="number" min={0} step="any" value={draft.quantity} onChange={(e) => setDraft(withIntakeQuantity(draft, Number(e.target.value)))} /></Field>
          {draft.productId && existence > 0 ? (
            <>
              <Field label={LABELS.physicalRemaining}>
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  step="any"
                  value={draft.physicalRemaining ?? existence}
                  onChange={(e) => setDraft({ ...draft, physicalRemaining: Number(e.target.value) })}
                />
                <p className="mt-1 text-xs text-slate-500">
                  {LABELS.physicalRemainingHint}
                  {loose > 0 ? ` ${LABELS.looseUnits}: ${formatQty(loose)}.` : ''}
                </p>
              </Field>
              <div className="flex items-end">
                <SubmitButton type="button" variant="ghost" className="px-3 py-1.5" onClick={() => setDraft({ ...draft, physicalRemaining: 0 })}>
                  {LABELS.zeroStock}
                </SubmitButton>
              </div>
            </>
          ) : null}
          <Field label="Precio costo"><input className={inputClass} type="number" value={draft.costPrice} onChange={(e) => {
            const priced = recalcIntakePricing({ ...draft, costPrice: Number(e.target.value) });
            setDraft(withSalePrices({ ...priced, salePrice1: draft.salePrice1 }, draft.salePrice2));
          }} /></Field>
          <Field label="Precio unidad"><input className={inputClass} type="number" value={draft.unitCost} readOnly /></Field>
          <Field label={LABELS.previousPrice}><input className={`${inputClass} ${isHigherSalePrice(draft.salePrice1, draft.salePrice1, draft.salePrice2) ? higherPriceClass : ''}`} type="number" value={draft.salePrice1} onChange={(e) => setDraft(withSalePrices({ ...draft, salePrice1: Number(e.target.value) }, draft.salePrice2))} /></Field>
          <Field label={LABELS.newPrice}><input className={`${inputClass} ${isHigherSalePrice(draft.salePrice2, draft.salePrice1, draft.salePrice2) ? higherPriceClass : ''}`} type="number" value={draft.salePrice2} onChange={(e) => setDraft(withSalePrices(draft, Number(e.target.value)))} /></Field>
          <Field label={LABELS.lot}><input className={inputClass} value={draft.lot} onChange={(e) => setDraft({ ...draft, lot: e.target.value })} /></Field>
          <Field label={LABELS.expiresAt}><DateInput value={draft.expiresAt} onChange={(expiresAt) => setDraft({ ...draft, expiresAt })} /></Field>
          <Field label={LABELS.destination}><input className={inputClass} value={destinationLabel(draft.destination)} readOnly /></Field>
          <div className="flex items-end"><SubmitButton type="submit" variant="blue">{editingLineIndex == null ? LABELS.add : LABELS.updateLine}</SubmitButton></div>
        </form>
        {draft.productId && intakePreview?.ok ? (
          <p className="mt-2 text-sm text-slate-600">
            {intakePreview.wroteOff > 0
              ? `Ajuste: se sacan ${formatQty(intakePreview.wroteOff)} y quedan ${formatQty(intakePreview.remaining)}. Luego ingresan ${formatQty(draft.quantity)} → `
              : null}
            {binsPreview({ ...bins, existence })}
            {' → '}
            {binsPreview(intakePreview.bins)}
          </p>
        ) : draft.productId && intakePreview && !intakePreview.ok ? (
          <p className="mt-2 text-sm font-semibold text-amber-800">{LABELS.intakeRemainingTooHigh}</p>
        ) : null}
        {draft.destination === 'warehouse' ? (
          <p className="mt-1 text-sm font-semibold text-amber-800">{LABELS.priceChangeToWarehouse}</p>
        ) : null}
        <ExistingLotsPanel lots={previewLots} newExpiresAt={draft.expiresAt} />
        <h3 className="-mx-4 mt-4 rounded-none bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600 sm:mx-0 sm:rounded-xl">Detalle de ingreso</h3>
        <TableWrap className="mt-2">
          <table className={tableClass}>
            <TableHead columns={INTAKE_LINE_COLUMNS} />
            <tbody>
              {lines.map((line, index) => (
                <tr
                  key={`${line.sku}-${line.productId || index}-${index}`}
                  className={`cursor-pointer hover:bg-slate-50 ${editingLineIndex === index ? 'bg-violet-50' : ''}`}
                  onClick={() => beginEditLine(index)}
                >
                  <td className={tdClass}>{line.sku}</td>
                  <td className={tdClass}>{line.productName}</td>
                  <td className={tdClass}>{line.quantity}</td>
                  <td className={tdClass}>{line.lot}</td>
                  <td className={tdClass}>{line.expiresAt ? formatReportDate(line.expiresAt) : ''}</td>
                  <td className={tdClass}>{line.costPrice.toFixed(2)}</td>
                  <td className={tdClass}>{line.unitCost.toFixed(2)}</td>
                  <td className={tdClass}>{line.salePrice1.toFixed(2)}</td>
                  <td className={tdClass}>{line.salePrice2.toFixed(2)}</td>
                  <td className={tdClass}>{line.amount.toFixed(2)}</td>
                  <td className={tdClass}>{destinationLabel(line.destination)}</td>
                  <td className={tdClass}>
                    <SubmitButton type="button" variant="danger" className="px-3 py-1.5" onClick={(event) => { event.stopPropagation(); removeLine(index); }}>
                      {LABELS.remove}
                    </SubmitButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>Total ingreso C$ <b>{formatMoney(total)}</b></div>
          <div className="flex gap-2">
            <SubmitButton type="button" variant="ghost" onClick={clearHeader}>{LABELS.clear}</SubmitButton>
            <SubmitButton type="button" loading={saving} onClick={save}>{editingId ? LABELS.update : LABELS.save}</SubmitButton>
          </div>
        </div>
        <StatusMessage error={error} message={message} />
      </Panel>
      <Panel title="Consulta y edición de ingresos" tone="orange">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Nº factura / producto / id"><input className={inputClass} value={searchDoc} onChange={(e) => setSearchDoc(e.target.value)} /></Field>
          <SubmitButton type="button" variant="blue" onClick={() => loadList(searchDoc)}>{LABELS.search}</SubmitButton>
        </div>
        <TableWrap className="mt-3">
          <table className={tableClass}>
            <TableHead columns={INTAKE_LIST_COLUMNS} />
            <tbody>
              {pagedIntakes.rows.map((intake) => (
                <tr key={intake.id} className="cursor-pointer" onClick={() => openIntake(intake.id)}>
                  <td className={tdClass}>{intake.id}</td>
                  <td className={tdClass}>{intake.documentNumber}</td>
                  <td className={tdClass}>{intake.supplier}</td>
                  <td className={tdClass}>{intakeProductNames(intake)}</td>
                  <td className={tdClass}>{formatReportDate(intake.date)}</td>
                  <td className={tdClass}>{formatMoney(toNumber(intake.total))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <Pagination page={pagedIntakes.page} pageCount={pagedIntakes.pageCount} onPage={pagedIntakes.setPage} />
      </Panel>
      <ProductCreateModal
        open={showProductModal}
        lookups={lookups}
        seed={{ name: query, supplier }}
        saving={creatingProduct}
        addingBrand={addingBrand}
        addingCategory={addingCategory}
        onClose={() => setShowProductModal(false)}
        onSave={saveNewProduct}
        onAddBrand={(name) => addCatalog('brands', name)}
        onAddCategory={(name) => addCatalog('categories', name)}
      />
    </div>
  );
}
