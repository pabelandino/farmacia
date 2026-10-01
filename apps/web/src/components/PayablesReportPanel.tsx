import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { PAYABLE_COLUMNS, PAYABLE_SUPPLIER_COLUMNS } from '../constants/tables';
import { LABELS, labeledStats } from '../constants/labels';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { usePagedRows } from '../hooks/usePagedRows';
import { PayablesReport } from '../types/reports';
import { Settings } from '../types/settings';
import { formatCount, formatMoney } from '../utils/numbers';
import { Field } from './Field';
import { Pagination } from './Pagination';
import { Panel } from './Panel';
import { StatCards } from './StatCards';
import { SubmitButton } from './SubmitButton';
import { TableHead } from './TableHead';
import { TableWrap } from './TableWrap';
import { inputClass, tableClass, tdClass } from './formClasses';

export function PayablesReportPanel() {
  const [data, setData] = useState<PayablesReport | null>(null);
  const [companyName, setCompanyName] = useState<string>(LABELS.appName);
  const [query, setQuery] = useState('');
  const [exporting, setExporting] = useState(false);
  const debouncedQuery = useDebouncedValue(query);

  useEffect(() => {
    void Promise.all([
      api<PayablesReport>('/api/reports/payables'),
      api<Settings>('/api/settings'),
    ]).then(([report, settings]) => {
      setData(report);
      if (settings.company?.name) setCompanyName(settings.company.name);
    });
  }, []);

  const rows = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return data?.rows || [];
    return (data?.rows || []).filter((row) =>
      `${row.supplier} ${row.invoiceNumber} ${row.concept} ${row.purchaseOrder}`.toLowerCase().includes(q),
    );
  }, [data, debouncedQuery]);

  const pagedRows = usePagedRows(rows, debouncedQuery);
  const pagedSuppliers = usePagedRows(data?.suppliers || [], data?.suppliers.length ?? 0);

  async function exportExcel() {
    if (!data) return;
    setExporting(true);
    try {
      const { exportTableExcel } = await import('../utils/excel');
      await exportTableExcel({
        pharmacyName: companyName,
        title: LABELS.payables,
        sheetName: LABELS.payables,
        filenamePrefix: 'Cuentas-por-pagar',
        columns: [
          { header: LABELS.supplier, key: 'supplier', width: 24 },
          { header: LABELS.invoice, key: 'invoiceNumber', width: 14 },
          { header: LABELS.concept, key: 'concept', width: 28 },
          { header: LABELS.purchaseOrder, key: 'purchaseOrder', width: 16 },
          { header: LABELS.date, key: 'purchasedAt', width: 12 },
          { header: LABELS.dueDate, key: 'dueAt', width: 12 },
          { header: LABELS.status, key: 'status', width: 12 },
          { header: LABELS.balance, key: 'balance', width: 14 },
        ],
        rows: data.rows,
        totals: { balance: data.totalBalance },
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="grid gap-4">
      <StatCards
        items={labeledStats([
          ['invoiceCount', formatCount(data?.count ?? 0)],
          ['payableTotal', data ? formatMoney(data.totalBalance) : '0.00'],
          ['supplier', formatCount(data?.suppliers.length ?? 0)],
        ])}
      />
      <Panel title={LABELS.payables} tone="orange">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label={LABELS.search}>
            <input className={inputClass} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Proveedor, factura o concepto" />
          </Field>
          <SubmitButton type="button" variant="blue" loading={exporting} onClick={exportExcel}>
            {LABELS.exportExcel}
          </SubmitButton>
        </div>
        <TableWrap className="mt-4">
          <table className={tableClass}>
            <TableHead columns={PAYABLE_COLUMNS} />
            <tbody>
              {pagedRows.rows.map((row) => (
                <tr key={row.id}>
                  <td className={tdClass}>{row.supplier}</td>
                  <td className={tdClass}>{row.invoiceNumber}</td>
                  <td className={tdClass}>{row.concept}</td>
                  <td className={tdClass}>{row.purchaseOrder}</td>
                  <td className={tdClass}>{row.purchasedAt}</td>
                  <td className={tdClass}>{row.dueAt}</td>
                  <td className={tdClass}>{row.status}</td>
                  <td className={tdClass}>{formatMoney(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <Pagination page={pagedRows.page} pageCount={pagedRows.pageCount} onPage={pagedRows.setPage} />
      </Panel>
      <Panel title={LABELS.supplier}>
        <TableWrap>
          <table className={tableClass}>
            <TableHead columns={PAYABLE_SUPPLIER_COLUMNS} />
            <tbody>
              {pagedSuppliers.rows.map((row) => (
                <tr key={row.supplier}>
                  <td className={tdClass}>{row.supplier}</td>
                  <td className={tdClass}>{formatCount(row.invoices)}</td>
                  <td className={tdClass}>{formatMoney(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <Pagination page={pagedSuppliers.page} pageCount={pagedSuppliers.pageCount} onPage={pagedSuppliers.setPage} />
      </Panel>
    </div>
  );
}
