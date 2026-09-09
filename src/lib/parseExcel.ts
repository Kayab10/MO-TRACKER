import type * as XLSXNS from 'xlsx';
import { displayName } from '../data/officers';
import { classifyGroup, GROUP_AMOUNT_SOURCE } from '../data/taxonomy';
import { STATUS_CLASS } from '../data/constants';
import type { Dataset, Lead } from './types';

/** Columns the file must contain (checked by header name) — §8.2 */
const REQUIRED = [
  'LeadRefNum',
  'ProductName',
  'SubProductName',
  'Amount',
  'LeadStatus',
  'CreatorName',
  'AssignedDate',
];

/** Header aliases -> canonical field. All compared case-insensitively, spaces collapsed. */
const HEADER_MAP: Record<string, string> = {
  leadrefnum: 'ref',
  leadreference: 'ref',
  customername: 'customer',
  productname: 'product',
  subproductname: 'subProduct',
  amount: 'leadAmount',
  leadstatus: 'status',
  branchname: 'branch',
  regionname: 'region',
  zonename: 'zone',
  creatorusername: 'creatorId',
  creatorname: 'mo',
  fullname: 'moAlt',
  assigneddate: 'assignedDate',
  sanctionedamount: 'sanctioned',
  disbursedamount: 'disbursed',
  loanaccountno: 'loanAcc',
  depositaccountno: 'depAcc',
  depositamount: 'depAmt',
  lockeraccountno: 'lockerAcc',
  policynumber: 'policyNo',
  policypremiumamount: 'premium',
  mutualfundfoliono: 'mfFolio',
  mutualfundinvestedamount: 'mfAmt',
  demataccountno: 'dematAcc',
  dematinvestedamount: 'dematAmt',
};

// Positional fallback (0-indexed) matching the sample file layout: E, R, X ...
const POS = {
  ref: 0,
  customer: 1,
  product: 2,
  subProduct: 3,
  leadAmount: 4, // E
  status: 6, // G
  branch: 8,
  region: 9,
  zone: 10,
  creatorId: 12, // M CreatorUserName
  mo: 13, // N CreatorName
  moAlt: 14, // O FullName
  assignedDate: 17, // R
  sanctioned: 23, // X
  disbursed: 24,
  loanAcc: 25,
  depAcc: 26,
  depAmt: 27,
  lockerAcc: 28,
  policyNo: 29,
  premium: 30,
  mfFolio: 31,
  mfAmt: 32,
  dematAcc: 33,
  dematAmt: 34,
};

const key = (s: unknown) =>
  String(s ?? '')
    .replace(/\s+/g, '')
    .replace(/[^\w()]/g, '')
    .toLowerCase();

function num(v: unknown): number {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  const n = parseFloat(String(v).replace(/,/g, '').trim());
  return isFinite(n) ? n : 0;
}

