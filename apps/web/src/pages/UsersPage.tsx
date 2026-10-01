import { FormEvent, useEffect, useState } from 'react';
import { CASHIER_DEFAULTS, PermissionMap, PERMISSION_KEYS } from '@farmaplus/domain';
import { api } from '../api/client';
import { Role, getUser } from '../api/session';
import { ConfirmModal } from '../components/ConfirmModal';
import { Field } from '../components/Field';
import { Pagination } from '../components/Pagination';
import { Panel } from '../components/Panel';
import { StatusBadge } from '../components/StatusBadge';
import { StatusMessage } from '../components/StatusMessage';
import { SubmitButton } from '../components/SubmitButton';
import { TableHead } from '../components/TableHead';
import { TableWrap } from '../components/TableWrap';
import { inputClass, selectClass, tableClass, tdClass } from '../components/formClasses';
import { LABELS } from '../constants/labels';
import { PERMISSION_FIELDS } from '../constants/permissions';
import { USER_LIST_COLUMNS } from '../constants/tables';
import { useFeedback } from '../hooks/useFeedback';
import { usePagedRows } from '../hooks/usePagedRows';

type ManagedUser = {
  id: number;
  username: string;
  code: string;
  role: Role;
  active: boolean;
  permissions: PermissionMap;
};

const emptyForm = {
  username: '',
  code: '',
  password: '',
  passwordConfirm: '',
  role: 'CASHIER' as Role,
  permissions: { ...CASHIER_DEFAULTS },
};

