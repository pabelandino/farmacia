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
import { CLIENT_LIST_COLUMNS } from '../constants/tables';
import { usePagedRows } from '../hooks/usePagedRows';
import { Client } from '../types/catalog';

const empty = { code: '', name: '', address: '', phone: '', cell: '', nationalId: '' };

export default function ClientsPage() {
  const [rows, setRows] = useState<Client[]>([]);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function load(q = query) {
    api<Client[]>(`/api/clients${q ? `?q=${encodeURIComponent(q)}` : ''}`).then(setRows);
  }

  useEffect(() => { load(); }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingId) await api(`/api/clients/${editingId}`, { method: 'PUT', body: JSON.stringify(form) });
      else await api('/api/clients', { method: 'POST', body: JSON.stringify(form) });
      setForm(empty);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  const paged = usePagedRows(rows, query);

  return (
    <Panel title={LABELS.clients}>
      <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={save}>
        <Field label={LABELS.sku}><input className={inputClass} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
        <Field label={LABELS.name}><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
        <Field label={LABELS.nationalId}><input className={inputClass} value={form.nationalId} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} /></Field>
        <Field label={LABELS.phone}><input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label={LABELS.address}><input className={inputClass} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
        <div className="flex items-end"><SubmitButton loading={saving}>{editingId ? LABELS.update : LABELS.add}</SubmitButton></div>
      </form>
      <StatusMessage error={error} />
      <div className="mt-4"><Field label={LABELS.quickSearch}><input className={inputClass} value={query} onChange={(e) => { setQuery(e.target.value); load(e.target.value); }} /></Field></div>
      <TableWrap className="mt-3">
        <table className={tableClass}>
          <TableHead columns={CLIENT_LIST_COLUMNS} />
          <tbody>
            {paged.rows.map((row) => (
              <tr key={row.id} className="cursor-pointer" onClick={() => { setEditingId(row.id); setForm({ code: row.code || '', name: row.name, address: row.address || '', phone: row.phone || '', cell: row.cell || '', nationalId: row.nationalId || '' }); }}>
                <td className={tdClass}>{row.code}</td>
                <td className={tdClass}>{row.name}</td>
                <td className={tdClass}>{row.address}</td>
                <td className={tdClass}>{row.phone}</td>
                <td className={tdClass}>{row.nationalId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
      <Pagination page={paged.page} pageCount={paged.pageCount} onPage={paged.setPage} />
    </Panel>
  );
}
