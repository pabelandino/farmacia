import { useEffect, useState } from 'react';
import { compactQtyInputClass, inputClass } from './formClasses';

export function NumericInput({
  value,
  min = 0,
  className = '',
  compact,
  onCommit,
}: {
  value: number;
  min?: number;
  className?: string;
  compact?: boolean;
  onCommit: (value: number) => void;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  function parse(raw: string) {
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed === '-' || trimmed === '.' || trimmed === '-.') return null;
    if (/[.,]$/.test(trimmed)) return null;
    const next = Number(trimmed);
    if (!Number.isFinite(next) || next < min) return null;
    return next;
  }

  function commit() {
    const next = parse(text);
    if (next === null) {
      setText(String(value));
      return;
    }
    onCommit(next);
  }

  return (
    <input
      className={`${compact ? compactQtyInputClass : inputClass} ${className}`}
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        const next = parse(raw);
        if (next !== null) onCommit(next);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit();
        }
      }}
    />
  );
}
