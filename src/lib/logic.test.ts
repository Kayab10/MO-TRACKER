import { describe, it, expect } from 'vitest';
import { classifyGroup, GROUP_AMOUNT_SOURCE } from '../data/taxonomy';
import { displayName } from '../data/officers';
import { STATUS_CLASS } from '../data/constants';
import {
  monthCount,
  monthlyRange,
  cumulativeRange,
  buildGroupReport,
  productReport,
  setStrictCount,
} from './aggregate';
import type { Lead } from './types';

// ---- §2.3 classification: the two rows most likely to be coded wrong ----
describe('loan sub-product classification', () => {
  it('Gold Loan (under ProductName=Loans) → Agriculture, per the instruction sheet', () => {
    expect(classifyGroup('Loans', 'Gold Loan')).toBe('Agriculture');
  });
  it('Retail - Gold Loan → its own separate section, NOT the same as Gold Loan', () => {
    expect(classifyGroup('Loans', 'Retail - Gold Loan')).toBe('RetailGoldLoan');
  });
  it('Kisan Credit Card (under ProductName=Loans) → Agriculture', () => {
    expect(classifyGroup('Loans', 'Kisan Credit Card')).toBe('Agriculture');
  });
  it('Retail keeps only the first four sub-products', () => {
    for (const s of ['Car Loan', 'Education Loan', 'Housing Loan', 'Personal Loan'])
      expect(classifyGroup('Loans', s)).toBe('Retail');
  });
  it('Retail - Other is explicitly Retail (item 2 of the classification list)', () => {
    expect(classifyGroup('Loans', 'Retail - Other')).toBe('Retail');
  });
  it('every documented sub-product resolves to a group', () => {
    const rows: [string, string, string][] = [
      ['Loans', 'Car Loan', 'Retail'],
      ['Loans', 'Business Loan', 'MSME'],
      ['Loans', 'Cent Hotel', 'MSME'],
      ['Deposits', 'Saving Account', 'Deposits'],
      ['Deposits', 'TASC Accounts', 'Deposits'],
      ['Government Scheme', 'PPF', 'GovtSchemes'],
      ['Government Scheme', 'Sukanya  Samriddhi Yojna', 'GovtSchemes'],
      ['Government Scheme', 'Pension Accounts', 'GovtSchemes'],
      ['Insurance', 'Term Insurance', 'Insurance'],
      ['Mutual Funds', 'Mutual Funds', 'MutualFund'],
      ['Agriculture Loan', 'Cent Cluster_food Processing', 'Agriculture'],
    ];
    for (const [p, s, g] of rows) expect(classifyGroup(p, s)).toBe(g);
  });
  it('has no product-name fallback — an unrecognised sub-product is unclassified', () => {
    expect(classifyGroup('Loans', 'Something New')).toBeNull();
  });
});

// ---- §3 amount source per product ----
describe('achievement amount source', () => {
  it('loan groups use Sanctioned (never Disbursed)', () => {
    expect(GROUP_AMOUNT_SOURCE.Retail).toBe('sanctioned');
    expect(GROUP_AMOUNT_SOURCE.MSME).toBe('sanctioned');
    expect(GROUP_AMOUNT_SOURCE.Agriculture).toBe('sanctioned');
    expect(GROUP_AMOUNT_SOURCE.RetailGoldLoan).toBe('sanctioned');
  });
  it('deposits/insurance/MF use their own columns', () => {
    expect(GROUP_AMOUNT_SOURCE.Deposits).toBe('deposit');
    expect(GROUP_AMOUNT_SOURCE.Insurance).toBe('premium');
    expect(GROUP_AMOUNT_SOURCE.MutualFund).toBe('mutualfund');
  });
});

// ---- §4 status buckets ----
describe('lead status buckets', () => {
  it('maps all five documented statuses', () => {
    expect(STATUS_CLASS['converted']).toBe('progress');
    expect(STATUS_CLASS['open']).toBe('pending');
    expect(STATUS_CLASS['under process']).toBe('pending');
    expect(STATUS_CLASS['non converted']).toBe('rejected');
    expect(STATUS_CLASS['not interested']).toBe('rejected');
  });
});

// ---- roster name display (derived from the file, not hard-coded) ----
describe('creator display name', () => {
  it('title-cases and collapses spacing', () => {
    expect(displayName('VISHAKHA  VALKEY')).toBe('Vishakha Valkey');
    expect(displayName('sudhanshu soni')).toBe('Sudhanshu Soni');
    expect(displayName('  Gopal   Ji ')).toBe('Gopal Ji');
  });
  it('two spellings of one person collapse to the same key', () => {
    expect(displayName('SHUKLA  SAUMITRA')).toBe(displayName('Shukla Saumitra'));
  });
});

