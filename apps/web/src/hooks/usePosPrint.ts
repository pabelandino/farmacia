import { useEffect, useRef, useState } from 'react';
import { LABELS } from '../constants/labels';
import { ReceiptData } from '../types/receipt';

export function invoicePrintFileName(number: number | string | null | undefined) {
  const value = String(number ?? '').trim();
  return value ? `factura_${value}` : 'factura';
}

export function usePosPrint() {
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [shouldPrint, setShouldPrint] = useState(false);
  const previousTitle = useRef<string>(LABELS.appName);

  useEffect(() => {
    if (!shouldPrint || !receipt) return;
    const restore = () => {
      document.title = previousTitle.current;
    };
    const timer = window.setTimeout(() => {
      window.print();
      setShouldPrint(false);
    }, 50);
    window.addEventListener('afterprint', restore, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('afterprint', restore);
    };
  }, [shouldPrint, receipt]);

  function printNow(next: ReceiptData) {
    previousTitle.current = document.title || LABELS.appName;
    document.title = invoicePrintFileName(next.invoiceNumber);
    setReceipt(next);
    setShouldPrint(true);
  }

  return { receipt, printNow };
}
