import { InvoicesReportPanel } from '../components/InvoicesReportPanel';
import { ReportBackLink } from '../components/ReportBackLink';

export default function InvoicesReportPage() {
  return (
    <div className="grid gap-4">
      <ReportBackLink />
      <InvoicesReportPanel />
    </div>
  );
}
