import { FormEvent, useEffect, useState } from 'react';
import { LABELS } from '../constants/labels';
import { ProductLookups } from '../types/catalog';
import { emptyProductDraft, ProductDraft, ProductFormFields } from './ProductFormFields';
import { SubmitButton } from './SubmitButton';

export type NewProductDraft = ProductDraft;

export function ProductCreateModal({
  open,
  lookups,
  seed,
  saving,
  addingBrand,
  addingCategory,
  onClose,
  onSave,
  onAddBrand,
  onAddCategory,
}: {
  open: boolean;
  lookups: ProductLookups;
  seed?: Partial<ProductDraft>;
  saving?: boolean;
  addingBrand?: boolean;
  addingCategory?: boolean;
  onClose: () => void;
  onSave: (draft: ProductDraft) => void;
  onAddBrand: (name: string) => Promise<void> | void;
  onAddCategory: (name: string) => Promise<void> | void;
}) {
  const [draft, setDraft] = useState<ProductDraft>(() => emptyProductDraft(seed));

  useEffect(() => {
    if (open) setDraft(emptyProductDraft(seed));
  }, [open]);

  if (!open) return null;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.sku.trim() || !draft.name.trim()) return;
    onSave(draft);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-10 backdrop-blur-[2px]">
      <form className="w-full max-w-4xl rounded-[28px] bg-white/90 p-4 shadow-sm ring-1 ring-white/80 backdrop-blur sm:p-5" onSubmit={submit}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">{LABELS.newProduct}</h2>
          <SubmitButton type="button" variant="ghost" className="px-3 py-1.5" onClick={onClose}>{LABELS.close}</SubmitButton>
        </div>
        <ProductFormFields
          draft={draft}
          lookups={lookups}
          addingBrand={addingBrand}
          addingCategory={addingCategory}
          onChange={setDraft}
          onAddBrand={onAddBrand}
          onAddCategory={onAddCategory}
        />
        <div className="mt-4 flex justify-end gap-2">
          <SubmitButton type="button" variant="ghost" onClick={onClose}>{LABELS.close}</SubmitButton>
          <SubmitButton loading={saving}>{LABELS.save}</SubmitButton>
        </div>
      </form>
    </div>
  );
}
