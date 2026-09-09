# MO Track — Marketing Officer Performance Reports

A mobile-first PWA that turns the lead-report Excel export into target-vs-achievement
reports for the 21 Marketing Officers.

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- `xlsx` (SheetJS) — Excel parsing, in the browser
- `jspdf` + `jspdf-autotable` — PDF export
- `vite-plugin-pwa` — installable / offline

No backend. One file at a time — an upload **replaces** the previous dataset and stays until
the next upload (or an admin clicks "Remove"). All data (dataset, targets, passwords, settings)
lives in the browser `localStorage` of the device that uploaded it.

## Run locally

```bash
npm install
npm run dev
```

## Logins

| Role  | ID      | Password   | Can |
|-------|---------|------------|-----|
| Admin | `admin` | `admin123` | Upload Excel, set targets, reset the user password, view all reports |
| User  | `user`  | `user123`  | View reports only |

Both can change their own password (Settings). Passwords are SHA-256 hashed in
`localStorage`.

## How the numbers are computed

- **MO roster** ← the distinct `CreatorName` (N) values in the uploaded file (title-cased,
  whitespace-collapsed). Not hard-coded — whoever is in the file is a row in every report.
- **Group** ← sub-product → group mapping (seeded from the instruction sheet). `Gold Loan`
  and `Kisan Credit Card` classify as **Agriculture** even though the file lists them under
  `ProductName = Loans` — unit-tested in `src/lib/logic.test.ts`.
- **Lead count / amount** ← every row (all statuses); amount from column `E`, shown in lakh.
  `E` is null for all Government Scheme / Insurance rows — treated as 0.
- **Pending** ← Lead Status `Open` or `Under Process`.
- **Rejected** (`Non Converted`, `Not Interested`) count only toward *Lead Generated*.
- **Achievement (Number)** ← count of `Converted` leads. Settings → *Lenient* (default) counts
  all; *Strict* counts only converted leads with an account / policy / folio number in the
  columns from `X` onward.
- **Achievement (Amount)** ← for `Converted` leads, the actual amount from the X-onward column
  — `SanctionedAmount` for loans (**not** `DisbursedAmount`), `DepositAmount`,
  `PolicyPremiumAmount`, `MutualFundInvestedAmount` — to lakh (÷100000). Government Scheme has
  no amount column → 0 (count-only group).
- **Date** ← `AssignedDate` (R), parsed as `DD-MM-YYYY HH:MM:SS`.
  - *Monthly* = 1st → last day of a **selected** calendar month (capped at the last data date).
  - *Cumulative* = the whole file (the client's export is already cumulative — no fixed start date).
- **Targets** are entered **per month** per MO per group. Monthly reports use the value as-is;
  Cumulative multiplies it by the number of calendar months in the window.
- **Achievement %** = achievement ÷ target × 100. Shows `—` when no target is set.
- **Low performance** = overall Achievement % below an admin-set threshold (Settings, default 40%).

Any file name is accepted. Column layout is detected by header name, with a positional
fallback (E / R / X …) for files that match the original export layout.

## Deploy to Vercel

Framework preset: **Vite**. Build command `npm run build`, output `dist`.
`vercel.json` adds the SPA fallback so deep links work.

```bash
npm i -g vercel
vercel
```
