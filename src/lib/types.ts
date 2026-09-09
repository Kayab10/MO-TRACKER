import type { GroupKey } from '../data/taxonomy';
import type { StatusClass } from '../data/constants';

export interface Lead {
  ref: string;
  customer: string;
  product: string;
  subProduct: string;
  leadAmount: number; // Column E (actual rupees)
  statusRaw: string;
  statusClass: StatusClass;
  branch: string;
  region: string;
  zone: string;
  moRaw: string;
  creatorId: string; // CreatorUserName (col M)
  mo: string; // display name of the creator (from the file)
  assignedDate: Date | null; // Column R
  sanctionedAmount: number;
  depositAmount: number;
  policyPremium: number;
  mfInvested: number;
  group: GroupKey | null;
  progressCount: number; // 1 when converted & in a mapped group
  hasAccount: boolean; // an account/policy/folio no. present in cols X onward
  progressAmount: number; // rupees, group-specific source
}

export interface Dataset {
  fileName: string;
  uploadedAt: string; // ISO
  rowCount: number;
  minDate: string | null; // ISO
  maxDate: string | null; // ISO
  roster: string[]; // distinct creator display names found in this file (report row order)
  unmappedGroups: { name: string; count: number }[];
  convertedNoAccount: number;
  leads: Lead[];
}

// target[mo][group] = { number, amount(lakh) }
export type Targets = Record<string, Partial<Record<GroupKey, { number: number; amount: number }>>>;

export interface CellRow {
  target: { number: number; amount: number };
  achievement: { number: number; amount: number };
  pct: { number: number; amount: number };
}
