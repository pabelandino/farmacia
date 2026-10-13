import { useEffect, useState } from 'react';
import { changeDue, lineAmount, totalUsd } from '@farmaplus/domain';
import { api } from '../api/client';
import { getUser } from '../api/session';
import { CashShortLabel } from '../components/CashShortLabel';
import { Field } from '../components/Field';
import { InvoiceLinesTable } from '../components/InvoiceLinesTable';
import { NumericInput } from '../components/NumericInput';
import { Panel } from '../components/Panel';
import { PosReceipt } from '../components/PosReceipt';
import { ProductPickerTable } from '../components/ProductPickerTable';
import { RecentInvoicesPanel } from '../components/RecentInvoicesPanel';
import { StatusMessage } from '../components/StatusMessage';
import { SubmitButton } from '../components/SubmitButton';
import { inputClass } from '../components/formClasses';
import { LABELS } from '../constants/labels';
import { useDelayedWarning } from '../hooks/useDelayedWarning';
import { useFeedback } from '../hooks/useFeedback';
import { useInvoiceCart } from '../hooks/useInvoiceCart';
import { usePosPrint } from '../hooks/usePosPrint';
import { useProductSearch } from '../hooks/useProductSearch';
import { Client } from '../types/catalog';
import { cartToReceiptLines, invoiceToReceipt, paymentModeLabel } from '../types/receipt';
import { InvoiceDetail } from '../types/sales';
import { Settings } from '../types/settings';
import { todayIso } from '../utils/dates';
import { formatMoney } from '../utils/numbers';

