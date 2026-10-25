import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Field } from '../components/Field';
import { Pagination } from '../components/Pagination';
import { Panel } from '../components/Panel';
import { StatusBadge, invoiceStatusTone } from '../components/StatusBadge';
import { TableHead } from '../components/TableHead';
import { TableWrap } from '../components/TableWrap';
import { VoidInvoiceButton } from '../components/VoidInvoiceButton';
import { inputClass, tableClass, tdClass } from '../components/formClasses';
import { LABELS, statusLabel } from '../constants/labels';
import { RECENT_SALES_PAGE_SIZE } from '../constants/pagination';
import { VOID_INVOICE_COLUMNS } from '../constants/tables';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { paymentModeLabel } from '../types/receipt';
import { RecentInvoiceItem, RecentInvoicesPage } from '../types/sales';
import { formatReportDate } from '../utils/dates';
import { formatMoney, formatQty, toNumber } from '../utils/numbers';

export default function VoidInvoicesPage() {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [reloadAt, setReloadAt] = useState(0);
  const [data, setData] = useState<RecentInvoicesPage | null>(null);
  const debouncedQuery = useDebouncedValue(query);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  useEffect(() => {
    const q = debouncedQuery.trim() ? `&q=${encodeURIComponent(debouncedQuery.trim())}` : '';
    void api<RecentInvoicesPage>(
      `/api/invoices/recent?page=${page}&pageSize=${RECENT_SALES_PAGE_SIZE}${q}`,
    ).then(setData);
  }, [debouncedQuery, page, reloadAt]);

  return (
    <Panel title={LABELS.voidInvoicesTitle} tone="blue">
      <p className="text-sm text-slate-600">{LABELS.voidInvoicesHint}</p>
      <div className="mt-3 max-w-md">
        <Field label={LABELS.searchInvoice}>
          <input
            className={inputClass}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={LABELS.searchInvoiceHint}
          />
        </Field>
      </div>
      <TableWrap className="mt-4">
        <table className={tableClass}>
          <TableHead columns={VOID_INVOICE_COLUMNS} />
          <tbody>
            {(data?.rows || []).map((row) => (
              <tr key={row.id} className={row.status === 'VOID' ? 'text-slate-400' : ''}>
                <td className={tdClass}>{row.number}</td>
                <td className={tdClass}>{row.clientName}</td>
                <VoidItemsCells items={row.items ?? []} field="productName" />
                <VoidItemsCells items={row.items ?? []} field="quantity" />
                <td className={tdClass}>{formatMoney(toNumber(row.total))}</td>
                <td className={tdClass}>
                  {paymentModeLabel(toNumber(row.cashAmount), toNumber(row.cardAmount), row.paymentMethod)}
                </td>
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
        </table>
      </TableWrap>
      <Pagination page={data?.page ?? 1} pageCount={data?.pageCount ?? 1} onPage={setPage} />
    </Panel>
  );
}

function VoidItemsCells({
  items,
  field,
}: {
  items: RecentInvoiceItem[];
  field: 'productName' | 'quantity';
}) {
  return (
    <td className={tdClass}>
      {items.length
        ? items.map((item, index) => (
          <div key={`${item.sku}-${index}`}>
            {field === 'quantity' ? formatQty(toNumber(item.quantity)) : item.productName}
          </div>
        ))
        : null}
    </td>
  );
}
