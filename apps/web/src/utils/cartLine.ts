import { salePriceChanged } from '@farmaplus/domain';
import { LABELS } from '../constants/labels';
import { CartLine } from '../types/catalog';
import { toNumber } from './numbers';

export function cartLineName(line: CartLine): string {
  const p1 = toNumber(line.salePrice1);
  const p2 = toNumber(line.salePrice2) || p1;
  if (!salePriceChanged(p1, p2)) return line.name;
  const bin = line.bin === 'warehouse' ? LABELS.warehouse : LABELS.dispatch;
  return `${line.name} (${bin})`;
}
