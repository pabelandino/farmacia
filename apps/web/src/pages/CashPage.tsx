import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { DateInput } from '../components/DateInput';
import { Field } from '../components/Field';
import { Pagination } from '../components/Pagination';
import { Panel } from '../components/Panel';
import { StatCards } from '../components/StatCards';
import { TableHead } from '../components/TableHead';
import { TableWrap } from '../components/TableWrap';
import { tableClass, tdClass } from '../components/formClasses';
import { LABELS, LabelKey, labeledStats } from '../constants/labels';
import { CASH_DETAIL_COLUMNS, CASH_STAT_KEYS } from '../constants/tables';
import { usePagedRows } from '../hooks/usePagedRows';
import { CashReport } from '../types/reports';
import { todayIso } from '../utils/dates';
import { formatCount, formatMoney } from '../utils/numbers';

function cashStatValues(data: CashReport | null): Record<(typeof CASH_STAT_KEYS)[number], string | number> {
  return {
    movements: formatCount(data?.count ?? 0),
    income: data ? formatMoney(data.income) : '0.00',
    card: data ? formatMoney(data.card) : '0.00',
    expenses: data ? formatMoney(data.operatingExpense + data.returnExpense) : '0.00',
    net: data ? formatMoney(data.net) : '0.00',
  };
}

export default function CashPage() {
  const today = todayIso();
  const [date, setDate] = useState(today);
  const [data, setData] = useState<CashReport | null>(null);

  useEffect(() => {
    api<CashReport>(`/api/reports/cash?date=${date}`).then(setData);
  }, [date]);

  const rows = usePagedRows(data?.rows || [], date);

  return (
    <div className="grid gap-4">
      <StatCards
        items={labeledStats(
          CASH_STAT_KEYS.map((key) => [key, cashStatValues(data)[key]] as const satisfies readonly [LabelKey, string | number]),
        )}
      />
      <Panel title={`Detalle de ${LABELS.cashDrawer.toLowerCase()}`}>
        <Field label={LABELS.date}><DateInput className="max-w-56" value={date} onChange={setDate} /></Field>
        <TableWrap className="mt-3">
          <table className={tableClass}>
            <TableHead columns={CASH_DETAIL_COLUMNS} />
            <tbody>
              {rows.rows.map((row) => (
                <tr key={row.id}>
                  <td className={tdClass}>{row.userName}</td>
                  <td className={tdClass}>{row.invoiceNumber}</td>
                  <td className={tdClass}>{formatMoney(Number(row.income))}</td>
                  <td className={tdClass}>{formatMoney(Number(row.card))}</td>
                  <td className={tdClass}>{formatMoney(Number(row.operatingExpense))}</td>
                  <td className={tdClass}>{formatMoney(Number(row.returnExpense))}</td>
                  <td className={tdClass}>{row.cardAuth}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <Pagination page={rows.page} pageCount={rows.pageCount} onPage={rows.setPage} />
      </Panel>
    </div>
  );
}
