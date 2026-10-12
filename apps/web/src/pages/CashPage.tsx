import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { ConfirmModal } from '../components/ConfirmModal';
import { DateInput } from '../components/DateInput';
import { Field } from '../components/Field';
import { NumericInput } from '../components/NumericInput';
import { Pagination } from '../components/Pagination';
import { Panel } from '../components/Panel';
import { StatCards } from '../components/StatCards';
import { StatusBadge, invoiceStatusTone } from '../components/StatusBadge';
import { StatusMessage } from '../components/StatusMessage';
import { SubmitButton } from '../components/SubmitButton';
import { TableHead } from '../components/TableHead';
import { TableWrap } from '../components/TableWrap';
import { inputClass, tableClass, tdClass } from '../components/formClasses';
import { LABELS, LabelKey, labeledStats, statusLabel } from '../constants/labels';
import { CASH_CUT_COLUMNS, CASH_DETAIL_COLUMNS, CASH_STAT_KEYS } from '../constants/tables';
import { useFeedback } from '../hooks/useFeedback';
import { usePagedRows } from '../hooks/usePagedRows';
import { paymentModeLabel } from '../types/receipt';
import { CashCutInvoice, CashDay } from '../types/cash';
import { CashCutTotals, CashReport } from '../types/reports';
import { todayIso } from '../utils/dates';
import { formatCount, formatMoney, toNumber } from '../utils/numbers';

const CUT_LABEL: Record<CashCutTotals['key'], LabelKey> = {
  cut10: 'cashCut10',
  cut13: 'cashCut13',
  cut16: 'cashCut16',
  close: 'cashCutClose',
};

function cutAmount(cuts: CashCutTotals[] | undefined, key: CashCutTotals['key']) {
  return cuts?.find((cut) => cut.key === key)?.total ?? 0;
}

