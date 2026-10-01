import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LABELS } from '../constants/labels';
import { SubmitButton } from './SubmitButton';

type ConfirmTone = 'danger' | 'warning';

const toneClass: Record<ConfirmTone, { icon: string; ring: string; variant: 'danger' | 'blue' }> = {
  danger: {
    icon: 'bg-red-50 text-red-600',
    ring: 'ring-red-100',
    variant: 'danger',
  },
  warning: {
    icon: 'bg-amber-50 text-amber-700',
    ring: 'ring-amber-100',
    variant: 'blue',
  },
};

export function ConfirmModal({
  open,
  title,
  lead,
  description,
  confirmLabel,
  tone = 'danger',
  loading = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  lead?: string;
  description: string;
  confirmLabel: string;
  tone?: ConfirmTone;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const descId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const palette = toneClass[tone];

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cardRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !loading) onClose();
    }

    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, loading, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="confirm-modal-backdrop no-print fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onClose();
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        className="confirm-modal-card w-full max-w-md rounded-[28px] bg-white/90 p-5 shadow-sm ring-1 ring-white/80 outline-none backdrop-blur sm:p-6"
      >
        <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full ring-8 ${palette.icon} ${palette.ring}`}>
          <ConfirmIcon />
        </div>
        <h2 id={titleId} className="text-lg font-semibold tracking-tight text-slate-900">
          {title}
        </h2>
        {lead ? <p className="mt-1 text-sm font-semibold text-slate-800">{lead}</p> : null}
        <p id={descId} className="mt-2 text-sm leading-relaxed text-slate-600">
          {description}
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <SubmitButton type="button" variant="ghost" disabled={loading} onClick={onClose}>
            {LABELS.cancel}
          </SubmitButton>
          <SubmitButton type="button" variant={palette.variant} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </SubmitButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ConfirmIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M12 8.25v4.5m0 3h.008M10.29 4.86 2.82 17.14A2 2 0 0 0 4.53 20h14.94a2 2 0 0 0 1.71-2.86L13.71 4.86a2 2 0 0 0-3.42 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
