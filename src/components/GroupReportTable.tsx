import { GROUP_LABEL } from '../data/taxonomy';
import { fmtLakh, fmtNum, fmtPct, pctTone } from '../lib/format';
import type { GroupReport } from '../lib/aggregate';

const dash = (n: number, fmt: (n: number) => string) => (n > 0 ? fmt(n) : '—');

export default function GroupReportTable({ report }: { report: GroupReport }) {
  const t = report.total;
  return (
    <div className="print-area card overflow-hidden">
      <div className="border-b border-gray-100 px-4 py-3 text-center">
        <div className="text-sm font-extrabold uppercase tracking-wide text-violet-800">
          MO Performance Report ({GROUP_LABEL[report.group]})
        </div>
        <div className="text-xs font-medium text-gray-500">{report.range.label}</div>
        <div className="text-[11px] italic text-gray-400">Amount in lakh</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-violet-50 text-[11px] uppercase tracking-wide text-violet-800">
              <th className="sticky left-0 z-10 bg-violet-50 px-2 py-2" rowSpan={2}>
                Sl
              </th>
              <th className="sticky left-8 z-10 bg-violet-50 px-2 py-2 text-left" rowSpan={2}>
                MO Name
              </th>
              <th className="px-2 py-2" colSpan={2}>
                Target
              </th>
              <th className="px-2 py-2" colSpan={2}>
                Achievement
              </th>
              <th className="px-2 py-2" colSpan={2}>
                Achv %
              </th>
            </tr>
            <tr className="bg-violet-50 text-[11px] text-violet-700">
              <th className="px-2 py-1 font-semibold">No.</th>
              <th className="px-2 py-1 font-semibold">Amt.</th>
              <th className="px-2 py-1 font-semibold">No.</th>
              <th className="px-2 py-1 font-semibold">Amt.</th>
              <th className="px-2 py-1 font-semibold">No.</th>
              <th className="px-2 py-1 font-semibold">Amt.</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((r, i) => (
              <tr key={r.mo} className={`border-t border-gray-100 ${i % 2 ? 'bg-gray-50/60' : ''}`}>
                <td className={`sticky left-0 z-10 px-2 py-2 text-center text-gray-500 ${i % 2 ? 'bg-gray-50' : 'bg-white'}`}>
                  {r.slNo}
                </td>
                <td className={`sticky left-8 z-10 whitespace-nowrap px-2 py-2 font-medium text-gray-800 ${i % 2 ? 'bg-gray-50' : 'bg-white'}`}>
                  {r.mo}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-gray-400">{dash(r.target.number, fmtNum)}</td>
                <td className="px-2 py-2 text-right tabular-nums text-gray-400">{dash(r.target.amount, fmtLakh)}</td>
                <td className="px-2 py-2 text-right tabular-nums font-semibold">{fmtNum(r.achievement.number)}</td>
                <td className="px-2 py-2 text-right tabular-nums font-semibold">{fmtLakh(r.achievement.amount)}</td>
                <td className={`px-2 py-2 text-right font-semibold tabular-nums ${pctTone(r.pct.number)}`}>
                  {fmtPct(r.pct.number)}
                </td>
                <td className={`px-2 py-2 text-right font-semibold tabular-nums ${pctTone(r.pct.amount)}`}>
                  {fmtPct(r.pct.amount)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-violet-200 bg-violet-100 font-bold text-gray-800">
              <td className="sticky left-0 z-10 bg-violet-100 px-2 py-2" />
              <td className="sticky left-8 z-10 bg-violet-100 px-2 py-2">Total</td>
              <td className="px-2 py-2 text-right tabular-nums">{dash(t.target.number, fmtNum)}</td>
              <td className="px-2 py-2 text-right tabular-nums">{dash(t.target.amount, fmtLakh)}</td>
              <td className="px-2 py-2 text-right tabular-nums">{fmtNum(t.achievement.number)}</td>
              <td className="px-2 py-2 text-right tabular-nums">{fmtLakh(t.achievement.amount)}</td>
              <td className="px-2 py-2 text-right tabular-nums">{fmtPct(t.pct.number)}</td>
              <td className="px-2 py-2 text-right tabular-nums">{fmtPct(t.pct.amount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
