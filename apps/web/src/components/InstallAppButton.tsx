import { LABELS } from '../constants/labels';
import { useInstallApp } from '../hooks/useInstallApp';

export function InstallAppButton({
  className = '',
  tone = 'light',
}: {
  className?: string;
  tone?: 'light' | 'dark';
}) {
  const { canInstall, install } = useInstallApp();
  if (!canInstall) return null;

  const dark = tone === 'dark';

  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
        dark
          ? 'border-white/20 bg-white/10 text-white hover:bg-white/20'
          : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
      } ${className}`}
      onClick={() => { void install(); }}
      title={LABELS.installAppHint}
    >
      <InstallIcon />
      {LABELS.installApp}
    </button>
  );
}

function InstallIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
      <path
        d="M12 3v12m0 0-3.5-3.5M12 15l3.5-3.5M5 21h14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
