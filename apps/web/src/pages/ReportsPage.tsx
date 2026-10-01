import { Link } from 'react-router-dom';
import { Panel } from '../components/Panel';
import { LABELS } from '../constants/labels';
import { REPORT_ITEMS } from '../constants/nav';

const REPORT_TONES = [
  'bg-[#ece8ff] dark:bg-[#2a2540]',
  'bg-[#e7f6b8] dark:bg-[#2a3320]',
  'bg-[#d8f3ee] dark:bg-[#1c322e]',
  'bg-[#f8dce6] dark:bg-[#3a2430]',
  'bg-[#e7f0ff] dark:bg-[#1e2a40]',
  'bg-[#fff3d6] dark:bg-[#3a3018]',
  'bg-white ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700',
];

export default function ReportsPage() {
  return (
    <div className="grid gap-4">
      <Panel title={LABELS.reports}>
        <p className="mb-4 text-sm text-slate-500">Elija un reporte para consultarlo.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {REPORT_ITEMS.map((item, index) => (
            <Link
              key={item.to}
              to={item.to}
              className={`rounded-[28px] p-5 transition hover:-translate-y-0.5 hover:shadow-md ${REPORT_TONES[index % REPORT_TONES.length]}`}
            >
              <div className="text-base font-semibold text-slate-900">{LABELS[item.title]}</div>
              <p className="mt-1 text-sm text-slate-600">{LABELS[item.description]}</p>
              <span className="mt-4 inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800">
                {LABELS.openReport}
              </span>
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  );
}
