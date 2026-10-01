import { Link } from 'react-router-dom';
import { hasPermission } from '@farmaplus/domain';
import { getUser } from '../api/session';
import { LABELS } from '../constants/labels';

export function ReportBackLink() {
  if (!hasPermission(getUser(), 'reports')) return null;
  return (
    <Link
      to="/reportes"
      className="inline-flex w-fit rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
    >
      ← {LABELS.backToReports}
    </Link>
  );
}
