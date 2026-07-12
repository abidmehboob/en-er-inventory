# Reports & Expenses Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add expense management and a tabbed reports page (Sales, Orders, Expenses, Inventory, Profit & Loss) with PDF export to the EN-ER Textile admin panel.

**Architecture:** Two new admin pages — `/admin/expenses` (server component + client form) and `/admin/reports` (client component calling a new `/api/reports/data` GET route). PDF export uses a new `/api/reports/pdf` POST route that reuses the existing Puppeteer setup. Expenses are stored in a new `Expenses` tab in the existing Google Sheet.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Google Sheets API v4, Puppeteer, NextAuth

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `types/index.ts` | Modify | Add `Expense` interface |
| `lib/sheets.ts` | Modify | Add `parseExpenseRow`, `readExpenses`, `appendExpenseRow` |
| `lib/reportPdf.ts` | Create | HTML builders for each report type (Sales, Orders, Expenses, Inventory, P&L) |
| `components/AdminNav.tsx` | Modify | Add Expenses + Reports nav links |
| `components/ExpenseForm.tsx` | Create | Client component — add expense form |
| `components/ReportsPage.tsx` | Create | Client component — tabs, date pickers, table display, PDF export |
| `app/admin/expenses/page.tsx` | Create | Server component — fetch expenses, render ExpenseForm + table |
| `app/admin/reports/page.tsx` | Create | Thin server wrapper that renders ReportsPage |
| `app/api/expenses/route.ts` | Create | GET (list all) + POST (add one) |
| `app/api/reports/data/route.ts` | Create | GET — filtered report data by type + date range |
| `app/api/reports/pdf/route.ts` | Create | POST — generate PDF via Puppeteer |
| `__tests__/expenses.test.ts` | Create | Unit tests for parseExpenseRow + date filtering + P&L calc |

---

## Task 1: Add Expense type

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Add Expense interface to types/index.ts**

Open `types/index.ts` and append after the `ExchangeRates` interface:

```ts
export type ExpenseCategory = 'Rent' | 'Shipping' | 'Utilities' | 'Salaries' | 'Other'
export type ExpenseCurrency = 'PLN' | 'EUR'

export interface Expense {
  expense_id: string
  date: string          // ISO date YYYY-MM-DD
  category: ExpenseCategory
  amount: number
  currency: ExpenseCurrency
  notes: string
  created_at: string    // ISO datetime
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add types/index.ts
git commit -m "feat: add Expense type"
```

---

## Task 2: Add Expense functions to sheets.ts

**Files:**
- Modify: `lib/sheets.ts`
- Create: `__tests__/expenses.test.ts`

- [ ] **Step 1: Write failing test for parseExpenseRow**

Create `__tests__/expenses.test.ts` with just the parseExpenseRow tests for now (Task 4 will expand this file):

```ts
import { parseExpenseRow } from '@/lib/sheets'

describe('parseExpenseRow', () => {
  it('parses a full expense row', () => {
    const row = ['exp-1', '2026-07-12', 'Rent', '1500.50', 'PLN', 'Office July', '2026-07-12T10:00:00Z']
    expect(parseExpenseRow(row)).toEqual({
      expense_id: 'exp-1', date: '2026-07-12', category: 'Rent',
      amount: 1500.50, currency: 'PLN', notes: 'Office July', created_at: '2026-07-12T10:00:00Z',
    })
  })
  it('handles missing notes', () => {
    const row = ['exp-2', '2026-07-01', 'Shipping', '200', 'EUR', '', '2026-07-01T08:00:00Z']
    const result = parseExpenseRow(row)
    expect(result.notes).toBe('')
    expect(result.amount).toBe(200)
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- --testPathPattern=expenses
```

Expected: FAIL — `parseExpenseRow` is not exported from `@/lib/sheets`.

- [ ] **Step 3: Add parseExpenseRow, readExpenses, appendExpenseRow to lib/sheets.ts**

Add this import at the top of `lib/sheets.ts` (after the existing import):

```ts
import type { Product, Order, ReservedRow, LineItem, Expense } from '@/types'
```

Then append these functions at the bottom of `lib/sheets.ts`:

```ts
export function parseExpenseRow(row: string[]): Expense {
  return {
    expense_id: row[0],
    date: row[1],
    category: row[2] as Expense['category'],
    amount: Number(row[3]),
    currency: row[4] as Expense['currency'],
    notes: row[5] || '',
    created_at: row[6],
  }
}

export async function readExpenses(): Promise<Expense[]> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Expenses!A2:G',
  })
  return (res.data.values || []).map(row => parseExpenseRow(row as string[]))
}

export async function appendExpenseRow(expense: Expense): Promise<void> {
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Expenses!A:G',
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        expense.expense_id,
        expense.date,
        expense.category,
        expense.amount,
        expense.currency,
        expense.notes,
        expense.created_at,
      ]],
    },
  })
}
```

- [ ] **Step 4: Fix the import line — replace the old type import**

The existing import in `lib/sheets.ts` line 2 is:
```ts
import type { Product, Order, ReservedRow, LineItem } from '@/types'
```

Replace it with:
```ts
import type { Product, Order, ReservedRow, LineItem, Expense } from '@/types'
```

- [ ] **Step 5: Run test to confirm it passes**

```bash
npm test -- --testPathPattern=expenses
```

