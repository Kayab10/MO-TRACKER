import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download,
  CalendarDays,
  LayoutGrid,
  Landmark,
  Tag,
  Factory,
  Sprout,
  ShieldCheck,
  LineChart,
  CalendarClock,
  Banknote,
  PiggyBank,
  type LucideIcon,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GROUPS, type GroupKey } from '../data/taxonomy';
import { funnel, buildGroupReport, perfHighlights, groupSummaries } from '../lib/aggregate';
import { PageHead, SectionTitle, Pills, StatCard, EmptyState } from '../components/ui';
import RangeBar from '../components/RangeBar';
import { fmtLakh, fmtNum, fmtPct, pctTone } from '../lib/format';

type Band = 'all' | 'nil' | 'low' | 'high';

const GROUP_TILES: { key: string; label: string; group: GroupKey; icon: LucideIcon; tint: string }[] = [
  { key: 'Deposits', label: 'Deposits', group: 'Deposits', icon: Landmark, tint: 'bg-sky-100 text-sky-700' },
  { key: 'Retail', label: 'Retail', group: 'Retail', icon: Tag, tint: 'bg-pink-100 text-pink-700' },
  { key: 'GovtSchemes', label: 'Govt. Schemes', group: 'GovtSchemes', icon: Banknote, tint: 'bg-lime-100 text-lime-700' },
  { key: 'MSME', label: 'MSME', group: 'MSME', icon: Factory, tint: 'bg-amber-100 text-amber-700' },
  { key: 'Agriculture', label: 'Agriculture', group: 'Agriculture', icon: Sprout, tint: 'bg-emerald-100 text-emerald-700' },
  { key: 'Insurance', label: 'Insurance', group: 'Insurance', icon: ShieldCheck, tint: 'bg-indigo-100 text-indigo-700' },
  { key: 'MutualFund', label: 'Mutual Fund', group: 'MutualFund', icon: PiggyBank, tint: 'bg-rose-100 text-rose-700' },
];

