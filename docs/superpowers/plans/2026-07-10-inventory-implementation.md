# Qaswa Textile Inventory Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js 14 web app for towel inventory management with Google Sheets as the database, PDF quotation generation, public stock view, and admin order management.

**Architecture:** Next.js 14 App Router for both frontend and API routes, deployed on Plesk via PM2. Google Sheets (4 tabs) is the sole database, protected by a single-cell mutex lock for write consistency. Puppeteer generates PDF quotations server-side.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, googleapis, next-auth, puppeteer, uuid, open.er-api.com

---

## Architecture Diagrams

### System Overview
```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTS                              │
│   Customers (public)            Admin / Staff (login)       │
│   /stock  /quotation/[id]       /admin/*                    │
└──────────────┬──────────────────────────┬───────────────────┘
               │ HTTPS                    │ HTTPS + Session Cookie
               ▼                          ▼
┌─────────────────────────────────────────────────────────────┐
│           Next.js 14 App Router  (Plesk + PM2)              │
│  API Routes                                                 │
│  GET  /api/products   → read + calc available stock         │
│  GET  /api/rates      → fetch + cache exchange rates        │
│  POST /api/quotation  → acquire lock → reserve stock        │
│  POST /api/confirm    → acquire lock → deduct stock         │
│  POST /api/cancel     → release reserved stock              │
│  POST /api/pdf        → generate PDF via Puppeteer          │
│  PUT  /api/inventory  → update product qty/threshold        │
└──────────────┬──────────────────────────┬───────────────────┘
               │ googleapis               │ fetch
               ▼                          ▼
   ┌───────────────────────┐   ┌─────────────────────┐
   │     Google Sheets     │   │  open.er-api.com     │
   │  Tab 1: Products      │   │  USD→EUR/PLN/GBP     │
   │  Tab 2: Orders        │   │  (cached 1hr)        │
   │  Tab 3: Reserved      │   └─────────────────────┘
   │  Tab 4: Lock          │
   └───────────────────────┘
```

### Write Flow (CAP Lock)
```
API receives write request
        │
        ▼
Read Tab 4 (Lock cell)
        │
   ┌────┴────┐
LOCKED?      FREE?
   │              │
wait 300ms    Set LOCKED + timestamp
retry ×3          │
   │          Read-Modify-Write data tabs
   │              │
   └────→    Set FREE
             Return response
```

### Stock Calculation
```
Tab 1: qty_total (confirmed remaining)
Tab 3: SUM(reserved_qty) per article_size_key
─────────────────────────────────────────────
available = qty_total - SUM(reserved_qty)
```

### Order Status Flow
```
draft → reserved → confirmed → shipped
                ↘ cancelled (releases reserved)
```

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx                      # Root HTML shell, Tailwind font
│   ├── page.tsx                        # Redirect → /stock
│   ├── stock/page.tsx                  # Public stock table
│   ├── quotation/[id]/page.tsx         # Public quotation read-only view
│   └── admin/
│       ├── layout.tsx                  # Auth guard + sidebar nav
│       ├── login/page.tsx              # Login form
│       ├── dashboard/page.tsx          # KPIs + low-stock alerts
│       ├── inventory/page.tsx          # Edit products + thresholds
│       ├── new-quotation/page.tsx      # Quotation builder
│       ├── orders/page.tsx             # Orders list + actions
│       └── settings/page.tsx          # Admin user management
├── app/api/
│   ├── auth/[...nextauth]/route.ts     # NextAuth handler
│   ├── products/route.ts               # GET available stock
│   ├── rates/route.ts                  # GET exchange rates
│   ├── quotation/route.ts             # POST reserve stock
│   ├── confirm/route.ts               # POST confirm order
│   ├── cancel/route.ts                # POST cancel order
│   ├── pdf/route.ts                   # POST generate PDF
│   └── inventory/route.ts             # PUT update product
├── lib/
│   ├── sheets.ts                       # All Sheets API read/write
│   ├── lock.ts                         # Mutex acquire/release/withLock
│   ├── stock.ts                        # calculateAvailable()
│   ├── currency.ts                     # fetchRates() + convert()
│   ├── pdf.ts                          # generateQuotationPDF()
│   └── auth.ts                         # NextAuth config
├── types/index.ts                      # Shared TypeScript types
├── components/
│   ├── StockTable.tsx                  # Public stock display
│   ├── CurrencyToggle.tsx              # USD/EUR/PLN/GBP switcher
│   ├── QuotationForm.tsx              # Admin quotation builder
│   ├── OrdersTable.tsx                # Orders list with action buttons
│   ├── InventoryTable.tsx             # Editable product rows
│   └── AdminNav.tsx                   # Sidebar navigation
├── .env.local                          # Secrets (never commit)
├── .env.example                        # Template (commit this)
├── ecosystem.config.js                 # PM2 config
└── next.config.ts                      # Next.js config
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`
- Create: `.env.example`

- [ ] **Step 1: Bootstrap Next.js app**

```bash
cd "E:\qaswa textile\inventory-management"
npx create-next-app@14 . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

Expected: Next.js 14 project created with TypeScript and Tailwind.

- [ ] **Step 2: Install dependencies**

```bash
npm install googleapis next-auth@4 puppeteer uuid
npm install --save-dev @types/uuid jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom
```

- [ ] **Step 3: Create .env.example**

```bash
# .env.example
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GOOGLE_SHEET_ID=your_google_sheet_id_here
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
NEXTAUTH_URL=https://your-domain.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=bcrypt-hash-of-your-password
```

- [ ] **Step 4: Create jest.config.ts**

```typescript
// jest.config.ts
import type { Config } from 'jest'
const config: Config = {
  testEnvironment: 'node',
  transform: { '^.+\\.tsx?$': ['ts-jest', {}] },
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
}
export default config
```

- [ ] **Step 5: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold Next.js 14 project with dependencies"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `types/index.ts`

- [ ] **Step 1: Write types**

```typescript
// types/index.ts
export type Currency = 'USD' | 'EUR' | 'PLN' | 'GBP'

export interface Product {
  article: string        // e.g. "HAND TOWEL"
  size_cm: string        // e.g. "50x100"
  gsm: number
  wt_pc: number
  cartons: number
  qty_total: number
  price_usd: number
  version: number
  min_sale_usd: number
  available?: number     // computed: qty_total - reserved
}

export interface LineItem {
  article: string
  size_cm: string
  gsm: number
  qty: number
  price_usd: number
  price_display: number  // in selected currency
}

export interface Order {
  order_id: string
  created_at: string
  customer_name: string
  customer_contact: string
  status: 'draft' | 'reserved' | 'confirmed' | 'shipped' | 'cancelled'
  currency: Currency
  items: LineItem[]
  total_amount: number
  confirmed_at: string | null
}

export interface ReservedRow {
  article_size_key: string  // e.g. "HAND_TOWEL_50x100_460"
  reserved_qty: number
  order_id: string
}

export interface ExchangeRates {
  base: 'USD'
  rates: Record<Currency, number>
  fetched_at: number
}
```

- [ ] **Step 2: Commit**

```bash
git add types/index.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 3: Google Sheets Library

**Files:**
- Create: `lib/sheets.ts`
- Create: `lib/__tests__/sheets.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/__tests__/sheets.test.ts
jest.mock('googleapis', () => ({
  google: {
    auth: { GoogleAuth: jest.fn() },
    sheets: jest.fn(() => ({
      spreadsheets: {
        values: {
          get: jest.fn(),
          update: jest.fn(),
          append: jest.fn(),
          batchUpdate: jest.fn(),
        },
      },
    })),
  },
}))

import { parseProductRow, parseOrderRow, makeProductKey } from '@/lib/sheets'

