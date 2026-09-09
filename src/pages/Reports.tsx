import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileDown, Sheet, MessageCircle, Mail, Printer } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GROUPS, GROUP_LABEL, type GroupKey } from '../data/taxonomy';
import { buildGroupReport } from '../lib/aggregate';
import {
  exportGroupReportExcel,
  exportGroupReportPDF,
  mailtoUrl,
  reportShareText,
  whatsappUrl,
} from '../lib/export';
import { PageHead, EmptyState } from '../components/ui';
import RangeBar from '../components/RangeBar';
import GroupReportTable from '../components/GroupReportTable';

export default function Reports() {
  const { dataset, targets, range, countMode, roster } = useApp();
  const [params, setParams] = useSearchParams();
  const raw = params.get('group') as GroupKey | null;
  const group: GroupKey = raw && GROUPS.some((g) => g.key === raw) ? raw : 'Deposits';

  const report = useMemo(
    () => (dataset ? buildGroupReport(dataset.leads, targets, group, range, roster) : null),
    [dataset, targets, group, range, countMode, roster],
  );
  const hasGroupTargets = !!report && report.total.target.number + report.total.target.amount > 0;

  if (!dataset)
    return (
      <div>
        <PageHead title="Reports" />
        <EmptyState title="No data uploaded yet" hint="Ask the Administrator to upload the Excel file." />
      </div>
    );

  const shareText = report ? reportShareText(report) : '';

  return (
    <div>
      <PageHead title="Reports" subtitle="Group-wise MO performance" />

      <div className="mb-3">
        <RangeBar />
      </div>

      <select
        value={group}
        onChange={(e) => setParams({ group: e.target.value }, { replace: true })}
        className="field mb-3 font-semibold"
      >
        {GROUPS.map((g) => (
          <option key={g.key} value={g.key}>
            {GROUP_LABEL[g.key]}
          </option>
        ))}
      </select>

      <div className="mb-3 grid grid-cols-3 gap-2 no-print">
        <button className="btn-primary !py-2.5" onClick={() => report && exportGroupReportPDF(report)}>
          <FileDown className="h-4 w-4" /> PDF
        </button>
        <button className="btn-ghost !py-2.5" onClick={() => report && exportGroupReportExcel(report)}>
          <Sheet className="h-4 w-4" /> Excel
        </button>
        <button className="btn-outline !py-2.5" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print
        </button>
        <a
          className="btn bg-emerald-500 text-white hover:bg-emerald-600 !py-2.5"
          href={whatsappUrl(shareText)}
          target="_blank"
          rel="noreferrer"
        >
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </a>
        <a
          className="btn bg-sky-600 text-white hover:bg-sky-700 !py-2.5 col-span-2"
          href={mailtoUrl(`MO Performance Report — ${GROUP_LABEL[group]}`, shareText)}
        >
          <Mail className="h-4 w-4" /> Email report
        </a>
      </div>

      {report && !hasGroupTargets && (
        <div className="mb-3 rounded-2xl bg-violet-50 p-3 text-sm text-violet-800 no-print">
          <b>No targets set for {GROUP_LABEL[group]}.</b> The Target and Achievement % columns stay blank until
          an admin enters targets for this group. The Achievement figures below are live from the file.
        </div>
      )}

      {report && report.total.achievement.number === 0 && report.total.achievement.amount === 0 && (
        <div className="mb-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800 no-print">
          No converted leads for <b>{GROUP_LABEL[group]}</b> in this date range.
          {dataset.convertedNoAccount > 0 &&
            ' If you expected some, check the "converted without account number" note on the Upload screen, or switch counting mode in Settings.'}
        </div>
      )}

      {report && <GroupReportTable report={report} />}
    </div>
  );
}
