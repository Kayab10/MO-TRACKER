import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart3, ChevronUp, Target, TrendingUp, Percent } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { pendency, perfHighlights } from '../lib/aggregate';
import { GROUPS, type GroupKey } from '../data/taxonomy';
import { PageHead, SectionTitle, EmptyState } from '../components/ui';
import RangeBar from '../components/RangeBar';
import { fmtLakh, fmtNum, fmtPct } from '../lib/format';

type Cut = 'region' | 'branch' | 'mo';

export default function Highlights() {
  const { dataset, targets, range, session, countMode, lowThreshold, roster } = useApp();
  const nav = useNavigate();
  const [cut, setCut] = useState<Cut>('region');
  const [group, setGroup] = useState<GroupKey | 'all'>('all');
  const [open, setOpen] = useState(true);

  const pend = useMemo(
    () => (dataset ? pendency(dataset.leads, range, group === 'all' ? undefined : group) : null),
    [dataset, range, group],
  );
  const perf = useMemo(
    () => (dataset ? perfHighlights(dataset.leads, targets, range, roster, lowThreshold) : { nil: [], low: [] }),
    [dataset, targets, range, countMode, lowThreshold, roster],
  );

  if (!dataset)
    return (
      <div>
        <PageHead title="Highlights" />
        <EmptyState title="No data uploaded yet" />
      </div>
    );

  const rows = cut === 'region' ? pend!.byRegion : cut === 'branch' ? pend!.byBranch : pend!.byMo;

  return (
    <div>
      <PageHead title="Highlights" subtitle="Lead pendency & performance" />
      <div className="mb-4">
        <RangeBar />
      </div>

      {/* Region / Stats / Branch */}
      <div className="mb-4 grid grid-cols-3 items-center gap-2">
        <button
          onClick={() => setCut('region')}
          className={`rounded-2xl px-3 py-3 text-center text-sm font-bold leading-tight ${
            cut === 'region' ? 'bg-violet-500 text-white' : 'bg-violet-100 text-violet-700'
          }`}
        >
          Region
          <br />
          Wise
        </button>
        <button onClick={() => setCut('mo')} className="flex flex-col items-center gap-1 text-gray-700">
          <BarChart3 className={`h-6 w-6 ${cut === 'mo' ? 'text-violet-600' : ''}`} />
          <span className="text-xs font-bold">Stats</span>
        </button>
        <button
          onClick={() => setCut('branch')}
          className={`rounded-2xl px-3 py-3 text-center text-sm font-bold leading-tight ${
            cut === 'branch' ? 'bg-violet-500 text-white' : 'bg-violet-100 text-violet-700'
          }`}
        >
          Branch
          <br />
          Wise
        </button>
      </div>

      {/* Lead pendency card */}
      <div className="rounded-3xl bg-violet-500 p-4 text-white">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Lead Pendency</h2>
          <button onClick={() => setOpen((o) => !o)} className="rounded-full bg-lime-400 p-1.5 text-violet-900">
            <ChevronUp className={`h-4 w-4 transition ${open ? '' : 'rotate-180'}`} />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip active={group === 'all'} onClick={() => setGroup('all')}>
            All
          </Chip>
          {GROUPS.filter((g) => g.key !== 'BuilderTieup' && g.key !== 'DealerTieup').map((g) => (
            <Chip key={g.key} active={group === g.key} onClick={() => setGroup(g.key)}>
              {g.label}
            </Chip>
          ))}
        </div>
        {open && (
          <div className="mt-4 overflow-hidden rounded-2xl bg-white/95 text-gray-800">
            <div className="max-h-72 divide-y divide-gray-100 overflow-y-auto">
              {rows.slice(0, 50).map((r) => (
                <div key={r.name} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="truncate pr-3 font-medium">{r.name}</span>
                  <span className="shrink-0 tabular-nums text-gray-500">
                    {fmtNum(r.count)} · {fmtLakh(r.amount)} L
                  </span>
                </div>
              ))}
              {!rows.length && (
                <div className="px-4 py-6 text-center text-sm text-gray-400">No pending leads.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Big pending stats */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-gradient-to-br from-violet-100 to-violet-50 p-4">
          <div className="text-sm font-semibold text-violet-700">Pending Leads</div>
          <div className="text-xs font-medium text-gray-500">Number</div>
          <div className="mt-4 text-4xl font-extrabold tracking-tight text-gray-800">
            {fmtNum(pend!.overall.count)}
          </div>
        </div>
        <div className="rounded-3xl bg-gradient-to-br from-violet-100 to-violet-50 p-4">
          <div className="text-sm font-semibold text-violet-700">Pending Leads</div>
          <div className="text-xs font-medium text-gray-500">Amount (lakh)</div>
          <div className="mt-4 text-4xl font-extrabold tracking-tight text-gray-800">
            {fmtLakh(pend!.overall.amount)}
          </div>
        </div>
      </div>

      {/* Target / Progress / Score */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {session?.role === 'admin' && (
          <button onClick={() => nav('/targets')} className="tile !bg-violet-50 !text-violet-700 py-4">
            <Target className="h-5 w-5" />
            Target
          </button>
        )}
        <button onClick={() => nav('/reports')} className="tile !bg-violet-50 !text-violet-700 py-4">
          <TrendingUp className="h-5 w-5" />
          Progress
        </button>
        <button onClick={() => nav('/officers')} className="tile !bg-violet-50 !text-violet-700 py-4">
          <Percent className="h-5 w-5" />
          Score
        </button>
      </div>

      <SectionTitle>Nil Performance ({perf.nil.length})</SectionTitle>
      {perf.nil.length ? (
        <div className="flex flex-wrap gap-2">
          {perf.nil.map((mo) => (
            <Link
              key={mo}
              to={`/officers/${encodeURIComponent(mo)}`}
              className="rounded-full bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700"
            >
              {mo}
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">Every officer has at least one conversion.</p>
      )}

      <SectionTitle>Low Performance ({perf.low.length})</SectionTitle>
      <div className="card divide-y divide-gray-100">
        {perf.low.map((l) => (
          <Link
            key={l.mo}
            to={`/officers/${encodeURIComponent(l.mo)}`}
            className="flex items-center justify-between px-4 py-2.5 text-sm"
          >
            <span className="font-medium text-gray-700">{l.mo}</span>
            <span className="font-semibold text-orange-600">{fmtPct(l.pct)}</span>
          </Link>
        ))}
        {!perf.low.length && (
          <div className="px-4 py-6 text-center text-sm text-gray-400">
            No officers below threshold {targets && Object.keys(targets).length ? '' : '(set targets first)'}.
          </div>
        )}
      </div>

    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active ? 'bg-lime-400 text-violet-900' : 'bg-white/90 text-gray-600'
      }`}
    >
      {children}
    </button>
  );
}
