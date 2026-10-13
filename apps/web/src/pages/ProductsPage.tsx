import { FormEvent, useEffect, useState } from 'react';
import { hasPermission, isHigherSalePrice, unitCostFromBox } from '@farmaplus/domain';
import { api } from '../api/client';
import { getUser } from '../api/session';
import { Field } from '../components/Field';
import { emptyProductDraft, nearestUtilityPercent, ProductDraft, ProductFormFields } from '../components/ProductFormFields';
import { Pagination } from '../components/Pagination';
import { Panel } from '../components/Panel';
import { StatusMessage } from '../components/StatusMessage';
import { SubmitButton } from '../components/SubmitButton';
import { TableHead } from '../components/TableHead';
import { TableWrap } from '../components/TableWrap';
import { higherPriceClass, inputClass, tableClass, tdClass } from '../components/formClasses';
import { LABELS } from '../constants/labels';
import { PRODUCT_LIST_COLUMNS } from '../constants/tables';
import { PAGE_SIZE } from '../constants/pagination';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useFeedback } from '../hooks/useFeedback';
import { useProductLookups } from '../hooks/useProductLookups';
import { Product } from '../types/catalog';
import { formatMoney, formatQty } from '../utils/numbers';

function fromProduct(product: Product): ProductDraft {
  const costPrice = Number(product.costPrice);
  const unitsPerBox = product.unitsPerBox || 1;
  const salePrice1 = Number(product.salePrice1);
  return emptyProductDraft({
    sku: product.sku,
    name: product.name,
    generic: product.generic || '',
    brand: product.brand || '',
    line: product.line || '',
    unit: product.unit || 'Unidad',
    costPrice,
    salePrice1,
    salePrice2: Number(product.salePrice2),
    dispatchQty: Number(product.dispatchQty ?? product.stock),
    warehouseQty: Number(product.warehouseQty),
    supplier: product.supplier || '',
    minQty: product.minQty ?? 0,
    maxQty: product.maxQty ?? 0,
    unitsPerBox,
    utilityPercent: nearestUtilityPercent(salePrice1, unitCostFromBox(costPrice, unitsPerBox)),
  });
}

export default function ProductsPage() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query);
  const [rows, setRows] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<ProductDraft>(emptyProductDraft);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [addingBrand, setAddingBrand] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const { message, error, setMessage, catchError } = useFeedback();
  const { lookups, addLookup } = useProductLookups();
  const [saving, setSaving] = useState(false);
  const canEdit = hasPermission(getUser(), 'editProducts');

  function load(q = query, nextPage = page) {
    const skip = (nextPage - 1) * PAGE_SIZE;
    const search = q ? `&q=${encodeURIComponent(q)}` : '';
    api<{ items: Product[]; total: number }>(`/api/products?take=${PAGE_SIZE}&skip=${skip}${search}`).then((data) => {
      setRows(data.items);
      setTotal(data.total);
    });
  }

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  useEffect(() => {
    load(debouncedQuery, page);
  }, [debouncedQuery, page]);

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

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form.sku.trim() || !form.name.trim()) return;
    setSaving(true);
    try {
      const unitCost = unitCostFromBox(form.costPrice, form.unitsPerBox || 1);
      const payload = {
        sku: form.sku,
        name: form.name,
        generic: form.generic || undefined,
        brand: form.brand.trim() || undefined,
        line: form.line.trim() || undefined,
        unit: form.unit,
        supplier: form.supplier || undefined,
        costPrice: form.costPrice,
        unitPrice: unitCost,
        salePrice1: form.salePrice1,
        salePrice2: form.salePrice2,
        stock: form.dispatchQty,
        dispatchQty: form.dispatchQty,
        warehouseQty: form.warehouseQty,
        minQty: form.minQty,
        maxQty: form.maxQty,
        unitsPerBox: form.unitsPerBox,
      };
      if (editingId) await api(`/api/products/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await api('/api/products', { method: 'POST', body: JSON.stringify(payload) });
      setMessage('Producto guardado');
      setEditingId(null);
      setForm(emptyProductDraft());
      load(debouncedQuery, 1);
      setPage(1);
    } catch (err) {
      catchError(err, 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel title="Productos e inventario">
      {canEdit ? (
      <form className="grid gap-3" onSubmit={save}>
        <ProductFormFields
          draft={form}
          lookups={lookups}
          addingBrand={addingBrand}
          addingCategory={addingCategory}
          onChange={setForm}
          onAddBrand={(name) => addCatalog('brands', name)}
          onAddCategory={(name) => addCatalog('categories', name)}
        />
        <div className="flex items-end gap-2">
          <SubmitButton loading={saving}>{editingId ? LABELS.update : LABELS.create}</SubmitButton>
          <SubmitButton type="button" variant="ghost" onClick={() => { setEditingId(null); setForm(emptyProductDraft()); }}>{LABELS.clear}</SubmitButton>
        </div>
      </form>
      ) : null}
      <StatusMessage error={error} message={message} />
      <div className="mt-4"><Field label={LABELS.searchField}><input className={inputClass} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Código / descripción / proveedor" /></Field></div>
      <TableWrap className="mt-3 max-h-[28rem] overflow-y-auto">
        <table className={tableClass}>
          <TableHead columns={PRODUCT_LIST_COLUMNS} />
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={`${Number(row.stock) <= (row.minQty ?? 0) ? 'bg-amber-50' : ''} ${canEdit ? 'cursor-pointer' : ''}`}
                onClick={() => { if (!canEdit) return; setEditingId(row.id); setForm(fromProduct(row)); }}
              >
                <td className={tdClass}>{row.sku}</td>
                <td className={tdClass}>{row.name}</td>
                <td className={tdClass}>{row.generic}</td>
                <td className={tdClass}>{row.brand}</td>
                <td className={tdClass}>{row.line}</td>
                <td className={`${tdClass} ${isHigherSalePrice(Number(row.salePrice1), Number(row.salePrice1), Number(row.salePrice2)) ? higherPriceClass : ''}`}>{formatMoney(Number(row.salePrice1))}</td>
                <td className={`${tdClass} ${isHigherSalePrice(Number(row.salePrice2), Number(row.salePrice1), Number(row.salePrice2)) ? higherPriceClass : ''}`}>{formatMoney(Number(row.salePrice2))}</td>
                <td className={tdClass}>{formatQty(Number(row.stock))}</td>
                <td className={tdClass}>{row.minQty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
      <Pagination page={page} pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))} onPage={setPage} />
    </Panel>
  );
}
