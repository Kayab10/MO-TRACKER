import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { currentSession, logout as doLogout, type Session } from '../store/auth';
import { db } from '../store/db';
import { SEED_OFFICERS } from '../data/officers';
import type { Dataset, Targets } from '../lib/types';
import { cumulativeRange, customRange, monthlyRange, setStrictCount, type DateRange } from '../lib/aggregate';

export type RangeMode = 'monthly' | 'cumulative' | 'custom';
export type CountMode = 'strict' | 'lenient';

/** List of 'YYYY-MM' spanning the file's own date range. */
export function availableMonths(minIso: string | null, maxIso: string | null): string[] {
  const start = minIso ? new Date(minIso) : new Date();
  const end = maxIso ? new Date(maxIso) : new Date();
  const out: string[] = [];
  const d = new Date(start.getFullYear(), start.getMonth(), 1);
  while (d <= end) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    d.setMonth(d.getMonth() + 1);
  }
  return out.length ? out : [`${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}`];
}

interface AppState {
  session: Session | null;
  setSession: (s: Session | null) => void;
  logout: () => void;

  dataset: Dataset | null;
  reloadDataset: () => void;
  setDataset: (d: Dataset) => { ok: boolean; error?: string };

  targets: Targets;
  setTargets: (t: Targets) => { ok: boolean; error?: string };

  rangeMode: RangeMode;
  setRangeMode: (m: RangeMode) => void;
  customStart: string;
  customEnd: string;
  setCustom: (start: string, end: string) => void;
  selectedMonth: string; // 'YYYY-MM'
  setSelectedMonth: (m: string) => void;
  months: string[];

  countMode: CountMode;
  setCountMode: (m: CountMode) => void;
  lowThreshold: number;
  setLowThreshold: (n: number) => void;

  roster: string[]; // MO names from the uploaded file (or seed list if none)
  refDate: Date;
  range: DateRange;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(() => currentSession());
  const [dataset, setDatasetState] = useState<Dataset | null>(() => db.getDataset());
  const [targets, setTargetsState] = useState<Targets>(() => db.getTargets());
  const [rangeMode, setRangeMode] = useState<RangeMode>('cumulative');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [countMode, setCountModeState] = useState<CountMode>(() => {
    const m = db.getCountMode();
    setStrictCount(m === 'strict');
    return m;
  });
  const [lowThreshold, setLowThresholdState] = useState<number>(() => db.getLowThreshold());

  const setCountMode = useCallback((m: CountMode) => {
    setStrictCount(m === 'strict');
    db.setCountMode(m);
    setCountModeState(m);
  }, []);

  const setLowThreshold = useCallback((n: number) => {
    db.setLowThreshold(n);
    setLowThresholdState(n);
  }, []);

  const reloadDataset = useCallback(() => setDatasetState(db.getDataset()), []);

  const setDataset = useCallback((d: Dataset) => {
    const res = db.setDataset(d);
    if (res.ok) setDatasetState(d);
    return res;
  }, []);

  const setTargets = useCallback((t: Targets) => {
    const res = db.setTargets(t);
    if (res.ok) setTargetsState(t);
    return res;
  }, []);

  const setSession = useCallback((s: Session | null) => setSessionState(s), []);
  const logout = useCallback(() => {
    doLogout();
    setSessionState(null);
  }, []);

  const setCustom = useCallback((start: string, end: string) => {
    setCustomStart(start);
    setCustomEnd(end);
  }, []);

  const refDate = useMemo(
    () => (dataset?.maxDate ? new Date(dataset.maxDate) : new Date()),
    [dataset?.maxDate],
  );

  const roster = useMemo(
    () => (dataset?.roster?.length ? dataset.roster : SEED_OFFICERS),
    [dataset?.roster],
  );

  const months = useMemo(
    () => availableMonths(dataset?.minDate ?? null, dataset?.maxDate ?? null),
    [dataset?.minDate, dataset?.maxDate],
  );

  // default the month selector to the data's latest month
  useEffect(() => {
    if (!selectedMonth || !months.includes(selectedMonth)) setSelectedMonth(months[months.length - 1]);
  }, [months, selectedMonth]);

  const range = useMemo<DateRange>(() => {
    if (rangeMode === 'monthly') {
      const mk = selectedMonth || months[months.length - 1];
      const [y, m] = mk.split('-').map(Number);
      return monthlyRange(new Date(y, m - 1, 15), refDate);
    }
    if (rangeMode === 'custom' && customStart && customEnd)
      return customRange(new Date(customStart), new Date(customEnd));
    return cumulativeRange(
      dataset?.minDate ? new Date(dataset.minDate) : null,
      dataset?.maxDate ? new Date(dataset.maxDate) : null,
    );
  }, [rangeMode, customStart, customEnd, refDate, selectedMonth, months, dataset?.minDate, dataset?.maxDate]);

  useEffect(() => {
    if (customStart || customEnd) return;
    if (dataset?.minDate) setCustomStart(dataset.minDate.slice(0, 10));
    if (dataset?.maxDate) setCustomEnd(dataset.maxDate.slice(0, 10));
  }, [dataset?.minDate, dataset?.maxDate, customStart, customEnd]);

  const value: AppState = {
    session,
    setSession,
    logout,
    dataset,
    reloadDataset,
    setDataset,
    targets,
    setTargets,
    rangeMode,
    setRangeMode,
    customStart,
    customEnd,
    setCustom,
    selectedMonth,
    setSelectedMonth,
    months,
    countMode,
    setCountMode,
    lowThreshold,
    setLowThreshold,
    roster,
    refDate,
    range,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used within AppProvider');
  return v;
}
