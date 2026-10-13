import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';
import { DateInput } from '../components/DateInput';
import { Field } from '../components/Field';
import { NumericInput } from '../components/NumericInput';
import { Pagination } from '../components/Pagination';
import { Panel } from '../components/Panel';
import { StatCards } from '../components/StatCards';
import { StatusMessage } from '../components/StatusMessage';
import { SubmitButton } from '../components/SubmitButton';
import { TableHead } from '../components/TableHead';
import { TableWrap } from '../components/TableWrap';
import { inputClass, tableClass, tdClass } from '../components/formClasses';
import { LABELS, labeledStats } from '../constants/labels';
import { RECENT_SALES_PAGE_SIZE } from '../constants/pagination';
import { EXPENSE_COLUMNS } from '../constants/tables';
import { useFeedback } from '../hooks/useFeedback';
import { ExpensesPageData } from '../types/expenses';
import { formatReportDate, todayIso } from '../utils/dates';
import { formatCount, formatMoney } from '../utils/numbers';

export default function ExpensesPage() {
  const today = todayIso();
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState(0);
  const [detail, setDetail] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ExpensesPageData | null>(null);
  const [saving, setSaving] = useState(false);
  const { message, error, toastSuccess, toastWarning, catchError } = useFeedback();

  function load(nextPage = page, nextDate = date) {
    void api<ExpensesPageData>(
      `/api/expenses?date=${nextDate}&page=${nextPage}&pageSize=${RECENT_SALES_PAGE_SIZE}`,
    ).then(setData).catch((err) => catchError(err, LABELS.expenseFailed));
  }

  useEffect(() => {
    load(page, date);
  }, [date, page]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!(amount > 0)) {
      toastWarning(LABELS.expenseNeedAmount);
      return;
    }
    if (!detail.trim()) {
      toastWarning(LABELS.expenseNeedDetail);
      return;
    }
    setSaving(true);
    try {
      await api('/api/expenses', {
        method: 'POST',
        body: JSON.stringify({ date, amount, detail }),
      });
      setAmount(0);
      setDetail('');
      toastSuccess(LABELS.expenseSaved);
      setPage(1);
      load(1, date);
    } catch (err) {
      catchError(err, LABELS.expenseFailed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4">
      <StatCards
        items={labeledStats([
          ['expensesToday', formatMoney(data?.total ?? 0)],
          ['records', formatCount(data?.count ?? 0)],
        ])}
      />
      <Panel title={LABELS.expensesTitle} tone="blue">
        <p className="mb-4 text-sm text-slate-500">{LABELS.expensesHint}</p>
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={save}>
          <Field label={LABELS.date}>
            <DateInput value={date} onChange={(next) => { setDate(next); setPage(1); }} />
          </Field>
          <Field label={LABELS.expenseAmount}>
            <NumericInput value={amount} onCommit={setAmount} />
          </Field>
          <Field label={LABELS.expenseDetail}>
            <input
              className={inputClass}
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
              placeholder={LABELS.expenseDetail}
            />
          </Field>
          <div className="flex items-end">
            <SubmitButton loading={saving}>{LABELS.expenseSave}</SubmitButton>
          </div>
        </form>
        <StatusMessage error={error} message={message} />
      </Panel>
      <Panel title={LABELS.recentExpenses} tone="orange">
        <TableWrap>
          <table className={tableClass}>
            <TableHead columns={EXPENSE_COLUMNS} />
            <tbody>
              {(data?.rows || []).map((row) => (
                <tr key={row.id}>
                  <td className={tdClass}>{formatReportDate(row.date)}</td>
                  <td className={tdClass}>{formatMoney(row.amount)}</td>
                  <td className={tdClass}>{row.detail}</td>
                  <td className={tdClass}>{row.userName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <Pagination page={data?.page ?? 1} pageCount={data?.pageCount ?? 1} onPage={setPage} />
      </Panel>
    </div>
  );
}
