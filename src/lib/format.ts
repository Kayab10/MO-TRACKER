export function fmtNum(n: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(n || 0));
}

export function fmtLakh(n: number): string {
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
}

export function fmtPct(n: number): string {
  if (!isFinite(n)) return '—';
  return `${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n || 0)}%`;
}

export function pctTone(n: number): string {
  if (n >= 100) return 'text-emerald-600';
  if (n >= 60) return 'text-amber-600';
  if (n > 0) return 'text-orange-600';
  return 'text-gray-400';
}
