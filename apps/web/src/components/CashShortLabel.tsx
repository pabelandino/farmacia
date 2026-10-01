import { LABELS } from '../constants/labels';

export function CashShortLabel({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p className="cash-short-label mt-1 text-xs font-bold text-red-600" role="alert">
      {LABELS.cashShort}
    </p>
  );
}
