import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { LABELS, statusLabel } from '../constants/labels';
import { StatusBadge, invoiceStatusTone } from './StatusBadge';
import { POS_RECENT_SALES_PAGE_SIZE } from '../constants/pagination';
import { POS_RECENT_COLUMNS } from '../constants/tables';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { paymentModeLabel } from '../types/receipt';
import { RecentInvoiceItem, RecentInvoicesPage } from '../types/sales';
import { formatReportDate } from '../utils/dates';
import { formatMoney, formatQty, toNumber } from '../utils/numbers';
import { Field } from './Field';
import { Panel } from './Panel';
import { SubmitButton } from './SubmitButton';
import { TableHead } from './TableHead';
import { TableWrap } from './TableWrap';
import { compactTableClass, compactTdClass, inputClass } from './formClasses';

export function RecentInvoicesPanel({
  refreshAt,
  onReprint,
  paymentMethod,
  title = LABELS.recentSales,
}: {
  refreshAt?: number;
  onReprint?: (id: number) => void;
  paymentMethod?: 'Contado' | 'Credito';
  title?: string;
}) {
  const [query, setQuery] = useState('');
  const [data, setData] = useState<RecentInvoicesPage | null>(null);
  const debouncedQuery = useDebouncedValue(query);

  useEffect(() => {
    const q = debouncedQuery.trim() ? `&q=${encodeURIComponent(debouncedQuery.trim())}` : '';
    const pay = paymentMethod ? `&paymentMethod=${paymentMethod}` : '';
    void api<RecentInvoicesPage>(
      `/api/invoices/recent?page=1&pageSize=${POS_RECENT_SALES_PAGE_SIZE}${q}${pay}`,
    ).then(setData);
  }, [debouncedQuery, refreshAt, paymentMethod]);

  return (
    <Panel title={title} tone="blue" className="no-print">
      <Field label={LABELS.searchInvoice}>
        <input
          className={inputClass}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={LABELS.searchInvoiceHint}
        />
      </Field>
      <TableWrap className="mt-2">
        <table className={compactTableClass}>
          <TableHead columns={POS_RECENT_COLUMNS} compact />
          <tbody>
            {(data?.rows || []).map((row) => (
              <tr key={row.id} className={row.status === 'VOID' ? 'text-slate-400' : ''}>
                <td className={compactTdClass}>{row.number}</td>
                <RecentItemsCells items={row.items ?? []} field="productName" />
                <RecentItemsCells items={row.items ?? []} field="quantity" />
                <td className={compactTdClass}>{formatMoney(toNumber(row.total))}</td>
                <td className={compactTdClass}>
                  {paymentModeLabel(toNumber(row.cashAmount), toNumber(row.cardAmount), row.paymentMethod)}
                </td>
                <td className={compactTdClass}>
                  <StatusBadge compact tone={invoiceStatusTone(row.status)}>{statusLabel(row.status)}</StatusBadge>
                </td>
                <td className={compactTdClass}>{formatReportDate(row.date)}</td>
                <td className={compactTdClass}>
                  <SubmitButton
                    type="button"
                    variant="blue"
                    size="sm"
                    disabled={row.status === 'VOID' || !onReprint}
                    onClick={() => onReprint?.(row.id)}
                  >
                    {LABELS.print}
                  </SubmitButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </Panel>
  );
}

function RecentItemsCells({
  items,
  field,
}: {
  items: RecentInvoiceItem[];
  field: 'productName' | 'quantity';
}) {
  return (
    <td className={compactTdClass}>
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
