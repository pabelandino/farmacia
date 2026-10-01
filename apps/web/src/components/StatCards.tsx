const STAT_TONES = [
  'bg-[#ece8ff] dark:bg-[#2a2540]',
  'bg-[#e7f6b8] dark:bg-[#2a3320]',
  'bg-[#d8f3ee] dark:bg-[#1c322e]',
  'bg-[#f8dce6] dark:bg-[#3a2430]',
  'bg-white ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700',
  'bg-[#e7f0ff] dark:bg-[#1e2a40]',
  'bg-[#fff3d6] dark:bg-[#3a3018]',
];

export function StatCards({
  items,
}: {
  items: Array<[string, string | number, string?]>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map(([label, value, hint], index) => (
        <article
          key={label}
          className={`rounded-[28px] p-5 shadow-sm ${STAT_TONES[index % STAT_TONES.length]}`}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/70 text-slate-700">
            <StatGlyph index={index} />
          </div>
          <h3 className="mt-5 text-sm font-semibold text-slate-800">{label}</h3>
          {hint ? <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{hint}</p> : null}
          <div className="mt-6 flex items-end justify-between gap-3">
            <p className="text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white/80 text-slate-700 shadow-sm">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                <path d="M7 17 17 7M9 7h8v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

function StatGlyph({ index }: { index: number }) {
  const paths = [
    'M4 19V9m5 10V5m5 14v-6m5 6V8',
    'M12 3v18M5 10h14M5 16h14',
    'M5 12h14M12 5v14',
    'M4 7h16M4 12h10M4 17h7',
    'M5 19h14V8L12 4 5 8v11Z',
    'M12 8v8m-4-4h8',
    'M12 5v2m0 10v2M5 12H3m18 0h-2M6.3 6.3 5 5m14 14-1.3-1.3M17.7 6.3 19 5M6.3 17.7 5 19',
  ];
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path d={paths[index % paths.length]} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