function parseDate(v: unknown): Date | null {
  if (v == null || v === '') return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === 'number') {
    // Excel serial date
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return !isNaN(d.getTime()) ? d : null;
  }
  const s = String(v).trim();
  // dd-mm-yyyy [hh:mm:ss]  or dd/mm/yyyy
  let m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    const [, d, mo, y, hh = '0', mm = '0', ss = '0'] = m;
    return new Date(+y, +mo - 1, +d, +hh, +mm, +ss);
  }
  // yyyy-mm-dd
  m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    const [, y, mo, d, hh = '0', mm = '0', ss = '0'] = m;
    return new Date(+y, +mo - 1, +d, +hh, +mm, +ss);
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export async function parseWorkbook(buf: ArrayBuffer, fileName: string): Promise<Dataset> {
  const XLSX: typeof XLSXNS = await import('xlsx');
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });
  if (!rows.length) throw new Error('The sheet is empty.');

  const header = rows[0].map(key);
  const idx: Record<string, number> = {};
  header.forEach((h, i) => {
    const canon = HEADER_MAP[h];
    if (canon && !(canon in idx)) idx[canon] = i;
  });
  const at = (row: unknown[], field: keyof typeof POS): unknown => {
    const i = field in idx ? idx[field as string] : POS[field];
    return row[i];
  };
  // If we didn't even find a status column by header, assume positional layout.
  const usePos = !('status' in idx) && !('product' in idx);

  // §8.2 required-column check (only when the file looks header-based)
  if (!usePos) {
    const present = new Set(header);
    const missing = REQUIRED.filter((c) => !present.has(key(c)));
    if (missing.length)
      throw new Error(`This file is missing required column(s): ${missing.join(', ')}.`);
  }

  const leads: Lead[] = [];
  const rosterSet = new Set<string>();
  const unmappedGroups = new Map<string, number>();
  let minDate: Date | null = null;
  let maxDate: Date | null = null;
  let convertedNoAccount = 0;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every((c) => c === '' || c == null)) continue;
    const get = (f: keyof typeof POS) => (usePos ? row[POS[f]] : at(row, f));

    const ref = String(get('ref') ?? '').trim();
    const product = String(get('product') ?? '').trim();
    const subProduct = String(get('subProduct') ?? '').trim();
    const statusRaw = String(get('status') ?? '').trim();
    if (!statusRaw && !product && !ref) continue;

    const statusClass = STATUS_CLASS[statusRaw.toLowerCase()] ?? 'pending';
    const moRaw = String(get('mo') ?? get('moAlt') ?? '').trim();
    const creatorId = String(get('creatorId') ?? '').trim();
    const mo = displayName(moRaw); // roster is whatever the file contains
    if (mo) rosterSet.add(mo);
    const assignedDate = parseDate(get('assignedDate'));
    const group = classifyGroup(product, subProduct);

    if (!group && (product || subProduct))
      unmappedGroups.set(
        subProduct || product,
        (unmappedGroups.get(subProduct || product) ?? 0) + 1,
      );

    if (assignedDate) {
      if (!minDate || assignedDate < minDate) minDate = assignedDate;
      if (!maxDate || assignedDate > maxDate) maxDate = assignedDate;
    }

    const sanctionedAmount = num(get('sanctioned'));
    const depositAmount = num(get('depAmt'));
    const policyPremium = num(get('premium'));
    const mfInvested = num(get('mfAmt'));
    const dematInvested = num(get('dematAmt'));
    const leadAmount = num(get('leadAmount'));

    // "In the column, where Account number is mentioned will be counted for number."
    const nonEmpty = (v: unknown) => v != null && String(v).trim() !== '' && String(v).trim() !== '0';
    const hasAccountNo =
      nonEmpty(get('loanAcc')) ||
      nonEmpty(get('depAcc')) ||
      nonEmpty(get('lockerAcc')) ||
      nonEmpty(get('policyNo')) ||
      nonEmpty(get('mfFolio')) ||
      nonEmpty(get('dematAcc'));

    let progressCount = 0;
    let progressAmount = 0;
    if (statusClass === 'progress' && group) {
      progressCount = 1;
      if (!hasAccountNo) convertedNoAccount++;
      // Amount = the actual amount from the X-onward column (no fall-back to Column E).
      switch (GROUP_AMOUNT_SOURCE[group]) {
        case 'sanctioned':
          progressAmount = sanctionedAmount; // "sanctioned Amount ... not Disbursed"
          break;
        case 'deposit':
          progressAmount = depositAmount;
          break;
        case 'premium':
          progressAmount = policyPremium;
          break;
        case 'mutualfund':
          progressAmount = mfInvested || dematInvested;
          break;
        default:
          progressAmount = 0;
      }
    }

    leads.push({
      ref,
      customer: String(get('customer') ?? '').trim(),
      product,
      subProduct,
      leadAmount,
      statusRaw,
      statusClass,
      branch: String(get('branch') ?? '').trim(),
      region: String(get('region') ?? '').trim(),
      zone: String(get('zone') ?? '').trim(),
      moRaw,
      creatorId,
      mo,
      assignedDate,
      sanctionedAmount,
      depositAmount,
      policyPremium,
      mfInvested,
      group,
      progressCount,
      hasAccount: hasAccountNo,
      progressAmount,
    });
  }

  if (!leads.length) throw new Error('No data rows found in the sheet.');

  return {
    fileName,
    uploadedAt: new Date().toISOString(),
    rowCount: leads.length,
    minDate: minDate ? minDate.toISOString() : null,
    maxDate: maxDate ? maxDate.toISOString() : null,
    roster: [...rosterSet].sort((a, b) => a.localeCompare(b)),
    unmappedGroups: [...unmappedGroups].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    convertedNoAccount,
    leads,
  };
}
