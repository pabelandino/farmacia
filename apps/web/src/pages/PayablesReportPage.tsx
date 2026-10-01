import { PayablesReportPanel } from '../components/PayablesReportPanel';
import { ReportBackLink } from '../components/ReportBackLink';

export default function PayablesReportPage() {
  return (
    <div className="grid gap-4">
      <ReportBackLink />
      <PayablesReportPanel />
    </div>
  );
}
