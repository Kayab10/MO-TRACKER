import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, ClipboardList, ArrowUp, Users, BellRing } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Logo, Wordmark } from './Brand';

const TABS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/reports', label: 'Reports', icon: ClipboardList },
  { to: '/officers', label: 'MO Cards', icon: Users },
  { to: '/highlights', label: 'Alerts', icon: BellRing },
];

export default function Layout() {
  const { session } = useApp();
  const nav = useNavigate();
  const fabTo = '/upload';

  return (
    <div className="mx-auto min-h-full max-w-md bg-shell shadow-xl sm:min-h-screen">
      <div className="sticky top-0 z-20 flex items-center justify-between bg-shell/90 px-4 py-2.5 backdrop-blur">
        <button onClick={() => nav('/')} className="flex items-center gap-2">
          <Logo className="h-7 w-7" />
          <span className="text-sm">
            <Wordmark />
          </span>
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => nav('/highlights')} className="rounded-full bg-white p-2 shadow-sm" aria-label="Alerts">
            <BellRing className="h-4 w-4 text-gray-500" />
          </button>
          <button
            onClick={() => nav('/settings')}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500 text-xs font-bold text-white"
            aria-label="Settings"
          >
            {session?.name?.[0]?.toUpperCase() ?? 'U'}
          </button>
        </div>
      </div>

      <main className="px-4 pb-28 pt-3">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-gray-200 bg-white">
        <div className="relative grid grid-cols-5 items-center px-2 py-2">
          {TABS.slice(0, 2).map(({ to, label, icon: Icon, end }) => (
            <Tab key={to} to={to} label={label} Icon={Icon} end={end} />
          ))}
          <div className="flex justify-center">
            <button
              onClick={() => nav(fabTo)}
              className="-mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-violet-500 text-white shadow-lg ring-4 ring-shell"
              aria-label="Upload Excel"
            >
              <ArrowUp className="h-6 w-6" />
            </button>
          </div>
          {TABS.slice(2).map(({ to, label, icon: Icon }) => (
            <Tab key={to} to={to} label={label} Icon={Icon} />
          ))}
        </div>
      </nav>
    </div>
  );
}

function Tab({ to, label, Icon, end }: { to: string; label: string; Icon: typeof Home; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex flex-col items-center gap-0.5 py-1 text-[10px] font-semibold ${
          isActive ? 'text-violet-600' : 'text-gray-400'
        }`
      }
    >
      <Icon className="h-5 w-5" />
      {label}
    </NavLink>
  );
}
