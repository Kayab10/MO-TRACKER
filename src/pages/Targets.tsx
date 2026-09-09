import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Save, Copy } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GROUPS, GROUP_LABEL, type GroupKey } from '../data/taxonomy';
import type { Targets } from '../lib/types';
import { PageHead, SectionTitle } from '../components/ui';

export default function TargetsPage() {
  const { targets, setTargets, session, roster } = useApp();
  const [group, setGroup] = useState<GroupKey>('Deposits');
  const [draft, setDraft] = useState<Targets>(() => structuredClone(targets));
  const [bulkN, setBulkN] = useState('');
  const [bulkA, setBulkA] = useState('');
  const [msg, setMsg] = useState('');

  const rows = useMemo(
    () =>
      roster.map((mo) => ({
        mo,
        number: draft[mo]?.[group]?.number ?? 0,
        amount: draft[mo]?.[group]?.amount ?? 0,
      })),
    [draft, group, roster],
  );

  function setCell(mo: string, field: 'number' | 'amount', value: number) {
    setDraft((d) => {
      const next = structuredClone(d);
      next[mo] = next[mo] ?? {};
      next[mo][group] = next[mo][group] ?? { number: 0, amount: 0 };
      next[mo][group]![field] = isFinite(value) ? value : 0;
      return next;
    });
  }

  function applyBulk() {
    const n = parseFloat(bulkN);
    const a = parseFloat(bulkA);
    setDraft((d) => {
      const next = structuredClone(d);
      for (const mo of roster) {
        next[mo] = next[mo] ?? {};
        next[mo][group] = next[mo][group] ?? { number: 0, amount: 0 };
        if (isFinite(n)) next[mo][group]!.number = n;
        if (isFinite(a)) next[mo][group]!.amount = a;
      }
      return next;
    });
  }

  async function save() {
    setMsg('Saving…');
    const res = await setTargets(draft);
    setMsg(
      !res.ok
        ? `Save failed: ${res.error}`
        : res.cloudError
          ? `Saved locally — cloud sync failed: ${res.cloudError}`
          : 'Targets saved.',
    );
    setTimeout(() => setMsg(''), 3000);
  }

  async function exportXlsx() {
    const XLSX = await import('xlsx');
    const aoa: (string | number)[][] = [['MO Name', ...GROUPS.flatMap((g) => [`${g.label} No`, `${g.label} Amt(L)`])]];
    for (const mo of roster) {
      aoa.push([
        mo,
        ...GROUPS.flatMap((g) => [draft[mo]?.[g.key]?.number ?? 0, draft[mo]?.[g.key]?.amount ?? 0]),
      ]);
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Targets');
    XLSX.writeFile(wb, 'MO_Targets.xlsx');
  }

  async function importXlsx(file: File) {
    const XLSX = await import('xlsx');
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const rows2: Record<string, unknown>[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    const next: Targets = structuredClone(draft);
    for (const r of rows2) {
      const mo = roster.find((o) => o.toLowerCase() === String(r['MO Name'] ?? '').trim().toLowerCase());
      if (!mo) continue;
      next[mo] = next[mo] ?? {};
      for (const g of GROUPS) {
        const n = Number(r[`${g.label} No`] ?? 0);
        const a = Number(r[`${g.label} Amt(L)`] ?? 0);
        next[mo][g.key] = { number: isFinite(n) ? n : 0, amount: isFinite(a) ? a : 0 };
      }
    }
    setDraft(next);
    setMsg('Imported. Review and Save.');
  }

  if (session && session.role !== 'admin') return <Navigate to="/" replace />;

  return (
    <div>
      <PageHead title="Targets" subtitle="Monthly target per MO — Number & Amount (lakh)" />

      <p className="mb-3 rounded-2xl bg-violet-50 p-3 text-xs text-violet-800">
        Enter the <b>per-month</b> target. Monthly reports use it as-is; the Cumulative report multiplies it by
        the number of months in the window (20 Jul 2026 → latest data date).
      </p>

      <select value={group} onChange={(e) => setGroup(e.target.value as GroupKey)} className="field mb-3 font-semibold">
        {GROUPS.map((g) => (
          <option key={g.key} value={g.key}>
            {GROUP_LABEL[g.key]}
          </option>
        ))}
      </select>

      <div className="card mb-3 p-3">
        <div className="mb-2 text-xs font-semibold uppercase text-gray-500">Set for all MOs</div>
        <div className="flex gap-2">
          <input className="field" placeholder="Number" value={bulkN} onChange={(e) => setBulkN(e.target.value)} inputMode="decimal" />
          <input className="field" placeholder="Amount (L)" value={bulkA} onChange={(e) => setBulkA(e.target.value)} inputMode="decimal" />
          <button className="btn-ghost shrink-0" onClick={applyBulk}>
            <Copy className="h-4 w-4" /> Apply
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-violet-50 text-[11px] uppercase text-violet-700">
              <th className="px-3 py-2 text-left">MO</th>
              <th className="px-2 py-2 text-right">Target No.</th>
              <th className="px-2 py-2 text-right">Target Amt (L)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.mo} className="border-t border-gray-100">
                <td className="px-3 py-1.5 font-medium text-gray-800">{r.mo}</td>
                <td className="px-2 py-1.5">
                  <input
                    className="w-24 rounded-lg border border-gray-200 px-2 py-1 text-right tabular-nums"
                    value={r.number || ''}
                    inputMode="decimal"
                    onChange={(e) => setCell(r.mo, 'number', parseFloat(e.target.value))}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    className="w-24 rounded-lg border border-gray-200 px-2 py-1 text-right tabular-nums"
                    value={r.amount || ''}
                    inputMode="decimal"
                    onChange={(e) => setCell(r.mo, 'amount', parseFloat(e.target.value))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sticky bottom-24 mt-3 flex items-center gap-2">
        <button className="btn-primary flex-1" onClick={save}>
          <Save className="h-4 w-4" /> Save targets
        </button>
        {msg && <span className="text-sm font-medium text-emerald-600">{msg}</span>}
      </div>

      <SectionTitle>Bulk via Excel</SectionTitle>
      <div className="flex gap-2">
        <button className="btn-outline flex-1" onClick={exportXlsx}>
          Export template
        </button>
        <label className="btn-outline flex-1 cursor-pointer">
          Import
          <input
            type="file"
            accept=".xlsx,.xls"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importXlsx(f);
              e.target.value = '';
            }}
          />
        </label>
      </div>
    </div>
  );
}