describe('parseProductRow', () => {
  it('maps a raw Sheets row array to a Product', () => {
    const row = ['HAND TOWEL', '50x100', '460', '230', '23', '1840', '1.80', '1', '1.60']
    const product = parseProductRow(row)
    expect(product.article).toBe('HAND TOWEL')
    expect(product.size_cm).toBe('50x100')
    expect(product.gsm).toBe(460)
    expect(product.qty_total).toBe(1840)
    expect(product.price_usd).toBe(1.80)
    expect(product.version).toBe(1)
    expect(product.min_sale_usd).toBe(1.60)
  })
})

describe('makeProductKey', () => {
  it('creates a consistent key from article, size, gsm', () => {
    expect(makeProductKey('HAND TOWEL', '50x100', 460)).toBe('HAND_TOWEL_50x100_460')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest lib/__tests__/sheets.test.ts
```

Expected: FAIL — `parseProductRow` not found.

- [ ] **Step 3: Write lib/sheets.ts**

```typescript
// lib/sheets.ts
import { google } from 'googleapis'
import type { Product, Order, ReservedRow, LineItem } from '@/types'

const SHEET_ID = process.env.GOOGLE_SHEET_ID!

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

function getSheetsClient() {
  return google.sheets({ version: 'v4', auth: getAuth() })
}

export function makeProductKey(article: string, size_cm: string, gsm: number) {
  return `${article.replace(/ /g, '_')}_${size_cm}_${gsm}`
}

export function parseProductRow(row: string[]): Product {
  return {
    article: row[0],
    size_cm: row[1],
    gsm: Number(row[2]),
    wt_pc: Number(row[3]),
    cartons: Number(row[4]),
    qty_total: Number(row[5]),
    price_usd: Number(row[6]),
    version: Number(row[7]),
    min_sale_usd: Number(row[8]),
  }
}

export function parseOrderRow(row: string[]): Order {
  return {
    order_id: row[0],
    created_at: row[1],
    customer_name: row[2],
    customer_contact: row[3],
    status: row[4] as Order['status'],
    currency: row[5] as Order['currency'],
    items: JSON.parse(row[6] || '[]') as LineItem[],
    total_amount: Number(row[7]),
    confirmed_at: row[8] || null,
  }
}

export async function readProducts(): Promise<Product[]> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Products!A2:I',
  })
  return (res.data.values || []).map(parseProductRow)
}

export async function readOrders(): Promise<Order[]> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Orders!A2:I',
  })
  return (res.data.values || []).map(parseOrderRow)
}

export async function readReserved(): Promise<ReservedRow[]> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Reserved!A2:C',
  })
  return (res.data.values || []).map((row) => ({
    article_size_key: row[0],
    reserved_qty: Number(row[1]),
    order_id: row[2],
  }))
}

export async function readLock(): Promise<{ status: string; locked_at: string }> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Lock!A2:B2',
  })
  const row = res.data.values?.[0] || ['FREE', '']
  return { status: row[0], locked_at: row[1] }
}

export async function writeLock(status: 'FREE' | 'LOCKED', locked_at: string) {
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: 'Lock!A2:B2',
    valueInputOption: 'RAW',
    requestBody: { values: [[status, locked_at]] },
  })
}

export async function appendOrderRow(order: Order) {
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Orders!A:I',
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        order.order_id, order.created_at, order.customer_name,
        order.customer_contact, order.status, order.currency,
        JSON.stringify(order.items), order.total_amount, order.confirmed_at || '',
      ]],
    },
  })
}

export async function updateOrderStatus(order_id: string, status: Order['status'], confirmed_at?: string) {
  const orders = await readOrders()
  const rowIndex = orders.findIndex(o => o.order_id === order_id)
  if (rowIndex === -1) throw new Error(`Order ${order_id} not found`)
  const sheets = getSheetsClient()
  const sheetRow = rowIndex + 2
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `Orders!E${sheetRow}:I${sheetRow}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[status, orders[rowIndex].currency, JSON.stringify(orders[rowIndex].items), orders[rowIndex].total_amount, confirmed_at || '']] },
  })
}

export async function appendReservedRows(rows: ReservedRow[]) {
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Reserved!A:C',
    valueInputOption: 'RAW',
    requestBody: { values: rows.map(r => [r.article_size_key, r.reserved_qty, r.order_id]) },
  })
}

export async function deleteReservedByOrderId(order_id: string) {
  const reserved = await readReserved()
  const toDelete = reserved
    .map((r, i) => ({ ...r, i }))
    .filter(r => r.order_id === order_id)
  if (toDelete.length === 0) return
  const sheets = getSheetsClient()
  // Clear each matching row (set to empty strings)
  for (const row of toDelete) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `Reserved!A${row.i + 2}:C${row.i + 2}`,
      valueInputOption: 'RAW',
      requestBody: { values: [['', '', '']] },
    })
  }
}

export async function updateProductQty(article: string, size_cm: string, gsm: number, new_qty: number, new_version: number) {
  const products = await readProducts()
  const rowIndex = products.findIndex(
    p => p.article === article && p.size_cm === size_cm && p.gsm === gsm
  )
  if (rowIndex === -1) throw new Error(`Product not found: ${article} ${size_cm} ${gsm}gsm`)
  const sheets = getSheetsClient()
  const sheetRow = rowIndex + 2
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `Products!F${sheetRow}:H${sheetRow}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[new_qty, products[rowIndex].price_usd, new_version]] },
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest lib/__tests__/sheets.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/sheets.ts lib/__tests__/sheets.test.ts
git commit -m "feat: Google Sheets read/write library"
```

---

## Task 4: Mutex Lock

**Files:**
- Create: `lib/lock.ts`
- Create: `lib/__tests__/lock.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// lib/__tests__/lock.test.ts
const mockReadLock = jest.fn()
const mockWriteLock = jest.fn()
jest.mock('@/lib/sheets', () => ({ readLock: mockReadLock, writeLock: mockWriteLock }))

import { acquireLock, releaseLock } from '@/lib/lock'