export default function Dashboard() {
  const { dataset, targets, range, rangeMode, setRangeMode, session, countMode, lowThreshold, roster } =
    useApp();
  const nav = useNavigate();
  const [band, setBand] = useState<Band>('all');
  const [showRange, setShowRange] = useState(false);
  const [gA, setGA] = useState<GroupKey>('Deposits');
  const [gB, setGB] = useState<GroupKey>('Retail');

  const leads = dataset?.leads ?? [];

  const perf = useMemo(
    () => (dataset ? perfHighlights(leads, targets, range, roster, lowThreshold) : { nil: [], low: [] }),
    [dataset, leads, targets, range, countMode, lowThreshold, roster],
  );
  const highCount = roster.length - perf.nil.length - perf.low.length;

  const fA = useMemo(() => funnel(leads, range, (l) => l.group === gA), [leads, range, gA]);
  const fB = useMemo(() => funnel(leads, range, (l) => l.group === gB), [leads, range, gB]);
  const repA = useMemo(
    () => buildGroupReport(leads, targets, gA, range, roster),
    [leads, targets, gA, range, countMode, roster],
  );
  const repB = useMemo(
    () => buildGroupReport(leads, targets, gB, range, roster),
    [leads, targets, gB, range, countMode, roster],
  );
  const summaries = useMemo(
    () => (dataset ? groupSummaries(leads, targets, range, roster) : []),
    [dataset, leads, targets, range, countMode, roster],
  );

  const location = dataset?.leads?.[0]?.zone
    ? `${dataset.leads[0].zone}`
    : 'All Regions';

  const perfLabel =
    rangeMode === 'monthly' ? 'Monthly Performance' : rangeMode === 'custom' ? 'Custom Range' : 'Cumulative Performance';

  return (
    <div>
      <PageHead
        title="Dashboard"
        right={
          <div className="flex flex-col items-end gap-1">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-600 shadow-sm">
              {location}
            </span>
            <button onClick={() => nav('/reports')} className="rounded-full bg-gray-800 p-1.5 text-white">
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        }
      />

      <div className="mb-4">
        <p className="mb-2 text-base font-bold text-gray-600">MO Performance</p>
        <Pills<Band>
          value={band}
          onChange={(b) => {
            setBand(b);
            if (b !== 'all') nav(`/officers?band=${b}`);
          }}
          options={[
            { key: 'all', label: 'All' },
            { key: 'nil', label: `Nil ${dataset ? `(${perf.nil.length})` : ''}` },
            { key: 'low', label: `Low ${dataset ? `(${perf.low.length})` : ''}` },
            { key: 'high', label: `High ${dataset ? `(${Math.max(0, highCount)})` : ''}` },
          ]}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => nav('/reports')}
          className="flex flex-col items-start gap-3 rounded-3xl bg-violet-500 p-4 text-left text-white"
        >
          <Download className="h-7 w-7" />
          <span className="text-lg font-extrabold leading-tight">
            Download
            <br />
            Reports
          </span>
        </button>
        <button
          onClick={() => setShowRange((s) => !s)}
          className="flex flex-col items-start gap-3 rounded-3xl bg-violet-100 p-4 text-left text-violet-700"
        >
          <CalendarDays className="h-7 w-7" />
          <span className="text-lg font-extrabold leading-tight">
            Select
            <br />
            Date Range
          </span>
        </button>
      </div>

      {showRange && (
        <div className="mt-3">
          <RangeBar />
        </div>
      )}

      {session?.role === 'admin' && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button onClick={() => nav('/upload')} className="btn-outline !py-2.5 bg-white">
            Upload Excel
          </button>
          <button onClick={() => nav('/targets')} className="btn-outline !py-2.5 bg-white">
            Set Targets
          </button>
        </div>
      )}

      {!dataset ? (
        <div className="mt-6">
          <EmptyState
            title="No data uploaded yet"
            hint="An Administrator needs to upload the lead Excel file from the Upload tab."
          />
        </div>
      ) : (
        <>
          <SectionTitle>{perfLabel}</SectionTitle>

          <div className="mb-3 flex gap-2 text-xs">
            <GroupSelect value={gA} onChange={setGA} />
            <GroupSelect value={gB} onChange={setGB} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatCard kind="LEAD" group={groupLabel(gA)} number={fA.total.count} amount={fA.total.amount} tone="navy" />
            <StatCard kind="LEAD" group={groupLabel(gB)} number={fB.total.count} amount={fB.total.amount} tone="magenta" />
            <StatCard
              kind="CONVERTED"
              group={groupLabel(gA)}
              number={repA.total.achievement.number}
              amount={repA.total.achievement.amount}
              tone="violet"
            />
            <StatCard
              kind="CONVERTED"
              group={groupLabel(gB)}
              number={repB.total.achievement.number}
              amount={repB.total.achievement.amount}
              tone="teal"
            />
          </div>

          <p className="mt-2 text-center text-[11px] text-gray-400">
            {fmtNum(
              leads.filter((l) => l.assignedDate && l.assignedDate >= range.start && l.assignedDate <= range.end)
                .length,
            )}{' '}
            leads in range · as on{' '}
            {dataset.maxDate
              ? new Date(dataset.maxDate).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : '—'}
          </p>

          <SectionTitle
            action={
              <button onClick={() => nav('/reports')} className="text-sm font-semibold text-violet-600">
                See All
              </button>
            }
          >
            Report by group
          </SectionTitle>
          <div className="grid grid-cols-2 gap-2.5">
            {GROUP_TILES.map((t) => {
              const Icon = t.icon;
              const s = summaries.find((x) => x.group === t.group)!;
              const p = isFinite(s.pct.amount) ? s.pct.amount : s.pct.number;
              const hasT = s.target.number + s.target.amount > 0;
              return (
                <button
                  key={t.key}
                  onClick={() => nav(`/reports?group=${t.group}`)}
                  className="flex flex-col gap-2 rounded-2xl bg-white p-3 text-left shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${t.tint}`}>
                      <Icon className="h-4 w-4" strokeWidth={2.2} />
                    </span>
                    <span className="text-sm font-bold text-gray-700">{t.label}</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-[10px] font-medium uppercase text-gray-400">Achv No / Amt</div>
                      <div className="text-sm font-extrabold tabular-nums text-gray-800">
                        {fmtNum(s.achievement.number)} <span className="text-gray-400">·</span>{' '}
                        {fmtLakh(s.achievement.amount)}
                      </div>
                    </div>
                    <span className={`text-sm font-extrabold ${pctTone(hasT ? p : NaN)}`}>
                      {hasT ? fmtPct(p) : '—'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {(['monthly', 'cumulative'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setRangeMode(m)}
                className={`flex items-center justify-center gap-2 rounded-2xl p-3 text-sm font-bold capitalize shadow-sm ${
                  rangeMode === m ? 'bg-violet-500 text-white' : 'bg-white text-gray-600'
                }`}
              >
                {m === 'monthly' ? <CalendarClock className="h-4 w-4" /> : <LineChart className="h-4 w-4" />}
                {m}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function groupLabel(k: GroupKey) {
  return GROUPS.find((g) => g.key === k)?.label ?? k;
}

function GroupSelect({ value, onChange }: { value: GroupKey; onChange: (v: GroupKey) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as GroupKey)}
      className="flex-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-600"
    >
      {GROUPS.map((g) => (
        <option key={g.key} value={g.key}>
          {g.label}
        </option>
      ))}
    </select>
  );
}
