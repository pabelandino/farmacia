import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { INVENTORY_COLUMNS } from '../constants/tables';
import { LABELS, labeledStats } from '../constants/labels';
import { PAGE_SIZE } from '../constants/pagination';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { InventoryReport, InventoryRow } from '../types/reports';
import { Settings } from '../types/settings';
import { formatCount, formatMoney, formatQty } from '../utils/numbers';
import { Field } from './Field';
import { Pagination } from './Pagination';
import { Panel } from './Panel';
import { StatCards } from './StatCards';
import { SubmitButton } from './SubmitButton';
import { TableHead } from './TableHead';
import { TableWrap } from './TableWrap';
import { inputClass, tableClass, tdClass, thClass } from './formClasses';

export function InventoryReportPanel() {
  const [data, setData] = useState<InventoryReport | null>(null);
  const [companyName, setCompanyName] = useState<string>(LABELS.appName);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const debouncedQuery = useDebouncedValue(query);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  useEffect(() => {
    const q = debouncedQuery.trim() ? `&q=${encodeURIComponent(debouncedQuery.trim())}` : '';
    void api<InventoryReport>(`/api/reports/inventory?page=${page}&pageSize=${PAGE_SIZE}${q}`).then(setData);
  }, [page, debouncedQuery]);

  useEffect(() => {
    api<Settings>('/api/settings').then((settings) => {
      if (settings.company?.name) setCompanyName(settings.company.name);
    });
  }, []);

  async function exportExcel() {
    setExporting(true);
    try {
      const q = debouncedQuery.trim() ? `&q=${encodeURIComponent(debouncedQuery.trim())}` : '';
      const full = await api<InventoryReport>(`/api/reports/inventory?all=1${q}`);
      const { exportTableExcel } = await import('../utils/excel');
      await exportTableExcel({
        pharmacyName: companyName,
        title: LABELS.inventory,
        sheetName: LABELS.inventory,
        filenamePrefix: 'Inventario',
        columns: [
          { header: LABELS.sku, key: 'sku', width: 16 },
          { header: LABELS.product, key: 'name', width: 36 },
          { header: LABELS.unit, key: 'unit', width: 12 },
          { header: LABELS.unitsPerBox, key: 'unitsPerBox', width: 12 },
          { header: LABELS.boxes, key: 'boxes', width: 10 },
          { header: LABELS.loose, key: 'loose', width: 12 },
          { header: LABELS.stock, key: 'stock', width: 12 },
          { header: LABELS.dispatch, key: 'dispatchQty', width: 12 },
          { header: LABELS.warehouse, key: 'warehouseQty', width: 12 },
          { header: LABELS.minShort, key: 'minQty', width: 10 },
          { header: LABELS.unitCost, key: 'unitCost', width: 12 },
          { header: LABELS.unitSale, key: 'unitSale', width: 12 },
          { header: LABELS.costSubtotal, key: 'costAmount', width: 14 },
          { header: LABELS.saleSubtotal, key: 'saleAmount', width: 14 },
          { header: LABELS.profitSubtotal, key: 'profitAmount', width: 14 },
        ],
        rows: full.products,
        totals: {
          stock: full.totalStock,
          costAmount: full.totalCost,
          saleAmount: full.totalSale,
          profitAmount: full.totalProfit,
        },
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="grid gap-4">
      <StatCards
        items={labeledStats([
          ['productsCount', formatCount(data?.count ?? 0)],
          ['totalUnits', formatQty(data?.totalStock ?? 0)],
          ['inventoryCost', formatMoney(data?.totalCost ?? 0), 'inventoryCostHint'],
          ['inventorySale', formatMoney(data?.totalSale ?? 0), 'inventoryCashHint'],
          ['inventoryProfit', formatMoney(data?.totalProfit ?? 0), 'inventoryProfitHint'],
        ])}
      />
      <Panel title={LABELS.inventory} tone="blue">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label={LABELS.search}>
            <input
              className={inputClass}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Código, producto o unidad"
            />
          </Field>
          <SubmitButton type="button" variant="blue" loading={exporting} onClick={exportExcel}>
            {LABELS.exportExcel}
          </SubmitButton>
        </div>
        <TableWrap className="mt-4">
          <table className={tableClass}>
            <TableHead columns={INVENTORY_COLUMNS} />
            <tbody>
              {(data?.products || []).map((row) => (
                <InventoryTableRow key={row.id} row={row} />
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-semibold">
                <td className={thClass} colSpan={12}>{LABELS.total}</td>
                <td className={tdClass}>{formatMoney(data?.totalCost ?? 0)}</td>
                <td className={tdClass}>{formatMoney(data?.totalSale ?? 0)}</td>
                <td className={tdClass}>{formatMoney(data?.totalProfit ?? 0)}</td>
              </tr>
            </tfoot>
          </table>
        </TableWrap>
        <Pagination page={data?.page ?? 1} pageCount={data?.pageCount ?? 1} onPage={setPage} />
      </Panel>
    </div>
  );
}

function InventoryTableRow({ row }: { row: InventoryRow }) {
  return (
    <tr>
      <td className={tdClass}>{row.sku}</td>
      <td className={tdClass}>{row.name}</td>
      <td className={tdClass}>{row.unit || ''}</td>
      <td className={tdClass}>{formatCount(row.unitsPerBox)}</td>
      <td className={tdClass}>{formatCount(row.boxes)}</td>
      <td className={tdClass}>{formatQty(row.loose)}</td>
      <td className={tdClass}>{formatQty(row.stock)}</td>
      <td className={tdClass}>{formatQty(row.dispatchQty)}</td>
      <td className={tdClass}>{formatQty(row.warehouseQty)}</td>
      <td className={tdClass}>{formatCount(row.minQty)}</td>
      <td className={tdClass}>{formatMoney(row.unitCost)}</td>
      <td className={tdClass}>{formatMoney(row.unitSale)}</td>
      <td className={tdClass}>{formatMoney(row.costAmount)}</td>
      <td className={tdClass}>{formatMoney(row.saleAmount)}</td>
      <td className={tdClass}>{formatMoney(row.profitAmount)}</td>
    </tr>
  );
}
