import { GROUPS, type GroupKey } from '../data/taxonomy';
import { LOW_PERF_THRESHOLD } from '../data/constants';
import type { CellRow, Lead, Targets } from './types';

export const LAKH = 100000;
export const toLakh = (rupees: number) => rupees / LAKH;

// Achievement "Number" counting mode.
//  strict  = only converted leads that carry an account/policy/folio no. (per instruction)
//  lenient = every converted lead in a mapped group
let STRICT_COUNT = false; // §3: achievement_count = COUNT(Converted); strict is an opt-in
export function setStrictCount(v: boolean) {
  STRICT_COUNT = v;
}
function achvNo(l: Lead): number {
  if (!l.progressCount) return 0;
  return STRICT_COUNT ? (l.hasAccount ? 1 : 0) : 1;
}

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
  kind: 'monthly' | 'cumulative' | 'custom';
  /** calendar months the window spans — used to scale the monthly target for cumulative reports */
  months: number;
}

export function monthCount(a: Date, b: Date): number {
  return Math.max(1, (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + 1);
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
export function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/** Monthly window for the calendar month containing `monthDate`, capped at `cap` (latest data date). */
export function monthlyRange(monthDate: Date, cap?: Date): DateRange {
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const capped = cap && cap < monthEnd && cap >= start ? cap : monthEnd;
  const end = endOfDay(capped);
  const monthName = start.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
  const label =
    capped < monthEnd ? `${monthName} (up to ${fmtDate(end)})` : monthName;
  return { start, end, label, kind: 'monthly', months: 1 };
}

/** Cumulative window = the whole file (client says the file is already cumulative). */
export function cumulativeRange(minDate: Date | null, maxDate: Date | null): DateRange {
  const start = startOfDay(minDate ?? new Date(2000, 0, 1));
  const end = endOfDay(maxDate ?? new Date());
  return {
    start,
    end,
    label:
      minDate && maxDate
        ? `Cumulative — full file (${fmtDate(minDate)} to ${fmtDate(maxDate)})`
        : 'Cumulative — full file',
    kind: 'cumulative',
    months: monthCount(start, end),
  };
}

export function customRange(start: Date, end: Date): DateRange {
  const s = startOfDay(start);
  const e = endOfDay(end);
  return {
    start: s,
    end: e,
    label: `${fmtDate(start)} to ${fmtDate(end)}`,
    kind: 'custom',
    months: monthCount(s, e),
  };
}

export function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function inRange(lead: Lead, r: DateRange): boolean {
  const d = lead.assignedDate;
  if (!d) return false;
  return d >= r.start && d <= r.end;
}

function pct(a: number, t: number): number {
  if (!t) return NaN; // no target set
  return (a / t) * 100;
}

function emptyCell(): CellRow {
  return {
    target: { number: 0, amount: 0 },
    achievement: { number: 0, amount: 0 },
    pct: { number: 0, amount: 0 },
  };
}

export interface GroupReportRow extends CellRow {
  mo: string;
  slNo: number;
}
export interface GroupReport {
  group: GroupKey;
  range: DateRange;
  rows: GroupReportRow[];
  total: CellRow;
}

export function buildGroupReport(
  leads: Lead[],
  targets: Targets,
  group: GroupKey,
  range: DateRange,
  roster: string[],
): GroupReport {
  const ach = new Map<string, { number: number; amount: number }>();
  for (const o of roster) ach.set(o, { number: 0, amount: 0 });

  for (const l of leads) {
    if (l.group !== group || !l.mo || l.statusClass !== 'progress') continue;
    if (!inRange(l, range)) continue;
    const a = ach.get(l.mo);
    if (!a) continue;
    a.number += achvNo(l);
    a.amount += toLakh(l.progressAmount);
  }

  const rows: GroupReportRow[] = roster.map((mo, i) => {
    const raw = targets[mo]?.[group] ?? { number: 0, amount: 0 };
    // monthly target scaled to the number of calendar months in the window (§6)
    const t = { number: raw.number * range.months, amount: raw.amount * range.months };
    const a = ach.get(mo)!;
    return {
      mo,
      slNo: i + 1,
      target: { number: t.number, amount: round2(t.amount) },
      achievement: { number: a.number, amount: round2(a.amount) },
      pct: { number: round1(pct(a.number, t.number)), amount: round1(pct(a.amount, t.amount)) },
    };
  });

  const total = rows.reduce((acc, r) => {
    acc.target.number += r.target.number;
    acc.target.amount += r.target.amount;
    acc.achievement.number += r.achievement.number;
    acc.achievement.amount += r.achievement.amount;
    return acc;
  }, emptyCell());
  total.target.amount = round2(total.target.amount);
  total.achievement.amount = round2(total.achievement.amount);
  total.pct = {
    number: round1(pct(total.achievement.number, total.target.number)),
    amount: round1(pct(total.achievement.amount, total.target.amount)),
  };

  return { group, range, rows, total };
}

export interface Funnel {
  total: { count: number; amount: number };
  converted: { count: number; amount: number };
  pending: { count: number; amount: number };
  rejected: { count: number; amount: number };
}

export function funnel(leads: Lead[], range: DateRange, filter?: (l: Lead) => boolean): Funnel {
  const f: Funnel = {
    total: { count: 0, amount: 0 },
    converted: { count: 0, amount: 0 },
    pending: { count: 0, amount: 0 },
    rejected: { count: 0, amount: 0 },
  };
  for (const l of leads) {
    if (!inRange(l, range)) continue;
    if (filter && !filter(l)) continue;
    const amt = toLakh(l.leadAmount);
    f.total.count++;
    f.total.amount += amt;
    if (l.statusClass === 'progress') {
      // Funnel = lead lifecycle (all converted leads, Column E amount).
      f.converted.count++;
      f.converted.amount += amt;
    } else if (l.statusClass === 'pending') {
      f.pending.count++;
      f.pending.amount += amt;
    } else {
      f.rejected.count++;
      f.rejected.amount += amt;
    }
  }
  return f;
}

export interface GroupSummary {
  group: GroupKey;
  label: string;
  target: { number: number; amount: number };
  achievement: { number: number; amount: number };
  pct: { number: number; amount: number };
}

export function groupSummaries(
  leads: Lead[],
  targets: Targets,
  range: DateRange,
  roster: string[],
): GroupSummary[] {
  return GROUPS.map(({ key, label }) => {
    const rep = buildGroupReport(leads, targets, key, range, roster);
    return {
      group: key,
      label,
      target: rep.total.target,
      achievement: rep.total.achievement,
      pct: rep.total.pct,
    };
  });
}

// ---- Product / sub-product wise report (instruction: "Classification" section) ----
export interface ProductRow {
  product: string;
  subProduct: string;
  group: GroupKey | null;
  leads: number; // all statuses (instruction: "For total Lead Generated, All Lead Status will be taken")
  leadAmount: number; // lakh, Column E
  converted: number;
  convertedAmount: number; // lakh, group-specific source column (X onward)
  pending: number;
  rejected: number;
}
export interface ProductReportTotals {
  leads: number;
  leadAmount: number;
  converted: number;
  convertedAmount: number;
  pending: number;
  rejected: number;
}
export interface ProductReport {
  range: DateRange;
  rows: ProductRow[];
  total: ProductReportTotals;
}

export function productReport(leads: Lead[], range: DateRange): ProductReport {
  const map = new Map<string, ProductRow>();
  for (const l of leads) {
    if (!inRange(l, range)) continue;
    const product = l.product || '—';
    const subProduct = l.subProduct || '—';
    const k = `${product} ||| ${subProduct}`;
    let row = map.get(k);
    if (!row) {
      row = {
        product,
        subProduct,
        group: l.group,
        leads: 0,
        leadAmount: 0,
        converted: 0,
        convertedAmount: 0,
        pending: 0,
        rejected: 0,
      };
      map.set(k, row);
    }
    row.leads += 1;
    row.leadAmount += toLakh(l.leadAmount);
    if (l.statusClass === 'progress') {
      row.converted += 1;
      row.convertedAmount += toLakh(l.progressAmount);
    } else if (l.statusClass === 'pending') {
      row.pending += 1;
    } else {
      row.rejected += 1;
    }
  }
  const rows = [...map.values()].sort(
    (a, b) => a.product.localeCompare(b.product) || b.leads - a.leads,
  );
  for (const r of rows) {
    r.leadAmount = round2(r.leadAmount);
    r.convertedAmount = round2(r.convertedAmount);
  }
  const total = rows.reduce<ProductReportTotals>(
    (t, r) => {
      t.leads += r.leads;
      t.leadAmount += r.leadAmount;
      t.converted += r.converted;
      t.convertedAmount += r.convertedAmount;
      t.pending += r.pending;
      t.rejected += r.rejected;
      return t;
    },
    { leads: 0, leadAmount: 0, converted: 0, convertedAmount: 0, pending: 0, rejected: 0 },
  );
  total.leadAmount = round2(total.leadAmount);
  total.convertedAmount = round2(total.convertedAmount);
  return { range, rows, total };
}

export interface Pendency {
  overall: { count: number; amount: number };
  byRegion: { name: string; count: number; amount: number }[];
  byBranch: { name: string; count: number; amount: number }[];
  byMo: { name: string; count: number; amount: number }[];
}

export function pendency(leads: Lead[], range: DateRange, group?: GroupKey): Pendency {
  const region = new Map<string, { count: number; amount: number }>();
  const branch = new Map<string, { count: number; amount: number }>();
  const mo = new Map<string, { count: number; amount: number }>();
  let count = 0;
  let amount = 0;
  const bump = (m: Map<string, { count: number; amount: number }>, k: string, amt: number) => {
    const e = m.get(k) ?? { count: 0, amount: 0 };
    e.count++;
    e.amount += amt;
    m.set(k, e);
  };
  for (const l of leads) {
    if (l.statusClass !== 'pending' || !inRange(l, range)) continue;
    if (group && l.group !== group) continue;
    const amt = toLakh(l.leadAmount);
    count++;
    amount += amt;
    bump(region, l.region || 'Unknown', amt);
    bump(branch, l.branch || 'Unknown', amt);
    bump(mo, l.mo || l.moRaw || 'Unknown', amt);
  }
  const sort = (m: Map<string, { count: number; amount: number }>) =>
    [...m].map(([name, v]) => ({ name, count: v.count, amount: round2(v.amount) })).sort((a, b) => b.count - a.count);
  return {
    overall: { count, amount: round2(amount) },
    byRegion: sort(region),
    byBranch: sort(branch),
    byMo: sort(mo),
  };
}

export interface MoCard {
  mo: string;
  range: DateRange;
  groups: GroupSummary[];
  overall: GroupSummary;
  funnel: Funnel;
  pendingCount: number;
}

export function moReportCard(leads: Lead[], targets: Targets, mo: string, range: DateRange): MoCard {
  const mine = leads.filter((l) => l.mo === mo);
  const groups = GROUPS.map(({ key, label }) => {
    const raw = targets[mo]?.[key] ?? { number: 0, amount: 0 };
    const t = { number: raw.number * range.months, amount: round2(raw.amount * range.months) };
    let an = 0;
    let aa = 0;
    for (const l of mine) {
      if (l.group !== key || l.statusClass !== 'progress' || !inRange(l, range)) continue;
      an += achvNo(l);
      aa += toLakh(l.progressAmount);
    }
    return {
      group: key,
      label,
      target: t,
      achievement: { number: an, amount: round2(aa) },
      pct: { number: round1(safePct(an, t.number)), amount: round1(safePct(aa, t.amount)) },
    };
  });
  const overall = groups.reduce(
    (acc, g) => {
      acc.target.number += g.target.number;
      acc.target.amount += g.target.amount;
      acc.achievement.number += g.achievement.number;
      acc.achievement.amount += g.achievement.amount;
      return acc;
    },
    { group: 'Deposits' as GroupKey, label: 'Overall', target: { number: 0, amount: 0 }, achievement: { number: 0, amount: 0 }, pct: { number: 0, amount: 0 } },
  );
  overall.target.amount = round2(overall.target.amount);
  overall.achievement.amount = round2(overall.achievement.amount);
  overall.pct = {
    number: round1(safePct(overall.achievement.number, overall.target.number)),
    amount: round1(safePct(overall.achievement.amount, overall.target.amount)),
  };
  const f = funnel(mine, range);
  return { mo, range, groups, overall, funnel: f, pendingCount: f.pending.count };
}

function safePct(a: number, t: number): number {
  if (!t) return NaN;
  return (a / t) * 100;
}

export interface PerfHighlights {
  nil: string[];
  low: { mo: string; pct: number }[];
}

export function perfHighlights(
  leads: Lead[],
  targets: Targets,
  range: DateRange,
  roster: string[],
  lowThreshold = LOW_PERF_THRESHOLD,
): PerfHighlights {
  const nil: string[] = [];
  const low: { mo: string; pct: number }[] = [];
  for (const mo of roster) {
    const card = moReportCard(leads, targets, mo, range);
    const conv = card.funnel.converted.count;
    if (conv === 0) {
      nil.push(mo);
      continue;
    }
    const p = isFinite(card.overall.pct.amount) ? card.overall.pct.amount : card.overall.pct.number;
    if (card.overall.target.amount + card.overall.target.number > 0 && isFinite(p) && p < lowThreshold)
      low.push({ mo, pct: round1(p) });
  }
  low.sort((a, b) => a.pct - b.pct);
  return { nil, low };
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
