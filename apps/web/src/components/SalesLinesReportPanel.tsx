import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { LABELS, labeledStats } from '../constants/labels';
import { PAGE_SIZE } from '../constants/pagination';
import { SALES_LINES_COLUMNS } from '../constants/tables';
import { useAbortableQuery } from '../hooks/useAbortableQuery';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { paymentModeLabel } from '../types/receipt';
import { SalesLinesReport } from '../types/reports';
import { Settings } from '../types/settings';
import { todayIso, formatReportDate } from '../utils/dates';
import { formatCount, formatMoney, formatQty } from '../utils/numbers';
import { DateRangeFields } from './DateRangeFields';
import { Field } from './Field';
import { Pagination } from './Pagination';
import { Panel } from './Panel';
import { StatCards } from './StatCards';
import { SubmitButton } from './SubmitButton';
import { TableHead } from './TableHead';
import { TableWrap } from './TableWrap';
import { inputClass, tableClass, tdClass, thClass } from './formClasses';

export function SalesLinesReportPanel() {
  const today = todayIso();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [companyName, setCompanyName] = useState<string>(LABELS.appName);
  const [exporting, setExporting] = useState(false);
  const debouncedQuery = useDebouncedValue(query);
  const q = debouncedQuery.trim() ? `&q=${encodeURIComponent(debouncedQuery.trim())}` : '';
  const { data, loading, error } = useAbortableQuery<SalesLinesReport>(
    `/api/reports/sales-lines?from=${from}&to=${to}&page=${page}&pageSize=${PAGE_SIZE}${q}`,
  );

  useEffect(() => {
    setPage(1);
  }, [from, to, debouncedQuery]);

  useEffect(() => {
    api<Settings>('/api/settings').then((settings) => {
      if (settings.company?.name) setCompanyName(settings.company.name);
    });
  }, []);

  async function exportExcel() {
    setExporting(true);
    try {
      const q = debouncedQuery.trim() ? `&q=${encodeURIComponent(debouncedQuery.trim())}` : '';
      const full = await api<SalesLinesReport>(`/api/reports/sales-lines?from=${from}&to=${to}&all=1${q}`);
      const { exportTableExcel } = await import('../utils/excel');
      await exportTableExcel({
        pharmacyName: companyName,
        title: `${LABELS.salesReport} ${formatReportDate(from)} - ${formatReportDate(to)}`,
        sheetName: LABELS.salesReport,
        filenamePrefix: 'Reporte-ventas',
        columns: [
          { header: LABELS.invoice, key: 'number', width: 12 },
          { header: LABELS.client, key: 'clientName', width: 24 },
          { header: LABELS.sku, key: 'sku', width: 16 },
          { header: LABELS.product, key: 'productName', width: 36 },
          { header: LABELS.brand, key: 'brand', width: 16 },
          { header: LABELS.qty, key: 'quantity', width: 12 },
          { header: LABELS.price, key: 'unitPrice', width: 12 },
          { header: LABELS.amount, key: 'amount', width: 14 },
          { header: LABELS.profitAmount, key: 'profit', width: 14 },
          { header: LABELS.payment, key: 'payment', width: 12 },
          { header: LABELS.cashier, key: 'cashierName', width: 14 },
          { header: LABELS.date, key: 'date', width: 12 },
        ],
        rows: full.rows.map((row) => ({
          ...row,
          payment: paymentModeLabel(row.cashAmount, row.cardAmount, row.paymentMethod),
          date: formatReportDate(row.date),
        })),
        totals: { quantity: full.totalQty, amount: full.totalSale, profit: full.totalProfit },
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="grid gap-4">
      <StatCards
        items={labeledStats([
          ['lineCount', formatCount(data?.lineCount ?? 0)],
          ['invoiceCount', formatCount(data?.invoiceCount ?? 0)],
          ['totalQty', formatQty(data?.totalQty ?? 0)],
          ['totalSale', data ? formatMoney(data.totalSale) : '0.00', 'salesWithoutExpensesHint'],
          ['expensesToday', formatMoney(data?.expenses ?? 0)],
          ['salesMinusExpenses', data ? formatMoney(data.salesMinusExpenses ?? data.totalSale) : '0.00', 'salesMinusExpensesHint'],
          ['totalUtility', data ? formatMoney(data.totalProfit) : '0.00'],
          ['marginPct', data ? `${formatMoney(data.marginPct)}%` : '0.00%'],
        ])}
      />
      <Panel title={LABELS.salesReport} tone="blue">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <DateRangeFields from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <Field label={LABELS.search}>
            <input className={inputClass} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Factura, producto, cliente" />
          </Field>
          <SubmitButton type="button" variant="blue" loading={exporting} onClick={exportExcel}>
            {LABELS.exportExcel}
          </SubmitButton>
        </div>
        <p className="mt-2 text-xs text-slate-500">{LABELS.salesReportRangeHint}</p>
        {loading ? <p className="mt-2 text-sm text-slate-500">{LABELS.loadingReport}</p> : null}
        {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
        <TableWrap className="mt-4">
          <table className={tableClass}>
            <TableHead columns={SALES_LINES_COLUMNS} />
            <tbody>
              {(data?.rows || []).map((row) => (
                <tr key={row.id}>
                  <td className={tdClass}>{row.number}</td>
                  <td className={tdClass}>{row.clientName}</td>
                  <td className={tdClass}>{row.sku}</td>
                  <td className={tdClass}>{row.productName}</td>
                  <td className={tdClass}>{row.brand || ''}</td>
                  <td className={tdClass}>{formatQty(row.quantity)}</td>
                  <td className={tdClass}>{formatMoney(row.unitPrice)}</td>
                  <td className={tdClass}>{formatMoney(row.amount)}</td>
                  <td className={tdClass}>{formatMoney(row.profit)}</td>
                  <td className={tdClass}>{paymentModeLabel(row.cashAmount, row.cardAmount, row.paymentMethod)}</td>
                  <td className={tdClass}>{row.cashierName}</td>
                  <td className={tdClass}>{formatReportDate(row.date)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-semibold">
                <td className={thClass} colSpan={5}>{LABELS.total}</td>
                <td className={tdClass}>{formatQty(data?.totalQty ?? 0)}</td>
                <td className={tdClass} />
                <td className={tdClass}>{formatMoney(data?.totalSale ?? 0)}</td>
                <td className={tdClass}>{formatMoney(data?.totalProfit ?? 0)}</td>
                <td className={tdClass} colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </TableWrap>
        <Pagination page={data?.page ?? 1} pageCount={data?.pageCount ?? 1} onPage={setPage} />
      </Panel>
    </div>
  );
}
