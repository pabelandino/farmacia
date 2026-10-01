import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { Field } from '../components/Field';
import { NumericInput } from '../components/NumericInput';
import { Pagination } from '../components/Pagination';
import { Panel } from '../components/Panel';
import { ReportBackLink } from '../components/ReportBackLink';
import { StatCards } from '../components/StatCards';
import { StatusMessage } from '../components/StatusMessage';
import { SubmitButton } from '../components/SubmitButton';
import { TableHead } from '../components/TableHead';
import { TableWrap } from '../components/TableWrap';
import { inputClass, tableClass, tdClass } from '../components/formClasses';
import { LABELS, labeledStats } from '../constants/labels';
import { RECEIVABLE_CLIENT_COLUMNS, RECEIVABLE_COLUMNS } from '../constants/tables';
import { useFeedback } from '../hooks/useFeedback';
import { usePagedRows } from '../hooks/usePagedRows';
import { ReceivableInvoice, ReceivablesReport } from '../types/reports';
import { Settings } from '../types/settings';
import { dateOnly } from '../utils/dates';
import { formatCount, formatMoney } from '../utils/numbers';

export default function ReceivablesPage() {
  const [data, setData] = useState<ReceivablesReport | null>(null);
  const [companyName, setCompanyName] = useState<string>(LABELS.appName);
  const [query, setQuery] = useState('');
  const [amounts, setAmounts] = useState<Record<number, number>>({});
  const [paying, setPaying] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const { message, error, setMessage, catchError, clearFeedback } = useFeedback();

  function load() {
    return api<ReceivablesReport>('/api/reports/receivables').then((report) => {
      setData(report);
      setAmounts(Object.fromEntries(report.invoices.map((row) => [row.id, row.balance])));
      return report;
    });
  }

  useEffect(() => {
    load();
    api<Settings>('/api/settings').then((settings) => {
      if (settings.company?.name) setCompanyName(settings.company.name);
    });
  }, []);

  const invoices = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data?.invoices || [];
    return (data?.invoices || []).filter((row) =>
      `${row.clientName} ${row.number}`.toLowerCase().includes(q),
    );
  }, [data, query]);

  const pagedInvoices = usePagedRows(invoices, query);
  const pagedClients = usePagedRows(data?.clients || [], data?.clients.length ?? 0);

  async function pay(row: ReceivableInvoice) {
    const amount = amounts[row.id] ?? row.balance;
    if (!Number.isFinite(amount) || amount < 0.01) {
      catchError(new Error(LABELS.emptyPayment), LABELS.emptyPayment);
      return;
    }
    setPaying(row.id);
    clearFeedback();
    try {
      await api(`/api/invoices/${row.id}/payment`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      });
      setMessage(`Abono de C$ ${amount.toFixed(2)} registrado en factura ${row.number}`);
      await load();
    } catch (err) {
      catchError(err, 'No se pudo registrar el abono');
    } finally {
      setPaying(null);
    }
  }

  async function exportExcel() {
    if (!data) return;
    setExporting(true);
    try {
      const { exportTableExcel } = await import('../utils/excel');
      await exportTableExcel({
        pharmacyName: companyName,
        title: LABELS.receivables,
        sheetName: LABELS.receivables,
        filenamePrefix: 'Cuentas-por-cobrar',
        columns: [
          { header: LABELS.client, key: 'clientName', width: 32 },
          { header: LABELS.invoice, key: 'number', width: 12 },
          { header: LABELS.date, key: 'date', width: 14 },
          { header: LABELS.dueDate, key: 'dueDate', width: 14 },
          { header: LABELS.total, key: 'total', width: 14 },
          { header: LABELS.advance, key: 'advance', width: 14 },
          { header: LABELS.balance, key: 'balance', width: 14 },
        ],
        rows: data.invoices.map((row) => ({
          clientName: row.clientName,
          number: row.number,
          date: dateOnly(row.date),
          dueDate: row.dueDate ? dateOnly(row.dueDate) : '',
          total: row.total,
          advance: row.advance,
          balance: row.balance,
        })),
        totals: { balance: data.totalBalance, total: data.invoices.reduce((sum, row) => sum + row.total, 0) },
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="grid gap-4">
      <ReportBackLink />
      <StatCards
        items={labeledStats([
          ['invoiceCount', formatCount(data?.invoiceCount ?? 0)],
          ['receivableTotal', data ? formatMoney(data.totalBalance) : '0.00'],
          ['clients', formatCount(data?.clients.length ?? 0)],
        ])}
      />
      <Panel title={LABELS.receivables} tone="orange">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label={LABELS.search}>
            <input className={inputClass} value={query} onChange={(e) => setQuery(e.target.value)} />
          </Field>
          <SubmitButton type="button" variant="blue" loading={exporting} onClick={exportExcel}>
            {LABELS.exportExcel}
          </SubmitButton>
        </div>
        <StatusMessage error={error} message={message} />
        <TableWrap className="mt-4">
          <table className={tableClass}>
            <TableHead columns={RECEIVABLE_COLUMNS} />
            <tbody>
              {pagedInvoices.rows.map((row) => (
                <tr key={row.id}>
                  <td className={tdClass}>{row.clientName}</td>
                  <td className={tdClass}>{row.number}</td>
                  <td className={tdClass}>{dateOnly(row.date)}</td>
                  <td className={tdClass}>{row.dueDate ? dateOnly(row.dueDate) : ''}</td>
                  <td className={tdClass}>{formatMoney(row.total)}</td>
                  <td className={tdClass}>{formatMoney(row.advance)}</td>
                  <td className={tdClass}>{formatMoney(row.balance)}</td>
                  <td className={tdClass}>
                    <div className="flex min-w-52 items-center gap-2">
                      <NumericInput
                        className="w-24"
                        min={0.01}
                        value={amounts[row.id] ?? row.balance}
                        onCommit={(value) => setAmounts((current) => ({ ...current, [row.id]: value }))}
                      />
                      <SubmitButton
                        type="button"
                        className="px-3 py-1.5"
                        loading={paying === row.id}
                        onClick={() => pay(row)}
                      >
                        {LABELS.paymentAmount}
                      </SubmitButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <Pagination page={pagedInvoices.page} pageCount={pagedInvoices.pageCount} onPage={pagedInvoices.setPage} />
      </Panel>
      <Panel title={LABELS.clients}>
        <TableWrap>
          <table className={tableClass}>
            <TableHead columns={RECEIVABLE_CLIENT_COLUMNS} />
            <tbody>
              {pagedClients.rows.map((row) => (
                <tr key={row.clientName}>
                  <td className={tdClass}>{row.clientName}</td>
                  <td className={tdClass}>{formatCount(row.invoices)}</td>
                  <td className={tdClass}>{formatMoney(row.total)}</td>
                  <td className={tdClass}>{formatMoney(row.advance)}</td>
                  <td className={tdClass}>{formatMoney(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <Pagination page={pagedClients.page} pageCount={pagedClients.pageCount} onPage={pagedClients.setPage} />
      </Panel>
    </div>
  );
}