// ---- periods ----
describe('reporting periods', () => {
  it('monthCount is inclusive', () => {
    expect(monthCount(new Date(2026, 6, 20), new Date(2026, 8, 7))).toBe(3);
  });
  it('monthly window is 1st → capped date', () => {
    const r = monthlyRange(new Date(2026, 8, 15), new Date(2026, 8, 10));
    expect(r.start.getDate()).toBe(1);
    expect(r.end.getDate()).toBe(10);
    expect(r.months).toBe(1);
  });
  it('cumulative window spans the whole file', () => {
    const r = cumulativeRange(new Date(2026, 6, 6), new Date(2026, 8, 7));
    expect(r.start.getMonth()).toBe(6);
    expect(r.start.getDate()).toBe(6);
    expect(r.months).toBe(3);
  });
});

// ---- §3 + §6 end-to-end on synthetic leads ----
function lead(p: Partial<Lead>): Lead {
  return {
    ref: 'r',
    customer: 'c',
    product: 'Loans',
    subProduct: 'Car Loan',
    leadAmount: 0,
    statusRaw: 'Converted',
    statusClass: 'progress',
    branch: 'B',
    region: 'R',
    zone: 'Z',
    moRaw: 'Rohit Muley',
    creatorId: '1',
    mo: 'Rohit Muley',
    assignedDate: new Date(2026, 7, 10),
    sanctionedAmount: 0,
    depositAmount: 0,
    policyPremium: 0,
    mfInvested: 0,
    group: 'Retail',
    progressCount: 1,
    hasAccount: true,
    progressAmount: 0,
    ...p,
  };
}

describe('group report', () => {
  const roster = ['Rohit Muley'];
  const range = cumulativeRange(new Date(2026, 6, 1), new Date(2026, 8, 30)); // 3 months
  const leads = [
    lead({ progressAmount: 1_000_000, hasAccount: true }),
    lead({ progressAmount: 500_000, hasAccount: false }),
    lead({ statusRaw: 'Open', statusClass: 'pending', progressCount: 0 }),
  ];

  it('lenient counts all converted', () => {
    setStrictCount(false);
    const rep = buildGroupReport(leads, {}, 'Retail', range, roster);
    const r = rep.rows[0];
    expect(r.achievement.number).toBe(2);
    expect(r.achievement.amount).toBe(15);
  });

  it('strict excludes converted-without-account from Number only', () => {
    setStrictCount(true);
    const rep = buildGroupReport(leads, {}, 'Retail', range, roster);
    const r = rep.rows[0];
    expect(r.achievement.number).toBe(1);
    expect(r.achievement.amount).toBe(15);
    setStrictCount(false);
  });

  it('cumulative target = monthly target × months in window', () => {
    const rep = buildGroupReport(
      leads,
      { 'Rohit Muley': { Retail: { number: 10, amount: 20 } } },
      'Retail',
      range,
      roster,
    );
    expect(rep.rows[0].target.number).toBe(30);
    expect(rep.rows[0].target.amount).toBe(60);
  });

  it('roster drives the rows — unknown creators are ignored', () => {
    setStrictCount(false);
    const withGhost = [...leads, lead({ mo: 'Ghost Person', progressAmount: 999 })];
    const rep = buildGroupReport(withGhost, {}, 'Retail', range, roster);
    expect(rep.rows).toHaveLength(1);
    expect(rep.rows[0].mo).toBe('Rohit Muley');
    expect(rep.total.achievement.number).toBe(2); // ghost not counted
  });
});

describe('product-wise report', () => {
  const range = cumulativeRange(new Date(2026, 6, 1), new Date(2026, 8, 30));
  const leads = [
    lead({ product: 'Loans', subProduct: 'Car Loan', progressAmount: 1_000_000, leadAmount: 1_200_000 }),
    lead({ product: 'Loans', subProduct: 'Car Loan', progressAmount: 500_000, leadAmount: 600_000 }),
    lead({
      product: 'Deposits',
      subProduct: 'Saving Account',
      group: 'Deposits',
      statusRaw: 'Open',
      statusClass: 'pending',
      progressCount: 0,
      progressAmount: 0,
      leadAmount: 50_000,
    }),
    lead({
      product: 'Insurance',
      subProduct: 'Life Insurance',
      group: 'Insurance',
      statusRaw: 'Not Interested',
      statusClass: 'rejected',
      progressCount: 0,
      leadAmount: 0,
    }),
  ];

  it('rolls leads up per product/sub-product with all statuses counted', () => {
    const rep = productReport(leads, range);
    const car = rep.rows.find((r) => r.subProduct === 'Car Loan')!;
    expect(car.leads).toBe(2);
    expect(car.converted).toBe(2);
    expect(car.convertedAmount).toBe(15); // (10L + 5L) in lakh
    expect(car.leadAmount).toBe(18); // Column E, in lakh

    expect(rep.total.leads).toBe(4);
    expect(rep.total.converted).toBe(2);
    expect(rep.total.pending).toBe(1);
    expect(rep.total.rejected).toBe(1);
  });
});
