import { ReactNode } from 'react';

export function Panel({
  title,
  tone = 'purple',
  children,
  className = '',
}: {
  title: string;
  tone?: 'purple' | 'blue' | 'orange';
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    purple: 'bg-violet-300',
    blue: 'bg-sky-300',
    orange: 'bg-amber-300',
  };
  return (
    <section className={`overflow-hidden rounded-[28px] bg-white/90 shadow-sm ring-1 ring-slate-100 ${className}`}>
      <div className="flex items-center gap-2 px-5 pt-4">
        <span className={`h-2 w-2 rounded-full ${tones[tone]}`} />
        <h2 className="text-[15px] font-semibold text-slate-800">{title}</h2>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}
