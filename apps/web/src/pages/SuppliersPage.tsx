import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';
import { Field } from '../components/Field';
import { Pagination } from '../components/Pagination';
import { Panel } from '../components/Panel';
import { StatusMessage } from '../components/StatusMessage';
import { SubmitButton } from '../components/SubmitButton';
import { TableHead } from '../components/TableHead';
import { TableWrap } from '../components/TableWrap';
import { inputClass, tableClass, tdClass } from '../components/formClasses';
import { LABELS } from '../constants/labels';
import { SUPPLIER_LIST_COLUMNS } from '../constants/tables';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useFeedback } from '../hooks/useFeedback';
import { usePagedRows } from '../hooks/usePagedRows';

type SupplierRow = {
  id: number;
  name: string;
  contact: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  line: string | null;
};

const empty = { name: '', contact: '', address: '', phone: '', email: '', line: '' };

export default function SuppliersPage() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query);
  const [rows, setRows] = useState<SupplierRow[]>([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const { message, error, setMessage, catchError } = useFeedback();

  function load(q = query) {
    api<SupplierRow[]>(`/api/suppliers${q ? `?q=${encodeURIComponent(q)}` : ''}`).then(setRows);
  }

  useEffect(() => { load(debouncedQuery); }, [debouncedQuery]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        contact: form.contact || undefined,
        address: form.address || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        line: form.line || undefined,
      };
      if (editingId) await api(`/api/suppliers/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await api('/api/suppliers', { method: 'POST', body: JSON.stringify(payload) });
      setMessage(LABELS.supplierSaved);
      setEditingId(null);
      setForm(empty);
      load(query);
    } catch (err) {
      catchError(err, LABELS.supplierSaveFailed);
    } finally {
      setSaving(false);
    }
  }

  const paged = usePagedRows(rows, debouncedQuery);

  return (
    <Panel title={LABELS.suppliers}>
      <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={save}>
        <Field label={LABELS.name}><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
        <Field label={LABELS.contact}><input className={inputClass} value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></Field>
        <Field label={LABELS.phone}><input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label={LABELS.email}><input className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label={LABELS.address}><input className={inputClass} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
        <Field label={LABELS.category}><input className={inputClass} value={form.line} onChange={(e) => setForm({ ...form, line: e.target.value })} /></Field>
        <div className="flex items-end"><SubmitButton loading={saving}>{editingId ? LABELS.update : LABELS.add}</SubmitButton></div>
      </form>
      <StatusMessage error={error} message={message} />
      <div className="mt-4">
        <Field label={LABELS.quickSearch}>
          <input className={inputClass} value={query} onChange={(e) => setQuery(e.target.value)} />
        </Field>
      </div>
      <TableWrap className="mt-3">
        <table className={tableClass}>
          <TableHead columns={SUPPLIER_LIST_COLUMNS} />
          <tbody>
            {paged.rows.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer"
                onClick={() => {
                  setEditingId(row.id);
                  setForm({
                    name: row.name,
                    contact: row.contact || '',
                    address: row.address || '',
                    phone: row.phone || '',
                    email: row.email || '',
                    line: row.line || '',
                  });
                }}
              >
                <td className={tdClass}>{row.name}</td>
                <td className={tdClass}>{row.contact}</td>
                <td className={tdClass}>{row.phone}</td>
                <td className={tdClass}>{row.address}</td>
                <td className={tdClass}>{row.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
      <Pagination page={paged.page} pageCount={paged.pageCount} onPage={paged.setPage} />
    </Panel>
  );
}
