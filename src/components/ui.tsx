import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { fmtLakh, fmtNum } from '../lib/format';

export function PageHead({
  title,
  right,
  back,
  subtitle,
}: {
  title: ReactNode;
  right?: ReactNode;
  back?: boolean;
  subtitle?: ReactNode;
}) {
  const nav = useNavigate();
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-center gap-2">
        {back && (
          <button onClick={() => nav(-1)} className="rounded-full bg-white p-1.5 shadow-sm">
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
        )}
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-700">{title}</h1>
          {subtitle && <p className="text-sm font-medium text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 mt-6 flex items-end justify-between">
      <h2 className="text-lg font-extrabold text-gray-700">{children}</h2>
      {action}
    </div>
  );
}

export function Pills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`pill ${
            value === o.key ? 'bg-lime-400 text-violet-900' : 'bg-gray-200 text-gray-600'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const TONE: Record<string, string> = {
  navy: 'bg-navy',
  magenta: 'bg-magenta',
  violet: 'bg-violet-600',
  teal: 'bg-teal',
};

export function StatCard({
  kind,
  group,
  number,
  amount,
  tone,
}: {
  kind: string;
  group: string;
  number: number;
  amount: number;
  tone: keyof typeof TONE;
}) {
  return (
    <div className={`rounded-3xl p-4 text-white ${TONE[tone]}`}>
      <div className="text-sm font-extrabold tracking-wide">{kind}</div>
      <div className="text-xs font-medium text-white/70">{group}</div>
      <div className="mt-4 space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] font-medium text-white/70">Number</span>
          <span className="text-lg font-extrabold tabular-nums">{fmtNum(number)}</span>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] font-medium text-white/70">Amount</span>
          <span className="text-lg font-extrabold tabular-nums">{fmtLakh(amount)}</span>
        </div>
      </div>
    </div>
  );
}

export function BigStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-3xl bg-gradient-to-br from-violet-100 to-violet-50 p-4">
      <div className="text-sm font-semibold text-violet-700">{label}</div>
      <div className="mt-3 text-4xl font-extrabold tracking-tight text-gray-800">{value}</div>
      {hint && <div className="mt-1 text-xs font-medium text-gray-500">{hint}</div>}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card p-8 text-center">
      <p className="text-base font-bold text-gray-700">{title}</p>
      {hint && <p className="mt-1 text-sm text-gray-500">{hint}</p>}
    </div>
  );
}
