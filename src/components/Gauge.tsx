import { fmtPct } from '../lib/format';

/** Circular achievement-% ring. */
export default function Gauge({
  value,
  size = 120,
  label,
  sub,
}: {
  value: number; // percent; NaN => no target
  size?: number;
  label?: string;
  sub?: string;
}) {
  const has = isFinite(value);
  const pct = has ? Math.max(0, Math.min(value, 150)) : 0;
  const r = (size - 14) / 2;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(pct, 100) / 100) * c;
  const color = !has
    ? '#cbd5e1'
    : pct >= 100
      ? '#16a34a'
      : pct >= 60
        ? '#d9a441'
        : pct >= 25
          ? '#f97316'
          : '#e11d48';

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eceef4" strokeWidth={12} />
          {dash > 0.5 && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={color}
              strokeWidth={12}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${c}`}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-extrabold text-gray-800">{has ? fmtPct(value) : '—'}</span>
          {label && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</span>
          )}
        </div>
      </div>
      {sub && <div className="mt-2 text-center text-xs font-medium text-gray-500">{sub}</div>}
    </div>
  );
}