describe('acquireLock', () => {
  it('acquires when FREE', async () => {
    mockReadLock.mockResolvedValue({ status: 'FREE', locked_at: '' })
    mockWriteLock.mockResolvedValue(undefined)
    await expect(acquireLock()).resolves.not.toThrow()
    expect(mockWriteLock).toHaveBeenCalledWith('LOCKED', expect.any(String))
  })

  it('throws after max retries when LOCKED and not expired', async () => {
    const recentTime = new Date(Date.now() - 1000).toISOString()
    mockReadLock.mockResolvedValue({ status: 'LOCKED', locked_at: recentTime })
    await expect(acquireLock(3, 10)).rejects.toThrow('Could not acquire lock')
  })

  it('acquires when lock is expired (>10s)', async () => {
    const oldTime = new Date(Date.now() - 15000).toISOString()
    mockReadLock.mockResolvedValue({ status: 'LOCKED', locked_at: oldTime })
    mockWriteLock.mockResolvedValue(undefined)
    await expect(acquireLock()).resolves.not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest lib/__tests__/lock.test.ts
```

Expected: FAIL — `acquireLock` not found.

- [ ] **Step 3: Write lib/lock.ts**

```typescript
// lib/lock.ts
import { readLock, writeLock } from '@/lib/sheets'

const LOCK_TTL_MS = 10_000

function isExpired(locked_at: string): boolean {
  return Date.now() - new Date(locked_at).getTime() > LOCK_TTL_MS
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function acquireLock(maxRetries = 3, retryDelayMs = 300): Promise<void> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const lock = await readLock()
    if (lock.status === 'FREE' || isExpired(lock.locked_at)) {
      await writeLock('LOCKED', new Date().toISOString())
      return
    }
    await sleep(retryDelayMs)
  }
  throw new Error('Could not acquire lock after retries')
}

export async function releaseLock(): Promise<void> {
  await writeLock('FREE', '')
}

export async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  await acquireLock()
  try {
    return await fn()
  } finally {
    await releaseLock()
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest lib/__tests__/lock.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/lock.ts lib/__tests__/lock.test.ts
git commit -m "feat: mutex lock with TTL expiry for write serialization"
```

---

## Task 5: Stock Calculation

**Files:**
- Create: `lib/stock.ts`
- Create: `lib/__tests__/stock.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// lib/__tests__/stock.test.ts
import { calculateAvailable } from '@/lib/stock'
import type { Product, ReservedRow } from '@/types'

const products: Product[] = [
  { article: 'BATH TOWEL', size_cm: '70x140', gsm: 460, wt_pc: 451, cartons: 46,
    qty_total: 1840, price_usd: 3.12, version: 1, min_sale_usd: 2.50 },
]

describe('calculateAvailable', () => {
  it('returns qty_total when nothing reserved', () => {
    const result = calculateAvailable(products, [])
    expect(result[0].available).toBe(1840)
  })

  it('subtracts reserved qty for matching key', () => {
    const reserved: ReservedRow[] = [
      { article_size_key: 'BATH_TOWEL_70x140_460', reserved_qty: 200, order_id: 'ord-1' },
    ]
    const result = calculateAvailable(products, reserved)
    expect(result[0].available).toBe(1640)
  })

  it('never returns negative available', () => {
    const reserved: ReservedRow[] = [
      { article_size_key: 'BATH_TOWEL_70x140_460', reserved_qty: 9999, order_id: 'ord-1' },
    ]
    const result = calculateAvailable(products, reserved)
    expect(result[0].available).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest lib/__tests__/stock.test.ts
```

- [ ] **Step 3: Write lib/stock.ts**

```typescript
// lib/stock.ts
import { makeProductKey } from '@/lib/sheets'
import type { Product, ReservedRow } from '@/types'

export function calculateAvailable(products: Product[], reserved: ReservedRow[]): Product[] {
  const reservedMap = new Map<string, number>()
  for (const row of reserved) {
    reservedMap.set(row.article_size_key, (reservedMap.get(row.article_size_key) ?? 0) + row.reserved_qty)
  }
  return products.map(p => {
    const key = makeProductKey(p.article, p.size_cm, p.gsm)
    const totalReserved = reservedMap.get(key) ?? 0
    return { ...p, available: Math.max(0, p.qty_total - totalReserved) }
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest lib/__tests__/stock.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/stock.ts lib/__tests__/stock.test.ts
git commit -m "feat: stock availability calculation with reserved subtraction"
```

---

## Task 6: Currency Library

**Files:**
- Create: `lib/currency.ts`
- Create: `lib/__tests__/currency.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// lib/__tests__/currency.test.ts
import { convert } from '@/lib/currency'

describe('convert', () => {
  const rates = { USD: 1, EUR: 0.92, PLN: 4.05, GBP: 0.79 }

  it('converts USD to PLN', () => {
    expect(convert(10, 'USD', 'PLN', rates)).toBeCloseTo(40.5, 1)
  })

  it('returns same amount for USD to USD', () => {
    expect(convert(10, 'USD', 'USD', rates)).toBe(10)
  })

  it('converts USD to GBP', () => {
    expect(convert(4.89, 'USD', 'GBP', rates)).toBeCloseTo(3.86, 1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest lib/__tests__/currency.test.ts
```

- [ ] **Step 3: Write lib/currency.ts**

```typescript
// lib/currency.ts
import type { Currency, ExchangeRates } from '@/types'

let cache: ExchangeRates | null = null
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

export async function fetchRates(): Promise<Record<Currency, number>> {
  if (cache && Date.now() - cache.fetched_at < CACHE_TTL_MS) {
    return cache.rates
  }
  const res = await fetch('https://open.er-api.com/v6/latest/USD')
  const data = await res.json()
  cache = {
    base: 'USD',
    rates: { USD: 1, EUR: data.rates.EUR, PLN: data.rates.PLN, GBP: data.rates.GBP },
    fetched_at: Date.now(),
  }
  return cache.rates
}

export function convert(
  amount: number,
  from: Currency,
  to: Currency,
  rates: Record<Currency, number>
): number {
  const inUSD = amount / rates[from]
  return Math.round(inUSD * rates[to] * 100) / 100
}
```

- [ ] **Step 4: Run test**

```bash
npx jest lib/__tests__/currency.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/currency.ts lib/__tests__/currency.test.ts
git commit -m "feat: currency conversion with 1hr rate cache"
```

---

## Task 7: API Routes — Products & Rates

**Files:**
- Create: `app/api/products/route.ts`
- Create: `app/api/rates/route.ts`

- [ ] **Step 1: Write app/api/products/route.ts**

```typescript
// app/api/products/route.ts
import { NextResponse } from 'next/server'
import { readProducts, readReserved } from '@/lib/sheets'
import { calculateAvailable } from '@/lib/stock'

export const revalidate = 60 // 60-second edge cache

export async function GET() {
  try {
    const [products, reserved] = await Promise.all([readProducts(), readReserved()])
    const withAvailable = calculateAvailable(products, reserved)
    return NextResponse.json(withAvailable)
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Write app/api/rates/route.ts**

```typescript
// app/api/rates/route.ts
import { NextResponse } from 'next/server'
import { fetchRates } from '@/lib/currency'

export const revalidate = 3600

export async function GET() {
  try {
    const rates = await fetchRates()
    return NextResponse.json(rates)
  } catch {
    // Fallback rates if API is down
    return NextResponse.json({ USD: 1, EUR: 0.92, PLN: 4.05, GBP: 0.79 })
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/products/route.ts app/api/rates/route.ts
git commit -m "feat: GET /api/products and /api/rates endpoints"
```

---

## Task 8: Auth Setup

**Files:**
- Create: `lib/auth.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `app/admin/login/page.tsx`
- Create: `app/admin/layout.tsx`

- [ ] **Step 1: Write lib/auth.ts**

```typescript
// lib/auth.ts
import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const validUser = credentials?.username === process.env.ADMIN_USERNAME
        const validPass = credentials?.password === process.env.ADMIN_PASSWORD
        if (validUser && validPass) {
          return { id: '1', name: credentials!.username, email: '' }
        }
        return null
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/admin/login' },
  secret: process.env.NEXTAUTH_SECRET,
}
```

Note: For production, store `ADMIN_PASSWORD` as a bcrypt hash and compare with `bcrypt.compare()`. For simplicity in v1 it's plaintext — change before deploying.

- [ ] **Step 2: Write auth API route**

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

- [ ] **Step 3: Write login page**

```typescript
// app/admin/login/page.tsx
'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const result = await signIn('credentials', {
      username: form.get('username'),
      password: form.get('password'),
      redirect: false,
    })
    if (result?.error) {
      setError('Invalid username or password')
    } else {
      router.push('/admin/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">Qaswa Textile</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input name="username" type="text" placeholder="Username" required
            className="w-full border rounded px-3 py-2" />
          <input name="password" type="password" placeholder="Password" required
            className="w-full border rounded px-3 py-2" />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
            Sign In
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Write admin layout with auth guard**

```typescript
// app/admin/layout.tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminNav from '@/components/AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/admin/login')

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminNav />
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
```

- [ ] **Step 5: Write AdminNav component**

```typescript
// components/AdminNav.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

const links = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/inventory', label: 'Inventory' },
  { href: '/admin/new-quotation', label: 'New Quotation' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/settings', label: 'Settings' },
]

export default function AdminNav() {
  const pathname = usePathname()
  return (
    <nav className="w-56 bg-white shadow-sm flex flex-col py-6 px-4">
      <h2 className="font-bold text-lg mb-8 text-blue-700">Qaswa Textile</h2>
      <ul className="space-y-2 flex-1">
        {links.map(l => (
          <li key={l.href}>
            <Link href={l.href}
              className={`block px-3 py-2 rounded text-sm ${pathname === l.href ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
      <button onClick={() => signOut({ callbackUrl: '/admin/login' })}
        className="text-sm text-gray-500 hover:text-red-600 text-left px-3">
        Sign out
      </button>
    </nav>
  )
}
```

- [ ] **Step 6: Add SessionProvider to root layout**

```typescript
// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = { title: 'Qaswa Textile Inventory' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add lib/auth.ts app/api/auth app/admin/login app/admin/layout.tsx components/AdminNav.tsx app/layout.tsx
git commit -m "feat: NextAuth credentials login + admin layout with auth guard"
```

---

## Task 9: Public Stock Page

**Files:**
- Create: `app/stock/page.tsx`
- Create: `components/StockTable.tsx`
- Create: `components/CurrencyToggle.tsx`

- [ ] **Step 1: Write CurrencyToggle component**

```typescript
// components/CurrencyToggle.tsx
'use client'
import type { Currency } from '@/types'

const CURRENCIES: Currency[] = ['USD', 'EUR', 'PLN', 'GBP']

export default function CurrencyToggle({
  value, onChange,
}: { value: Currency; onChange: (c: Currency) => void }) {
  return (
    <div className="flex gap-2">
      {CURRENCIES.map(c => (
        <button key={c} onClick={() => onChange(c)}
          className={`px-3 py-1 rounded text-sm font-medium ${value === c ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          {c}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Write StockTable component**

```typescript
// components/StockTable.tsx
'use client'
import { useEffect, useState } from 'react'
import type { Currency, Product } from '@/types'
import CurrencyToggle from './CurrencyToggle'

const SYMBOL: Record<Currency, string> = { USD: '$', EUR: '€', PLN: 'zł', GBP: '£' }

export default function StockTable() {
  const [products, setProducts] = useState<Product[]>([])
  const [rates, setRates] = useState<Record<Currency, number>>({ USD: 1, EUR: 0.92, PLN: 4.05, GBP: 0.79 })
  const [currency, setCurrency] = useState<Currency>('USD')
  const [loading, setLoading] = useState(true)

  async function load() {
    const [pRes, rRes] = await Promise.all([
      fetch('/api/products').then(r => r.json()),
      fetch('/api/rates').then(r => r.json()),
    ])
    setProducts(pRes)
    setRates(rRes)
    setLoading(false)
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [])

  function price(p: Product) {
    const converted = (p.price_usd / rates['USD']) * rates[currency]
    return `${SYMBOL[currency]}${converted.toFixed(2)}`
  }

  if (loading) return <p className="text-gray-500">Loading stock...</p>

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">Auto-refreshes every 60 seconds</p>
        <CurrencyToggle value={currency} onChange={setCurrency} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full bg-white rounded-lg shadow text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              {['Article', 'Size', 'GSM', 'Wt/Pc (g)', 'Available (pcs)', 'Price'].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => (
              <tr key={i} className={`border-t ${(p.available ?? 0) === 0 ? 'bg-red-50' : ''}`}>
                <td className="px-4 py-3 font-medium">{p.article}</td>
                <td className="px-4 py-3">{p.size_cm}</td>
                <td className="px-4 py-3">{p.gsm}</td>
                <td className="px-4 py-3">{p.wt_pc}</td>
                <td className="px-4 py-3">
                  {(p.available ?? 0) === 0
                    ? <span className="text-red-500 font-semibold">Out of stock</span>
                    : p.available?.toLocaleString()}
                </td>
                <td className="px-4 py-3 font-semibold">{price(p)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write stock page**

```typescript
// app/stock/page.tsx
import StockTable from '@/components/StockTable'

export default function StockPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Qaswa Textile — Stock</h1>
          <p className="text-gray-500 mt-1">Live available inventory</p>
        </div>
        <StockTable />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Update root page to redirect**

```typescript
// app/page.tsx
import { redirect } from 'next/navigation'
export default function Home() { redirect('/stock') }
```

- [ ] **Step 5: Commit**

```bash
git add app/stock app/page.tsx components/StockTable.tsx components/CurrencyToggle.tsx
git commit -m "feat: public stock page with currency toggle and 60s auto-refresh"
```

---

## Task 10: PDF Generation

**Files:**
- Create: `lib/pdf.ts`

- [ ] **Step 1: Write lib/pdf.ts**

```typescript
// lib/pdf.ts
import type { Order } from '@/types'

const SYMBOL: Record<string, string> = { USD: '$', EUR: '€', PLN: 'zł', GBP: '£' }

export function buildQuotationHTML(order: Order): string {
  const sym = SYMBOL[order.currency] ?? '$'
  const rows = order.items.map(item => `
    <tr>
      <td>${item.article}</td>
      <td>${item.size_cm}</td>
      <td>${item.gsm}</td>
      <td>${item.qty.toLocaleString()}</td>
      <td>${sym}${item.price_display.toFixed(2)}</td>
      <td>${sym}${(item.price_display * item.qty).toFixed(2)}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a1a; }
  h1 { color: #1d4ed8; margin-bottom: 4px; }
  .meta { color: #555; font-size: 14px; margin-bottom: 30px; }
  .label { font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  th { background: #1d4ed8; color: white; padding: 10px; text-align: left; font-size: 13px; }
  td { padding: 9px 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
  tr:nth-child(even) { background: #f9fafb; }
  .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
  .footer { margin-top: 40px; font-size: 12px; color: #888; border-top: 1px solid #e5e7eb; padding-top: 16px; }
</style>
</head>
<body>
  <h1>Qaswa Textile</h1>
  <div class="meta">Premium Towel Wholesale</div>
  <hr/>
  <p><span class="label">Quotation ID:</span> ${order.order_id}</p>
  <p><span class="label">Date:</span> ${new Date(order.created_at).toLocaleDateString('en-GB')}</p>
  <p><span class="label">Customer:</span> ${order.customer_name}</p>
  <p><span class="label">Contact:</span> ${order.customer_contact}</p>
  <table>
    <thead>
      <tr><th>Article</th><th>Size</th><th>GSM</th><th>Qty (pcs)</th><th>Unit Price</th><th>Total</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="total">Grand Total: ${sym}${order.total_amount.toFixed(2)} ${order.currency}</div>
  <div class="footer">
    This quotation is valid for 7 days. Stock is reserved upon confirmation.<br/>
    Contact: info@qaswatextile.com
  </div>
</body>
</html>`
}

export async function generateQuotationPDF(order: Order): Promise<Buffer> {
  const puppeteer = await import('puppeteer')
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  try {
    const page = await browser.newPage()
    await page.setContent(buildQuotationHTML(order), { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({ format: 'A4', margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}
```

- [ ] **Step 2: Write POST /api/pdf route**

```typescript
// app/api/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateQuotationPDF } from '@/lib/pdf'
import { readOrders } from '@/lib/sheets'
import type { Order } from '@/types'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { order_id } = await req.json() as { order_id: string }
  const orders = await readOrders()
  const order = orders.find(o => o.order_id === order_id)
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const pdf = await generateQuotationPDF(order)
  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="quotation-${order_id}.pdf"`,
    },
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/pdf.ts app/api/pdf/route.ts
git commit -m "feat: Puppeteer PDF generation with branded quotation template"
```

---

## Task 11: POST /api/quotation (Reserve Stock)

**Files:**
- Create: `app/api/quotation/route.ts`

- [ ] **Step 1: Write route**

```typescript
// app/api/quotation/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { withLock } from '@/lib/lock'
import { readProducts, readReserved, appendOrderRow, appendReservedRows, makeProductKey } from '@/lib/sheets'
import { calculateAvailable } from '@/lib/stock'
import { fetchRates, convert } from '@/lib/currency'
import { v4 as uuidv4 } from 'uuid'
import type { LineItem, Currency } from '@/types'

interface QuotationRequest {
  customer_name: string
  customer_contact: string
  currency: Currency
  items: Array<{ article: string; size_cm: string; gsm: number; qty: number; price_usd: number }>
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as QuotationRequest

  try {
    const order_id = await withLock(async () => {
      const [products, reserved, rates] = await Promise.all([
        readProducts(), readReserved(), fetchRates(),
      ])
      const available = calculateAvailable(products, reserved)

      // Validate all items
      for (const item of body.items) {
        const product = available.find(
          p => p.article === item.article && p.size_cm === item.size_cm && p.gsm === item.gsm
        )
        if (!product) throw new Error(`Product not found: ${item.article} ${item.size_cm}`)
        if ((product.available ?? 0) < item.qty) {
          throw new Error(`Insufficient stock for ${item.article} ${item.size_cm}: available ${product.available}, requested ${item.qty}`)
        }
        if (item.price_usd < product.min_sale_usd) {
          throw new Error(`Price $${item.price_usd} is below minimum $${product.min_sale_usd} for ${item.article}`)
        }
      }

      const lineItems: LineItem[] = body.items.map(item => ({
        article: item.article,
        size_cm: item.size_cm,
        gsm: item.gsm,
        qty: item.qty,
        price_usd: item.price_usd,
        price_display: convert(item.price_usd, 'USD', body.currency, rates),
      }))

      const total_amount = lineItems.reduce((sum, i) => sum + i.price_display * i.qty, 0)
      const id = uuidv4()

      await appendOrderRow({
        order_id: id,
        created_at: new Date().toISOString(),
        customer_name: body.customer_name,
        customer_contact: body.customer_contact,
        status: 'reserved',
        currency: body.currency,
        items: lineItems,
        total_amount: Math.round(total_amount * 100) / 100,
        confirmed_at: null,
      })

      await appendReservedRows(body.items.map(item => ({
        article_size_key: makeProductKey(item.article, item.size_cm, item.gsm),
        reserved_qty: item.qty,
        order_id: id,
      })))

      return id
    })

    return NextResponse.json({ order_id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create quotation'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/quotation/route.ts
git commit -m "feat: POST /api/quotation with lock, stock validation, and reservation"
```

---

## Task 12: POST /api/confirm and POST /api/cancel

**Files:**
- Create: `app/api/confirm/route.ts`
- Create: `app/api/cancel/route.ts`

- [ ] **Step 1: Write confirm route**

```typescript
// app/api/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { withLock } from '@/lib/lock'
import { readProducts, readReserved, updateProductQty, deleteReservedByOrderId, updateOrderStatus, readOrders } from '@/lib/sheets'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { order_id } = await req.json() as { order_id: string }

  try {
    await withLock(async () => {
      const [orders, products, reserved] = await Promise.all([
        readOrders(), readProducts(), readReserved(),
      ])
      const order = orders.find(o => o.order_id === order_id)
      if (!order) throw new Error('Order not found')
      if (order.status !== 'reserved') throw new Error('Order is not in reserved status')

      // Deduct stock for each line item
      for (const item of order.items) {
        const product = products.find(
          p => p.article === item.article && p.size_cm === item.size_cm && p.gsm === item.gsm
        )
        if (!product) throw new Error(`Product not found: ${item.article}`)
        await updateProductQty(
          item.article, item.size_cm, item.gsm,
          product.qty_total - item.qty,
          product.version + 1
        )
      }

      await deleteReservedByOrderId(order_id)
      await updateOrderStatus(order_id, 'confirmed', new Date().toISOString())
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to confirm order'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
```

- [ ] **Step 2: Write cancel route**

```typescript
// app/api/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { deleteReservedByOrderId, updateOrderStatus, readOrders } from '@/lib/sheets'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { order_id } = await req.json() as { order_id: string }

  try {
    const orders = await readOrders()
    const order = orders.find(o => o.order_id === order_id)
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (!['reserved', 'draft'].includes(order.status)) {
      return NextResponse.json({ error: 'Only reserved or draft orders can be cancelled' }, { status: 400 })
    }

    await deleteReservedByOrderId(order_id)
    await updateOrderStatus(order_id, 'cancelled')
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to cancel order'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/confirm/route.ts app/api/cancel/route.ts
git commit -m "feat: POST /api/confirm and /api/cancel order endpoints"
```

---

## Task 13: Admin Dashboard

**Files:**
- Create: `app/admin/dashboard/page.tsx`

- [ ] **Step 1: Write dashboard page**

```typescript
// app/admin/dashboard/page.tsx
import { readProducts, readOrders, readReserved } from '@/lib/sheets'
import { calculateAvailable } from '@/lib/stock'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const [products, orders, reserved] = await Promise.all([
    readProducts(), readOrders(), readReserved(),
  ])
  const withAvailable = calculateAvailable(products, reserved)

  const totalStockValueUSD = withAvailable.reduce((sum, p) => sum + p.price_usd * p.qty_total, 0)
  const lowStock = withAvailable.filter(p => (p.available ?? 0) < 200)
  const recentOrders = [...orders].reverse().slice(0, 5)
  const pendingCount = orders.filter(o => o.status === 'reserved').length

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-5 rounded-lg shadow">
          <p className="text-sm text-gray-500">Total Stock Value</p>
          <p className="text-2xl font-bold">${totalStockValueUSD.toLocaleString('en-US', { minimumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow">
          <p className="text-sm text-gray-500">Pending Orders</p>
          <p className="text-2xl font-bold">{pendingCount}</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow">
          <p className="text-sm text-gray-500">Low Stock Items</p>
          <p className={`text-2xl font-bold ${lowStock.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {lowStock.length}
          </p>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
          <h2 className="font-semibold text-red-700 mb-2">Low Stock Alerts</h2>
          <ul className="space-y-1">
            {lowStock.map((p, i) => (
              <li key={i} className="text-sm text-red-600">
                {p.article} {p.size_cm} {p.gsm}gsm — {p.available} pcs remaining
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-5">
        <div className="flex justify-between mb-4">
          <h2 className="font-semibold">Recent Orders</h2>
          <Link href="/admin/orders" className="text-blue-600 text-sm hover:underline">View all</Link>
        </div>
        <table className="w-full text-sm">
          <thead className="text-gray-500 text-xs uppercase">
            <tr>
              {['ID', 'Customer', 'Status', 'Currency', 'Total', 'Date'].map(h => (
                <th key={h} className="text-left py-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentOrders.map(o => (
              <tr key={o.order_id} className="border-t">
                <td className="py-2 font-mono text-xs">{o.order_id.slice(0, 8)}…</td>
                <td className="py-2">{o.customer_name}</td>
                <td className="py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    o.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                    o.status === 'reserved' ? 'bg-yellow-100 text-yellow-700' :
                    o.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'}`}>
                    {o.status}
                  </span>
                </td>
                <td className="py-2">{o.currency}</td>
                <td className="py-2 font-semibold">{o.total_amount.toFixed(2)}</td>
                <td className="py-2 text-gray-500">{new Date(o.created_at).toLocaleDateString('en-GB')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/dashboard/page.tsx
git commit -m "feat: admin dashboard with stock value, low-stock alerts, recent orders"
```

---

## Task 14: Admin New Quotation Page

**Files:**
- Create: `app/admin/new-quotation/page.tsx`
- Create: `components/QuotationForm.tsx`

- [ ] **Step 1: Write QuotationForm component**

```typescript
// components/QuotationForm.tsx
'use client'
import { useState, useEffect } from 'react'
import type { Product, Currency } from '@/types'
import CurrencyToggle from './CurrencyToggle'

const SYMBOL: Record<Currency, string> = { USD: '$', EUR: '€', PLN: 'zł', GBP: '£' }

interface CartItem { product: Product; qty: number; price_usd: number }

export default function QuotationForm() {
  const [products, setProducts] = useState<Product[]>([])
  const [rates, setRates] = useState<Record<Currency, number>>({ USD: 1, EUR: 0.92, PLN: 4.05, GBP: 0.79 })
  const [currency, setCurrency] = useState<Currency>('USD')
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerContact, setCustomerContact] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/products').then(r => r.json()),
      fetch('/api/rates').then(r => r.json()),
    ]).then(([p, r]) => { setProducts(p); setRates(r) })
  }, [])

  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(i => i.product.article === product.article && i.product.size_cm === product.size_cm && i.product.gsm === product.gsm)
      if (existing) return prev
      return [...prev, { product, qty: 1, price_usd: product.price_usd }]
    })
  }

  function updateQty(index: number, qty: number) {
    setCart(prev => prev.map((item, i) => i === index ? { ...item, qty: Math.max(1, qty) } : item))
  }

  function updatePrice(index: number, price_usd: number) {
    setCart(prev => prev.map((item, i) => i === index ? { ...item, price_usd } : item))
  }

  function removeFromCart(index: number) {
    setCart(prev => prev.filter((_, i) => i !== index))
  }

  function convertPrice(price_usd: number) {
    return ((price_usd / rates['USD']) * rates[currency]).toFixed(2)
  }

  function grandTotal() {
    return cart.reduce((sum, item) => {
      const display = (item.price_usd / rates['USD']) * rates[currency]
      return sum + display * item.qty
    }, 0).toFixed(2)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (cart.length === 0) { setError('Add at least one product'); return }

    // Client-side min price validation
    for (const item of cart) {
      if (item.price_usd < item.product.min_sale_usd) {
        setError(`Price for ${item.product.article} is below minimum $${item.product.min_sale_usd}`)
        return
      }
      if (item.qty > (item.product.available ?? 0)) {
        setError(`${item.product.article}: only ${item.product.available} pcs available`)
        return
      }
    }

    setLoading(true)
    const res = await fetch('/api/quotation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: customerName,
        customer_contact: customerContact,
        currency,
        items: cart.map(i => ({
          article: i.product.article,
          size_cm: i.product.size_cm,
          gsm: i.product.gsm,
          qty: i.qty,
          price_usd: i.price_usd,
        })),
      }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) { setError(data.error); return }

    setSuccess(data.order_id)
  }

  async function downloadPDF() {
    if (!success) return
    const res = await fetch('/api/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: success }),
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `quotation-${success}.pdf`; a.click()
    URL.revokeObjectURL(url)
  }

  if (success) return (
    <div className="text-center py-20">
      <h2 className="text-2xl font-bold text-green-700 mb-2">Quotation Reserved!</h2>
      <p className="text-gray-500 mb-6">ID: {success}</p>
      <button onClick={downloadPDF}
        className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 mr-3">
        Download PDF
      </button>
      <button onClick={() => { setSuccess(null); setCart([]) }}
        className="bg-gray-100 text-gray-700 px-6 py-3 rounded hover:bg-gray-200">
        New Quotation
      </button>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Customer Name</label>
          <input value={customerName} onChange={e => setCustomerName(e.target.value)} required
            className="w-full border rounded px-3 py-2" placeholder="e.g. ABC Retail Ltd" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Customer Contact</label>
          <input value={customerContact} onChange={e => setCustomerContact(e.target.value)} required
            className="w-full border rounded px-3 py-2" placeholder="Phone or email" />
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="font-semibold">Select Products</h2>
        <CurrencyToggle value={currency} onChange={setCurrency} />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              {['Article', 'Size', 'GSM', 'Available', `Price (${currency})`, 'Min Price (USD)', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => (
              <tr key={i} className="border-t">
                <td className="px-4 py-2 font-medium">{p.article}</td>
                <td className="px-4 py-2">{p.size_cm}</td>
                <td className="px-4 py-2">{p.gsm}</td>
                <td className="px-4 py-2">{(p.available ?? 0).toLocaleString()}</td>
                <td className="px-4 py-2">{SYMBOL[currency]}{convertPrice(p.price_usd)}</td>
                <td className="px-4 py-2 text-gray-400">${p.min_sale_usd}</td>
                <td className="px-4 py-2">
                  <button type="button" onClick={() => addToCart(p)}
                    disabled={(p.available ?? 0) === 0}
                    className="text-blue-600 hover:underline disabled:text-gray-300 text-sm">
                    Add
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {cart.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <h2 className="font-semibold p-4 border-b">Quotation Items</h2>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                {['Article', 'Size', 'GSM', 'Qty', 'Price USD', `Display (${currency})`, 'Line Total', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cart.map((item, i) => {
                const displayPrice = convertPrice(item.price_usd)
                const lineTotal = (parseFloat(displayPrice) * item.qty).toFixed(2)
                const belowMin = item.price_usd < item.product.min_sale_usd
                return (
                  <tr key={i} className={`border-t ${belowMin ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-2">{item.product.article}</td>
                    <td className="px-4 py-2">{item.product.size_cm}</td>
                    <td className="px-4 py-2">{item.product.gsm}</td>
                    <td className="px-4 py-2">
                      <input type="number" min={1} max={item.product.available ?? 0}
                        value={item.qty} onChange={e => updateQty(i, parseInt(e.target.value))}
                        className="w-20 border rounded px-2 py-1" />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" step="0.01" value={item.price_usd}
                        onChange={e => updatePrice(i, parseFloat(e.target.value))}
                        className={`w-24 border rounded px-2 py-1 ${belowMin ? 'border-red-400' : ''}`} />
                      {belowMin && <p className="text-red-500 text-xs">Below min ${item.product.min_sale_usd}</p>}
                    </td>
                    <td className="px-4 py-2">{SYMBOL[currency]}{displayPrice}</td>
                    <td className="px-4 py-2 font-semibold">{SYMBOL[currency]}{lineTotal}</td>
                    <td className="px-4 py-2">
                      <button type="button" onClick={() => removeFromCart(i)} className="text-red-500 hover:underline text-xs">Remove</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t bg-gray-50">
                <td colSpan={6} className="px-4 py-3 text-right font-bold">Grand Total</td>
                <td className="px-4 py-3 font-bold text-lg">{SYMBOL[currency]}{grandTotal()} {currency}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button type="submit" disabled={loading || cart.length === 0}
        className="bg-blue-600 text-white px-8 py-3 rounded hover:bg-blue-700 disabled:opacity-50">
        {loading ? 'Saving...' : 'Save & Reserve Stock'}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Write new-quotation page**

```typescript
// app/admin/new-quotation/page.tsx
import QuotationForm from '@/components/QuotationForm'

export default function NewQuotationPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">New Quotation</h1>
      <QuotationForm />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/admin/new-quotation components/QuotationForm.tsx
git commit -m "feat: admin new quotation form with cart, currency conversion, and PDF download"
```

---

## Task 15: Admin Orders Page

**Files:**
- Create: `app/admin/orders/page.tsx`
- Create: `components/OrdersTable.tsx`

- [ ] **Step 1: Write OrdersTable component**

```typescript
// components/OrdersTable.tsx
'use client'
import { useState } from 'react'
import type { Order } from '@/types'
import { useRouter } from 'next/navigation'

const STATUS_COLORS: Record<string, string> = {
  reserved: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  shipped: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-600',
  draft: 'bg-gray-100 text-gray-600',
}

export default function OrdersTable({ orders }: { orders: Order[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<string>('all')
  const [loading, setLoading] = useState<string | null>(null)

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  async function action(order_id: string, endpoint: string) {
    setLoading(order_id + endpoint)
    await fetch(`/api/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id }),
    })
    setLoading(null)
    router.refresh()
  }

  async function downloadPDF(order_id: string) {
    const res = await fetch('/api/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id }),
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `quotation-${order_id}.pdf`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {['all', 'reserved', 'confirmed', 'shipped', 'cancelled'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded text-sm capitalize ${filter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              {['ID', 'Customer', 'Contact', 'Status', 'Currency', 'Total', 'Date', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.order_id} className="border-t">
                <td className="px-4 py-3 font-mono text-xs">{o.order_id.slice(0, 8)}…</td>
                <td className="px-4 py-3 font-medium">{o.customer_name}</td>
                <td className="px-4 py-3 text-gray-500">{o.customer_contact}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[o.status] ?? ''}`}>
                    {o.status}
                  </span>
                </td>
                <td className="px-4 py-3">{o.currency}</td>
                <td className="px-4 py-3 font-semibold">{o.total_amount.toFixed(2)}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(o.created_at).toLocaleDateString('en-GB')}</td>
                <td className="px-4 py-3 flex gap-2 flex-wrap">
                  <button onClick={() => downloadPDF(o.order_id)}
                    className="text-blue-600 hover:underline text-xs">PDF</button>
                  {o.status === 'reserved' && (
                    <>
                      <button onClick={() => action(o.order_id, 'confirm')}
                        disabled={loading !== null}
                        className="text-green-600 hover:underline text-xs">Confirm</button>
                      <button onClick={() => action(o.order_id, 'cancel')}
                        disabled={loading !== null}
                        className="text-red-500 hover:underline text-xs">Cancel</button>
                    </>
                  )}
                  {o.status === 'confirmed' && (
                    <button onClick={() => action(o.order_id, 'confirm')}
                      disabled={loading !== null}
                      className="text-blue-600 hover:underline text-xs">Mark Shipped</button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">No orders found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write orders page**

```typescript
// app/admin/orders/page.tsx
import { readOrders } from '@/lib/sheets'
import OrdersTable from '@/components/OrdersTable'

export const dynamic = 'force-dynamic'

export default async function OrdersPage() {
  const orders = await readOrders()
  const sorted = [...orders].reverse()

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Orders</h1>
      <OrdersTable orders={sorted} />
    </div>
  )
}
```

- [ ] **Step 3: Add shipped endpoint (mark confirmed → shipped)**

```typescript
// app/api/ship/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updateOrderStatus, readOrders } from '@/lib/sheets'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { order_id } = await req.json() as { order_id: string }
  const orders = await readOrders()
  const order = orders.find(o => o.order_id === order_id)
  if (!order || order.status !== 'confirmed') {
    return NextResponse.json({ error: 'Order must be confirmed before marking shipped' }, { status: 400 })
  }
  await updateOrderStatus(order_id, 'shipped')
  return NextResponse.json({ success: true })
}
```

Update `OrdersTable.tsx` — change the "Mark Shipped" button action from `'confirm'` to `'ship'`:

```typescript
// In OrdersTable.tsx, find this line:
<button onClick={() => action(o.order_id, 'confirm')}

// Change to:
<button onClick={() => action(o.order_id, 'ship')}
```

- [ ] **Step 4: Commit**

```bash
git add app/admin/orders components/OrdersTable.tsx app/api/ship/route.ts
git commit -m "feat: admin orders page with confirm, ship, cancel, and PDF actions"
```

---

## Task 16: Admin Inventory Page

**Files:**
- Create: `app/admin/inventory/page.tsx`
- Create: `components/InventoryTable.tsx`
- Create: `app/api/inventory/route.ts`

- [ ] **Step 1: Write PUT /api/inventory**

```typescript
// app/api/inventory/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readProducts, updateProductQty } from '@/lib/sheets'

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { article, size_cm, gsm, qty_total } = await req.json() as {
    article: string; size_cm: string; gsm: number; qty_total: number
  }

  const products = await readProducts()
  const product = products.find(p => p.article === article && p.size_cm === size_cm && p.gsm === gsm)
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  await updateProductQty(article, size_cm, gsm, qty_total, product.version + 1)
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Write InventoryTable component**

```typescript
// components/InventoryTable.tsx
'use client'
import { useState } from 'react'
import type { Product } from '@/types'
import { useRouter } from 'next/navigation'

export default function InventoryTable({ products }: { products: Product[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<number | null>(null)
  const [newQty, setNewQty] = useState(0)
  const [saving, setSaving] = useState(false)

  async function saveQty(p: Product, index: number) {
    setSaving(true)
    await fetch('/api/inventory', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ article: p.article, size_cm: p.size_cm, gsm: p.gsm, qty_total: newQty }),
    })
    setSaving(false)
    setEditing(null)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            {['Article', 'Size', 'GSM', 'Wt/Pc', 'Cartons', 'Stock (pcs)', 'Price USD', 'Min Price', ''].map(h => (
              <th key={h} className="px-4 py-3 text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => (
            <tr key={i} className="border-t">
              <td className="px-4 py-3 font-medium">{p.article}</td>
              <td className="px-4 py-3">{p.size_cm}</td>
              <td className="px-4 py-3">{p.gsm}</td>
              <td className="px-4 py-3">{p.wt_pc}g</td>
              <td className="px-4 py-3">{p.cartons}</td>
              <td className="px-4 py-3">
                {editing === i ? (
                  <input type="number" value={newQty} onChange={e => setNewQty(parseInt(e.target.value))}
                    className="w-24 border rounded px-2 py-1" />
                ) : (
                  p.qty_total.toLocaleString()
                )}
              </td>
              <td className="px-4 py-3">${p.price_usd}</td>
              <td className="px-4 py-3 text-gray-400">${p.min_sale_usd}</td>
              <td className="px-4 py-3">
                {editing === i ? (
                  <div className="flex gap-2">
                    <button onClick={() => saveQty(p, i)} disabled={saving}
                      className="text-green-600 hover:underline text-xs">Save</button>
                    <button onClick={() => setEditing(null)}
                      className="text-gray-400 hover:underline text-xs">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => { setEditing(i); setNewQty(p.qty_total) }}
                    className="text-blue-600 hover:underline text-xs">Edit Qty</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: Write inventory page**

```typescript
// app/admin/inventory/page.tsx
import { readProducts, readReserved } from '@/lib/sheets'
import { calculateAvailable } from '@/lib/stock'
import InventoryTable from '@/components/InventoryTable'

export const dynamic = 'force-dynamic'

export default async function InventoryPage() {
  const [products, reserved] = await Promise.all([readProducts(), readReserved()])
  const withAvailable = calculateAvailable(products, reserved)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Inventory</h1>
      <p className="text-gray-500 text-sm mb-6">Edit stock quantities after new arrivals. Minimum sale prices are set in Google Sheets directly.</p>
      <InventoryTable products={withAvailable} />
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/admin/inventory components/InventoryTable.tsx app/api/inventory/route.ts
git commit -m "feat: admin inventory page with editable stock quantities"
```

---

## Task 17: Public Quotation View

**Files:**
- Create: `app/quotation/[id]/page.tsx`

- [ ] **Step 1: Write quotation view page**

```typescript
// app/quotation/[id]/page.tsx
import { readOrders } from '@/lib/sheets'
import { notFound } from 'next/navigation'

const SYMBOL: Record<string, string> = { USD: '$', EUR: '€', PLN: 'zł', GBP: '£' }

export default async function QuotationViewPage({ params }: { params: { id: string } }) {
  const orders = await readOrders()
  const order = orders.find(o => o.order_id === params.id)
  if (!order) notFound()

  const sym = SYMBOL[order.currency] ?? '$'

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold text-blue-700 mb-1">Qaswa Textile</h1>
        <p className="text-gray-500 mb-6">Premium Towel Wholesale</p>
        <hr className="mb-6" />
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div><span className="font-semibold">Quotation ID:</span> {order.order_id}</div>
          <div><span className="font-semibold">Date:</span> {new Date(order.created_at).toLocaleDateString('en-GB')}</div>
          <div><span className="font-semibold">Customer:</span> {order.customer_name}</div>
          <div><span className="font-semibold">Contact:</span> {order.customer_contact}</div>
          <div>
            <span className="font-semibold">Status:</span>{' '}
            <span className="capitalize">{order.status}</span>
          </div>
        </div>
        <table className="w-full text-sm border-collapse mb-6">
          <thead>
            <tr className="bg-blue-600 text-white">
              {['Article', 'Size', 'GSM', 'Qty', 'Unit Price', 'Total'].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                <td className="px-4 py-3">{item.article}</td>
                <td className="px-4 py-3">{item.size_cm}</td>
                <td className="px-4 py-3">{item.gsm}</td>
                <td className="px-4 py-3">{item.qty.toLocaleString()}</td>
                <td className="px-4 py-3">{sym}{item.price_display.toFixed(2)}</td>
                <td className="px-4 py-3 font-semibold">{sym}{(item.price_display * item.qty).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-right text-xl font-bold mb-8">
          Grand Total: {sym}{order.total_amount.toFixed(2)} {order.currency}
        </div>
        <p className="text-gray-400 text-xs">This quotation is valid for 7 days. Contact: info@qaswatextile.com</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/quotation
git commit -m "feat: public quotation view page"
```

---

## Task 18: Google Sheets Setup Script

**Files:**
- Create: `scripts/seed-sheets.ts`

- [ ] **Step 1: Write seed script**

```typescript
// scripts/seed-sheets.ts
// Run once: npx ts-node scripts/seed-sheets.ts
import { google } from 'googleapis'
import 'dotenv/config'

const SHEET_ID = process.env.GOOGLE_SHEET_ID!

async function main() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  const sheets = google.sheets({ version: 'v4', auth })

  // Create named sheets (tabs)
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: ['Products', 'Orders', 'Reserved', 'Lock'].map(title => ({
        addSheet: { properties: { title } },
      })),
    },
  })

  // Products headers + initial data
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: 'Products!A1:I1',
    valueInputOption: 'RAW',
    requestBody: { values: [['article', 'size_cm', 'gsm', 'wt_pc', 'cartons', 'qty_total', 'price_usd', 'version', 'min_sale_usd']] },
  })
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Products!A:I',
    valueInputOption: 'RAW',
    requestBody: { values: [
      ['HAND TOWEL',  '50x100',  460, 230, 23, 1840, 1.80, 1, 1.60],
      ['BATH TOWEL',  '70x140',  460, 451, 46, 1840, 3.12, 1, 2.80],
      ['HAND TOWEL',  '50x100',  500, 250, 23, 1840, 1.92, 1, 1.70],
      ['BATH TOWEL',  '70x140',  500, 490, 50, 2000, 3.36, 1, 3.00],
      ['BATH SHEET',  '100x150', 500, 750, 15,  420, 4.91, 1, 4.40],
      ['POOL TOWEL',  '90x180',  440, 713, 16,  448, 4.89, 1, 4.40],
      ['BATHMAT',     '50x70',   550, 193, 13, 1040, 1.64, 1, 1.45],
      ['BATHMAT',     '50x70',   650, 228, 14, 1120, 1.87, 1, 1.65],
    ]},
  })

  // Headers for other tabs
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID, range: 'Orders!A1:I1', valueInputOption: 'RAW',
    requestBody: { values: [['order_id','created_at','customer_name','customer_contact','status','currency','items_json','total_amount','confirmed_at']] },
  })
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID, range: 'Reserved!A1:C1', valueInputOption: 'RAW',
    requestBody: { values: [['article_size_key','reserved_qty','order_id']] },
  })
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID, range: 'Lock!A1:B2', valueInputOption: 'RAW',
    requestBody: { values: [['status','locked_at'],['FREE','']] },
  })

  console.log('Sheets seeded successfully.')
}

main().catch(console.error)
```

- [ ] **Step 2: Commit**

```bash
git add scripts/seed-sheets.ts
git commit -m "feat: Google Sheets seed script with initial product data"
```

---

## Task 19: Deployment Configuration

**Files:**
- Create: `ecosystem.config.js`
- Create: `next.config.ts`

- [ ] **Step 1: Write PM2 config**

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'qaswa-inventory',
    script: 'node_modules/.bin/next',
    args: 'start',
    env: { NODE_ENV: 'production', PORT: 3000 },
    restart_delay: 3000,
    max_restarts: 10,
  }],
}
```

- [ ] **Step 2: Write next.config.ts**

```typescript
// next.config.ts
import type { NextConfig } from 'next'
const config: NextConfig = {
  output: 'standalone',
  experimental: { serverComponentsExternalPackages: ['puppeteer'] },
}
export default config
```

- [ ] **Step 3: Deployment checklist**

```
1. SSH into Plesk server
2. Install Node.js 18+: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt install nodejs
3. Install PM2: npm install -g pm2
4. Clone/upload repo to server (e.g. /var/www/qaswa-inventory)
5. Copy .env.example to .env.local and fill in all values
6. Run: npm install && npm run build
7. Run seed script once: npx ts-node scripts/seed-sheets.ts
8. Start app: pm2 start ecosystem.config.js
9. Persist on reboot: pm2 startup && pm2 save
10. In Plesk: add domain → Node.js → set document root → enable reverse proxy to port 3000
11. Enable SSL in Plesk (Let's Encrypt)
```

- [ ] **Step 4: Commit**

```bash
git add ecosystem.config.js next.config.ts
git commit -m "feat: PM2 ecosystem config and Next.js standalone build for Plesk deployment"
```

---

## Self-Review: Spec Coverage Check

| Spec Requirement | Task(s) |
|-----------------|---------|
| Stock tracking (qty goes down) | Task 12 (confirm), Task 16 (inventory edit) |
| PDF quotation generation | Task 10 (lib/pdf.ts + /api/pdf) |
| Admin login | Task 8 |
| Public stock page | Task 9 |
| Two-step reserve → confirm | Tasks 11, 12 |
| Multi-currency USD/EUR/PLN/GBP | Task 6 (lib/currency), Tasks 9, 14 |
| CAP mutex lock | Task 4 (lib/lock.ts) |
| Optimistic versioning | Task 3 (lib/sheets.ts updateProductQty) |
| Google Sheets as database | Task 3 (lib/sheets.ts) |
| Low-stock alerts on dashboard | Task 13 |
| Orders list with filter | Task 15 |
| Cancel order (release reserved) | Task 12 (/api/cancel) |
| Public quotation view | Task 17 |
| Plesk + PM2 deployment | Task 19 |
| Seed initial product data | Task 18 |
