// Product / sub-product taxonomy — this is a direct transcription of the
// "Classification Loans" section of Instruction.docx, item by item. Nothing is
// added or assumed beyond what that list states:
//   1. Loans -> Retail, MSME, Agriculture (& Other, absorbed into Retail/MSME below)
//   2. Retail      = Car Loan, Education Loan, Housing Loan, Personal Loan, Retail - Other
//   3. MSME        = Business Loan, Cent Business, Cent Hotel, MSME - Other
//   4. Agriculture = Gold Loan, Kisan Credit Card, Agriculture- Other /Agri Allied
//                    Activities, Cent Cluster_food Processing
//   5. Retail - Gold Loan  -> its own section, separate from Retail and Agriculture
//   6. Deposits    = Cent Achiever, Cent Prestige, Current Account, FCNR(B), FD,
//                    Salary Account, Saving Account
//   7. Govt. Schemes = PPF, Senior Citizen Saving Scheme, Sukanya Samriddhi Yojna
//   8. Insurance   = Life Insurance, Term Insurance
//   9. Mutual Fund = Mutual Fund
//
// Two sub-products from the master table aren't named in those nine bullets —
// TASC Accounts and Pension Accounts. Per the client: TASC Accounts -> Deposits,
// Pension Accounts -> Govt. Schemes (same product family as their group).

export type GroupKey =
  | 'Retail'
  | 'MSME'
  | 'Agriculture'
  | 'RetailGoldLoan'
  | 'Deposits'
  | 'GovtSchemes'
  | 'Insurance'
  | 'MutualFund';

export const GROUPS: { key: GroupKey; label: string }[] = [
  { key: 'Deposits', label: 'Deposits' },
  { key: 'Retail', label: 'Retail' },
  { key: 'GovtSchemes', label: 'Govt. Schemes' },
  { key: 'MSME', label: 'MSME' },
  { key: 'Agriculture', label: 'Agriculture' },
  { key: 'RetailGoldLoan', label: 'Retail Gold Loan' },
  { key: 'Insurance', label: 'Insurance' },
  { key: 'MutualFund', label: 'Mutual Fund' },
];

export const GROUP_LABEL: Record<GroupKey, string> = Object.fromEntries(
  GROUPS.map((g) => [g.key, g.label]),
) as Record<GroupKey, string>;

// How the achievement AMOUNT is sourced for a converted lead in each group
// (instruction: "from Column X onward"; loans use Sanctioned, never Disbursed).
export type AmountSource = 'sanctioned' | 'deposit' | 'premium' | 'mutualfund';
export const GROUP_AMOUNT_SOURCE: Record<GroupKey, AmountSource> = {
  Retail: 'sanctioned',
  MSME: 'sanctioned',
  Agriculture: 'sanctioned',
  RetailGoldLoan: 'sanctioned',
  Deposits: 'deposit',
  GovtSchemes: 'deposit', // PPF / SCSS / SSY are deposit accounts
  Insurance: 'premium',
  MutualFund: 'mutualfund',
};

function norm(s: unknown): string {
  return String(s ?? '')
    .replace(/[‐-―−]/g, '-') // dashes
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// Sub-product -> group. Keys are normalised. This is the ONLY lookup —
// there is no product-name fallback, so nothing outside these nine bullets
// gets classified by guesswork.
const SUB_TO_GROUP: Record<string, GroupKey> = {};
const add = (g: GroupKey, subs: string[]) => subs.forEach((s) => (SUB_TO_GROUP[norm(s)] = g));

// 2. Retail
add('Retail', ['Car Loan', 'Education Loan', 'Housing Loan', 'Personal Loan', 'Retail - Other']);
// 3. MSME
add('MSME', ['Business Loan', 'Cent Business', 'Cent Hotel', 'MSME - Other']);
// 4. Agriculture
add('Agriculture', [
  'Gold Loan',
  'Kisan Credit Card',
  'Agriculture- Other /Agri Allied Activities',
  'Agriculture - Other /Agri Allied Activities',
  'Cent Cluster_food Processing',
  'Cent Cluster_Food Processing',
]);
// 5. Retail Gold Loan — its own section
add('RetailGoldLoan', ['Retail - Gold Loan']);
// 6. Deposits (+ TASC Accounts, per client)
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
// 7. Govt. Schemes (+ Pension Accounts, per client)
add('GovtSchemes', [
  'PPF',
  'Senior Citizen Saving Scheme',
  'Sukanya Samriddhi Yojna',
  'Sukanya Samriddhi Yojana',
  'Pension Accounts',
]);
// 8. Insurance
add('Insurance', ['Life Insurance', 'Term Insurance']);
// 9. Mutual Fund
add('MutualFund', ['Mutual Funds', 'Mutual Fund']);

export function classifyGroup(_product: unknown, subProduct: unknown): GroupKey | null {
  const sub = norm(subProduct);
  return sub ? (SUB_TO_GROUP[sub] ?? null) : null;
}
