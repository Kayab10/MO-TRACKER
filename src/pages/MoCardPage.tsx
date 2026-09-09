import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { moReportCard } from '../lib/aggregate';
import { PageHead, EmptyState, BigStat } from '../components/ui';
import RangeBar from '../components/RangeBar';
import Gauge from '../components/Gauge';
import { fmtLakh, fmtNum, fmtPct, pctTone } from '../lib/format';

const d = (n: number, f: (n: number) => string) => (n > 0 ? f(n) : '—');

export default function MoCardPage() {
  const { mo = '' } = useParams();
  const name = decodeURIComponent(mo);
  const { dataset, targets, range, countMode, roster } = useApp();

  const card = useMemo(
    () => (dataset && roster.includes(name) ? moReportCard(dataset.leads, targets, name, range) : null),
    [dataset, targets, name, range, countMode, roster],
  );

  if (!card)
    return (
      <div>
        <PageHead title="MO Card" back />
        <EmptyState title="Officer not found or no data." />
      </div>
    );

  const f = card.funnel;
  const op = isFinite(card.overall.pct.amount) ? card.overall.pct.amount : card.overall.pct.number;
  const hasTarget = card.overall.target.amount + card.overall.target.number > 0;

  return (
    <div>
      <PageHead title={name} subtitle="MO report card" back />
      <div className="mb-3">
        <RangeBar />
      </div>

      <div className="card mb-3 flex items-center gap-4 p-4">
        <Gauge value={hasTarget ? op : NaN} label="Achv" size={104} />
        <div className="flex-1 space-y-1 text-sm">
          <Line k="Achievement (No.)" v={fmtNum(card.overall.achievement.number)} />
          <Line k="Achievement (Amt.)" v={`${fmtLakh(card.overall.achievement.amount)} L`} />
          <Line k="Target (Amt.)" v={hasTarget ? `${fmtLakh(card.overall.target.amount)} L` : 'not set'} />
          <Line k="Converted leads" v={fmtNum(f.converted.count)} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <BigStat label="Total Leads" value={fmtNum(f.total.count)} hint={`${fmtLakh(f.total.amount)} L`} />
        <BigStat label="Pending" value={fmtNum(f.pending.count)} hint={`${fmtLakh(f.pending.amount)} L`} />
        <BigStat label="Rejected" value={fmtNum(f.rejected.count)} />
      </div>

      <div className="card mt-4 overflow-hidden">
        <div className="border-b border-gray-100 px-4 py-2.5 text-sm font-extrabold text-violet-800">
          Group-wise (Amount in lakh)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-violet-50 text-[11px] uppercase text-violet-700">
                <th className="px-3 py-2 text-left">Group</th>
                <th className="px-2 py-2 text-right">Tgt No</th>
                <th className="px-2 py-2 text-right">Tgt Amt</th>
                <th className="px-2 py-2 text-right">Achv No</th>
                <th className="px-2 py-2 text-right">Achv Amt</th>
                <th className="px-2 py-2 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {card.groups.map((g) => (
                <tr key={g.group} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium text-gray-800">{g.label}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-gray-400">{d(g.target.number, fmtNum)}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-gray-400">{d(g.target.amount, fmtLakh)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{fmtNum(g.achievement.number)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{fmtLakh(g.achievement.amount)}</td>
                  <td className={`px-2 py-2 text-right font-semibold tabular-nums ${pctTone(g.pct.amount || g.pct.number)}`}>
                    {fmtPct(g.pct.amount || g.pct.number)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-violet-200 bg-violet-50 font-bold">
                <td className="px-3 py-2">Total</td>
                <td className="px-2 py-2 text-right tabular-nums">{d(card.overall.target.number, fmtNum)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{d(card.overall.target.amount, fmtLakh)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{fmtNum(card.overall.achievement.number)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{fmtLakh(card.overall.achievement.amount)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{fmtPct(op)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-500">{k}</span>
      <span className="font-semibold text-gray-800">{v}</span>
    </div>
  );
}
