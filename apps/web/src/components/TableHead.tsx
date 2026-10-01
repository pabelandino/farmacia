import { columnClass, columnKey, TableColumn } from '../constants/tables';
import { LABELS } from '../constants/labels';
import { compactThClass, thClass } from './formClasses';

export function TableHead({
  columns,
  sticky,
  compact,
  thClassName,
}: {
  columns: readonly TableColumn[];
  sticky?: boolean;
  compact?: boolean;
  thClassName?: string;
}) {
  const baseTh = thClassName ?? (compact ? compactThClass : thClass);
  return (
    <thead>
      <tr>
        {columns.map((column, index) => {
          const key = columnKey(column);
          const extra = columnClass(column);
          return (
            <th
              key={`${key}-${index}`}
              className={`${baseTh} ${sticky ? 'sticky top-0 z-10 shadow-[0_1px_0_0_rgb(226_232_240)]' : ''} ${extra}`.trim()}
            >
              {LABELS[key]}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}
