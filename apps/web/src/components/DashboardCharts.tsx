import { useMemo } from 'react';
import { Panel } from './Panel';
import { HorizonChart } from './charts/HorizonChart';
import {
  HORIZON,
  donutOptions,
  horizontalBarOptions,
  lineChartOptions,
  stackedBarOptions,
  trafficBarOptions,
} from './charts/horizonOptions';
import { LABELS } from '../constants/labels';
import { DashboardReport } from '../types/reports';
import { formatChartDay } from '../utils/dates';
import { formatCount, formatMoney } from '../utils/numbers';

function ChartLegend({ items }: { items: Array<{ name: string; value: string; color: string }> }) {
  return (
    <ul className="mt-3 grid gap-1.5 text-xs text-slate-500">
      {items.map((item) => (
        <li key={item.name} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
            {item.name}
          </span>
          <span className="font-semibold text-slate-700">{item.value}</span>
        </li>
      ))}
    </ul>
  );
}

export function DashboardCharts({ data }: { data: DashboardReport | null }) {
  const days = data?.salesByDay || [];
  const categories = useMemo(() => days.map((row) => formatChartDay(row.date)), [days]);
  const top = data?.topProducts || [];

  const lineOptions = useMemo(() => lineChartOptions(categories, formatMoney), [categories]);
  const stackedOptions = useMemo(() => stackedBarOptions(categories, formatMoney), [categories]);
  const trafficOptions = useMemo(() => trafficBarOptions(categories, formatCount), [categories]);
  const mixOptions = useMemo(
    () => donutOptions([LABELS.cashSale, LABELS.credit], [HORIZON.purple, HORIZON.cyan]),
    [],
  );
  const payOptions = useMemo(
    () => donutOptions([LABELS.cash, LABELS.card, LABELS.credit], [HORIZON.indigo, HORIZON.blue, HORIZON.orange]),
    [],
  );
  const stockOptions = useMemo(
    () => donutOptions([LABELS.healthyStock, LABELS.lowStock], [HORIZON.cyan, HORIZON.rose]),
    [],
  );
  const topNames = useMemo(
    () => top.map((row) => (row.name.length > 22 ? `${row.name.slice(0, 21)}…` : row.name)),
    [top],
  );
  const topOptions = useMemo(() => horizontalBarOptions(topNames, formatMoney), [topNames]);

  const mix = data?.mix || [];
  const payment = data?.paymentMix || { cash: 0, card: 0, credit: 0 };
  const stock = data?.stockHealth || { ok: 0, low: 0 };

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title={LABELS.salesAndProfit} tone="blue">
          <HorizonChart
            type="line"
            height={320}
            options={lineOptions}
            series={[
              { name: LABELS.todaySales, data: days.map((row) => Number((row.cash + row.credit).toFixed(2))) },
              { name: LABELS.profitAmount, data: days.map((row) => row.profit) },
            ]}
          />
        </Panel>
        <Panel title={LABELS.sales14d} tone="orange">
          <HorizonChart
            type="bar"
            height={320}
            options={stackedOptions}
            series={[
              { name: LABELS.cashSale, data: days.map((row) => row.cash) },
              { name: LABELS.credit, data: days.map((row) => row.credit) },
            ]}
          />
        </Panel>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title={LABELS.salesMix}>
          <HorizonChart type="donut" height={240} options={mixOptions} series={mix.map((row) => row.value)} />
          <ChartLegend
            items={mix.map((row, index) => ({
              name: row.name,
              value: formatMoney(row.value),
              color: [HORIZON.purple, HORIZON.cyan][index] || HORIZON.muted,
            }))}
          />
        </Panel>
        <Panel title={LABELS.paymentMix} tone="blue">
          <HorizonChart
            type="donut"
            height={240}
            options={payOptions}
            series={[payment.cash, payment.card, payment.credit]}
          />
          <ChartLegend
            items={[
              { name: LABELS.cash, value: formatMoney(payment.cash), color: HORIZON.indigo },
              { name: LABELS.card, value: formatMoney(payment.card), color: HORIZON.blue },
              { name: LABELS.credit, value: formatMoney(payment.credit), color: HORIZON.orange },
            ]}
          />
        </Panel>
        <Panel title={LABELS.stockHealth} tone="orange">
          <HorizonChart type="donut" height={240} options={stockOptions} series={[stock.ok, stock.low]} />
          <ChartLegend
            items={[
              { name: LABELS.healthyStock, value: formatCount(stock.ok), color: HORIZON.cyan },
              { name: LABELS.lowStock, value: formatCount(stock.low), color: HORIZON.rose },
            ]}
          />
        </Panel>
      </div>
      <Panel title={LABELS.invoicesByDay} tone="blue">
        <HorizonChart
          type="bar"
          height={300}
          options={trafficOptions}
          series={[{ name: LABELS.invoiceCount, data: days.map((row) => row.invoices) }]}
        />
      </Panel>
      <Panel title={LABELS.topProducts}>
        <HorizonChart
          type="bar"
          height={520}
          options={topOptions}
          series={[{ name: LABELS.amount, data: top.map((row) => row.amount) }]}
        />
      </Panel>
    </>
  );
}
