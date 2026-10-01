import { DEFAULT_PRODUCT_UTILITY_PERCENT, isHigherSalePrice, markupPercent, PRODUCT_UNITS, salePriceFromMarkup, unitCostFromBox, UTILITY_PERCENT_OPTIONS } from '@farmaplus/domain';
import { LABELS } from '../constants/labels';
import { ProductLookups } from '../types/catalog';
import { CatalogPicker } from './CatalogPicker';
import { Field } from './Field';
import { higherPriceClass, inputClass, selectClass } from './formClasses';

export type ProductDraft = {
  sku: string;
  name: string;
  generic: string;
  brand: string;
  line: string;
  unit: string;
  supplier: string;
  unitsPerBox: number;
  utilityPercent: number;
  costPrice: number;
  salePrice1: number;
  salePrice2: number;
  dispatchQty: number;
  warehouseQty: number;
  minQty: number;
  maxQty: number;
};

export function emptyProductDraft(seed?: Partial<ProductDraft>): ProductDraft {
  return {
    sku: '',
    name: '',
    generic: '',
    brand: '',
    line: '',
    unit: 'Unidad',
    supplier: '',
    unitsPerBox: 1,
    utilityPercent: DEFAULT_PRODUCT_UTILITY_PERCENT,
    costPrice: 0,
    salePrice1: 0,
    salePrice2: 0,
    dispatchQty: 0,
    warehouseQty: 0,
    minQty: 0,
    maxQty: 0,
    ...seed,
  };
}

export function nearestUtilityPercent(salePrice: number, unitCost: number) {
  const raw = markupPercent(salePrice, unitCost);
  if (raw <= 0) return DEFAULT_PRODUCT_UTILITY_PERCENT;
  return UTILITY_PERCENT_OPTIONS.reduce((best, value) => (
    Math.abs(value - raw) < Math.abs(best - raw) ? value : best
  ));
}

export function withProductPricing(draft: ProductDraft, next: Partial<ProductDraft>): ProductDraft {
  const merged = { ...draft, ...next };
  const priced = salePriceFromMarkup(unitCostFromBox(merged.costPrice, merged.unitsPerBox || 1), merged.utilityPercent);
  return {
    ...merged,
    salePrice1: priced,
    salePrice2: draft.salePrice2 === draft.salePrice1 ? priced : merged.salePrice2,
  };
}

function unitOptions(current: string) {
  const units: string[] = [...PRODUCT_UNITS];
  if (current && !units.includes(current)) units.unshift(current);
  return units;
}

export function ProductFormFields({
  draft,
  lookups,
  addingBrand,
  addingCategory,
  onChange,
  onAddBrand,
  onAddCategory,
}: {
  draft: ProductDraft;
  lookups: ProductLookups;
  addingBrand?: boolean;
  addingCategory?: boolean;
  onChange: (draft: ProductDraft) => void;
  onAddBrand: (name: string) => Promise<void> | void;
  onAddCategory: (name: string) => Promise<void> | void;
}) {
  const unitCost = unitCostFromBox(draft.costPrice, draft.unitsPerBox || 1);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Field label={LABELS.sku}>
        <input className={inputClass} value={draft.sku} onChange={(event) => onChange({ ...draft, sku: event.target.value })} required />
      </Field>
      <CatalogPicker
        label={LABELS.category}
        value={draft.line}
        options={lookups.categories}
        addLabel={LABELS.addCategory}
        modalTitle={LABELS.newCategory}
        fieldLabel={LABELS.categoryName}
        saving={addingCategory}
        onChange={(line) => onChange({ ...draft, line })}
        onAdd={onAddCategory}
      />
      <CatalogPicker
        label={LABELS.brandLab}
        value={draft.brand}
        options={lookups.brands}
        addLabel={LABELS.addBrand}
        modalTitle={LABELS.newBrand}
        fieldLabel={LABELS.brandName}
        saving={addingBrand}
        onChange={(brand) => onChange({ ...draft, brand })}
        onAdd={onAddBrand}
      />
      <Field label={LABELS.description}>
        <input className={inputClass} value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} required />
      </Field>
      <Field label={LABELS.supplier}>
        <input className={inputClass} value={draft.supplier} onChange={(event) => onChange({ ...draft, supplier: event.target.value })} />
      </Field>
      <Field label={LABELS.generic}>
        <input className={inputClass} value={draft.generic} onChange={(event) => onChange({ ...draft, generic: event.target.value })} />
      </Field>
      <Field label={LABELS.unitsPerBox}>
        <input className={inputClass} type="number" min={1} value={draft.unitsPerBox} onChange={(event) => onChange(withProductPricing(draft, { unitsPerBox: Number(event.target.value) }))} />
      </Field>
      <Field label={LABELS.utilityPercent}>
        <select className={selectClass} value={draft.utilityPercent} onChange={(event) => onChange(withProductPricing(draft, { utilityPercent: Number(event.target.value) }))}>
          {UTILITY_PERCENT_OPTIONS.map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </Field>
      <Field label={LABELS.unitMeasure}>
        <select className={selectClass} value={draft.unit} onChange={(event) => onChange({ ...draft, unit: event.target.value })}>
          {unitOptions(draft.unit).map((unit) => (
            <option key={unit} value={unit}>{unit}</option>
          ))}
        </select>
      </Field>
      <Field label={LABELS.costPrice}>
        <input className={inputClass} type="number" value={draft.costPrice} onChange={(event) => onChange(withProductPricing(draft, { costPrice: Number(event.target.value) }))} />
      </Field>
      <Field label={LABELS.unitCostPrice}>
        <input className={inputClass} type="number" value={unitCost} readOnly />
      </Field>
      <Field label={LABELS.dispatch}>
        <input className={inputClass} type="number" min={0} value={draft.dispatchQty} onChange={(event) => onChange({ ...draft, dispatchQty: Number(event.target.value) })} />
      </Field>
      <Field label={LABELS.warehouse}>
        <input className={inputClass} type="number" min={0} value={draft.warehouseQty} onChange={(event) => onChange({ ...draft, warehouseQty: Number(event.target.value) })} />
      </Field>
      <Field label={LABELS.maxQty}>
        <input className={inputClass} type="number" min={0} value={draft.maxQty} onChange={(event) => onChange({ ...draft, maxQty: Number(event.target.value) })} />
      </Field>
      <Field label={LABELS.minimum}>
        <input className={inputClass} type="number" min={0} value={draft.minQty} onChange={(event) => onChange({ ...draft, minQty: Number(event.target.value) })} />
      </Field>
      <Field label={LABELS.salePrice1Long}>
        <input
          className={`${inputClass} ${isHigherSalePrice(draft.salePrice1, draft.salePrice1, draft.salePrice2) ? higherPriceClass : ''}`}
          type="number"
          value={draft.salePrice1}
          onChange={(event) => onChange({ ...draft, salePrice1: Number(event.target.value) })}
        />
      </Field>
      <Field label={LABELS.salePrice2Long}>
        <input
          className={`${inputClass} ${isHigherSalePrice(draft.salePrice2, draft.salePrice1, draft.salePrice2) ? higherPriceClass : ''}`}
          type="number"
          value={draft.salePrice2}
          onChange={(event) => onChange({ ...draft, salePrice2: Number(event.target.value) })}
        />
      </Field>
    </div>
  );
}
