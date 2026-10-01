import { ExpiredProductsReportPanel } from '../components/ExpiredProductsReportPanel';
import { ReportBackLink } from '../components/ReportBackLink';

export default function ExpiredProductsReportPage() {
  return (
    <div className="grid gap-4">
      <ReportBackLink />
      <ExpiredProductsReportPanel />
    </div>
  );
}
