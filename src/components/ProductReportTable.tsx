import { Fragment } from 'react';
import { fmtLakh, fmtNum } from '../lib/format';
import type { ProductReport } from '../lib/aggregate';

const dash = (n: number, fmt: (n: number) => string) => (n > 0 ? fmt(n) : '—');

export default function ProductReportTable({ report }: { report: ProductReport }) {
  const t = report.total;

  // group the flat rows by product so the table reads Product → Sub-products
  const byProduct: { product: string; rows: ProductReport['rows'] }[] = [];
  for (const r of report.rows) {
    const last = byProduct[byProduct.length - 1];
    if (last && last.product === r.product) last.rows.push(r);
    else byProduct.push({ product: r.product, rows: [r] });
  }

  return (
    <div className="print-area card overflow-hidden">
      <div className="border-b border-gray-100 px-4 py-3 text-center">
        <div className="text-sm font-extrabold uppercase tracking-wide text-violet-800">
          Product-wise Lead Report
        </div>
        <div className="text-xs font-medium text-gray-500">{report.range.label}</div>
        <div className="text-[11px] italic text-gray-400">Amount in lakh</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-violet-50 text-[11px] uppercase tracking-wide text-violet-800">
              <th className="sticky left-0 z-10 bg-violet-50 px-2 py-2 text-left" rowSpan={2}>
                Product / Sub-product
              </th>
              <th className="px-2 py-2" colSpan={2}>
                Leads (all)
              </th>
              <th className="px-2 py-2" colSpan={2}>
                Converted
              </th>
              <th className="px-2 py-2" rowSpan={2}>
                Pend.
              </th>
              <th className="px-2 py-2" rowSpan={2}>
                Rej.
              </th>
            </tr>
            <tr className="bg-violet-50 text-[11px] text-violet-700">
              <th className="px-2 py-1 font-semibold">No.</th>
              <th className="px-2 py-1 font-semibold">Amt.</th>
              <th className="px-2 py-1 font-semibold">No.</th>
              <th className="px-2 py-1 font-semibold">Amt.</th>
            </tr>
          </thead>
          <tbody>
            {byProduct.map(({ product, rows }) => {
              const sub = rows.reduce(
                (a, r) => {
                  a.leads += r.leads;
                  a.leadAmount += r.leadAmount;
                  a.converted += r.converted;
                  a.convertedAmount += r.convertedAmount;
                  a.pending += r.pending;
                  a.rejected += r.rejected;
                  return a;
                },
                { leads: 0, leadAmount: 0, converted: 0, convertedAmount: 0, pending: 0, rejected: 0 },
              );
              return (
                <Fragment key={product}>
                  <tr className="border-t border-gray-100 bg-violet-50/60 font-bold text-violet-900">
                    <td className="sticky left-0 z-10 bg-violet-50 px-2 py-1.5">{product}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmtNum(sub.leads)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmtLakh(sub.leadAmount)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmtNum(sub.converted)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmtLakh(sub.convertedAmount)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmtNum(sub.pending)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmtNum(sub.rejected)}</td>
                  </tr>
                  {rows.map((r, i) => (
                    <tr
                      key={r.subProduct}
                      className={`border-t border-gray-100 ${i % 2 ? 'bg-gray-50/60' : ''}`}
                    >
                      <td
                        className={`sticky left-0 z-10 whitespace-nowrap px-2 py-2 pl-4 text-gray-700 ${
                          i % 2 ? 'bg-gray-50' : 'bg-white'
                        }`}
                      >
                        {r.subProduct}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums font-semibold">{fmtNum(r.leads)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{dash(r.leadAmount, fmtLakh)}</td>
                      <td className="px-2 py-2 text-right tabular-nums font-semibold">{fmtNum(r.converted)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{dash(r.convertedAmount, fmtLakh)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-gray-500">{fmtNum(r.pending)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-gray-500">{fmtNum(r.rejected)}</td>
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-violet-200 bg-violet-100 font-bold text-gray-800">
              <td className="sticky left-0 z-10 bg-violet-100 px-2 py-2">Total</td>
              <td className="px-2 py-2 text-right tabular-nums">{fmtNum(t.leads)}</td>
              <td className="px-2 py-2 text-right tabular-nums">{fmtLakh(t.leadAmount)}</td>
              <td className="px-2 py-2 text-right tabular-nums">{fmtNum(t.converted)}</td>
              <td className="px-2 py-2 text-right tabular-nums">{fmtLakh(t.convertedAmount)}</td>
              <td className="px-2 py-2 text-right tabular-nums">{fmtNum(t.pending)}</td>
              <td className="px-2 py-2 text-right tabular-nums">{fmtNum(t.rejected)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
