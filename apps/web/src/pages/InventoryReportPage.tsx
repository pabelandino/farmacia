import { InventoryReportPanel } from '../components/InventoryReportPanel';
import { ReportBackLink } from '../components/ReportBackLink';

export default function InventoryReportPage() {
  return (
    <div className="grid gap-4">
      <ReportBackLink />
      <InventoryReportPanel />
    </div>
  );
}
