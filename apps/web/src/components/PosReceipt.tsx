import { lineAmount } from '@farmaplus/domain';
import { LABELS } from '../constants/labels';
import { ReceiptCompany, ReceiptData } from '../types/receipt';
import { formatMoney } from '../utils/numbers';

function slogan(text: string | null | undefined) {
  if (!text) return '';
  const trimmed = text.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('"') ? trimmed : `"${trimmed}"`;
}

export function PosReceipt({
  company,
  receipt,
}: {
  company: ReceiptCompany | null;
  receipt: ReceiptData | null;
}) {
  if (!receipt) return null;

  return (
    <div className="pos-receipt hidden" aria-hidden="true">
      <div className="pos-receipt-title text-center uppercase">{company?.name || LABELS.appName}</div>
      {company?.line1 ? <div className="text-center">{slogan(company.line1)}</div> : null}
      {company?.address ? <div className="text-center">{company.address}</div> : null}
      {company?.line2 ? <div className="text-center">{company.line2}</div> : null}
      {company?.phone ? <div className="text-center">{company.phone}</div> : null}

      <div className="mt-3">
        <div>{LABELS.client}  {receipt.clientName}</div>
        <div>{LABELS.invoiceNumber}  {receipt.invoiceNumber}</div>
        <div>{LABELS.paymentMode}  {receipt.paymentMode}</div>
        <div>{LABELS.cashier}  {receipt.cashier}</div>
        <div>{LABELS.date}  {receipt.date}</div>
      </div>

      <div className="pos-receipt-cols mt-3 grid gap-x-2 border-y border-black py-1">
        <span>{LABELS.skuProd}</span>
        <span className="text-right">{LABELS.qty}</span>
        <span className="text-right">{LABELS.price}</span>
        <span className="text-right">{LABELS.amount}</span>
      </div>

      {receipt.lines.map((line) => (
        <div key={`${line.sku}-${line.name}`} className="border-b border-black py-1">
          <div>{line.name}</div>
          <div className="pos-receipt-cols grid gap-x-2">
            <span className="pos-receipt-sku">{line.sku}</span>
            <span className="text-right">{formatMoney(line.quantity)}</span>
            <span className="text-right">{formatMoney(line.price)}</span>
            <span className="text-right">{formatMoney(lineAmount(line.price, line.quantity))}</span>
          </div>
        </div>
      ))}

      <div className="mt-2">{LABELS.itemCount}  {receipt.itemCount}</div>
      <div className="pos-receipt-totals mt-2 text-right">
        <div>{LABELS.totalUsdLabel}  {formatMoney(receipt.totalUsd)}</div>
        <div>{LABELS.totalNioLabel}  {formatMoney(receipt.totalCs)}</div>
        {receipt.advanceCs != null ? <div>{LABELS.advance} C$  {formatMoney(receipt.advanceCs)}</div> : null}
        {receipt.balanceCs != null ? <div>{LABELS.balance} C$  {formatMoney(receipt.balanceCs)}</div> : null}
        {receipt.receivedCs != null ? <div>{LABELS.receivedNio}  {formatMoney(receipt.receivedCs)}</div> : null}
        {receipt.changeCs != null ? <div>{LABELS.changeNio}  {formatMoney(receipt.changeCs)}</div> : null}
      </div>

      <div className="mt-3 text-center">{LABELS.claimFooter}</div>
      <div className="text-center">{LABELS.thanksFooter}</div>
    </div>
  );
}
