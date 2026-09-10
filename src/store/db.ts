import type { Dataset, Targets } from '../lib/types';
import { classifyGroup, GROUP_AMOUNT_SOURCE } from '../data/taxonomy';

// localStorage acts as an offline cache / local-only store.
// When Supabase is configured, AppContext + auth keep the cloud as the source of truth
// and mirror every write into these same keys.

const K = {
  dataset: 'mo.dataset.v1',
  targets: 'mo.targets.v1',
  users: 'mo.users.v1',
  settings: 'mo.settings.v1',
  lastReportDate: 'mo.lastReportDate.v1',
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
    const msg = e instanceof Error ? e.message : 'Storage failed';
    return { ok: false, error: /quota|exceeded/i.test(msg) ? 'file too large for browser storage' : msg };
  }
}

export interface Settings {
  countMode: 'strict' | 'lenient';
  lowThreshold: number;
}
const DEFAULT_SETTINGS: Settings = { countMode: 'lenient', lowThreshold: 40 };

export interface StoredUser {
  id: string;
  role: 'admin' | 'user';
  name: string;
  passwordHash: string;
}

// Re-run the parts of parsing that depend on the taxonomy, so a classification
// change (e.g. splitting out "Gold Loan") takes effect on the next load without
// forcing the admin to re-upload the file. The raw per-lead fields it needs
// (product, sub-product, the amount columns, status) are all stored already.
function reclassify(d: Dataset): void {
  for (const l of d.leads) {
    const group = classifyGroup(l.product, l.subProduct);
    l.group = group;
    if (l.statusClass === 'progress' && group) {
      l.progressCount = 1;
      switch (GROUP_AMOUNT_SOURCE[group]) {
        case 'sanctioned':
          l.progressAmount = l.sanctionedAmount;
          break;
        case 'deposit':
          l.progressAmount = l.depositAmount;
          break;
        case 'premium':
          l.progressAmount = l.policyPremium;
          break;
        case 'mutualfund':
          l.progressAmount = l.mfInvested;
          break;
        case 'leadAmount':
          l.progressAmount = l.leadAmount;
          break;
        default:
          l.progressAmount = 0;
      }
    } else {
      l.progressCount = 0;
      l.progressAmount = 0;
    }
  }
}

function reviveDataset(d: Dataset | null): Dataset | null {
  if (d?.leads) {
    for (const l of d.leads) {
      if (l.assignedDate && !(l.assignedDate instanceof Date))
        l.assignedDate = new Date(l.assignedDate as unknown as string);
    }
    reclassify(d);
  }
  return d;
}

export const db = {
  // ---- dataset ----
  getDataset(): Dataset | null {
    return reviveDataset(read<Dataset | null>(K.dataset, null));
  },
  setDataset(d: Dataset | null) {
    if (d === null) {
      localStorage.removeItem(K.dataset);
      return { ok: true };
    }
    const res = write(K.dataset, d);
    if (res.ok) write(K.lastReportDate, d.maxDate);
    return res;
  },
  clearDataset() {
    localStorage.removeItem(K.dataset);
  },

  // ---- targets ----
  getTargets(): Targets {
    return read<Targets>(K.targets, {});
  },
  setTargets(t: Targets) {
    return write(K.targets, t);
  },

  // ---- settings ----
  getSettings(): Settings {
    const s = read<Partial<Settings>>(K.settings, {});
    return {
      countMode: s.countMode === 'strict' ? 'strict' : 'lenient',
      lowThreshold: typeof s.lowThreshold === 'number' && s.lowThreshold > 0 && s.lowThreshold <= 100 ? s.lowThreshold : DEFAULT_SETTINGS.lowThreshold,
    };
  },
  setSettings(s: Settings) {
    return write(K.settings, s);
  },

  // ---- users ----
  getUsers(): StoredUser[] {
    return read<StoredUser[]>(K.users, []);
  },
  setUsers(u: StoredUser[]) {
    return write(K.users, u);
  },

  getLastReportDate(): string | null {
    return read<string | null>(K.lastReportDate, null);
  },
};
