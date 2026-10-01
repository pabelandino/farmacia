import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';
import { DateInput } from '../components/DateInput';
import { Field } from '../components/Field';
import { NumericInput } from '../components/NumericInput';
import { Pagination } from '../components/Pagination';
import { Panel } from '../components/Panel';
import { StatusMessage } from '../components/StatusMessage';
import { SubmitButton } from '../components/SubmitButton';
import { TableHead } from '../components/TableHead';
import { TableWrap } from '../components/TableWrap';
import { inputClass, tableClass, tdClass } from '../components/formClasses';
import { LABELS } from '../constants/labels';
import { TRANSFER_LIST_COLUMNS } from '../constants/tables';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useFeedback } from '../hooks/useFeedback';
import { usePagedRows } from '../hooks/usePagedRows';
import { formatReportDate, todayIso } from '../utils/dates';

type TransferRow = {
  id: number;
  sku: string | null;
  productName: string | null;
  sender: string | null;
  origin: string | null;
  destination: string | null;
  quantity: number;
  receiver: string | null;
  reason: string | null;
  date: string | null;
};

const empty = {
  sku: '',
  productName: '',
  sender: '',
  origin: '',
  destination: '',
  quantity: 0,
  receiver: '',
  reason: '',
  date: todayIso(),
};

export default function TransfersPage() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query);
  const [rows, setRows] = useState<TransferRow[]>([]);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const { message, error, setMessage, catchError } = useFeedback();

  function load(q = query) {
    api<TransferRow[]>(`/api/transfers${q ? `?q=${encodeURIComponent(q)}` : ''}`).then(setRows);
  }

  useEffect(() => { load(debouncedQuery); }, [debouncedQuery]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await api('/api/transfers', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          sku: form.sku || undefined,
          productName: form.productName || undefined,
          sender: form.sender || undefined,
          origin: form.origin || undefined,
          destination: form.destination || undefined,
          receiver: form.receiver || undefined,
          reason: form.reason || undefined,
        }),
      });
      setMessage(LABELS.transferSaved);
      setForm({ ...empty, date: todayIso() });
      load(query);
    } catch (err) {
      catchError(err, LABELS.transferSaveFailed);
    } finally {
      setSaving(false);
    }
  }

  const paged = usePagedRows(rows, debouncedQuery);

  return (
    <Panel title={LABELS.transfers}>
      <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={save}>
        <Field label={LABELS.date}><DateInput value={form.date} onChange={(date) => setForm({ ...form, date })} /></Field>
        <Field label={LABELS.sku}><input className={inputClass} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></Field>
        <Field label={LABELS.product}><input className={inputClass} value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} /></Field>
        <Field label={LABELS.origin}><input className={inputClass} value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} /></Field>
        <Field label={LABELS.destination}><input className={inputClass} value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} /></Field>
        <Field label={LABELS.qty}><NumericInput value={form.quantity} min={0} onCommit={(quantity) => setForm({ ...form, quantity })} /></Field>
        <Field label={LABELS.sender}><input className={inputClass} value={form.sender} onChange={(e) => setForm({ ...form, sender: e.target.value })} /></Field>
        <Field label={LABELS.receiver}><input className={inputClass} value={form.receiver} onChange={(e) => setForm({ ...form, receiver: e.target.value })} /></Field>
        <Field label={LABELS.writeOffReason}><input className={inputClass} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
        <div className="flex items-end"><SubmitButton loading={saving}>{LABELS.add}</SubmitButton></div>
      </form>
      <StatusMessage error={error} message={message} />
      <div className="mt-4">
        <Field label={LABELS.quickSearch}>
          <input className={inputClass} value={query} onChange={(e) => setQuery(e.target.value)} />
        </Field>
      </div>
      <TableWrap className="mt-3">
        <table className={tableClass}>
          <TableHead columns={TRANSFER_LIST_COLUMNS} />
          <tbody>
            {paged.rows.map((row) => (
              <tr key={row.id}>
                <td className={tdClass}>{formatReportDate(row.date || '')}</td>
                <td className={tdClass}>{row.sku}</td>
                <td className={tdClass}>{row.productName}</td>
                <td className={tdClass}>{row.origin}</td>
                <td className={tdClass}>{row.destination}</td>
                <td className={tdClass}>{row.quantity}</td>
                <td className={tdClass}>{row.sender}</td>
                <td className={tdClass}>{row.receiver}</td>
                <td className={tdClass}>{row.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
      <Pagination page={paged.page} pageCount={paged.pageCount} onPage={paged.setPage} />
    </Panel>
  );
}
