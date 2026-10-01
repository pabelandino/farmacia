import { lineAmount } from '@farmaplus/domain';
import { POS_LINE_COLUMNS } from '../constants/tables';
import { LABELS } from '../constants/labels';
import { CartLine, cartLineKey } from '../types/catalog';
import { cartLineName } from '../utils/cartLine';
import { toNumber } from '../utils/numbers';
import { NumericInput } from './NumericInput';
import { SalePriceCell } from './SalePriceCell';
import { SubmitButton } from './SubmitButton';
import { TableHead } from './TableHead';
import { TableWrap } from './TableWrap';
import { compactTableClass, compactTdClass } from './formClasses';

export function InvoiceLinesTable({
  cart,
  onQty,
  onRemove,
}: {
  cart: CartLine[];
  onQty: (lineKey: string, quantity: number) => void;
  onRemove: (lineKey: string) => void;
}) {
  return (
    <TableWrap className="mt-1 max-h-48 overflow-y-auto">
      <table className={compactTableClass}>
        <TableHead columns={POS_LINE_COLUMNS} sticky compact />
        <tbody>
          {cart.map((line) => (
            <tr key={cartLineKey(line)}>
              <td className={compactTdClass}>{cartLineName(line)}</td>
              <td className={compactTdClass}>
                <NumericInput compact min={1} value={line.quantity} onCommit={(qty) => onQty(cartLineKey(line), qty)} />
              </td>
              <SalePriceCell compact price={line.price} salePrice1={toNumber(line.salePrice1)} salePrice2={toNumber(line.salePrice2) || toNumber(line.salePrice1)} />
              <td className={compactTdClass}>{lineAmount(line.price, line.quantity).toFixed(2)}</td>
              <td className={compactTdClass}>
                <SubmitButton type="button" variant="danger" size="sm" onClick={() => onRemove(cartLineKey(line))}>
                  {LABELS.remove}
                </SubmitButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrap>
  );
}
