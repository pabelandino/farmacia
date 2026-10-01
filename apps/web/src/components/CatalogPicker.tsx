import { useState } from 'react';
import { LABELS } from '../constants/labels';
import { CatalogNameModal } from './CatalogNameModal';
import { Field } from './Field';
import { SubmitButton } from './SubmitButton';
import { selectClass } from './formClasses';

export function CatalogPicker({
  label,
  value,
  options,
  addLabel,
  modalTitle,
  fieldLabel,
  saving,
  onChange,
  onAdd,
}: {
  label: string;
  value: string;
  options: string[];
  addLabel: string;
  modalTitle: string;
  fieldLabel: string;
  saving?: boolean;
  onChange: (value: string) => void;
  onAdd: (name: string) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const names = value && !options.includes(value) ? [value, ...options] : options;

  async function save(name: string) {
    await onAdd(name);
    onChange(name);
    setOpen(false);
  }

  return (
    <>
      <div className="flex min-w-0 items-end gap-2">
        <div className="min-w-0 flex-1">
          <Field label={label}>
            <select className={selectClass} value={value} onChange={(event) => onChange(event.target.value)}>
              <option value="">{LABELS.selectCatalog}</option>
              {names.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </Field>
        </div>
        <SubmitButton type="button" variant="blue" size="sm" className="mb-0.5 shrink-0" onClick={() => setOpen(true)}>
          {addLabel}
        </SubmitButton>
      </div>
      <CatalogNameModal
        open={open}
        title={modalTitle}
        fieldLabel={fieldLabel}
        saving={saving}
        onClose={() => { if (!saving) setOpen(false); }}
        onSave={save}
      />
    </>
  );
}
