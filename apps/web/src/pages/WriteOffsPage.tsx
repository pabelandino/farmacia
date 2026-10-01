import { useEffect, useMemo, useState } from 'react';
import { existenceQty, splitPack, writeOffFullBoxes } from '@farmaplus/domain';
import { api } from '../api/client';
import { ConfirmModal } from '../components/ConfirmModal';
import { DateInput } from '../components/DateInput';
import { Field } from '../components/Field';
import { NumericInput } from '../components/NumericInput';
import { Pagination } from '../components/Pagination';
import { Panel } from '../components/Panel';
import { ProductPickerTable } from '../components/ProductPickerTable';
import { StatusMessage } from '../components/StatusMessage';
import { SubmitButton } from '../components/SubmitButton';
import { TableHead } from '../components/TableHead';
import { TableWrap } from '../components/TableWrap';
import { inputClass, tableClass, tdClass } from '../components/formClasses';
import { LABELS } from '../constants/labels';
import { RECENT_SALES_PAGE_SIZE } from '../constants/pagination';
import { WRITE_OFF_COLUMNS } from '../constants/tables';
import { useFeedback } from '../hooks/useFeedback';
import { useProductSearch } from '../hooks/useProductSearch';
import { Product } from '../types/catalog';
import { WriteOffsPageData } from '../types/writeOffs';
import { formatReportDate } from '../utils/dates';
import { formatQty, toNumber } from '../utils/numbers';

