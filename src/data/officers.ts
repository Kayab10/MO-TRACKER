// The MO roster is NOT hard-coded. It is derived from the distinct `CreatorName`
// values in the uploaded Excel file (see parseExcel). These helpers only clean the
// raw names for display and de-duplication.

/** Collapse whitespace, trim, strip stray dots. */
export function normName(raw: unknown): string {
  return String(raw ?? '')
    .replace(/\./g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Display form: "SHUKLA  SAUMITRA" -> "Shukla Saumitra", "gopal ji" -> "Gopal Ji". */
export function displayName(raw: unknown): string {
  const n = normName(raw);
  if (!n) return '';
  return n
    .toLowerCase()
    .split(' ')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/** The 21 names from the original brief — used only as a fallback roster when no file is loaded. */
export const SEED_OFFICERS: string[] = [
  'Abhijeet Singh Bhadouriya',
  'Akshay Chourasia',
  'Amit Sahu',
  'Atul Sanodiya',
  'Chandresh Cholkar',
  'Gaurav Ojha',
  'Gopal Ji',
  'Jajvalya Holkar',
  'Jitendra Singh',
  'Paras Bandil',
  'Rohit Muley',
  'Sakshi Jain',
  'Sakshi Shrivastava',
  'Satish Yadav',
  'Saurabh Yadav',
  'Shubham Singh',
  'Shukla Saumitra',
  'Somesh Gautam',
  'Sudhanshu Soni',
  'Tarun Khatri',
  'Vishakha Valkey',
];
