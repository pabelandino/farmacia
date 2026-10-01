import { LABELS } from '../constants/labels';
import { dismissToast, ToastItem, useToasts } from '../hooks/useToasts';

const kindClass: Record<ToastItem['kind'], string> = {
  success: 'border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100',
  warning: 'border-amber-500 bg-amber-50 text-amber-950 dark:bg-amber-950 dark:text-amber-100',
  error: 'border-red-500 bg-red-50 text-red-950 dark:bg-red-950 dark:text-red-100',
};

const kindLabel: Record<ToastItem['kind'], string> = {
  success: LABELS.toastSuccess,
  warning: LABELS.toastWarning,
  error: LABELS.toastError,
};

export function ToastHost() {
  const toasts = useToasts();
  if (!toasts.length) return null;

  return (
    <div className="no-print pointer-events-none fixed top-4 right-3 z-[60] flex w-[min(100%-1.5rem,22rem)] flex-col gap-2 sm:right-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto rounded-2xl border-l-4 px-3 py-2 shadow-lg ${kindClass[toast.kind]}`}
          role="status"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide">{kindLabel[toast.kind]}</p>
              <p className="mt-0.5 text-sm font-semibold">{toast.message}</p>
            </div>
            <button
              type="button"
              className="rounded px-1 text-lg leading-none font-bold opacity-60 hover:opacity-100"
              onClick={() => dismissToast(toast.id)}
              aria-label={LABELS.close}
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
