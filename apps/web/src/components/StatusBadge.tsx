import { ReactNode } from 'react';

export type BadgeTone = 'active' | 'inactive' | 'warning';

const tones: Record<BadgeTone, string> = {
  active: 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-400 dark:bg-emerald-950/50 dark:text-emerald-200',
  inactive: 'border-red-400 bg-red-50 text-red-600 dark:border-red-400 dark:bg-red-950/50 dark:text-red-200',
  warning: 'border-amber-500 bg-amber-50 text-amber-800 dark:border-amber-400 dark:bg-amber-950/50 dark:text-amber-200',
};

export function StatusBadge({
  tone,
  compact,
  children,
}: {
  tone: BadgeTone;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border font-medium ${
        compact ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
      } ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function invoiceStatusTone(status: string): BadgeTone {
  if (status === 'VOID') return 'inactive';
  if (status === 'CREDIT') return 'warning';
  return 'active';
}

export function expiryTone(status: string): BadgeTone {
  if (status === 'expired') return 'inactive';
  if (status === 'today') return 'warning';
  return 'warning';
}
