import { NavLink } from 'react-router-dom';
import { BILLING_TABS } from '../constants/nav';

export function BillingTabs() {
  return (
    <nav className="no-print inline-flex w-fit rounded-full bg-slate-100 p-1 dark:bg-slate-800" aria-label="Tipo de factura">
      {BILLING_TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            `rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              isActive ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-100'
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
