import { useEffect, useState } from 'react';
import { remainingBalance, lineAmount, totalUsd } from '@farmaplus/domain';
import { api } from '../api/client';
import { getUser } from '../api/session';
import { DateInput } from '../components/DateInput';
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
import { useFeedback } from '../hooks/useFeedback';
import { useInvoiceCart } from '../hooks/useInvoiceCart';
import { usePosPrint } from '../hooks/usePosPrint';
import { useProductSearch } from '../hooks/useProductSearch';
import { Client } from '../types/catalog';
import { cartToReceiptLines, invoiceToReceipt } from '../types/receipt';
import { InvoiceDetail } from '../types/sales';
import { Settings } from '../types/settings';
import { isoDate } from '../utils/dates';
import { formatMoney } from '../utils/numbers';

export default function CreditPage() {
  const user = getUser();
  const [query, setQuery] = useState('');
  const { products, reload, applySale } = useProductSearch(query);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState<number | ''>('');
  const [address, setAddress] = useState<string>(LABELS.unknown);
  const [dueDate, setDueDate] = useState(isoDate(30));
  const [issuedAt, setIssuedAt] = useState(isoDate());
  const { cart, total, itemCount, addProduct, updateQty, removeLine, clearCart } = useInvoiceCart();
  const [advance, setAdvance] = useState(0);
  const [rate, setRate] = useState(36.2);
  const [nextNumber, setNextNumber] = useState(0);
  const [company, setCompany] = useState<Settings['company']>(null);
  const { message, error, setMessage, clearFeedback, catchError } = useFeedback();
  const [saving, setSaving] = useState(false);
  const [salesTick, setSalesTick] = useState(0);
  const { receipt, printNow } = usePosPrint();
  const selectedClient = clients.find((client) => client.id === clientId);
  const remaining = remainingBalance(total, advance);

  function buildReceipt(invoiceNumber: number | string) {
    return {
      clientName: selectedClient?.name || LABELS.genericClient,
      invoiceNumber,
      paymentMode: LABELS.credit,
      cashier: user?.username || '',
      date: issuedAt,
      lines: cartToReceiptLines(cart).map((line) => ({
        ...line,
        amount: lineAmount(line.price, line.quantity),
      })),
      itemCount: cart.length,
      totalUsd: totalUsd(total, rate),
      totalCs: total,
      advanceCs: advance,
      balanceCs: remaining,
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
      if (generic) {
        setClientId(generic.id);
        setAddress(generic.address || LABELS.unknown);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedClient) setAddress(selectedClient.address || LABELS.unknown);
  }, [selectedClient]);

  async function submit() {
    if (!cart.length) return;
    clearFeedback();
    if (cart.some((line) => !Number.isFinite(line.quantity) || line.quantity < 1)) {
      catchError(new Error(LABELS.qtyRequired), LABELS.qtyRequired);
      return;
    }
    if (advance - 0.009 > total) {
      catchError(new Error('El adelanto no puede ser mayor al total'), 'El adelanto no puede ser mayor al total');
      return;
    }
    setSaving(true);
    try {
      const ticket = buildReceipt(nextNumber);
      const invoice = await api<{ number: number }>('/api/invoices', {
        method: 'POST',
        body: JSON.stringify({
          paymentMethod: 'Credito',
          clientId: clientId || undefined,
          clientName: selectedClient?.name,
          clientAddress: address,
          date: issuedAt,
          dueDate,
          advanceAmount: advance,
          items: cart.map((line) => ({ productId: line.id, quantity: line.quantity, unitPrice: line.price })),
        }),
      });
      const sold = cart.map((line) => ({ productId: line.id, quantity: line.quantity }));
      printNow({ ...ticket, invoiceNumber: invoice.number });
      applySale(sold);
      setMessage(`Factura de crédito ${invoice.number} guardada. Pendiente C$ ${remaining.toFixed(2)}`);
      clearCart();
      setAdvance(0);
      setDueDate(isoDate(30));
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
      <Panel title={LABELS.creditBilling} className="no-print">
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
            <Field label={LABELS.address}><input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
            <Field label={LABELS.invoiceNumber}><input className={inputClass} value={nextNumber || ''} readOnly /></Field>
            <Field label={LABELS.exchangeRate}><div className="rounded-md bg-amber-100 px-2 py-1 text-sm font-black text-amber-800">{rate.toFixed(2)}</div></Field>
            <Field label={LABELS.date}><DateInput value={issuedAt} onChange={setIssuedAt} /></Field>
            <Field label={LABELS.dueDate}><DateInput value={dueDate} onChange={setDueDate} /></Field>
            <Field label={LABELS.advance}><NumericInput min={0} value={advance} onCommit={setAdvance} /></Field>
            <div className="rounded-lg bg-slate-50 p-2 text-xs">
              <div>Total C$ <b>{formatMoney(total)}</b></div>
              <div>Total U$ <b>{formatMoney(totalUsd(total, rate))}</b></div>
              <div>Saldo C$ <b>{formatMoney(remaining)}</b></div>
              <div>Artículos: <b>{itemCount}</b></div>
            </div>
            <SubmitButton type="button" loading={saving} disabled={!cart.length} onClick={submit}>{LABELS.invoiceAction}</SubmitButton>
            <SubmitButton type="button" variant="blue" disabled={!cart.length} onClick={() => printNow(buildReceipt(nextNumber))}>{LABELS.print}</SubmitButton>
          </div>
        </Panel>
        <RecentInvoicesPanel
          title={LABELS.recentCredits}
          paymentMethod="Credito"
          refreshAt={salesTick}
          onReprint={reprintInvoice}
        />
      </div>
      <PosReceipt company={company} receipt={receipt} />
    </div>
  );
}
