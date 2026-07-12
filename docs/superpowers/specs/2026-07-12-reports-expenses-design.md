# Reports & Expenses Feature Design

**Date:** 2026-07-12  
**Project:** EN-ER Textile Inventory Management  
**Scope:** Admin expense management + multi-type reporting with PDF export

---

## Overview

Add two new admin sections:
1. **Expenses** — admin can log business expenses
2. **Reports** — admin can view and export reports by date range as PDF

---

## Navigation

Two new items added to `components/AdminNav.tsx`:
- **Expenses** → `/admin/expenses`
- **Reports** → `/admin/reports`

---

## Data Model

### New Google Sheet Tab: `Expenses`

| Column | Field | Type | Notes |
|--------|-------|------|-------|
| A | `expense_id` | string | UUID |
| B | `date` | string | ISO date `YYYY-MM-DD` |
| C | `category` | string | Rent / Shipping / Utilities / Salaries / Other |
| D | `amount` | number | Decimal |
| E | `currency` | string | `PLN` or `EUR` |
| F | `notes` | string | Optional free text |
| G | `created_at` | string | ISO datetime |

### New TypeScript type (`types/index.ts`)

```ts
export interface Expense {
  expense_id: string;
  date: string;
  category: 'Rent' | 'Shipping' | 'Utilities' | 'Salaries' | 'Other';
  amount: number;
  currency: 'PLN' | 'EUR';
  notes: string;
  created_at: string;
}
```

### New `lib/sheets.ts` functions

- `readExpenses(): Promise<Expense[]>` — reads all rows from Expenses tab
- `appendExpenseRow(expense: Expense): Promise<void>` — appends one row

---

## New Pages

### `/admin/expenses` — Expense Management

**Add Expense form (top):**
| Field | Input | Default |
|-------|-------|---------|
| Date | `<input type="date">` | Today |
| Category | Dropdown: Rent / Shipping / Utilities / Salaries / Other | — |
| Amount | `<input type="number" step="0.01">` | — |
| Currency | Toggle buttons: PLN / EUR | PLN |
| Notes | `<input type="text">` | — (optional) |

- Submit → POST `/api/expenses` → appends row to Expenses sheet → refreshes list
- Append-only (no edit/delete), consistent with existing orders pattern

**Expenses table (bottom):**
- Columns: Date, Category, Amount, Currency, Notes
- Sorted newest first

---

### `/admin/reports` — Reports

**Controls bar:**
- Tab selector: `Sales | Orders | Expenses | Inventory | Profit & Loss`
- Date range: From / To date pickers (hidden on Inventory tab)
- **Export PDF** button → POST `/api/reports/pdf` with active tab + date range

**Tab: Sales**
- Filters: `status = confirmed OR shipped`, within date range by `created_at`
- Columns: Order ID, Date, Customer, Item count (e.g. "3 items"), Total
- Footer: Sum of totals (grouped by currency)

**Tab: Orders**
- Filters: all statuses, within date range by `created_at`
- Columns: Order ID, Date, Customer, Status, Total
- Footer: Count by status

**Tab: Expenses**
- Filters: within date range by `date`
- Columns: Date, Category, Amount, Currency, Notes
- Footer: Sum PLN / Sum EUR

**Tab: Inventory**
- No date filter (current snapshot)
- Columns: Article, Size (cm), GSM, Total Qty, Reserved, Available, Price (USD)
- Date picker hidden

**Tab: Profit & Loss**
- Filters: within date range
- Shows a summary breakdown:
  - **Revenue** — sum of confirmed/shipped order totals (in USD, the order currency)
  - **Expenses PLN** — sum of PLN expenses in date range
  - **Expenses EUR** — sum of EUR expenses in date range
  - **Net** — displayed per currency separately (no forced conversion)
- Rows: one row per month in the date range showing Revenue, Expenses PLN, Expenses EUR, Net per currency
- Footer: cumulative totals for the full period

---

## New API Routes

### `GET /api/expenses`
Returns all expenses from the Expenses sheet, sorted newest first.

### `POST /api/expenses`
Body: `{ date, category, amount, currency, notes }`  
Validates required fields, generates `expense_id` (UUID) and `created_at`, appends to sheet.

### `POST /api/reports/pdf`
Body: `{ reportType: 'sales' | 'orders' | 'expenses' | 'inventory' | 'pnl', from?: string, to?: string }`  
- Fetches relevant data from Google Sheets
- Applies date filters server-side
- Renders HTML report template
- Uses existing Puppeteer setup (`lib/pdf.ts`) to generate PDF
- Returns PDF as binary response with `Content-Type: application/pdf`

---

## PDF Output

Each report renders as a print-formatted A4 page with:
- EN-ER Textile header + report title
- Date range shown (except Inventory)
- Data table matching the screen view
- Totals/summary footer

Reuses existing Puppeteer infrastructure from `lib/pdf.ts`.

---

## File Changes Summary

| File | Action |
|------|--------|
| `components/AdminNav.tsx` | Add Expenses + Reports nav links |
| `lib/sheets.ts` | Add `readExpenses`, `appendExpenseRow` |
| `types/index.ts` | Add `Expense` interface |
| `app/admin/expenses/page.tsx` | New — expense form + table |
| `app/admin/reports/page.tsx` | New — tabbed reports page |
| `app/api/expenses/route.ts` | New — GET + POST |
| `app/api/reports/pdf/route.ts` | New — PDF generation |

---

## Out of Scope

- Editing or deleting expenses
- Currency conversion between USD / PLN / EUR for unified P&L total
- Charts or data visualizations
