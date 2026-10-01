import { ReportBackLink } from '../components/ReportBackLink';
import { SalesLinesReportPanel } from '../components/SalesLinesReportPanel';

export default function SalesLinesReportPage() {
  return (
    <div className="grid gap-4">
      <ReportBackLink />
      <SalesLinesReportPanel />
    </div>
  );
}