export default function PosPage() {
  const user = getUser();
  const [query, setQuery] = useState('');
  const { products, reload, applySale } = useProductSearch(query);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState<number | ''>('');
  const { cart, total, itemCount, addProduct, updateQty, removeLine, clearCart } = useInvoiceCart();
  const [cash, setCash] = useState(0);
  const [card, setCard] = useState(0);
  const [rate, setRate] = useState(36.2);
  const [company, setCompany] = useState<Settings['company']>(null);
  const [nextNumber, setNextNumber] = useState(0);
  const { message, error, setMessage, clearFeedback, catchError } = useFeedback();
  const [saving, setSaving] = useState(false);
  const [salesTick, setSalesTick] = useState(0);
  const { receipt, printNow } = usePosPrint();
  const selectedClient = clients.find((client) => client.id === clientId);
  const cashShort = total > 0 && cash > 0 && cash + card + 0.009 < total;
  const showCashShort = useDelayedWarning(cashShort);

  function buildReceipt(invoiceNumber: number | string) {
    const received = cash + card;
    return {
      clientName: selectedClient?.name || LABELS.genericClient,
      invoiceNumber,
      paymentMode: paymentModeLabel(cash, card),
      cashier: user?.username || '',
      date: todayIso(),
      lines: cartToReceiptLines(cart).map((line) => ({
        ...line,
        amount: lineAmount(line.price, line.quantity),
      })),
      itemCount: cart.length,
      totalUsd: totalUsd(total, rate),
      totalCs: total,
      receivedCs: received,
      changeCs: changeDue(received, total),
    };
  }

  useEffect(() => {
    api<Settings>('/api/settings').then((s) => {
      setRate(s.exchangeRate);
      setCompany(s.company);
    });
    api<{ number: number }>('/api/invoices/next-number').then((s) => setNextNumber(s.number));
    api<Client[]>('/api/clients').then((rows) => {
      setClients(rows);
      const generic = rows.find((c) => c.name.toLowerCase().includes('generico'));
      if (generic) setClientId(generic.id);
    });
  }, []);

  async function submit() {
    if (!cart.length) return;
    clearFeedback();
    if (cart.some((line) => !Number.isFinite(line.quantity) || line.quantity < 1)) {
      catchError(new Error(LABELS.qtyRequired), LABELS.qtyRequired);
      return;
    }
    if (cash + card <= 0) {
      catchError(new Error(LABELS.emptyPayment), LABELS.emptyPayment);
      return;
    }
    if (cash + card + 0.009 < total) {
      catchError(new Error('El pago no cubre el total'), 'El pago no cubre el total');
      return;
    }
    setSaving(true);
    try {
      const ticket = buildReceipt(nextNumber);
      const invoice = await api<{ number: number }>('/api/invoices', {
        method: 'POST',
        body: JSON.stringify({
          paymentMethod: 'Contado',
          clientId: clientId || undefined,
          cashAmount: cash,
          cardAmount: card,
          items: cart.map((line) => ({ productId: line.id, quantity: line.quantity, unitPrice: line.price })),
        }),
      });
      const sold = cart.map((line) => ({ productId: line.id, quantity: line.quantity }));
      printNow({ ...ticket, invoiceNumber: invoice.number });
      applySale(sold);
      setMessage(`Factura ${invoice.number} guardada`);
      clearCart();
      setCash(0);
      setCard(0);
      setSalesTick(Date.now());
      await Promise.all([
        api<{ number: number }>('/api/invoices/next-number').then((s) => setNextNumber(s.number)),
        reload(),
      ]);
    } catch (err) {
      catchError(err, 'No se pudo facturar');
    } finally {
      setSaving(false);
    }
  }

  async function reprintInvoice(id: number) {
    clearFeedback();
    try {
      const invoice = await api<InvoiceDetail>(`/api/invoices/${id}`);
      printNow(invoiceToReceipt(invoice, rate));
    } catch (err) {
      catchError(err, LABELS.reprintFailed);
    }
  }

  return (
    <div className="grid gap-3">
      <Panel title="Facturación de contado" className="no-print">
        <Field label={LABELS.searchProduct}>
          <input className={inputClass} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Código, nombre o marca" />
        </Field>
        <ProductPickerTable
          className="mt-2 max-h-56 w-full overflow-y-auto"
          products={products}
          limit={30}
          selectedIds={cart.map((line) => line.id)}
          onAdd={addProduct}
        />
      </Panel>
      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,0.9fr)]">
        <Panel title="Detalles de factura" className="no-print">
          <InvoiceLinesTable cart={cart} onQty={updateQty} onRemove={removeLine} />
          <StatusMessage error={error} message={message} />
        </Panel>
        <Panel title={LABELS.payment} tone="orange" className="no-print xl:row-span-2">
          <div className="grid gap-2">
            <Field label={LABELS.client}>
              <select className={inputClass} value={clientId} onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : '')}>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
              </select>
            </Field>
            <Field label={LABELS.invoiceNumber}><input className={inputClass} value={nextNumber || ''} readOnly /></Field>
            <Field label={LABELS.exchangeRate}><div className="rounded-md bg-amber-100 px-2 py-1 text-sm font-black text-amber-800">{rate.toFixed(2)}</div></Field>
            <Field label={LABELS.cash}>
              <NumericInput min={0} value={cash} onCommit={setCash} />
              <CashShortLabel show={showCashShort} />
            </Field>
            <Field label={LABELS.card}><NumericInput min={0} value={card} onCommit={setCard} /></Field>
            <div className="rounded-lg bg-slate-50 p-2 text-xs">
              <div>Total C$ <b>{formatMoney(total)}</b></div>
              <div>Total U$ <b>{formatMoney(totalUsd(total, rate))}</b></div>
              <div>Cambio C$ <b>{formatMoney(changeDue(cash + card, total))}</b></div>
              <div>Artículos: <b>{itemCount}</b></div>
            </div>
            <SubmitButton type="button" loading={saving} disabled={!cart.length} onClick={submit}>{LABELS.invoiceAction}</SubmitButton>
            <SubmitButton type="button" variant="blue" disabled={!cart.length} onClick={() => printNow(buildReceipt(nextNumber))}>{LABELS.print}</SubmitButton>
          </div>
        </Panel>
        <RecentInvoicesPanel refreshAt={salesTick} onReprint={reprintInvoice} />
      </div>
      <PosReceipt company={company} receipt={receipt} />
    </div>
  );
}
