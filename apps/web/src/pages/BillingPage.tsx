import { Outlet } from 'react-router-dom';
import { BillingTabs } from '../components/BillingTabs';

export default function BillingPage() {
  return (
    <div className="grid gap-3">
      <BillingTabs />
      <Outlet />
    </div>
  );
}
