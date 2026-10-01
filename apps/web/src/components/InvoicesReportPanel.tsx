import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { LABELS, labeledStats, statusLabel } from '../constants/labels';
import { StatusBadge, invoiceStatusTone } from './StatusBadge';
import { PAGE_SIZE } from '../constants/pagination';
import { INVOICE_REPORT_COLUMNS } from '../constants/tables';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { paymentModeLabel } from '../types/receipt';
import { InvoiceReportItem, InvoiceReportRow, InvoicesListReport } from '../types/reports';
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
import { VoidInvoiceButton } from './VoidInvoiceButton';
import { inputClass, tableClass, tdClass, thClass } from './formClasses';

export function InvoicesReportPanel() {
  const today = todayIso();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<InvoicesListReport | null>(null);
  const [companyName, setCompanyName] = useState<string>(LABELS.appName);
  const [exporting, setExporting] = useState(false);
  const [reloadAt, setReloadAt] = useState(0);
  const debouncedQuery = useDebouncedValue(query);

  useEffect(() => {
    setPage(1);
  }, [from, to, debouncedQuery]);

  useEffect(() => {
    const q = debouncedQuery.trim() ? `&q=${encodeURIComponent(debouncedQuery.trim())}` : '';
    void api<InvoicesListReport>(
      `/api/reports/invoices-list?from=${from}&to=${to}&page=${page}&pageSize=${PAGE_SIZE}${q}`,
    ).then(setData);
  }, [from, to, page, debouncedQuery, reloadAt]);

  useEffect(() => {
    api<Settings>('/api/settings').then((settings) => {
      if (settings.company?.name) setCompanyName(settings.company.name);
    });
  }, []);

  async function exportExcel() {
    setExporting(true);
    try {
      const q = debouncedQuery.trim() ? `&q=${encodeURIComponent(debouncedQuery.trim())}` : '';
      const full = await api<InvoicesListReport>(`/api/reports/invoices-list?from=${from}&to=${to}&all=1${q}`);
      const { exportTableExcel } = await import('../utils/excel');
      await exportTableExcel({
        pharmacyName: companyName,
        title: `${LABELS.invoicesReport} ${formatReportDate(from)} - ${formatReportDate(to)}`,
        sheetName: LABELS.invoicesReport,
        filenamePrefix: 'Reporte-facturas',
        columns: [
          { header: LABELS.invoice, key: 'number', width: 12 },
          { header: LABELS.client, key: 'clientName', width: 28 },
          { header: LABELS.product, key: 'productName', width: 36 },
          { header: LABELS.qty, key: 'quantity', width: 12 },
          { header: LABELS.total, key: 'total', width: 14 },
          { header: LABELS.profitAmount, key: 'profit', width: 14 },
          { header: LABELS.payment, key: 'paymentMethod', width: 12 },
          { header: LABELS.status, key: 'status', width: 12 },
          { header: LABELS.date, key: 'date', width: 12 },
          { header: LABELS.cashier, key: 'cashierName', width: 14 },
        ],
        rows: full.rows.flatMap((row) => excelInvoiceRows(row)),
        totals: { total: full.totalSale, profit: full.totalProfit },
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="grid gap-4">
      <StatCards
        items={labeledStats([
          ['paidCount', formatCount(data?.paidCount ?? 0)],
          ['voidedCount', formatCount(data?.voidedCount ?? 0)],
          ['credit', formatCount(data?.creditCount ?? 0)],
          ['totalSale', data ? formatMoney(data.totalSale) : '0.00'],
          ['totalUtility', data ? formatMoney(data.totalProfit) : '0.00'],
          ['avgTicket', data ? formatMoney(data.avgTicket) : '0.00'],
          ['cash', data ? formatMoney(data.cashTotal) : '0.00'],
          ['card', data ? formatMoney(data.cardTotal) : '0.00'],
        ])}
      />
      <Panel title={LABELS.invoicesReport} tone="blue">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <DateRangeFields from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <Field label={LABELS.search}>
            <input className={inputClass} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Factura, producto, cliente o cajero" />
          </Field>
          <SubmitButton type="button" variant="blue" loading={exporting} onClick={exportExcel}>
            {LABELS.exportExcel}
          </SubmitButton>
        </div>
        <TableWrap className="mt-4">
          <table className={tableClass}>
            <TableHead columns={INVOICE_REPORT_COLUMNS} />
            <tbody>
              {(data?.rows || []).map((row) => (
                <tr key={row.id} className={row.status === 'VOID' ? 'text-slate-400' : ''}>
                  <td className={tdClass}>{row.number}</td>
                  <td className={tdClass}>{row.clientName}</td>
                  <InvoiceItemsCells items={row.items ?? []} />
                  <td className={tdClass}>{formatMoney(row.total)}</td>
                  <td className={tdClass}>{formatMoney(row.profit)}</td>
                  <td className={tdClass}>{paymentModeLabel(row.cashAmount, row.cardAmount, row.paymentMethod)}</td>
                  <td className={tdClass}>
                    <StatusBadge tone={invoiceStatusTone(row.status)}>{statusLabel(row.status)}</StatusBadge>
                  </td>
                  <td className={tdClass}>{formatReportDate(row.date)}</td>
                  <td className={tdClass}>{row.cashierName}</td>
                  <td className={`${tdClass} no-print`}>
                    <VoidInvoiceButton
                      id={row.id}
                      number={row.number}
                      status={row.status}
                      onVoided={() => setReloadAt(Date.now())}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-semibold">
                <td className={thClass} colSpan={4}>{LABELS.total}</td>
                <td className={tdClass}>{formatMoney(data?.totalSale ?? 0)}</td>
                <td className={tdClass}>{formatMoney(data?.totalProfit ?? 0)}</td>
                <td className={tdClass} colSpan={5} />
              </tr>
            </tfoot>
          </table>
        </TableWrap>
        <Pagination page={data?.page ?? 1} pageCount={data?.pageCount ?? 1} onPage={setPage} />
      </Panel>
    </div>
  );
}

function InvoiceItemsCells({ items }: { items: InvoiceReportItem[] }) {
  if (!items.length) {
    return (
      <>
        <td className={tdClass} />
        <td className={tdClass} />
      </>
    );
  }
  return (
    <>
      <td className={tdClass}>
        {items.map((item, index) => (
          <div key={`${item.sku}-${index}`}>{item.productName}</div>
        ))}
      </td>
      <td className={tdClass}>
        {items.map((item, index) => (
          <div key={`${item.sku}-${index}`}>{formatQty(item.quantity)}</div>
        ))}
      </td>
    </>
  );
}

function excelInvoiceRows(row: InvoiceReportRow) {
  const items = row.items.length ? row.items : [{ sku: '', productName: '', quantity: '' as const }];
  return items.map((item, index) => ({
    number: row.number,
    clientName: row.clientName,
    productName: item.productName,
    quantity: item.quantity,
    total: index === 0 ? row.total : '',
    profit: index === 0 ? row.profit : '',
    paymentMethod: paymentModeLabel(row.cashAmount, row.cardAmount, row.paymentMethod),
    status: statusLabel(row.status),
    date: formatReportDate(row.date),
    cashierName: row.cashierName,
  }));
}
