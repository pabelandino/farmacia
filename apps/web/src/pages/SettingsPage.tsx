import { FormEvent, useEffect, useState } from 'react';
import { api, exportAuthedFile } from '../api/client';
import { ConfirmModal } from '../components/ConfirmModal';
import { Field } from '../components/Field';
import { Panel } from '../components/Panel';
import { StatusMessage } from '../components/StatusMessage';
import { SubmitButton } from '../components/SubmitButton';
import { TableHead } from '../components/TableHead';
import { TableWrap } from '../components/TableWrap';
import { inputClass, tableClass, tdClass } from '../components/formClasses';
import { LABELS } from '../constants/labels';
import { SETTINGS_COUNT_COLUMNS } from '../constants/tables';
import { useFeedback } from '../hooks/useFeedback';
import { ImportJob, Settings } from '../types/settings';
import { backupFileName } from '../utils/dates';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [rate, setRate] = useState('');
  const [pharmacyName, setPharmacyName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [savingRate, setSavingRate] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [confirmImport, setConfirmImport] = useState(false);
  const { message, error, setMessage, setError, toastSuccess, catchError } = useFeedback();

  function load() {
    api<Settings>('/api/settings').then((data) => {
      setSettings(data);
      setRate(String(data.exchangeRate));
      setPharmacyName(data.company?.name || '');
      setAddress(data.company?.address || '');
      setPhone(data.company?.phone || '');
      setLine1(data.company?.line1 || '');
      setLine2(data.company?.line2 || '');
    });
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!importing && job?.status !== 'running') return;
    const handle = setInterval(() => {
      api<ImportJob>('/api/settings/import-status').then((status) => {
        setJob(status);
        if (status.status === 'done' || status.status === 'error') {
          setImporting(false);
          if (status.status === 'done') {
            setMessage(LABELS.importBakDone);
            load();
          }
          if (status.status === 'error') setError(status.error || 'Falló la importación');
        }
      });
    }, 1500);
    return () => clearInterval(handle);
  }, [importing, job?.status]);

  async function saveCompany(event: FormEvent) {
    event.preventDefault();
    if (!pharmacyName.trim()) {
      setError(LABELS.pharmacyName + ' es obligatorio');
      return;
    }
    setSavingCompany(true);
    setError('');
    try {
      await api('/api/settings/company', {
        method: 'POST',
        body: JSON.stringify({
          name: pharmacyName,
          address,
          phone,
          line1,
          line2,
        }),
      });
      setMessage('Nombre de farmacia actualizado');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la farmacia');
    } finally {
      setSavingCompany(false);
    }
  }

  async function saveRate(event: FormEvent) {
    event.preventDefault();
    setSavingRate(true);
    setError('');
    try {
      await api('/api/settings/exchange-rate', { method: 'POST', body: JSON.stringify({ rate: Number(rate) }) });
      setMessage('Tipo de cambio actualizado');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el tipo de cambio');
    } finally {
      setSavingRate(false);
    }
  }

  function requestImportBak(event: FormEvent) {
    event.preventDefault();
    if (!file) { setError('Seleccione un archivo .bak'); return; }
    setError('');
    setConfirmImport(true);
  }

  async function confirmImportBak() {
    if (!file) return;
    setConfirmImport(false);
    setImporting(true);
    setError('');
    setMessage('');
    try {
      const body = new FormData();
      body.append('file', file);
      const started = await api<ImportJob>('/api/settings/import-bak', { method: 'POST', body });
      setJob(started);
    } catch (err) {
      setImporting(false);
      setError(err instanceof Error ? err.message : 'No se pudo subir el .bak');
    }
  }

  async function exportPg() {
    setExporting(true);
    setError('');
    try {
      const saved = await exportAuthedFile(
        '/api/settings/backup-pg',
        backupFileName(),
        LABELS.backupPgFileType,
      );
      if (saved) toastSuccess(LABELS.backupPgDone);
    } catch (err) {
      catchError(err, LABELS.backupPgFailed);
    } finally {
      setExporting(false);
    }
  }

  const counts = job?.counts || settings?.counts || {};

  return (
    <div className="grid gap-4">
      <Panel title="Configuración y respaldos">
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {LABELS.importBakHint}
        </div>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={saveCompany}>
          <Field label={LABELS.pharmacyName}>
            <input className={inputClass} value={pharmacyName} onChange={(e) => setPharmacyName(e.target.value)} required />
          </Field>
          <Field label={LABELS.phone}>
            <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label={LABELS.address}>
            <input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>
          <Field label={LABELS.ticketLine1}>
            <input className={inputClass} value={line1} onChange={(e) => setLine1(e.target.value)} />
          </Field>
          <Field label={LABELS.ticketLine2}>
            <input className={inputClass} value={line2} onChange={(e) => setLine2(e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <SubmitButton loading={savingCompany}>{LABELS.savePharmacy}</SubmitButton>
          </div>
        </form>
        <form className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={saveRate}>
          <Field label="Tipo de cambio C$ / U$">
            <input className={inputClass} type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} />
          </Field>
          <SubmitButton loading={savingRate}>Guardar tipo de cambio</SubmitButton>
        </form>
      </Panel>
      <Panel title="Importar .bak de SQL Server" tone="orange">
        <form className="grid gap-3" onSubmit={requestImportBak}>
          <Field label="Archivo .bak">
            <input className={inputClass} type="file" accept=".bak" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </Field>
          <SubmitButton loading={importing}>Restaurar e importar</SubmitButton>
        </form>
        {job ? (
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
            <div className="font-bold">Estado: {job.status}</div>
            <div className="mt-1 text-slate-600">{job.step}</div>
            <pre className="mt-2 max-h-40 overflow-auto text-xs text-slate-500">{job.log.slice(-12).join('\n')}</pre>
          </div>
        ) : null}
      </Panel>
      <Panel title={LABELS.backupPgTitle} tone="blue">
        <p className="text-sm text-slate-600">{LABELS.backupPgHint}</p>
        <SubmitButton className="mt-3" type="button" variant="blue" loading={exporting} onClick={exportPg}>
          {LABELS.backupPgAction}
        </SubmitButton>
      </Panel>
      <Panel title="Conteos actuales">
        <TableWrap>
          <table className={tableClass}>
            <TableHead columns={SETTINGS_COUNT_COLUMNS} />
            <tbody>
              {Object.entries(counts).map(([key, value]) => (
                <tr key={key}><td className={tdClass}>{key}</td><td className={tdClass}>{value}</td></tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Panel>
      <StatusMessage error={error} message={message} />
      <ConfirmModal
        open={confirmImport}
        title={LABELS.importBakConfirmTitle}
        lead={LABELS.importBakConfirmLead}
        description={LABELS.importBakConfirm}
        confirmLabel={LABELS.importBakConfirmAction}
        tone="warning"
        onConfirm={confirmImportBak}
        onClose={() => setConfirmImport(false)}
      />
    </div>
  );
}
