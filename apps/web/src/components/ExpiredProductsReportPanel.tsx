import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { LABELS, expiryStatusLabel, labeledStats } from '../constants/labels';
import { StatusBadge, expiryTone } from './StatusBadge';
import { PAGE_SIZE } from '../constants/pagination';
import { EXPIRED_PRODUCT_COLUMNS } from '../constants/tables';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { ExpiredProductRow, ExpiredProductsReport } from '../types/reports';
import { Settings } from '../types/settings';
import { formatReportDate, monthsAgoIso, todayIso } from '../utils/dates';
import { formatCount, formatQty } from '../utils/numbers';
import { DateRangeFields } from './DateRangeFields';
import { Field } from './Field';
import { Pagination } from './Pagination';
import { Panel } from './Panel';
import { StatCards } from './StatCards';
import { SubmitButton } from './SubmitButton';
import { TableHead } from './TableHead';
import { TableWrap } from './TableWrap';
import { inputClass, tableClass, tdClass } from './formClasses';

export function ExpiredProductsReportPanel() {
  const [from, setFrom] = useState(() => monthsAgoIso());
  const [to, setTo] = useState(() => todayIso());
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ExpiredProductsReport | null>(null);
  const [companyName, setCompanyName] = useState<string>(LABELS.appName);
  const [exporting, setExporting] = useState(false);
  const debouncedQuery = useDebouncedValue(query);

  useEffect(() => {
    setPage(1);
  }, [from, to, debouncedQuery]);

  useEffect(() => {
    const q = debouncedQuery.trim() ? `&q=${encodeURIComponent(debouncedQuery.trim())}` : '';
    void api<ExpiredProductsReport>(
      `/api/reports/expired-products?from=${from}&to=${to}&page=${page}&pageSize=${PAGE_SIZE}${q}`,
    ).then(setData);
  }, [from, to, page, debouncedQuery]);

  useEffect(() => {
    api<Settings>('/api/settings').then((settings) => {
      if (settings.company?.name) setCompanyName(settings.company.name);
    });
  }, []);

  async function exportExcel() {
    setExporting(true);
    try {
      const q = debouncedQuery.trim() ? `&q=${encodeURIComponent(debouncedQuery.trim())}` : '';
      const full = await api<ExpiredProductsReport>(
        `/api/reports/expired-products?from=${from}&to=${to}&all=1${q}`,
      );
      const { exportTableExcel } = await import('../utils/excel');
      await exportTableExcel({
        pharmacyName: companyName,
        title: `${LABELS.expiredProducts} ${formatReportDate(from)} - ${formatReportDate(to)}`,
        sheetName: LABELS.expiredProducts,
        filenamePrefix: 'Productos-vencidos',
        columns: [
          { header: LABELS.sku, key: 'sku', width: 16 },
          { header: LABELS.product, key: 'productName', width: 36 },
          { header: LABELS.lot, key: 'lot', width: 14 },
          { header: LABELS.expiresAt, key: 'expiresAt', width: 14 },
          { header: LABELS.status, key: 'statusLabel', width: 14 },
          { header: LABELS.qty, key: 'quantity', width: 12 },
          { header: LABELS.remainingQty, key: 'remaining', width: 12 },
          { header: LABELS.stock, key: 'stock', width: 12 },
          { header: LABELS.supplier, key: 'supplier', width: 22 },
          { header: LABELS.document, key: 'documentNumber', width: 14 },
          { header: LABELS.date, key: 'intakeDate', width: 12 },
        ],
        rows: full.rows.map((row) => ({
          ...row,
          expiresAt: formatReportDate(row.expiresAt),
          intakeDate: formatReportDate(row.intakeDate),
          statusLabel: expiryStatusLabel(row.status),
        })),
        totals: { quantity: full.totalQty },
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="grid gap-4">
      <StatCards
        items={labeledStats([
          ['expiredLots', formatCount(data?.count ?? 0)],
          ['productsCount', formatCount(data?.productCount ?? 0)],
          ['expiredCount', formatCount(data?.expiredCount ?? 0)],
          ['totalQty', formatQty(data?.totalQty ?? 0)],
        ])}
      />
      <Panel title={LABELS.expiredProducts} tone="orange">
        <p className="mb-3 text-sm text-slate-600">{LABELS.expiredProductsDesc}</p>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <DateRangeFields from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <Field label={LABELS.search}>
            <input className={inputClass} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Código, producto, lote o proveedor" />
          </Field>
          <SubmitButton type="button" variant="blue" loading={exporting} onClick={exportExcel}>
            {LABELS.exportExcel}
          </SubmitButton>
        </div>
        <TableWrap className="mt-4">
          <table className={tableClass}>
            <TableHead columns={EXPIRED_PRODUCT_COLUMNS} />
            <tbody>
              {(data?.rows || []).map((row) => (
                <ExpiredProductTableRow key={row.id} row={row} />
              ))}
            </tbody>
          </table>
        </TableWrap>
        <Pagination page={data?.page ?? 1} pageCount={data?.pageCount ?? 1} onPage={setPage} />
      </Panel>
    </div>
  );
}

function ExpiredProductTableRow({ row }: { row: ExpiredProductRow }) {
  return (
    <tr>
      <td className={tdClass}>{row.sku}</td>
      <td className={tdClass}>{row.productName}</td>
      <td className={tdClass}>{row.lot}</td>
      <td className={tdClass}>{formatReportDate(row.expiresAt)}</td>
      <td className={tdClass}>
        <StatusBadge tone={expiryTone(row.status)}>{expiryStatusLabel(row.status)}</StatusBadge>
      </td>
      <td className={tdClass}>{formatQty(row.quantity)}</td>
      <td className={tdClass}>{formatQty(row.remaining)}</td>
      <td className={tdClass}>{formatQty(row.stock)}</td>
      <td className={tdClass}>{row.supplier}</td>
      <td className={tdClass}>{row.documentNumber}</td>
      <td className={tdClass}>{formatReportDate(row.intakeDate)}</td>
    </tr>
  );
}
