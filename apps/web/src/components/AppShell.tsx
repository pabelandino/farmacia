import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ReactNode, useEffect, useState } from 'react';
import { hasPermission } from '@farmaplus/domain';
import { clearSession, getUser, onSessionChange } from '../api/session';
import { APP_LINKS, AppNavItem } from '../constants/nav';
import { visibleNavItems } from '../constants/permissions';
import { LABELS } from '../constants/labels';
import { InstallAppButton } from './InstallAppButton';
import { SwitchUserModal } from './SwitchUserModal';
import { ThemeToggle } from './ThemeToggle';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center rounded-2xl px-3 py-2 text-sm font-semibold transition ${
    isActive
      ? 'nav-link-active shadow-sm'
      : 'text-slate-500 hover:bg-white/80 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-100'
  }`;

function linkIsActive(item: AppNavItem, pathname: string, isActive: boolean) {
  if (item.match) return item.match.includes(pathname);
  return isActive;
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const user = getUser();
  const links = visibleNavItems(APP_LINKS, (key) => hasPermission(user, key));

  return (
    <>
      {links.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) => navClass({ isActive: linkIsActive(item, location.pathname, isActive) })}
        >
          {item.label}
        </NavLink>
      ))}
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [, setSessionTick] = useState(0);
  const user = getUser();
  const [open, setOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);

  useEffect(() => onSessionChange(() => setSessionTick((value) => value + 1)), []);

  function logout() {
    clearSession();
    navigate('/login');
  }

  return (
    <div className="app-canvas print:min-h-0 print:bg-white">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-3 p-3 sm:p-4 print:block print:p-0">
        <aside className="no-print hidden w-56 shrink-0 flex-col rounded-[28px] bg-white/75 p-4 shadow-sm ring-1 ring-white/80 backdrop-blur md:flex">
          <div className="px-2 pb-5 text-lg font-black tracking-tight text-slate-900">{LABELS.appName}</div>
          <nav className="grid gap-0.5">
            <NavItems />
          </nav>
          <div className="mt-auto grid gap-2">
            <InstallAppButton className="w-full" />
            <ThemeToggle className="w-full" />
            <div className="rounded-2xl bg-slate-900 px-3 py-3 text-white dark:bg-slate-800">
            <div className="text-sm font-bold">{user?.username}</div>
            <div className="text-[11px] text-slate-300">{user?.role === 'ADMIN' ? LABELS.adminRole : LABELS.cashierRole}</div>
            <button
              type="button"
              className="mt-3 w-full rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20"
              onClick={() => setSwitchOpen(true)}
            >
              {LABELS.switchUser}
            </button>
            <button
              type="button"
              className="mt-2 w-full rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20"
              onClick={logout}
            >
              {LABELS.logout}
            </button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="no-print mb-3 flex items-center justify-between gap-3 rounded-[24px] bg-white/80 px-3 py-2 shadow-sm ring-1 ring-white/80 backdrop-blur md:hidden">
            <div className="text-base font-black tracking-tight">{LABELS.appName}</div>
            <div className="flex items-center gap-2">
              <InstallAppButton />
              <ThemeToggle />
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800"
                onClick={() => setOpen((value) => !value)}
              >
                {LABELS.menu}
              </button>
            </div>
          </header>
          {open ? (
            <nav className="no-print mb-3 grid gap-1 rounded-[24px] bg-white/90 p-3 shadow-sm ring-1 ring-white/80 backdrop-blur md:hidden">
              <NavItems onNavigate={() => setOpen(false)} />
              <InstallAppButton className="w-full" />
              <ThemeToggle className="w-full" />
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-800"
                onClick={() => { setOpen(false); setSwitchOpen(true); }}
              >
                {LABELS.switchUser}
              </button>
              <button
                type="button"
                className="rounded-full bg-slate-900 px-3 py-2 text-left text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
                onClick={logout}
              >
                {LABELS.logout}
              </button>
            </nav>
          ) : null}
          <main className="min-h-0 flex-1 rounded-[28px] bg-white/85 p-3 shadow-sm ring-1 ring-white/80 backdrop-blur sm:p-5 print:rounded-none print:bg-white print:p-0 print:shadow-none print:ring-0">
            {children}
          </main>
        </div>
      </div>
      <SwitchUserModal open={switchOpen} onClose={() => setSwitchOpen(false)} />
    </div>
  );
}