export default function WriteOffsPage() {
  const [query, setQuery] = useState('');
  const { products, reload, applySale } = useProductSearch(query, { take: 20, skipEmpty: true });
  const [selected, setSelected] = useState<Product | null>(null);
  const [boxes, setBoxes] = useState(0);
  const [reason, setReason] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<WriteOffsPageData | null>(null);
  const { message, error, toastSuccess, toastWarning, catchError, clearFeedback } = useFeedback();

  const selectedBins = useMemo(() => {
    if (!selected) return null;
    const dispatch = toNumber(selected.dispatchQty);
    const warehouse = toNumber(selected.warehouseQty);
    const existence = existenceQty(toNumber(selected.stock), warehouse);
    const perBox = selected.unitsPerBox || 1;
    return { dispatch, warehouse, existence, perBox, pack: splitPack(existence, perBox) };
  }, [selected]);

  const preview = selectedBins
    ? writeOffFullBoxes(selectedBins.dispatch, selectedBins.warehouse, selectedBins.perBox, boxes)
    : null;

  useEffect(() => {
    void api<WriteOffsPageData>(`/api/write-offs?page=${page}&pageSize=${RECENT_SALES_PAGE_SIZE}`).then(setData);
  }, [page]);

  function pickProduct(product: Product) {
    setSelected(product);
    setBoxes(0);
    clearFeedback();
  }

  function requestSave() {
    if (!selected || !selectedBins) return;
    if (!preview || !preview.ok) {
      toastWarning(preview?.error === 'tooManyBoxes' ? LABELS.writeOffTooMany : LABELS.writeOffNoBoxes);
      return;
    }
    setConfirmOpen(true);
  }

  async function confirmSave() {
    if (!selected || !preview || !preview.ok) return;
    setSaving(true);
    try {
      await api('/api/write-offs', {
        method: 'POST',
        body: JSON.stringify({
          productId: selected.id,
          boxes: preview.boxes,
          reason,
          date,
        }),
      });
      applySale([{ productId: selected.id, quantity: preview.units }]);
      setSelected((current) => current && current.id === selected.id
        ? {
          ...current,
          stock: preview.dispatchQty,
          dispatchQty: preview.dispatchQty,
          warehouseQty: preview.warehouseQty,
        }
        : current);
      setBoxes(0);
      setConfirmOpen(false);
      toastSuccess(LABELS.writeOffDone);
      const next = await api<WriteOffsPageData>(`/api/write-offs?page=1&pageSize=${RECENT_SALES_PAGE_SIZE}`);
      setPage(1);
      setData(next);
      await reload();
    } catch (err) {
      catchError(err, LABELS.writeOffFailed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4">
      <Panel title={LABELS.writeOffsTitle}>
        <p className="mb-4 text-sm text-slate-500">{LABELS.writeOffsHint}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={LABELS.searchProduct}>
            <input
              className={inputClass}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Código, nombre o marca"
            />
          </Field>
          <Field label={LABELS.date}>
            <DateInput value={date} onChange={setDate} />
          </Field>
          <Field label={LABELS.writeOffReason}>
            <input className={inputClass} value={reason} onChange={(event) => setReason(event.target.value)} />
          </Field>
        </div>
        <ProductPickerTable
          className="mt-3 max-h-48 overflow-y-auto"
          products={products}
          limit={20}
          addLabel={LABELS.select}
          selectedIds={selected ? [selected.id] : undefined}
          onAdd={pickProduct}
        />
        {selected && selectedBins ? (
          <div className="mt-4 grid gap-3 rounded-[24px] bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-xs font-semibold text-slate-500">{LABELS.product}</div>
              <div className="text-sm font-semibold text-slate-900">{selected.name}</div>
              <div className="text-xs text-slate-500">{selected.sku}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500">{LABELS.existence}</div>
              <div className="text-sm font-semibold">{formatQty(selectedBins.existence)}</div>
              <div className="text-xs text-slate-500">
                {LABELS.dispatch} {formatQty(selectedBins.dispatch)} · {LABELS.warehouse} {formatQty(selectedBins.warehouse)}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500">{LABELS.fullBoxes}</div>
              <div className="text-sm font-semibold">{selectedBins.pack.boxes} × {selectedBins.perBox}</div>
              <div className="text-xs text-slate-500">{LABELS.looseUnits}: {formatQty(selectedBins.pack.loose)}</div>
            </div>
            <Field label={LABELS.writeOffBoxes}>
              <NumericInput min={0} value={boxes} onCommit={(value) => setBoxes(Math.floor(value))} />
            </Field>
            {preview?.ok ? (
              <p className="text-sm text-slate-600 sm:col-span-2 lg:col-span-4">
                Quedarán {preview.nextPack.boxes} cajas y {formatQty(preview.nextPack.loose)} sueltas
                ({LABELS.dispatch} {formatQty(preview.dispatchQty)} · {LABELS.warehouse} {formatQty(preview.warehouseQty)}).
              </p>
            ) : null}
            <div className="sm:col-span-2 lg:col-span-4">
              <SubmitButton type="button" variant="danger" disabled={!preview?.ok} onClick={requestSave}>
                {LABELS.writeOffAction}
              </SubmitButton>
            </div>
          </div>
        ) : null}
        <StatusMessage error={error} message={message} />
      </Panel>
      <Panel title={LABELS.recentWriteOffs} tone="orange">
        <TableWrap>
          <table className={tableClass}>
            <TableHead columns={WRITE_OFF_COLUMNS} />
            <tbody>
              {(data?.rows || []).map((row) => (
                <tr key={row.id}>
                  <td className={tdClass}>{formatReportDate(row.date)}</td>
                  <td className={tdClass}>{row.sku}</td>
                  <td className={tdClass}>{row.name}</td>
                  <td className={tdClass}>{row.boxes || '—'}</td>
                  <td className={tdClass}>{formatQty(row.quantity)}</td>
                  <td className={tdClass}>{row.reason}</td>
                  <td className={tdClass}>{row.userName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <Pagination page={data?.page ?? 1} pageCount={data?.pageCount ?? 1} onPage={setPage} />
      </Panel>
      <ConfirmModal
        open={confirmOpen}
        title={selected ? `${LABELS.writeOffConfirmTitle}: ${selected.name}` : LABELS.writeOffConfirmTitle}
        lead={LABELS.writeOffConfirmLead}
        description={
          preview?.ok
            ? `${LABELS.writeOffConfirm} Se descuentan ${preview.boxes} cajas (${formatQty(preview.units)} unidades). Quedan ${formatQty(preview.nextPack.loose)} unidades sueltas.`
            : LABELS.writeOffConfirm
        }
        confirmLabel={LABELS.writeOffConfirmAction}
        tone="danger"
        loading={saving}
        onConfirm={confirmSave}
        onClose={() => { if (!saving) setConfirmOpen(false); }}
      />
    </div>
  );
}
