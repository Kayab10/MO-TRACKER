// Product / sub-product taxonomy and the group classification rules
// straight from the instruction sheet.

export type GroupKey =
  | 'Deposits'
  | 'Retail'
  | 'GovtSchemes'
  | 'MSME'
  | 'Agriculture'
  | 'GoldLoan'
  | 'Insurance'
  | 'MutualFund'
  | 'BuilderTieup'
  | 'DealerTieup';

export const GROUPS: { key: GroupKey; label: string }[] = [
  { key: 'Deposits', label: 'Deposits' },
  { key: 'Retail', label: 'Retail' },
  { key: 'GovtSchemes', label: 'Govt. Schemes' },
  { key: 'MSME', label: 'MSME' },
  { key: 'Agriculture', label: 'Agriculture' },
  { key: 'GoldLoan', label: 'Gold Loan' },
  { key: 'Insurance', label: 'Insurance' },
  { key: 'MutualFund', label: 'Mutual Fund' },
  { key: 'BuilderTieup', label: 'Builder Tie-up' },
  { key: 'DealerTieup', label: 'Dealer Tie-up' },
];

export const GROUP_LABEL: Record<GroupKey, string> = Object.fromEntries(
  GROUPS.map((g) => [g.key, g.label]),
) as Record<GroupKey, string>;

// How the achievement AMOUNT is sourced for a converted lead in each group.
export type AmountSource = 'sanctioned' | 'deposit' | 'premium' | 'mutualfund' | 'leadAmount';
export const GROUP_AMOUNT_SOURCE: Record<GroupKey, AmountSource> = {
  Deposits: 'deposit',
  Retail: 'sanctioned',
  MSME: 'sanctioned',
  Agriculture: 'sanctioned',
  GoldLoan: 'sanctioned',
  GovtSchemes: 'deposit', // PPF / SCSS / SSY are deposit accounts
  Insurance: 'premium',
  MutualFund: 'mutualfund',
  BuilderTieup: 'leadAmount',
  DealerTieup: 'leadAmount',
};

function norm(s: unknown): string {
  return String(s ?? '')
    .replace(/[‐-―−]/g, '-') // dashes
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// Sub-product -> group. Keys are normalised.
const SUB_TO_GROUP: Record<string, GroupKey> = {};
const add = (g: GroupKey, subs: string[]) => subs.forEach((s) => (SUB_TO_GROUP[norm(s)] = g));

// Retail loans — only the first four sub-products from the instruction sheet.
// "Retail - Other" has no explicit mapping and falls through to the Loans→Retail
// fallback below, so it still lands in Retail without being double-counted here.
add('Retail', ['Car Loan', 'Education Loan', 'Housing Loan', 'Personal Loan']);
// MSME loans
add('MSME', ['Business Loan', 'Cent Business', 'Cent Hotel', 'MSME - Other']);
// Gold Loan — its own section (client asked for gold to be tracked separately,
// out of both Retail and Agriculture).
add('GoldLoan', ['Gold Loan', 'Retail - Gold Loan']);
// Agriculture (Kisan Credit Card + agri-allied activities)
add('Agriculture', [
  'Kisan Credit Card',
  'Agriculture- Other /Agri Allied Activities',
  'Agriculture - Other /Agri Allied Activities',
  'Cent Cluster_food Processing',
  'Cent Cluster_Food Processing',
]);
// Deposits
add('Deposits', [
  'Cent Achiever',
  'Cent Prestige',
  'Current Account',
  'FCNR(B)',
  'FD',
  'Salary Account',
  'Saving Account',
  'TASC Accounts',
]);
// Government schemes
add('GovtSchemes', [
  'PPF',
  'Senior Citizen Saving Scheme',
  'Sukanya Samriddhi Yojna',
  'Sukanya Samriddhi Yojana',
  'Pension Accounts',
]);
// Insurance
add('Insurance', ['Life Insurance', 'Term Insurance']);
// Mutual funds
add('MutualFund', ['Mutual Funds', 'Mutual Fund']);

// Product-name fallback when the sub-product is unknown.
const PRODUCT_TO_GROUP: Record<string, GroupKey> = {
  deposits: 'Deposits',
  'government scheme': 'GovtSchemes',
  'government schemes': 'GovtSchemes',
  insurance: 'Insurance',
  'mutual funds': 'MutualFund',
  'mutual fund': 'MutualFund',
  'agriculture loan': 'Agriculture',
  loans: 'Retail',
  'pension accounts': 'GovtSchemes',
  'tasc accounts': 'Deposits',
};

export function classifyGroup(product: unknown, subProduct: unknown): GroupKey | null {
  const sub = norm(subProduct);
  if (sub && SUB_TO_GROUP[sub]) return SUB_TO_GROUP[sub];
  const prod = norm(product);
  if (prod && PRODUCT_TO_GROUP[prod]) return PRODUCT_TO_GROUP[prod];
  return null;
}
