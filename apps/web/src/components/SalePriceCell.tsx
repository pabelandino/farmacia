import { isHigherSalePrice } from '@farmaplus/domain';
import { compactTdClass, higherPriceClass, tdClass } from './formClasses';

export function SalePriceCell({
  price,
  salePrice1,
  salePrice2,
  compact,
  cellClass,
}: {
  price: number;
  salePrice1: number;
  salePrice2: number;
  compact?: boolean;
  cellClass?: string;
}) {
  const highlight = isHigherSalePrice(price, salePrice1, salePrice2);
  return (
    <td className={`${cellClass ?? (compact ? compactTdClass : tdClass)} ${highlight ? higherPriceClass : ''}`}>
      {price.toFixed(2)}
    </td>
  );
}