export default function UsersPage() {
  const currentUser = getUser();
  const isAdmin = currentUser?.role === 'ADMIN';
  const [rows, setRows] = useState<ManagedUser[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDisable, setPendingDisable] = useState<ManagedUser | null>(null);
  const { message, error, setMessage, catchError } = useFeedback();

  function load() {
    api<ManagedUser[]>('/api/users').then(setRows);
  }

  useEffect(() => { load(); }, []);

  function pickUser(row: ManagedUser) {
    setEditingId(row.id);
    setForm({
      username: row.username,
      code: row.code || '',
      password: '',
      passwordConfirm: '',
      role: row.role,
      permissions: { ...CASHIER_DEFAULTS, ...row.permissions },
    });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      if (form.password !== form.passwordConfirm) throw new Error(LABELS.passwordsMismatch);
      const payload = {
        username: form.username,
        code: form.code || undefined,
        role: form.role,
        permissions: form.role === 'ADMIN' ? undefined : form.permissions,
        ...(form.password ? { password: form.password } : {}),
      };
      if (editingId) await api(`/api/users/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
      else {
        if (!form.password) throw new Error('La contraseña es obligatoria');
        await api('/api/users', { method: 'POST', body: JSON.stringify(payload) });
      }
      setMessage(LABELS.userSaved);
      setEditingId(null);
      setForm(emptyForm);
      load();
    } catch (err) {
      catchError(err, LABELS.userSaveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function setActive(row: ManagedUser, active: boolean) {
    try {
      await api(`/api/users/${row.id}`, { method: 'PUT', body: JSON.stringify({ active }) });
      setMessage(active ? LABELS.userEnabled : LABELS.userDisabled);
      setPendingDisable(null);
      load();
    } catch (err) {
      catchError(err, LABELS.userDisableFailed);
    }
  }

  const paged = usePagedRows(rows);

  return (
    <Panel title={LABELS.users}>
      <p className="mb-3 text-sm text-slate-500">{LABELS.usersHint}</p>
      <form className="grid gap-3" onSubmit={save}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={LABELS.user}>
            <input className={inputClass} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          </Field>
          <Field label={LABELS.sku}>
            <input className={inputClass} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </Field>
          <Field label={LABELS.role}>
            <select
              className={selectClass}
              value={form.role}
              onChange={(e) => {
                const role = e.target.value as Role;
                setForm({
                  ...form,
                  role,
                  permissions: role === 'CASHIER' && form.role === 'ADMIN' ? { ...CASHIER_DEFAULTS } : form.permissions,
                });
              }}
            >
              <option value="CASHIER">{LABELS.cashierRole}</option>
              <option value="ADMIN">{LABELS.adminRole}</option>
            </select>
          </Field>
        </div>
        {isAdmin ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={editingId ? LABELS.newPassword : LABELS.password}>
              <input
                className={inputClass}
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editingId ? LABELS.newPassword : LABELS.passwordPlaceholder}
                autoComplete="new-password"
                required={!editingId}
              />
            </Field>
            <Field label={LABELS.confirmPassword}>
              <input
                className={inputClass}
                type="password"
                value={form.passwordConfirm}
                onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })}
                placeholder={LABELS.confirmPassword}
                autoComplete="new-password"
                required={!editingId || Boolean(form.password)}
              />
            </Field>
            {editingId ? <p className="text-sm text-slate-500 sm:col-span-2">{LABELS.passwordChangeHint}</p> : null}
          </div>
        ) : null}
        {form.role === 'ADMIN' ? (
          <p className="text-sm text-slate-500">{LABELS.adminFullAccess}</p>
        ) : (
          <fieldset className="grid gap-2">
            <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">{LABELS.permissions}</legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {PERMISSION_FIELDS.map((item) => (
                <label key={item.key} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100">
                  <input
                    type="checkbox"
                    checked={form.permissions[item.key]}
                    onChange={(e) => setForm({
                      ...form,
                      permissions: { ...form.permissions, [item.key]: e.target.checked },
                    })}
                  />
                  {LABELS[item.label]}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <div className="flex items-end gap-2">
          <SubmitButton loading={saving}>{editingId ? LABELS.update : LABELS.create}</SubmitButton>
          <SubmitButton type="button" variant="ghost" onClick={() => { setEditingId(null); setForm(emptyForm); }}>{LABELS.clear}</SubmitButton>
        </div>
      </form>
      <StatusMessage error={error} message={message} />
      <TableWrap className="mt-4">
        <table className={tableClass}>
          <TableHead columns={USER_LIST_COLUMNS} />
          <tbody>
            {paged.rows.map((row) => (
              <tr
                key={row.id}
                className={`cursor-pointer ${row.active === false ? 'opacity-60' : ''}`}
                onClick={() => pickUser(row)}
              >
                <td className={tdClass}>{row.username}</td>
                <td className={tdClass}>{row.code}</td>
                <td className={tdClass}>
                  <StatusBadge tone={row.role === 'ADMIN' ? 'active' : 'warning'}>
                    {row.role === 'ADMIN' ? LABELS.adminRole : LABELS.cashierRole}
                  </StatusBadge>
                </td>
                <td className={tdClass}>
                  {row.role === 'ADMIN'
                    ? LABELS.adminFullAccess
                    : PERMISSION_KEYS.filter((key) => row.permissions[key]).length}
                </td>
                <td className={tdClass}>
                  <StatusBadge tone={row.active === false ? 'inactive' : 'active'}>
                    {row.active === false ? LABELS.disabled : LABELS.enabled}
                  </StatusBadge>
                </td>
                <td className={`${tdClass} no-print`}>
                  {isAdmin && row.id !== currentUser?.id ? (
                    row.active !== false ? (
                      <SubmitButton
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          setPendingDisable(row);
                        }}
                      >
                        {LABELS.disableUser}
                      </SubmitButton>
                    ) : (
                      <SubmitButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          setActive(row, true);
                        }}
                      >
                        {LABELS.enableUser}
                      </SubmitButton>
                    )
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
      <Pagination page={paged.page} pageCount={paged.pageCount} onPage={paged.setPage} />
      <ConfirmModal
        open={Boolean(pendingDisable)}
        title={`${LABELS.disableUserTitle} ${pendingDisable?.username ?? ''}`}
        lead={LABELS.disableUserLead}
        description={LABELS.disableUserLead}
        confirmLabel={LABELS.disableUser}
        tone="danger"
        onConfirm={() => { if (pendingDisable) setActive(pendingDisable, false); }}
        onClose={() => setPendingDisable(null)}
      />
    </Panel>
  );
}
