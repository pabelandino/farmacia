import { ReactNode } from 'react';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0 text-xs font-semibold text-slate-600">
      <span className="mb-0.5 block">{label}</span>
      {children}
    </label>
  );
}