export default function CashPage() {
  const today = todayIso();
  const [date, setDate] = useState(today);
  const [day, setDay] = useState<CashDay | null>(null);
  const [movements, setMovements] = useState<CashReport | null>(null);
  const [openingAmount, setOpeningAmount] = useState(0);
  const [countedCash, setCountedCash] = useState(0);
  const [countedCard, setCountedCard] = useState(0);
  const [notes, setNotes] = useState('');
  const [selectedCut, setSelectedCut] = useState<CashCutTotals['key']>('cut10');
  const [confirmKind, setConfirmKind] = useState<'shift' | 'final' | null>(null);
  const [saving, setSaving] = useState(false);
  const { message, error, setMessage, catchError } = useFeedback();

  function load(nextDate = date) {
    void Promise.all([
      api<CashDay>(`/api/cash/session?date=${nextDate}`),
      api<CashReport>(`/api/reports/cash?date=${nextDate}`),
    ]).then(([nextDay, nextMovements]) => {
      setDay(nextDay);
      setMovements(nextMovements);
      setOpeningAmount(nextDay.openingAmount || 0);
      setCountedCash(nextDay.countedCash ?? 0);
      setCountedCard(nextDay.countedCard ?? 0);
      setNotes(nextDay.notes || '');
    }).catch((err) => catchError(err, 'No se pudo cargar la caja'));
  }

  useEffect(() => { load(date); }, [date]);

  const cutRows = useMemo<CashCutInvoice[]>(() => day?.details[selectedCut] || [], [day, selectedCut]);
  const invoices = usePagedRows(cutRows, `${date}-${selectedCut}`);
  const movementRows = usePagedRows(movements?.rows || [], date);
  const opened = Boolean(day?.openedAt);
  const closed = Boolean(day?.closedAt);
  const shiftClosed = Boolean(day?.shiftClosedAt);
  const expectedForKind = confirmKind === 'shift' ? (day?.shiftExpectedCash ?? 0) : (day?.expectedCash ?? 0);

  async function openDrawer(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const next = await api<CashDay>('/api/cash/open', {
        method: 'POST',
        body: JSON.stringify({ date, openingAmount }),
      });
      setDay(next);
      setMessage(LABELS.cashOpenOk);
    } catch (err) {
      catchError(err, 'No se pudo abrir la caja');
    } finally {
      setSaving(false);
    }
  }

  async function closeDrawer(kind: 'shift' | 'final') {
    setSaving(true);
    try {
      const next = await api<CashDay>('/api/cash/close', {
        method: 'POST',
        body: JSON.stringify({ date, countedCash, countedCard, notes, kind }),
      });
      setDay(next);
      setSelectedCut(kind === 'shift' ? 'cut16' : 'close');
      setConfirmKind(null);
      if (kind === 'shift') {
        setCountedCash(0);
        setCountedCard(0);
        setNotes('');
      }
      setMessage(kind === 'shift' ? LABELS.cashShiftCloseOk : LABELS.cashCloseOk);
    } catch (err) {
      catchError(err, kind === 'shift' ? 'No se pudo cerrar el turno' : 'No se pudo cerrar la caja');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4">
      <StatCards
        items={labeledStats([
          ['openingAmount', formatMoney(day?.openingAmount ?? 0)],
          ['cashCut10', formatMoney(cutAmount(day?.cuts, 'cut10')), 'cashCutHint10'],
          ['cashCut13', formatMoney(cutAmount(day?.cuts, 'cut13')), 'cashCutHint13'],
          ['cashCut16', formatMoney(cutAmount(day?.cuts, 'cut16')), 'cashCutHint16'],
          ['shiftCountedCash', day?.shiftCountedCash == null ? '—' : formatMoney(day.shiftCountedCash)],
          ['shiftDifference', day?.shiftDifference == null ? '—' : formatMoney(day.shiftDifference)],
          ['cashCutClose', formatMoney(cutAmount(day?.cuts, 'close')), 'cashCutHintClose'],
          ['expectedCash', formatMoney(day?.expectedCash ?? 0)],
          ['countedCash', day?.countedCash == null ? '—' : formatMoney(day.countedCash)],
          ['cashDifference', day?.difference == null ? '—' : formatMoney(day.difference)],
        ] satisfies Array<readonly [typeof CASH_STAT_KEYS[number], string, LabelKey?]>)}
      />
      <Panel title={LABELS.cashDrawer} tone="blue">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label={LABELS.date}><DateInput className="max-w-56" value={date} onChange={setDate} /></Field>
          <div className="self-end text-sm text-slate-600">
            {opened ? `${LABELS.cashOpenedBy}: ${day?.openedBy || '—'} · ${day?.openedAt ? new Date(day.openedAt).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' }) : ''}` : LABELS.cashNotOpen}
            {shiftClosed ? ` · ${LABELS.cashShiftClosedBy}: ${day?.shiftClosedBy || '—'} · ${day?.shiftClosedAt ? new Date(day.shiftClosedAt).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' }) : ''}` : ''}
            {closed ? ` · ${LABELS.cashClosedBy}: ${day?.closedBy || '—'}` : ''}
          </div>
        </div>
        <StatusMessage error={error} message={message} />
        {!opened && !closed ? (
          <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={openDrawer}>
            <Field label={LABELS.openingAmount}>
              <NumericInput className="max-w-40" value={openingAmount} onCommit={setOpeningAmount} />
            </Field>
            <SubmitButton loading={saving}>{LABELS.cashOpen}</SubmitButton>
          </form>
        ) : null}
        {opened && !closed ? (
          <form className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={(event) => event.preventDefault()}>
            <Field label={LABELS.countedCash}>
              <NumericInput value={countedCash} onCommit={setCountedCash} />
            </Field>
            <Field label={LABELS.countedCard}>
              <NumericInput value={countedCard} onCommit={setCountedCard} />
            </Field>
            <Field label={LABELS.cashNotes}>
              <input className={inputClass} value={notes} onChange={(event) => setNotes(event.target.value)} />
            </Field>
            <div className="flex flex-wrap items-end gap-2">
              {!shiftClosed ? (
                <SubmitButton type="button" variant="blue" loading={saving} onClick={() => setConfirmKind('shift')}>
                  {LABELS.cashShiftClose}
                </SubmitButton>
              ) : null}
              <SubmitButton type="button" loading={saving} onClick={() => setConfirmKind('final')}>
                {LABELS.cashClose}
              </SubmitButton>
            </div>
          </form>
        ) : null}
        {opened && shiftClosed && !closed ? <p className="mt-3 text-sm text-slate-600">{LABELS.cashShiftAlreadyClosed}</p> : null}
        {closed ? <p className="mt-3 text-sm text-slate-600">{LABELS.cashAlreadyClosed}</p> : null}
      </Panel>
      <Panel title={LABELS[CUT_LABEL[selectedCut]]} tone="orange">
        <div className="flex flex-wrap gap-2">
          {(['cut10', 'cut13', 'cut16', 'close'] as const).map((key) => (
            <button
              key={key}
              type="button"
              className={`rounded-full px-3 py-1.5 text-sm ${selectedCut === key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
              onClick={() => setSelectedCut(key)}
            >
              {LABELS[CUT_LABEL[key]]} · {formatMoney(cutAmount(day?.cuts, key))}
            </button>
          ))}
        </div>
        <TableWrap className="mt-3">
          <table className={tableClass}>
            <TableHead columns={CASH_CUT_COLUMNS} />
            <tbody>
              {invoices.rows.map((invoice) => (
                <tr key={invoice.id}>
                  <td className={tdClass}>{invoice.number}</td>
                  <td className={tdClass}>{invoice.time}</td>
                  <td className={tdClass}>{invoice.clientName}</td>
                  <td className={tdClass}>{invoice.cashierName}</td>
                  <td className={tdClass}>{paymentModeLabel(toNumber(invoice.cashAmount), toNumber(invoice.cardAmount), invoice.paymentMethod)}</td>
                  <td className={tdClass}>
                    <StatusBadge tone={invoiceStatusTone(invoice.status)}>{statusLabel(invoice.status)}</StatusBadge>
                  </td>
                  <td className={tdClass}>{formatMoney(invoice.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <Pagination page={invoices.page} pageCount={invoices.pageCount} onPage={invoices.setPage} />
      </Panel>
      <Panel title={`Detalle de ${LABELS.cashDrawer.toLowerCase()}`}>
        <p className="text-sm text-slate-600">{LABELS.movements}: {formatCount(movements?.count ?? 0)} · {LABELS.net}: {movements ? formatMoney(movements.net) : '0.00'}</p>
        <TableWrap className="mt-3">
          <table className={tableClass}>
            <TableHead columns={CASH_DETAIL_COLUMNS} />
            <tbody>
              {movementRows.rows.map((row) => (
                <tr key={row.id}>
                  <td className={tdClass}>{row.userName}</td>
                  <td className={tdClass}>{row.invoiceNumber}</td>
                  <td className={tdClass}>{formatMoney(Number(row.income))}</td>
                  <td className={tdClass}>{formatMoney(Number(row.card))}</td>
                  <td className={tdClass}>{formatMoney(Number(row.operatingExpense))}</td>
                  <td className={tdClass}>{formatMoney(Number(row.returnExpense))}</td>
                  <td className={tdClass}>{row.notes || ''}</td>
                  <td className={tdClass}>{row.cardAuth}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <Pagination page={movementRows.page} pageCount={movementRows.pageCount} onPage={movementRows.setPage} />
      </Panel>
      <ConfirmModal
        open={confirmKind != null}
        title={confirmKind === 'shift' ? LABELS.cashShiftClose : LABELS.cashClose}
        lead={confirmKind === 'shift' ? LABELS.cashShiftCloseLead : LABELS.cashCloseLead}
        description={`${confirmKind === 'shift' ? LABELS.cashCut16 : LABELS.cashCutClose}: ${formatMoney(cutAmount(day?.cuts, confirmKind === 'shift' ? 'cut16' : 'close'))}. ${confirmKind === 'shift' ? LABELS.shiftExpectedCash : LABELS.expectedCash}: ${formatMoney(expectedForKind)}. ${LABELS.countedCash}: ${formatMoney(countedCash)}. ${LABELS.cashDifference}: ${formatMoney((countedCash || 0) - expectedForKind)}.`}
        confirmLabel={confirmKind === 'shift' ? LABELS.cashShiftClose : LABELS.cashClose}
        tone="warning"
        loading={saving}
        onConfirm={() => { if (confirmKind) void closeDrawer(confirmKind); }}
        onClose={() => setConfirmKind(null)}
      />
    </div>
  );
}
