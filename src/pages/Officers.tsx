import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { moReportCard, perfHighlights } from '../lib/aggregate';
import { PageHead, Pills, EmptyState } from '../components/ui';
import RangeBar from '../components/RangeBar';
import { fmtPct, fmtNum, pctTone } from '../lib/format';

type Band = 'all' | 'nil' | 'low' | 'high';

export default function Officers() {
  const { dataset, targets, range, countMode, lowThreshold, roster } = useApp();
  const [params, setParams] = useSearchParams();
  const band = ((params.get('band') as Band) || 'all') as Band;

  const cards = useMemo(() => {
    if (!dataset) return [];
    return roster.map((mo) => moReportCard(dataset.leads, targets, mo, range));
  }, [dataset, targets, range, countMode, roster]);

  const perf = useMemo(
    () => (dataset ? perfHighlights(dataset!.leads, targets, range, roster, lowThreshold) : { nil: [], low: [] }),
    [dataset, targets, range, countMode, lowThreshold, roster],
  );

  if (!dataset)
    return (
      <div>
        <PageHead title="MO Cards" />
        <EmptyState title="No data uploaded yet" />
      </div>
    );

  const lowSet = new Set(perf.low.map((l) => l.mo));
  const nilSet = new Set(perf.nil);
  const filtered = cards.filter((c) => {
    if (band === 'nil') return nilSet.has(c.mo);
    if (band === 'low') return lowSet.has(c.mo);
    if (band === 'high') return !nilSet.has(c.mo) && !lowSet.has(c.mo);
    return true;
  });

  return (
    <div>
      <PageHead title="MO Cards" subtitle={`${filtered.length} of ${roster.length} officers`} />
      <div className="mb-3">
        <RangeBar />
      </div>
      <div className="mb-4">
        <Pills<Band>
          value={band}
          onChange={(b) => setParams(b === 'all' ? {} : { band: b })}
          options={[
            { key: 'all', label: 'All' },
            { key: 'nil', label: `Nil (${perf.nil.length})` },
            { key: 'low', label: `Low (${perf.low.length})` },
            { key: 'high', label: `High (${Math.max(0, roster.length - perf.nil.length - perf.low.length)})` },
          ]}
        />
      </div>

      <div className="space-y-2.5">
        {filtered.map((c) => {
          const p = c.overall.pct.amount || c.overall.pct.number;
          return (
            <Link
              key={c.mo}
              to={`/officers/${encodeURIComponent(c.mo)}`}
              className="card flex items-center justify-between gap-3 p-3.5"
            >
              <div className="min-w-0">
                <div className="truncate font-bold text-gray-800">{c.mo}</div>
                <div className="text-xs font-medium text-gray-500">
                  {fmtNum(c.funnel.converted.count)} converted · {fmtNum(c.pendingCount)} pending
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className={`text-lg font-extrabold ${pctTone(p)}`}>{fmtPct(p)}</div>
                  <div className="text-[10px] text-gray-400">of target</div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-300" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