Expected: PASS — 2 tests passing.

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add lib/sheets.ts __tests__/expenses.test.ts types/index.ts
git commit -m "feat: add expense sheet functions with tests"
```

---

## Task 3: Create Expenses API route

**Files:**
- Create: `app/api/expenses/route.ts`

- [ ] **Step 1: Create the directory and route file**

Create `app/api/expenses/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readExpenses, appendExpenseRow } from '@/lib/sheets'
import { v4 as uuidv4 } from 'uuid'
import type { ExpenseCategory, ExpenseCurrency } from '@/types'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const expenses = await readExpenses()
  return NextResponse.json([...expenses].reverse())
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    date: string
    category: ExpenseCategory
    amount: number
    currency: ExpenseCurrency
    notes?: string
  }

  if (!body.date || !body.category || !body.amount || !body.currency) {
    return NextResponse.json({ error: 'Missing required fields: date, category, amount, currency' }, { status: 400 })
  }

  const VALID_CATEGORIES: ExpenseCategory[] = ['Rent', 'Shipping', 'Utilities', 'Salaries', 'Other']
  if (!VALID_CATEGORIES.includes(body.category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }

  if (body.currency !== 'PLN' && body.currency !== 'EUR') {
    return NextResponse.json({ error: 'Currency must be PLN or EUR' }, { status: 400 })
  }

  if (body.amount <= 0) {
    return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 })
  }

  const expense = {
    expense_id: uuidv4(),
    date: body.date,
    category: body.category,
    amount: Math.round(body.amount * 100) / 100,
    currency: body.currency,
    notes: body.notes || '',
    created_at: new Date().toISOString(),
  }

  await appendExpenseRow(expense)
  return NextResponse.json({ expense_id: expense.expense_id }, { status: 201 })
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/expenses/route.ts
git commit -m "feat: add expenses API route (GET + POST)"
```

---

## Task 4: Create reports data API route

**Files:**
- Create: `app/api/reports/data/route.ts`
- Modify: `__tests__/expenses.test.ts` (add date filter + P&L tests)

- [ ] **Step 1: Add date filtering and P&L helper tests**

Replace the entire contents of `__tests__/expenses.test.ts` with the full updated file (imports must stay at the top):

```ts
import { parseExpenseRow } from '@/lib/sheets'
import { filterByDateRange, calcPnlRows } from '@/lib/reportHelpers'
import type { PnlRow } from '@/lib/reportHelpers'
import type { Order, Expense } from '@/types'

describe('parseExpenseRow', () => {
  it('parses a full expense row', () => {
    const row = ['exp-1', '2026-07-12', 'Rent', '1500.50', 'PLN', 'Office July', '2026-07-12T10:00:00Z']
    const result = parseExpenseRow(row)
    expect(result).toEqual({
      expense_id: 'exp-1',
      date: '2026-07-12',
      category: 'Rent',
      amount: 1500.50,
      currency: 'PLN',
      notes: 'Office July',
      created_at: '2026-07-12T10:00:00Z',
    })
  })

  it('handles missing notes', () => {
    const row = ['exp-2', '2026-07-01', 'Shipping', '200', 'EUR', '', '2026-07-01T08:00:00Z']
    const result = parseExpenseRow(row)
    expect(result.notes).toBe('')
    expect(result.amount).toBe(200)
  })
})

const makeOrder = (overrides: Partial<Order>): Order => ({
  order_id: 'o1',
  created_at: '2026-07-10T10:00:00Z',
  customer_name: 'Test',
  customer_contact: '',
  status: 'confirmed',
  currency: 'USD',
  items: [],
  total_amount: 100,
  confirmed_at: null,
  ...overrides,
})

describe('filterByDateRange', () => {
  const items = [
    { date: '2026-07-01' },
    { date: '2026-07-15' },
    { date: '2026-08-01' },
  ]

  it('includes items within range', () => {
    const result = filterByDateRange(items, '2026-07-01', '2026-07-31')
    expect(result).toHaveLength(2)
  })

  it('is inclusive on both ends', () => {
    const result = filterByDateRange(items, '2026-07-15', '2026-07-15')
    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('2026-07-15')
  })

  it('returns all items when no dates given', () => {
    const result = filterByDateRange(items, undefined, undefined)
    expect(result).toHaveLength(3)
  })
})

