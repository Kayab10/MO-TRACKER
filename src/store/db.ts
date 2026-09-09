import type { Dataset, Targets } from '../lib/types';

const K = {
  dataset: 'mo.dataset.v1',
  targets: 'mo.targets.v1',
  users: 'mo.users.v1',
  lastReportDate: 'mo.lastReportDate.v1',
  countMode: 'mo.countMode.v1',
  lowThreshold: 'mo.lowThreshold.v1',
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown): { ok: boolean; error?: string } {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Storage failed' };
  }
}

export const db = {
  getDataset(): Dataset | null {
    const d = read<Dataset | null>(K.dataset, null);
    if (d?.leads) {
      for (const l of d.leads) {
        // dates are ISO strings after JSON round-trip — revive them
        if (l.assignedDate && !(l.assignedDate instanceof Date))
          l.assignedDate = new Date(l.assignedDate as unknown as string);
      }
    }
    return d;
  },
  setDataset(d: Dataset) {
    const res = write(K.dataset, d);
    if (res.ok) {
      write(K.lastReportDate, d.maxDate);
    } else if (/quota|exceeded/i.test(res.error ?? '')) {
      res.error = 'file too large for this browser to store (localStorage limit ~5 MB)';
    }
    return res;
  },
  clearDataset() {
    localStorage.removeItem(K.dataset);
  },
  getTargets(): Targets {
    return read<Targets>(K.targets, {});
  },
  setTargets(t: Targets) {
    return write(K.targets, t);
  },
  getLastReportDate(): string | null {
    return read<string | null>(K.lastReportDate, null);
  },
  getCountMode(): 'strict' | 'lenient' {
    return read<'strict' | 'lenient'>(K.countMode, 'lenient');
  },
  setCountMode(m: 'strict' | 'lenient') {
    return write(K.countMode, m);
  },
  getLowThreshold(): number {
    const n = read<number>(K.lowThreshold, 40);
    return typeof n === 'number' && n > 0 && n <= 100 ? n : 40;
  },
  setLowThreshold(n: number) {
    return write(K.lowThreshold, n);
  },
  _usersKey: K.users,
  rawRead: read,
  rawWrite: write,
};
