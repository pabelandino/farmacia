import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { DashboardCharts } from '../components/DashboardCharts';
import { Panel } from '../components/Panel';
import { StatusBadge, expiryTone } from '../components/StatusBadge';
import { StatCards } from '../components/StatCards';
import { TableHead } from '../components/TableHead';
import { TableWrap } from '../components/TableWrap';
import { tableClass, tdClass, thClass } from '../components/formClasses';
import { EXPIRED_DASHBOARD_COLUMNS } from '../constants/tables';
import { LABELS, expiryStatusLabel, labeledStats } from '../constants/labels';
import { DashboardReport, ExpiredProductRow } from '../types/reports';
import { formatCount, formatMoney, formatQty } from '../utils/numbers';
import { formatReportDate } from '../utils/dates';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardReport | null>(null);

  useEffect(() => {
    api<DashboardReport>('/api/reports/dashboard').then(setData);
  }, []);

  return (
    <div className="grid gap-4">
      <StatCards
        items={labeledStats([
          ['todaySales', data ? formatMoney(data.todaySales) : '0.00', 'todaySalesHint'],
          ['cashSale', data ? formatMoney(data.cashTotal) : '0.00', 'cashSaleHint'],
          ['credit', data ? formatMoney(data.creditTotal) : '0.00', 'creditHint'],
          ['receivableTotal', data ? formatMoney(data.receivable) : '0.00', 'receivableHint'],
          ['productsCount', formatCount(data?.productCount ?? 0), 'productsCountHint'],
          ['lowStock', formatCount(data?.lowStockCount ?? 0), 'lowStockHint'],
          ['expiredCount', formatCount(data?.expiredCount ?? 0), 'expiredHint'],
        ])}
      />
      {data ? <DashboardCharts data={data} /> : null}
      <Panel title={LABELS.topProducts} tone="blue">
        <TableWrap>
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>{LABELS.product}</th>
                <th className={thClass}>{LABELS.qty}</th>
                <th className={thClass}>{LABELS.amount}</th>
              </tr>
            </thead>
            <tbody>
              {(data?.topProducts || []).map((row) => (
                <tr key={row.name}>
                  <td className={tdClass}>{row.name}</td>
                  <td className={tdClass}>{formatCount(row.quantity)}</td>
                  <td className={tdClass}>{formatMoney(row.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Panel>
      <Panel title={LABELS.expiredProducts} tone="orange">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-600">{LABELS.expiredHint}</p>
          <Link to="/reportes/vencidos" className="rounded-full border border-emerald-600 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100">
            {LABELS.viewReport}
          </Link>
        </div>
        <TableWrap>
          <table className={tableClass}>
            <TableHead columns={EXPIRED_DASHBOARD_COLUMNS} />
            <tbody>
              {(data?.expiredProducts || []).map((row) => (
                <ExpiredDashboardRow key={row.id} row={row} />
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Panel>
    </div>
  );
}

function ExpiredDashboardRow({ row }: { row: ExpiredProductRow }) {
  return (
    <tr>
      <td className={tdClass}>{row.sku}</td>
      <td className={tdClass}>{row.productName}</td>
      <td className={tdClass}>{row.lot}</td>
      <td className={tdClass}>{formatReportDate(row.expiresAt)}</td>
      <td className={tdClass}>
        <StatusBadge tone={expiryTone(row.status)}>{expiryStatusLabel(row.status)}</StatusBadge>
      </td>
      <td className={tdClass}>{formatQty(row.remaining)}</td>
    </tr>
  );
}
