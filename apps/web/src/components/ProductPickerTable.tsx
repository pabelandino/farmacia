import { existenceQty, isOutOfStock } from '@farmaplus/domain';
import { PRODUCT_PICKER_COLUMNS } from '../constants/tables';
import { LABELS } from '../constants/labels';
import { Product } from '../types/catalog';
import { toNumber } from '../utils/numbers';
import { SalePriceCell } from './SalePriceCell';
import { SubmitButton } from './SubmitButton';
import { TableHead } from './TableHead';
import { TableWrap } from './TableWrap';
import { pickerRowClass, pickerSelectedRowClass, pickerTableClass, pickerTdClass, pickerThClass, pickerWrapTdClass, zeroStockClass } from './formClasses';

export function ProductPickerTable({
  products,
  limit,
  onAdd,
  selectedIds,
  addLabel = LABELS.add,
  className = 'mt-3 max-h-44 overflow-y-auto',
}: {
  products: Product[];
  limit: number;
  onAdd: (product: Product) => void;
  selectedIds?: Iterable<number>;
  addLabel?: string;
  className?: string;
}) {
  const selected = selectedIds ? new Set(selectedIds) : null;
  return (
    <TableWrap className={className}>
      <table className={pickerTableClass}>
        <TableHead columns={PRODUCT_PICKER_COLUMNS} sticky thClassName={pickerThClass} />
        <tbody>
          {products.slice(0, limit).map((product) => {
            const p1 = toNumber(product.salePrice1);
            const p2 = toNumber(product.salePrice2) || p1;
            const existence = existenceQty(toNumber(product.stock), toNumber(product.warehouseQty));
            const outOfStock = isOutOfStock(existence);
            const isSelected = selected?.has(product.id) ?? false;
            const generic = product.generic || '—';
            const brand = product.brand || '—';
            return (
              <tr
                key={product.id}
                className={`${pickerRowClass} ${isSelected ? pickerSelectedRowClass : ''}`}
                onClick={() => onAdd(product)}
              >
                <td className={`${pickerWrapTdClass} tabular-nums`} title={product.sku}>
                  <span className="block wrap-break-word">{product.sku}</span>
                </td>
                <td className={pickerWrapTdClass} title={product.name}>
                  <span className="block wrap-break-word">{product.name}</span>
                </td>
                <td className={pickerWrapTdClass} title={generic}>
                  <span className="block wrap-break-word">{generic}</span>
                </td>
                <td className={pickerWrapTdClass} title={brand}>
                  <span className="block wrap-break-word">{brand}</span>
                </td>
                <td className={`${pickerTdClass} ${outOfStock ? zeroStockClass : ''}`}>{existence.toFixed(2)}</td>
                <td className={pickerTdClass}>{toNumber(product.dispatchQty).toFixed(2)}</td>
                <SalePriceCell cellClass={pickerTdClass} price={p1} salePrice1={p1} salePrice2={p2} />
                <SalePriceCell cellClass={pickerTdClass} price={p2} salePrice1={p1} salePrice2={p2} />
                <td className={pickerTdClass}>
                  <SubmitButton type="button" variant="blue" size="sm">
                    {addLabel}
                  </SubmitButton>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableWrap>
  );
}
