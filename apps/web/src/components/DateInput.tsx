import { useState } from 'react';
import { formatReportDate, parseDmyToIso } from '../utils/dates';
import { inputClass } from './formClasses';

export function DateInput({
  value,
  onChange,
  className = 'max-w-80',
}: {
  value: string;
  onChange: (iso: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(() => formatReportDate(value));
  const display = editing ? text : formatReportDate(value);

  function commit(raw: string) {
    const iso = parseDmyToIso(raw);
    if (iso) {
      onChange(iso);
      setText(formatReportDate(iso));
      return;
    }
    if (!raw.trim()) {
      onChange('');
      setText('');
      return;
    }
    setText(formatReportDate(value));
  }

  return (
    <span className={`relative block w-full ${className}`}>
      <input
        className={`${inputClass} max-w-none pr-8`}
        inputMode="numeric"
        placeholder="dd/mm/aaaa"
        value={display}
        onFocus={() => {
          setEditing(true);
          setText(formatReportDate(value) || text);
        }}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          const iso = parseDmyToIso(next);
          if (iso) onChange(iso);
          if (!next.trim()) onChange('');
        }}
        onBlur={() => {
          commit(text);
          setEditing(false);
        }}
      />
      <input
        type="date"
        tabIndex={-1}
        aria-label="Calendario"
        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 cursor-pointer opacity-0"
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
      />
    </span>
  );
}
