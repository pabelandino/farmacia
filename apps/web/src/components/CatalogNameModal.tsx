import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LABELS } from '../constants/labels';
import { Field } from './Field';
import { SubmitButton } from './SubmitButton';
import { inputClass } from './formClasses';

export function CatalogNameModal({
  open,
  title,
  fieldLabel,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  fieldLabel: string;
  saving?: boolean;
  onClose: () => void;
  onSave: (name: string) => void | Promise<void>;
}) {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');

  useEffect(() => {
    if (!open) return;
    setName('');
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !saving) onClose();
    }

    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, saving, onClose]);

  if (!open) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    event.stopPropagation();
    const next = name.trim();
    if (!next || saving) return;
    await onSave(next);
  }

  return createPortal(
    <div
      className="no-print fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <form
        className="w-full max-w-sm rounded-[28px] bg-white/90 p-5 shadow-sm ring-1 ring-white/80 backdrop-blur sm:p-6"
        onSubmit={submit}
      >
        <h2 id={titleId} className="text-lg font-semibold tracking-tight text-slate-900">
          {title}
        </h2>
        <p className="mt-1 text-sm text-slate-600">{LABELS.catalogNameHint}</p>
        <div className="mt-4">
          <Field label={fieldLabel}>
            <input
              ref={inputRef}
              className={inputClass}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <SubmitButton type="button" variant="ghost" disabled={saving} onClick={onClose}>
            {LABELS.cancel}
          </SubmitButton>
          <SubmitButton loading={saving}>{LABELS.save}</SubmitButton>
        </div>
      </form>
    </div>,
    document.body,
  );
}
