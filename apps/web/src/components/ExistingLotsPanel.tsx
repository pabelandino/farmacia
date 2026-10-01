import { expiryStatus } from '@farmaplus/domain';
import { INTAKE_EXISTING_LOT_COLUMNS } from '../constants/tables';
import { expiryStatusLabel, LABELS } from '../constants/labels';
import { StatusBadge, expiryTone } from './StatusBadge';
import { ProductLot } from '../types/intakes';
import { formatReportDate, todayIso } from '../utils/dates';
import { formatQty } from '../utils/numbers';
import { TableHead } from './TableHead';
import { TableWrap } from './TableWrap';
import { tableClass, tdClass } from './formClasses';

export function ExistingLotsPanel({
  lots,
  newExpiresAt,
}: {
  lots: ProductLot[];
  newExpiresAt?: string;
}) {
  if (!lots.length) return null;
  const today = todayIso();
  const keepsOlder = Boolean(newExpiresAt && lots.some((lot) => lot.expiresAt && lot.expiresAt !== newExpiresAt));

  return (
    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <div className="text-sm font-bold text-amber-900">{LABELS.existingLots}</div>
      <p className="mt-1 text-sm text-amber-800">{LABELS.existingLotsHint}</p>
      {keepsOlder ? (
        <p className="mt-1 text-sm font-semibold text-amber-900">
          {LABELS.newLotKeepsOlder}
        </p>
      ) : null}
      <TableWrap className="mt-2">
        <table className={tableClass}>
          <TableHead columns={INTAKE_EXISTING_LOT_COLUMNS} />
          <tbody>
            {lots.map((lot, index) => {
              const status = lot.expiresAt ? expiryStatus(lot.expiresAt, today) : 'expired';
              return (
                <tr key={lot.id} className={index === 0 ? 'bg-amber-100' : ''}>
                  <td className={tdClass}>{lot.lot}</td>
                  <td className={tdClass}>{lot.expiresAt ? formatReportDate(lot.expiresAt) : ''}</td>
                  <td className={tdClass}>
                    <StatusBadge tone={expiryTone(status)}>{expiryStatusLabel(status)}</StatusBadge>
                  </td>
                  <td className={tdClass}>{formatQty(lot.quantity)}</td>
                  <td className={tdClass}>{formatQty(lot.remaining)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}
