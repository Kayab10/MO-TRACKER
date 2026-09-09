import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { currentSession, logout as doLogout, type Session } from '../store/auth';
import { db, type Settings } from '../store/db';
import { cloudEnabled, cloudReady, pull, push, watch, type StateKey } from '../lib/cloud';
import { SEED_OFFICERS } from '../data/officers';
import type { Dataset, Targets } from '../lib/types';
import { cumulativeRange, customRange, monthlyRange, setStrictCount, type DateRange } from '../lib/aggregate';

export type RangeMode = 'monthly' | 'cumulative' | 'custom';
export type CountMode = 'strict' | 'lenient';
export type SyncStatus = 'off' | 'connecting' | 'live' | 'error';

type SaveResult = { ok: boolean; error?: string; cloudError?: string };

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
  setDataset: (d: Dataset | null) => Promise<SaveResult>;

  targets: Targets;
  setTargets: (t: Targets) => Promise<SaveResult>;

  rangeMode: RangeMode;
  setRangeMode: (m: RangeMode) => void;
  customStart: string;
  customEnd: string;
  setCustom: (start: string, end: string) => void;
  selectedMonth: string;
  setSelectedMonth: (m: string) => void;
  months: string[];

  countMode: CountMode;
  setCountMode: (m: CountMode) => void;
  lowThreshold: number;
  setLowThreshold: (n: number) => void;

  roster: string[];
  refDate: Date;
  range: DateRange;

  cloudEnabled: boolean;
  syncStatus: SyncStatus;
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
  const [settings, setSettingsState] = useState<Settings>(() => {
    const s = db.getSettings();
    setStrictCount(s.countMode === 'strict');
    return s;
  });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(cloudEnabled ? 'connecting' : 'off');

  // timestamp of this device's last cloud write — used to ignore our own realtime echo
  const lastLocalWrite = useRef(0);
  const guard = () => {
    lastLocalWrite.current = Date.now();
  };

  // Apply a value received from the cloud. `undefined` = the row was deleted → clear locally.
  const applyKey = useCallback((key: StateKey, value: unknown) => {
    if (key === 'dataset') {
      const d = (value as Dataset | undefined) ?? null; // deleted → null
      db.setDataset(d);
      setDatasetState(db.getDataset());
    } else if (key === 'targets') {
      const t = (value as Targets | undefined) ?? {};
      db.setTargets(t);
      setTargetsState(t);
    } else if (key === 'settings') {
      if (value == null) return; // settings is never deleted
      const s = value as Settings;
      db.setSettings(s);
      setStrictCount(s.countMode === 'strict');
      setSettingsState(s);
    }
  }, []);

  const resyncAll = useCallback(async () => {
    for (const key of ['dataset', 'targets', 'settings'] as StateKey[]) {
      applyKey(key, await pull(key)); // undefined ⇒ row deleted ⇒ clear locally
    }
  }, [applyKey]);

  // Initial cloud hydrate + realtime subscription
  useEffect(() => {
    if (!cloudEnabled) return;
    let alive = true;
    (async () => {
      for (const key of ['dataset', 'targets', 'settings'] as StateKey[]) {
        const v = await pull(key);
        if (!alive) return;
        if (v !== undefined) {
          applyKey(key, v); // cloud is the source of truth
        } else if (cloudReady()) {
          // cloud has nothing for this key yet — seed it from this device if we have data
          const local =
            key === 'dataset' ? db.getDataset() : key === 'targets' ? db.getTargets() : null;
          const hasLocal = key === 'dataset' ? !!local : Object.keys(local ?? {}).length > 0;
          if (hasLocal) {
            guard();
            await push(key, local);
          }
        }
      }
      if (alive) setSyncStatus(cloudReady() ? 'live' : 'error');
    })();

    const off = watch(
      () => {
        if (Date.now() - lastLocalWrite.current < 3500) return; // our own echo
        void resyncAll();
      },
      (ok) => setSyncStatus(ok ? 'live' : 'error'),
    );
    return () => {
      alive = false;
      off();
    };
  }, [applyKey, resyncAll]);

  const mirror = useCallback(async (key: StateKey, value: unknown, localOk: boolean): Promise<SaveResult> => {
    if (!localOk) return { ok: false, error: 'could not save to this browser' };
    if (!cloudEnabled) return { ok: true };
    guard();
    const res = await push(key, value);
    if (!res.ok) {
      setSyncStatus('error');
      return { ok: true, cloudError: res.error };
    }
    setSyncStatus('live');
    return { ok: true };
  }, []);

  const setDataset = useCallback(
    async (d: Dataset | null): Promise<SaveResult> => {
      const res = db.setDataset(d);
      if (res.ok) setDatasetState(db.getDataset());
      return mirror('dataset', d, res.ok);
    },
    [mirror],
  );

  const setTargets = useCallback(
    async (t: Targets): Promise<SaveResult> => {
      const res = db.setTargets(t);
      if (res.ok) setTargetsState(t);
      return mirror('targets', t, res.ok);
    },
    [mirror],
  );

  const persistSettings = useCallback(
    (next: Settings) => {
      db.setSettings(next);
      setStrictCount(next.countMode === 'strict');
      setSettingsState(next);
      void mirror('settings', next, true);
    },
    [mirror],
  );

  const setCountMode = useCallback(
    (m: CountMode) => persistSettings({ ...db.getSettings(), countMode: m }),
    [persistSettings],
  );
  const setLowThreshold = useCallback(
    (n: number) => persistSettings({ ...db.getSettings(), lowThreshold: n }),
    [persistSettings],
  );

  const reloadDataset = useCallback(() => setDatasetState(db.getDataset()), []);
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
    countMode: settings.countMode,
    setCountMode,
    lowThreshold: settings.lowThreshold,
    setLowThreshold,
    roster,
    refDate,
    range,
    cloudEnabled,
    syncStatus,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used within AppProvider');
  return v;
}
