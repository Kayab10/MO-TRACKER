import { CalendarRange } from 'lucide-react';
import { useApp } from '../context/AppContext';

const MODES = [
  { key: 'monthly', label: 'Monthly' },
  { key: 'cumulative', label: 'Cumulative' },
  { key: 'custom', label: 'Custom' },
] as const;

function monthLabel(mk: string) {
  const [y, m] = mk.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export default function RangeBar() {
  const { rangeMode, setRangeMode, customStart, customEnd, setCustom, range, months, selectedMonth, setSelectedMonth } =
    useApp();
  return (
    <div className="card flex flex-col gap-3 p-3">
      <div className="flex items-center gap-2">
        <CalendarRange className="h-4 w-4 shrink-0 text-violet-700" />
        <div className="inline-flex rounded-xl bg-gray-100 p-1">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setRangeMode(m.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                rangeMode === m.key ? 'bg-white text-violet-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {rangeMode === 'monthly' && (
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="field !py-2 font-semibold"
        >
          {months.map((mk) => (
            <option key={mk} value={mk}>
              {monthLabel(mk)}
            </option>
          ))}
        </select>
      )}

      {rangeMode === 'custom' ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustom(e.target.value, customEnd)}
            className="field !w-auto !py-1.5"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustom(customStart, e.target.value)}
            className="field !w-auto !py-1.5"
          />
        </div>
      ) : (
        <div className="text-sm font-medium text-gray-600">{range.label}</div>
      )}
    </div>
  );
}
