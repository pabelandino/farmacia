import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { DateInput } from '../components/DateInput';
import { Field } from '../components/Field';
import { Pagination } from '../components/Pagination';
import { Panel } from '../components/Panel';
import { ReportBackLink } from '../components/ReportBackLink';
import { StatCards } from '../components/StatCards';
import { StatusBadge, invoiceStatusTone } from '../components/StatusBadge';
import { TableHead } from '../components/TableHead';
import { TableWrap } from '../components/TableWrap';
import { VoidInvoiceButton } from '../components/VoidInvoiceButton';
import { tableClass, tdClass } from '../components/formClasses';
import { LABELS, labeledStats, statusLabel } from '../constants/labels';
import { LOW_STOCK_COLUMNS, SALES_DAY_COLUMNS } from '../constants/tables';
import { useAbortableQuery } from '../hooks/useAbortableQuery';
import { usePagedRows } from '../hooks/usePagedRows';
import { paymentModeLabel } from '../types/receipt';
import { CashCutTotals, SalesReport, StockReport } from '../types/reports';
import { todayIso } from '../utils/dates';
import { formatCount, formatMoney, toNumber } from '../utils/numbers';

function cutTotal(cuts: CashCutTotals[] | undefined, key: CashCutTotals['key']) {
  return cuts?.find((cut) => cut.key === key)?.total ?? 0;
}

export default function SalesDayReportPage() {
  const today = todayIso();
  const [date, setDate] = useState(today);
  const [reloadAt, setReloadAt] = useState(0);
  const { data: sales } = useAbortableQuery<SalesReport>(`/api/reports/sales?date=${date}&reload=${reloadAt}`);
  const [stock, setStock] = useState<StockReport | null>(null);

  function loadSales() {
    setReloadAt(Date.now());
  }

  useEffect(() => { api<StockReport>('/api/reports/stock').then(setStock); }, []);

  const invoices = usePagedRows(sales?.invoices || [], date);
  const lowStock = usePagedRows(stock?.lowStock || [], stock?.lowStockCount ?? 0);

  return (
    <div className="grid gap-4">
      <ReportBackLink />
      <StatCards
        items={labeledStats([
          ['invoicesToday', formatCount(sales?.count ?? 0)],
          ['totalNio', sales ? formatMoney(sales.total) : '0.00', 'salesWithoutExpensesHint'],
          ['expensesToday', formatMoney(sales?.expenses ?? 0)],
          ['salesMinusExpenses', sales ? formatMoney(sales.salesMinusExpenses ?? sales.total) : '0.00', 'salesMinusExpensesHint'],
          ['expectedCash', formatMoney(sales?.expectedCash ?? 0), 'cashPlusSalesMinusExpensesHint'],
          ['cashAndCard', sales ? `${formatMoney(sales.cash)} / ${formatMoney(sales.card)}` : '0.00'],
          ['creditToday', sales ? `${formatCount(sales.creditCount)} / ${formatMoney(sales.creditTotal)}` : '0'],
          ['openingAmount', formatMoney(sales?.openingAmount ?? 0)],
          ['cashCut10', formatMoney(cutTotal(sales?.cuts, 'cut10')), 'cashCutHint10'],
          ['cashCut13', formatMoney(cutTotal(sales?.cuts, 'cut13')), 'cashCutHint13'],
          ['cashCut16', formatMoney(cutTotal(sales?.cuts, 'cut16')), 'cashCutHint16'],
          ['shiftCountedCash', sales?.shiftCountedCash == null ? '—' : formatMoney(sales.shiftCountedCash)],
          ['shiftDifference', sales?.shiftDifference == null ? '—' : formatMoney(sales.shiftDifference)],
          ['cashCutClose', formatMoney(cutTotal(sales?.cuts, 'close')), 'cashCutHintClose'],
          ['cashDifference', sales?.difference == null ? '—' : formatMoney(sales.difference)],
          ['lowStock', formatCount(stock?.lowStockCount ?? 0)],
        ])}
      />
      <Panel title="Ventas del día" tone="blue">
        <Field label={LABELS.date}><DateInput className="max-w-56" value={date} onChange={setDate} /></Field>
        <TableWrap className="mt-3">
          <table className={tableClass}>
            <TableHead columns={SALES_DAY_COLUMNS} />
            <tbody>
              {invoices.rows.map((invoice) => (
                <tr key={invoice.id}>
                  <td className={tdClass}>{invoice.number}</td>
                  <td className={tdClass}>{invoice.clientName}</td>
                  <td className={tdClass}>{invoice.cashierName}</td>
                  <td className={tdClass}>
                    {paymentModeLabel(toNumber(invoice.cashAmount), toNumber(invoice.cardAmount), invoice.paymentMethod)}
                  </td>
                  <td className={tdClass}>
                    <StatusBadge tone={invoiceStatusTone(invoice.status)}>{statusLabel(invoice.status)}</StatusBadge>
                  </td>
                  <td className={tdClass}>{formatMoney(Number(invoice.total))}</td>
                  <td className={tdClass}>
                    <VoidInvoiceButton id={invoice.id} number={invoice.number} status={invoice.status} onVoided={() => { loadSales(); api<StockReport>('/api/reports/stock').then(setStock); }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <Pagination page={invoices.page} pageCount={invoices.pageCount} onPage={invoices.setPage} />
      </Panel>
      <Panel title="Existencias mínimas" tone="orange">
        <TableWrap>
          <table className={tableClass}>
            <TableHead columns={LOW_STOCK_COLUMNS} />
            <tbody>
              {lowStock.rows.map((row) => (
                <tr key={row.id}>
                  <td className={tdClass}>{row.sku}</td>
                  <td className={tdClass}>{row.name}</td>
                  <td className={tdClass}>{formatMoney(Number(row.stock))}</td>
                  <td className={tdClass}>{formatCount(row.minQty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <Pagination page={lowStock.page} pageCount={lowStock.pageCount} onPage={lowStock.setPage} />
      </Panel>
    </div>
  );
}