describe('calcPnlRows', () => {
  const orders: Order[] = [
    makeOrder({ created_at: '2026-07-05T00:00:00Z', currency: 'USD', total_amount: 500, status: 'confirmed' }),
    makeOrder({ created_at: '2026-07-20T00:00:00Z', currency: 'EUR', total_amount: 300, status: 'shipped' }),
    makeOrder({ created_at: '2026-07-10T00:00:00Z', currency: 'USD', total_amount: 200, status: 'cancelled' }),
  ]
  const expenses: Expense[] = [
    { expense_id: 'e1', date: '2026-07-10', category: 'Rent', amount: 1500, currency: 'PLN', notes: '', created_at: '' },
    { expense_id: 'e2', date: '2026-07-15', category: 'Shipping', amount: 100, currency: 'EUR', notes: '', created_at: '' },
  ]

  it('calculates correct monthly P&L', () => {
    const rows = calcPnlRows(orders, expenses)
    expect(rows).toHaveLength(1) // only 2026-07
    const july = rows[0]
    expect(july.month).toBe('2026-07')
    expect(july.revenueUSD).toBe(500)   // only confirmed/shipped
    expect(july.revenueEUR).toBe(300)
    expect(july.expensesPLN).toBe(1500)
    expect(july.expensesEUR).toBe(100)
    expect(july.netEUR).toBe(300 - 100) // 200
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --testPathPattern=expenses
```

Expected: FAIL — `filterByDateRange` and `calcPnlRows` not found in `@/lib/reportHelpers`.

- [ ] **Step 3: Create lib/reportHelpers.ts**

Create `lib/reportHelpers.ts`:

```ts
import type { Order, Expense } from '@/types'

export interface PnlRow {
  month: string       // YYYY-MM
  revenueUSD: number
  revenueEUR: number
  revenuePLN: number
  expensesPLN: number
  expensesEUR: number
  netUSD: number
  netEUR: number
  netPLN: number
}

export function filterByDateRange<T extends { date: string }>(
  items: T[],
  from: string | undefined,
  to: string | undefined
): T[] {
  return items.filter(item => {
    if (from && item.date < from) return false
    if (to && item.date > to) return false
    return true
  })
}

export function orderDateToYYYYMM(isoDatetime: string): string {
  return isoDatetime.slice(0, 7)
}

export function calcPnlRows(orders: Order[], expenses: Expense[]): PnlRow[] {
  const months = new Set<string>()
  const salesOrders = orders.filter(o => o.status === 'confirmed' || o.status === 'shipped')
  salesOrders.forEach(o => months.add(orderDateToYYYYMM(o.created_at)))
  expenses.forEach(e => months.add(e.date.slice(0, 7)))

  return [...months].sort().map(month => {
    const monthOrders = salesOrders.filter(o => orderDateToYYYYMM(o.created_at) === month)
    const monthExpenses = expenses.filter(e => e.date.slice(0, 7) === month)

    const revenueUSD = monthOrders.filter(o => o.currency === 'USD').reduce((s, o) => s + o.total_amount, 0)
    const revenueEUR = monthOrders.filter(o => o.currency === 'EUR').reduce((s, o) => s + o.total_amount, 0)
    const revenuePLN = monthOrders.filter(o => o.currency === 'PLN').reduce((s, o) => s + o.total_amount, 0)
    const expensesPLN = monthExpenses.filter(e => e.currency === 'PLN').reduce((s, e) => s + e.amount, 0)
    const expensesEUR = monthExpenses.filter(e => e.currency === 'EUR').reduce((s, e) => s + e.amount, 0)

    return {
      month,
      revenueUSD,
      revenueEUR,
      revenuePLN,
      expensesPLN,
      expensesEUR,
      netUSD: revenueUSD,
      netEUR: Math.round((revenueEUR - expensesEUR) * 100) / 100,
      netPLN: Math.round((revenuePLN - expensesPLN) * 100) / 100,
    }
  })
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --testPathPattern=expenses
```

Expected: PASS — all tests passing.

- [ ] **Step 5: Create app/api/reports/data/route.ts**

First create the directory: `app/api/reports/data/`

Create `app/api/reports/data/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readOrders, readExpenses, readProducts, readReserved } from '@/lib/sheets'
import { calculateAvailable } from '@/lib/stock'
import { filterByDateRange, calcPnlRows } from '@/lib/reportHelpers'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'sales'
  const from = searchParams.get('from') ?? undefined
  const to = searchParams.get('to') ?? undefined

  if (type === 'sales') {
    const orders = await readOrders()
    const filtered = orders
      .filter(o => o.status === 'confirmed' || o.status === 'shipped')
      .filter(o => {
        const d = o.created_at.slice(0, 10)
        if (from && d < from) return false
        if (to && d > to) return false
        return true
      })
    return NextResponse.json(filtered)
  }

  if (type === 'orders') {
    const orders = await readOrders()
    const filtered = orders.filter(o => {
      const d = o.created_at.slice(0, 10)
      if (from && d < from) return false
      if (to && d > to) return false
      return true
    })
    return NextResponse.json(filtered)
  }

  if (type === 'expenses') {
    const expenses = await readExpenses()
    const filtered = filterByDateRange(expenses, from, to)
    return NextResponse.json(filtered)
  }

  if (type === 'inventory') {
    const [products, reserved] = await Promise.all([readProducts(), readReserved()])
    const withAvailable = calculateAvailable(products, reserved)
    return NextResponse.json(withAvailable)
  }

  if (type === 'pnl') {
    const [orders, expenses] = await Promise.all([readOrders(), readExpenses()])
    const filteredOrders = orders.filter(o => {
      const d = o.created_at.slice(0, 10)
      if (from && d < from) return false
      if (to && d > to) return false
      return true
    })
    const filteredExpenses = filterByDateRange(expenses, from, to)
    const rows = calcPnlRows(filteredOrders, filteredExpenses)
    return NextResponse.json(rows)
  }

  return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
}
```

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add lib/reportHelpers.ts app/api/reports/data/route.ts __tests__/expenses.test.ts
git commit -m "feat: add report data API and P&L helpers with tests"
```

---

## Task 5: Create report PDF helpers and PDF API

**Files:**
- Create: `lib/reportPdf.ts`
- Create: `app/api/reports/pdf/route.ts`

- [ ] **Step 1: Create lib/reportPdf.ts**

Create `lib/reportPdf.ts`:

```ts
import type { Order, Expense } from '@/types'
import type { PnlRow } from '@/lib/reportHelpers'

const HEADER = `
  <div class="logo">
    <span class="logo-en">EN</span><span class="logo-er">ER</span>
    <span class="logo-text">TEXTILE</span>
  </div>
  <div class="meta">Premium Towel Wholesale · info@en-er-textile.pl</div>
  <hr/>
`

const BASE_STYLES = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1a1a1a; background: #fff; }
  .logo { display: flex; align-items: center; gap: 0; margin-bottom: 4px; }
  .logo-en { background: #c0694a; color: #fff; font-weight: 800; font-size: 20px; padding: 4px 9px; letter-spacing: 1px; }
  .logo-er { background: #1a1a2e; color: #fff; font-weight: 800; font-size: 20px; padding: 4px 9px; letter-spacing: 1px; }
  .logo-text { color: #1a1a2e; font-weight: 700; font-size: 14px; margin-left: 10px; letter-spacing: 0.5px; }
  h1 { color: #1a1a2e; margin-bottom: 4px; font-size: 22px; }
  .meta { color: #888; font-size: 13px; margin-bottom: 24px; }
  hr { border: none; border-top: 1px solid #f0e8e4; margin: 16px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  th { background: #c0694a; color: white; padding: 10px; text-align: left; font-size: 13px; }
  td { padding: 9px 10px; border-bottom: 1px solid #f0e8e4; font-size: 13px; }
  tr:nth-child(even) td { background: #fdf3ef; }
  .summary { text-align: right; font-size: 15px; font-weight: bold; margin-top: 20px; color: #1a1a2e; }
  .footer { margin-top: 40px; font-size: 12px; color: #aaa; border-top: 1px solid #f0e8e4; padding-top: 16px; }
  .range { font-size: 13px; color: #666; margin-bottom: 16px; }
`

function wrap(title: string, range: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${BASE_STYLES}</style></head><body>
  ${HEADER}
  <h1>${title}</h1>
  ${range ? `<div class="range">${range}</div>` : ''}
  ${body}
  <div class="footer">EN-ER Textile · info@en-er-textile.pl · Generated ${new Date().toLocaleDateString('en-GB')}</div>
  </body></html>`
}

function rangeLabel(from?: string, to?: string): string {
  if (!from && !to) return ''
  if (from && to) return `Period: ${from} to ${to}`
  if (from) return `From: ${from}`
  return `To: ${to}`
}

export function buildSalesReportHTML(orders: Order[], from?: string, to?: string): string {
  const rows = orders.map(o => {
    const itemCount = o.items.length
    return `<tr>
      <td>${o.order_id.slice(0, 8)}</td>
      <td>${o.created_at.slice(0, 10)}</td>
      <td>${o.customer_name}</td>
      <td>${itemCount} item${itemCount !== 1 ? 's' : ''}</td>
      <td>${o.status}</td>
      <td>${o.total_amount.toFixed(2)} ${o.currency}</td>
    </tr>`
  }).join('')

  const byCurrency: Record<string, number> = {}
  orders.forEach(o => { byCurrency[o.currency] = (byCurrency[o.currency] ?? 0) + o.total_amount })
  const totals = Object.entries(byCurrency).map(([c, v]) => `${v.toFixed(2)} ${c}`).join(' | ')

  const body = `
    <table>
      <thead><tr><th>Order ID</th><th>Date</th><th>Customer</th><th>Items</th><th>Status</th><th>Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="summary">Total Revenue: ${totals || '—'}</div>`
  return wrap('Sales Report', rangeLabel(from, to), body)
}

export function buildOrdersReportHTML(orders: Order[], from?: string, to?: string): string {
  const STATUS_COLORS: Record<string, string> = {
    draft: '#888', reserved: '#c0694a', confirmed: '#1a8a1a', shipped: '#1a1a2e', cancelled: '#aaa',
  }
  const rows = orders.map(o => `<tr>
    <td>${o.order_id.slice(0, 8)}</td>
    <td>${o.created_at.slice(0, 10)}</td>
    <td>${o.customer_name}</td>
    <td style="color:${STATUS_COLORS[o.status] ?? '#333'};font-weight:600">${o.status}</td>
    <td>${o.total_amount.toFixed(2)} ${o.currency}</td>
  </tr>`).join('')

  const statusCounts: Record<string, number> = {}
  orders.forEach(o => { statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1 })
  const summary = Object.entries(statusCounts).map(([s, c]) => `${s}: ${c}`).join(' · ')

  const body = `
    <table>
      <thead><tr><th>Order ID</th><th>Date</th><th>Customer</th><th>Status</th><th>Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="summary">Total Orders: ${orders.length} &nbsp;|&nbsp; ${summary}</div>`
  return wrap('Orders Report', rangeLabel(from, to), body)
}

export function buildExpensesReportHTML(expenses: Expense[], from?: string, to?: string): string {
  const rows = expenses.map(e => `<tr>
    <td>${e.date}</td>
    <td>${e.category}</td>
    <td>${e.amount.toFixed(2)}</td>
    <td>${e.currency}</td>
    <td>${e.notes}</td>
  </tr>`).join('')

  const totalPLN = expenses.filter(e => e.currency === 'PLN').reduce((s, e) => s + e.amount, 0)
  const totalEUR = expenses.filter(e => e.currency === 'EUR').reduce((s, e) => s + e.amount, 0)

  const body = `
    <table>
      <thead><tr><th>Date</th><th>Category</th><th>Amount</th><th>Currency</th><th>Notes</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="summary">
      ${totalPLN > 0 ? `Total PLN: ${totalPLN.toFixed(2)} zł &nbsp; ` : ''}
      ${totalEUR > 0 ? `Total EUR: ${totalEUR.toFixed(2)} €` : ''}
    </div>`
  return wrap('Expenses Report', rangeLabel(from, to), body)
}

export function buildInventoryReportHTML(products: Array<{ article: string; size_cm: string; gsm: number; qty_total: number; available?: number; price_usd: number }>): string {
  const rows = products.map(p => `<tr>
    <td>${p.article}</td>
    <td>${p.size_cm}</td>
    <td>${p.gsm}</td>
    <td>${p.qty_total.toLocaleString()}</td>
    <td>${(p.qty_total - (p.available ?? p.qty_total)).toLocaleString()}</td>
    <td>${(p.available ?? p.qty_total).toLocaleString()}</td>
    <td>$${p.price_usd.toFixed(2)}</td>
  </tr>`).join('')

  const body = `
    <table>
      <thead><tr><th>Article</th><th>Size (cm)</th><th>GSM</th><th>Total Qty</th><th>Reserved</th><th>Available</th><th>Price (USD)</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`
  return wrap('Inventory Report', 'Current stock snapshot', body)
}

export function buildPnlReportHTML(rows: PnlRow[], from?: string, to?: string): string {
  const tableRows = rows.map(r => `<tr>
    <td>${r.month}</td>
    <td>${r.revenueUSD > 0 ? '$' + r.revenueUSD.toFixed(2) : '—'}</td>
    <td>${r.revenueEUR > 0 ? '€' + r.revenueEUR.toFixed(2) : '—'}</td>
    <td>${r.revenuePLN > 0 ? 'zł' + r.revenuePLN.toFixed(2) : '—'}</td>
    <td>${r.expensesPLN > 0 ? 'zł' + r.expensesPLN.toFixed(2) : '—'}</td>
    <td>${r.expensesEUR > 0 ? '€' + r.expensesEUR.toFixed(2) : '—'}</td>
    <td style="font-weight:600;color:${r.netEUR >= 0 ? '#1a8a1a' : '#c0694a'}">${r.netEUR !== 0 ? (r.netEUR >= 0 ? '+' : '') + '€' + r.netEUR.toFixed(2) : '—'}</td>
    <td style="font-weight:600;color:${r.netPLN >= 0 ? '#1a8a1a' : '#c0694a'}">${r.netPLN !== 0 ? (r.netPLN >= 0 ? '+' : '') + 'zł' + r.netPLN.toFixed(2) : '—'}</td>
  </tr>`).join('')

  const totRevUSD = rows.reduce((s, r) => s + r.revenueUSD, 0)
  const totRevEUR = rows.reduce((s, r) => s + r.revenueEUR, 0)
  const totExpPLN = rows.reduce((s, r) => s + r.expensesPLN, 0)
  const totExpEUR = rows.reduce((s, r) => s + r.expensesEUR, 0)
  const netEUR = Math.round((totRevEUR - totExpEUR) * 100) / 100

  const body = `
    <table>
      <thead><tr><th>Month</th><th>Revenue USD</th><th>Revenue EUR</th><th>Revenue PLN</th><th>Expenses PLN</th><th>Expenses EUR</th><th>Net EUR</th><th>Net PLN</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
    <div class="summary">
      Total Revenue: ${totRevUSD > 0 ? '$' + totRevUSD.toFixed(2) : ''} ${totRevEUR > 0 ? '€' + totRevEUR.toFixed(2) : ''}<br/>
      Total Expenses: ${totExpPLN > 0 ? 'zł' + totExpPLN.toFixed(2) : ''} ${totExpEUR > 0 ? '€' + totExpEUR.toFixed(2) : ''}<br/>
      Net EUR: <span style="color:${netEUR >= 0 ? '#1a8a1a' : '#c0694a'}">${(netEUR >= 0 ? '+' : '') + '€' + netEUR.toFixed(2)}</span>
    </div>`
  return wrap('Profit & Loss Report', rangeLabel(from, to), body)
}

export async function generateReportPDF(html: string): Promise<Buffer> {
  const puppeteer = await import('puppeteer')
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load' })
    const pdf = await page.pdf({ format: 'A4', margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}
```

- [ ] **Step 2: Create app/api/reports/pdf/route.ts**

Create `app/api/reports/pdf/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readOrders, readExpenses, readProducts, readReserved } from '@/lib/sheets'
import { calculateAvailable } from '@/lib/stock'
import { filterByDateRange, calcPnlRows } from '@/lib/reportHelpers'
import {
  buildSalesReportHTML, buildOrdersReportHTML, buildExpensesReportHTML,
  buildInventoryReportHTML, buildPnlReportHTML, generateReportPDF,
} from '@/lib/reportPdf'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, from, to } = await req.json() as { type: string; from?: string; to?: string }

  let html = ''

  if (type === 'sales') {
    const orders = await readOrders()
    const filtered = orders
      .filter(o => o.status === 'confirmed' || o.status === 'shipped')
      .filter(o => {
        const d = o.created_at.slice(0, 10)
        if (from && d < from) return false
        if (to && d > to) return false
        return true
      })
    html = buildSalesReportHTML(filtered, from, to)
  } else if (type === 'orders') {
    const orders = await readOrders()
    const filtered = orders.filter(o => {
      const d = o.created_at.slice(0, 10)
      if (from && d < from) return false
      if (to && d > to) return false
      return true
    })
    html = buildOrdersReportHTML(filtered, from, to)
  } else if (type === 'expenses') {
    const expenses = await readExpenses()
    html = buildExpensesReportHTML(filterByDateRange(expenses, from, to), from, to)
  } else if (type === 'inventory') {
    const [products, reserved] = await Promise.all([readProducts(), readReserved()])
    html = buildInventoryReportHTML(calculateAvailable(products, reserved))
  } else if (type === 'pnl') {
    const [orders, expenses] = await Promise.all([readOrders(), readExpenses()])
    const filteredOrders = orders.filter(o => {
      const d = o.created_at.slice(0, 10)
      if (from && d < from) return false
      if (to && d > to) return false
      return true
    })
    const pnlRows = calcPnlRows(filteredOrders, filterByDateRange(expenses, from, to))
    html = buildPnlReportHTML(pnlRows, from, to)
  } else {
    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
  }

  const pdf = await generateReportPDF(html)
  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${type}-report.pdf"`,
    },
  })
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/reportPdf.ts app/api/reports/pdf/route.ts
git commit -m "feat: add report PDF builders and PDF API route"
```

---

## Task 6: Update AdminNav

**Files:**
- Modify: `components/AdminNav.tsx`

- [ ] **Step 1: Add Expenses and Reports to the links array**

In `components/AdminNav.tsx`, replace the `links` array:

```ts
const links = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/inventory', label: 'Inventory' },
  { href: '/admin/new-quotation', label: 'New Quotation' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/expenses', label: 'Expenses' },
  { href: '/admin/reports', label: 'Reports' },
]
```

- [ ] **Step 2: Verify dev server still compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/AdminNav.tsx
git commit -m "feat: add Expenses and Reports links to admin nav"
```

---

## Task 7: Create Expenses admin page

**Files:**
- Create: `components/ExpenseForm.tsx`
- Create: `app/admin/expenses/page.tsx`

- [ ] **Step 1: Create components/ExpenseForm.tsx**

Create `components/ExpenseForm.tsx`:

```tsx
'use client'
import { useState } from 'react'
import type { ExpenseCategory, ExpenseCurrency } from '@/types'

const CATEGORIES: ExpenseCategory[] = ['Rent', 'Shipping', 'Utilities', 'Salaries', 'Other']

export default function ExpenseForm({ onAdded }: { onAdded: () => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [category, setCategory] = useState<ExpenseCategory>('Rent')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<ExpenseCurrency>('PLN')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!date || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Please enter a valid date and positive amount.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, category, amount: Number(amount), currency, notes }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to add expense')
        return
      }
      setAmount('')
      setNotes('')
      setDate(today)
      onAdded()
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "border rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#c0694a]"
  const labelClass = "text-xs font-semibold text-gray-600 mb-1 block"

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-[#f0e8e4] p-6 mb-8">
      <h2 className="text-lg font-bold mb-4" style={{ color: '#1a1a2e' }}>Add Expense</h2>
      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div>
          <label className={labelClass}>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} required />
        </div>
        <div>
          <label className={labelClass}>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)} className={inputClass}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Amount</label>
          <input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={inputClass} placeholder="0.00" required />
        </div>
        <div>
          <label className={labelClass}>Currency</label>
          <div className="flex gap-2 mt-1">
            {(['PLN', 'EUR'] as ExpenseCurrency[]).map(c => (
              <button key={c} type="button" onClick={() => setCurrency(c)}
                className="flex-1 py-2 text-sm font-semibold rounded border transition-colors"
                style={currency === c ? { background: '#c0694a', color: '#fff', borderColor: '#c0694a' } : { background: '#fff', color: '#333', borderColor: '#ddd' }}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4">
        <label className={labelClass}>Notes (optional)</label>
        <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className={inputClass} placeholder="e.g. Office rent July" />
      </div>
      <button type="submit" disabled={loading}
        className="mt-4 px-6 py-2 text-sm font-semibold rounded text-white transition-opacity"
        style={{ background: '#c0694a', opacity: loading ? 0.6 : 1 }}>
        {loading ? 'Adding…' : 'Add Expense'}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Create app/admin/expenses/page.tsx**

Create `app/admin/expenses/page.tsx`:

```tsx
'use client'
import { useCallback, useEffect, useState } from 'react'
import ExpenseForm from '@/components/ExpenseForm'
import type { Expense } from '@/types'

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  const fetchExpenses = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/expenses')
    const data = await res.json()
    setExpenses(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchExpenses() }, [fetchExpenses])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Expenses</h1>
      <ExpenseForm onAdded={fetchExpenses} />
      {loading ? (
        <div className="text-sm text-gray-400">Loading…</div>
      ) : expenses.length === 0 ? (
        <div className="text-sm text-gray-400">No expenses recorded yet.</div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-[#f0e8e4] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#c0694a', color: '#fff' }}>
                <th className="px-4 py-3 text-left font-semibold">Date</th>
                <th className="px-4 py-3 text-left font-semibold">Category</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                <th className="px-4 py-3 text-left font-semibold">Currency</th>
                <th className="px-4 py-3 text-left font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e, i) => (
                <tr key={e.expense_id} style={i % 2 === 1 ? { background: '#fdf3ef' } : {}}>
                  <td className="px-4 py-3">{e.date}</td>
                  <td className="px-4 py-3">{e.category}</td>
                  <td className="px-4 py-3 text-right font-semibold">{e.amount.toFixed(2)}</td>
                  <td className="px-4 py-3">{e.currency}</td>
                  <td className="px-4 py-3 text-gray-500">{e.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/ExpenseForm.tsx app/admin/expenses/page.tsx
git commit -m "feat: add expenses admin page with form and table"
```

---

## Task 8: Create Reports admin page

**Files:**
- Create: `app/admin/reports/page.tsx`

- [ ] **Step 1: Create app/admin/reports/page.tsx**

Create `app/admin/reports/page.tsx`:

```tsx
'use client'
import { useState, useCallback } from 'react'
import type { Order, Expense } from '@/types'
import type { PnlRow } from '@/lib/reportHelpers'

type ReportType = 'sales' | 'orders' | 'expenses' | 'inventory' | 'pnl'

const TABS: { id: ReportType; label: string }[] = [
  { id: 'sales', label: 'Sales' },
  { id: 'orders', label: 'Orders' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'pnl', label: 'Profit & Loss' },
]

const STATUS_COLORS: Record<string, string> = {
  draft: '#888', reserved: '#c0694a', confirmed: '#1a8a1a', shipped: '#1a1a2e', cancelled: '#aaa',
}

type InventoryItem = { article: string; size_cm: string; gsm: number; qty_total: number; available?: number; price_usd: number }

export default function ReportsPage() {
  const today = new Date().toISOString().slice(0, 10)
  const firstOfMonth = today.slice(0, 7) + '-01'

  const [tab, setTab] = useState<ReportType>('sales')
  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo] = useState(today)
  const [data, setData] = useState<Order[] | Expense[] | InventoryItem[] | PnlRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  const fetchData = useCallback(async (type: ReportType, f: string, t: string) => {
    setLoading(true)
    setData(null)
    const params = new URLSearchParams({ type })
    if (type !== 'inventory') { params.set('from', f); params.set('to', t) }
    const res = await fetch(`/api/reports/data?${params}`)
    const json = await res.json()
    setData(json)
    setLoading(false)
  }, [])

  function handleTabChange(newTab: ReportType) {
    setTab(newTab)
    fetchData(newTab, from, to)
  }

  function handleFetch() {
    fetchData(tab, from, to)
  }

  async function handleExportPdf() {
    setPdfLoading(true)
    try {
      const res = await fetch('/api/reports/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: tab, from: tab !== 'inventory' ? from : undefined, to: tab !== 'inventory' ? to : undefined }),
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${tab}-report.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setPdfLoading(false)
    }
  }

  const thClass = "px-4 py-3 text-left font-semibold text-sm"
  const tdClass = "px-4 py-3 text-sm"

  function renderTable() {
    if (!data) return <div className="text-sm text-gray-400 mt-4">Click "Run Report" to load data.</div>
    if (loading) return <div className="text-sm text-gray-400 mt-4">Loading…</div>

    if (tab === 'sales' || tab === 'orders') {
      const orders = data as Order[]
      if (orders.length === 0) return <div className="text-sm text-gray-400 mt-4">No orders found for this period.</div>
      const byCurrency: Record<string, number> = {}
      orders.forEach(o => { byCurrency[o.currency] = (byCurrency[o.currency] ?? 0) + o.total_amount })
      return (
        <>
          <table className="w-full text-sm">
            <thead><tr style={{ background: '#c0694a', color: '#fff' }}>
              <th className={thClass}>Order ID</th><th className={thClass}>Date</th>
              <th className={thClass}>Customer</th>
              {tab === 'orders' && <th className={thClass}>Status</th>}
              <th className={thClass}>Items</th><th className={thClass}>Total</th>
            </tr></thead>
            <tbody>
              {orders.map((o, i) => (
                <tr key={o.order_id} style={i % 2 === 1 ? { background: '#fdf3ef' } : {}}>
                  <td className={tdClass}>{o.order_id.slice(0, 8)}</td>
                  <td className={tdClass}>{o.created_at.slice(0, 10)}</td>
                  <td className={tdClass}>{o.customer_name}</td>
                  {tab === 'orders' && <td className={tdClass} style={{ color: STATUS_COLORS[o.status], fontWeight: 600 }}>{o.status}</td>}
                  <td className={tdClass}>{o.items.length} item{o.items.length !== 1 ? 's' : ''}</td>
                  <td className={tdClass}>{o.total_amount.toFixed(2)} {o.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-right font-bold mt-3 text-sm" style={{ color: '#1a1a2e' }}>
            {tab === 'orders'
              ? `Total: ${orders.length} orders`
              : `Revenue: ${Object.entries(byCurrency).map(([c, v]) => `${v.toFixed(2)} ${c}`).join(' | ')}`}
          </div>
        </>
      )
    }

    if (tab === 'expenses') {
      const expenses = data as Expense[]
      if (expenses.length === 0) return <div className="text-sm text-gray-400 mt-4">No expenses found for this period.</div>
      const totalPLN = expenses.filter(e => e.currency === 'PLN').reduce((s, e) => s + e.amount, 0)
      const totalEUR = expenses.filter(e => e.currency === 'EUR').reduce((s, e) => s + e.amount, 0)
      return (
        <>
          <table className="w-full text-sm">
            <thead><tr style={{ background: '#c0694a', color: '#fff' }}>
              <th className={thClass}>Date</th><th className={thClass}>Category</th>
              <th className={thClass}>Amount</th><th className={thClass}>Currency</th><th className={thClass}>Notes</th>
            </tr></thead>
            <tbody>
              {expenses.map((e, i) => (
                <tr key={e.expense_id} style={i % 2 === 1 ? { background: '#fdf3ef' } : {}}>
                  <td className={tdClass}>{e.date}</td><td className={tdClass}>{e.category}</td>
                  <td className={tdClass}>{e.amount.toFixed(2)}</td><td className={tdClass}>{e.currency}</td>
                  <td className={tdClass} style={{ color: '#888' }}>{e.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-right font-bold mt-3 text-sm" style={{ color: '#1a1a2e' }}>
            {totalPLN > 0 && `PLN: ${totalPLN.toFixed(2)} zł  `}{totalEUR > 0 && `EUR: ${totalEUR.toFixed(2)} €`}
          </div>
        </>
      )
    }

    if (tab === 'inventory') {
      const products = data as InventoryItem[]
      return (
        <table className="w-full text-sm">
          <thead><tr style={{ background: '#c0694a', color: '#fff' }}>
            <th className={thClass}>Article</th><th className={thClass}>Size (cm)</th><th className={thClass}>GSM</th>
            <th className={thClass}>Total Qty</th><th className={thClass}>Reserved</th><th className={thClass}>Available</th><th className={thClass}>Price (USD)</th>
          </tr></thead>
          <tbody>
            {products.map((p, i) => (
              <tr key={`${p.article}-${p.size_cm}-${p.gsm}`} style={i % 2 === 1 ? { background: '#fdf3ef' } : {}}>
                <td className={tdClass}>{p.article}</td><td className={tdClass}>{p.size_cm}</td><td className={tdClass}>{p.gsm}</td>
                <td className={tdClass}>{p.qty_total.toLocaleString()}</td>
                <td className={tdClass}>{(p.qty_total - (p.available ?? p.qty_total)).toLocaleString()}</td>
                <td className={tdClass}>{(p.available ?? p.qty_total).toLocaleString()}</td>
                <td className={tdClass}>${p.price_usd.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    }

    if (tab === 'pnl') {
      const rows = data as PnlRow[]
      if (rows.length === 0) return <div className="text-sm text-gray-400 mt-4">No data found for this period.</div>
      const totRevUSD = rows.reduce((s, r) => s + r.revenueUSD, 0)
      const totRevEUR = rows.reduce((s, r) => s + r.revenueEUR, 0)
      const totExpPLN = rows.reduce((s, r) => s + r.expensesPLN, 0)
      const totExpEUR = rows.reduce((s, r) => s + r.expensesEUR, 0)
      const netEUR = Math.round((totRevEUR - totExpEUR) * 100) / 100
      return (
        <>
          <table className="w-full text-sm">
            <thead><tr style={{ background: '#c0694a', color: '#fff' }}>
              <th className={thClass}>Month</th><th className={thClass}>Revenue USD</th><th className={thClass}>Revenue EUR</th>
              <th className={thClass}>Revenue PLN</th><th className={thClass}>Expenses PLN</th><th className={thClass}>Expenses EUR</th>
              <th className={thClass}>Net EUR</th><th className={thClass}>Net PLN</th>
            </tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.month} style={i % 2 === 1 ? { background: '#fdf3ef' } : {}}>
                  <td className={tdClass} style={{ fontWeight: 600 }}>{r.month}</td>
                  <td className={tdClass}>{r.revenueUSD > 0 ? '$' + r.revenueUSD.toFixed(2) : '—'}</td>
                  <td className={tdClass}>{r.revenueEUR > 0 ? '€' + r.revenueEUR.toFixed(2) : '—'}</td>
                  <td className={tdClass}>{r.revenuePLN > 0 ? 'zł' + r.revenuePLN.toFixed(2) : '—'}</td>
                  <td className={tdClass}>{r.expensesPLN > 0 ? 'zł' + r.expensesPLN.toFixed(2) : '—'}</td>
                  <td className={tdClass}>{r.expensesEUR > 0 ? '€' + r.expensesEUR.toFixed(2) : '—'}</td>
                  <td className={tdClass} style={{ fontWeight: 600, color: r.netEUR >= 0 ? '#1a8a1a' : '#c0694a' }}>
                    {r.netEUR !== 0 ? (r.netEUR >= 0 ? '+' : '') + '€' + r.netEUR.toFixed(2) : '—'}
                  </td>
                  <td className={tdClass} style={{ fontWeight: 600, color: r.netPLN >= 0 ? '#1a8a1a' : '#c0694a' }}>
                    {r.netPLN !== 0 ? (r.netPLN >= 0 ? '+' : '') + 'zł' + r.netPLN.toFixed(2) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-right font-bold mt-3 text-sm" style={{ color: '#1a1a2e' }}>
            Revenue: {totRevUSD > 0 ? '$' + totRevUSD.toFixed(2) : ''} {totRevEUR > 0 ? '€' + totRevEUR.toFixed(2) : ''} &nbsp;|&nbsp;
            Expenses: {totExpPLN > 0 ? 'zł' + totExpPLN.toFixed(2) : ''} {totExpEUR > 0 ? '€' + totExpEUR.toFixed(2) : ''} &nbsp;|&nbsp;
            Net EUR: <span style={{ color: netEUR >= 0 ? '#1a8a1a' : '#c0694a' }}>{(netEUR >= 0 ? '+' : '') + '€' + netEUR.toFixed(2)}</span>
          </div>
        </>
      )
    }

    return null
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Reports</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#f0e8e4]">
        {TABS.map(t => (
          <button key={t.id} onClick={() => handleTabChange(t.id)}
            className="px-4 py-2 text-sm font-semibold rounded-t transition-colors"
            style={tab === t.id
              ? { background: '#c0694a', color: '#fff' }
              : { color: '#555' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-end gap-4 mb-6 flex-wrap">
        {tab !== 'inventory' && (
          <>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">From</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#c0694a]" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">To</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)}
                className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#c0694a]" />
            </div>
          </>
        )}
        <button onClick={handleFetch} disabled={loading}
          className="px-4 py-2 text-sm font-semibold rounded text-white"
          style={{ background: '#1a1a2e', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Loading…' : 'Run Report'}
        </button>
        {data && (
          <button onClick={handleExportPdf} disabled={pdfLoading}
            className="px-4 py-2 text-sm font-semibold rounded border"
            style={{ borderColor: '#c0694a', color: '#c0694a', opacity: pdfLoading ? 0.6 : 1 }}>
            {pdfLoading ? 'Generating…' : 'Export PDF'}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-[#f0e8e4] overflow-x-auto p-0">
        {loading
          ? <div className="p-6 text-sm text-gray-400">Loading…</div>
          : <div className="p-0">{renderTable()}</div>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/admin/reports/page.tsx
git commit -m "feat: add reports admin page with tabs, date range, and PDF export"
```

---

## Task 9: Manual testing

- [ ] **Step 1: Ensure the Expenses tab exists in Google Sheet**

Open the Google Sheet at ID `1b96W5S8PPYxCF9tKNYAREWBCdewv4hV1jqEpr5PAHEs`. Add a new tab named exactly `Expenses`. Add header row: `expense_id | date | category | amount | currency | notes | created_at` (optional — the API uses A2:G so headers in row 1 are ignored).

- [ ] **Step 2: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 3: Test Expenses page**

Navigate to `http://localhost:3001/admin/expenses`. Verify:
- Form renders with Date, Category, Amount, Currency toggle (PLN/EUR), Notes
- Submit an expense — it appears in the table below without page reload
- Table shows newest first

- [ ] **Step 4: Test Reports page — Sales tab**

Navigate to `http://localhost:3001/admin/reports`. Click **Run Report**. Verify:
- Sales tab shows confirmed/shipped orders only
- Totals row shows revenue grouped by currency

- [ ] **Step 5: Test Reports page — Orders tab**

Click the **Orders** tab, then **Run Report**. Verify all orders appear with status colors.

- [ ] **Step 6: Test Reports page — Expenses tab**

Click the **Expenses** tab, then **Run Report**. Verify expenses appear with PLN/EUR totals in footer.

- [ ] **Step 7: Test Reports page — Inventory tab**

Click **Inventory** tab — date pickers should hide. Click **Run Report**. Verify products with available qty show.

- [ ] **Step 8: Test Reports page — Profit & Loss tab**

Click **Profit & Loss**, set a date range, click **Run Report**. Verify monthly rows appear with revenue vs expenses breakdown.

- [ ] **Step 9: Test PDF export**

On any tab after loading data, click **Export PDF**. Verify a PDF file downloads with the EN-ER Textile header and correct report data.

- [ ] **Step 10: Commit any fixes found during testing**

```bash
git add -A
git commit -m "fix: manual testing corrections"
```

---

## Task 10: Run full test suite

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Final TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: reports and expenses feature complete"
```
