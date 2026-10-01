import { LABELS } from '../constants/labels';
import { DateInput } from './DateInput';
import { Field } from './Field';

export function DateRangeFields({
  from,
  to,
  onFrom,
  onTo,
}: {
  from: string;
  to: string;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
}) {
  return (
    <>
      <Field label={LABELS.fromDate}>
        <DateInput className="max-w-56" value={from} onChange={onFrom} />
      </Field>
      <Field label={LABELS.toDate}>
        <DateInput className="max-w-56" value={to} onChange={onTo} />
      </Field>
    </>
  );
}
