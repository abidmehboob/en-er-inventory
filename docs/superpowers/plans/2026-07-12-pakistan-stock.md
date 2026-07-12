# Pakistan Ready-to-Ship Stock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Pakistan ready-to-ship stock section to the public stock page, backed by a new `PakistanStock` Google Sheet tab, with a full admin CRUD interface for managing items.

**Architecture:** New `PakistanStock` sheet tab holds flat item rows identified by UUID. Four sheet helper functions follow the existing pattern in `lib/sheets.ts`. The public stock page gains a second stacked section below Warsaw; the admin panel gets a new "Pakistan Stock" page with a table + modal form.

**Tech Stack:** Next.js 14 App Router, TypeScript, Google Sheets API (googleapis), `uuid` (already installed), NextAuth (already installed), Tailwind CSS, Jest + ts-jest.

---

## File Map

| File | Action |
|------|--------|
| `types/index.ts` | Modify — add `PakistanStockStatus` and `PakistanStockItem` |
| `lib/sheets.ts` | Modify — add `parsePakistanStockRow` + 4 sheet functions |
| `__tests__/pakistan-stock.test.ts` | Create — unit tests for `parsePakistanStockRow` |
| `app/api/pakistan-stock/route.ts` | Create — public GET, admin POST |
| `app/api/pakistan-stock/[id]/route.ts` | Create — admin PUT, admin DELETE |
| `components/PakistanStockTable.tsx` | Create — public read-only table component |
| `app/stock/page.tsx` | Modify — add Pakistan section below Warsaw |
| `app/admin/pakistan-stock/page.tsx` | Create — admin CRUD page with modal |
| `components/AdminNav.tsx` | Modify — add "Pakistan Stock" nav link |

---

## Pre-work: Create the Google Sheet tab

Before running any code, manually add the `PakistanStock` tab to the Google Sheet:

1. Open the Google Sheet used by the app
2. Add a new tab named exactly `PakistanStock`
3. Set row 1 as headers: `item_id | article | size_cm | gsm | wt_pc | cartons | qty_total | status | created_at`

---

## Task 1: Add TypeScript types

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Add the two new types to `types/index.ts`**

Append after the existing `Expense` interface:

```ts
export type PakistanStockStatus = 'available' | 'out_of_stock'

export interface PakistanStockItem {
  item_id: string               // UUID, stable across row deletions
  article: string
  size_cm: string
  gsm: number
  wt_pc: number
  cartons: number
  qty_total: number
  status: PakistanStockStatus
  created_at: string            // ISO datetime
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
git commit -m "feat: add PakistanStockItem type"
```

---

## Task 2: Sheet helper functions + unit tests

**Files:**
- Modify: `lib/sheets.ts`
- Create: `__tests__/pakistan-stock.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/pakistan-stock.test.ts`:

```ts
import { parsePakistanStockRow } from '@/lib/sheets'

describe('parsePakistanStockRow', () => {
  it('parses all fields correctly', () => {
    const row = [
      'abc-123',
      'Hotel White Towel',
      '50x100',
      '450',
      '0.35',
      '120',
      '2400',
      'available',
      '2026-07-12T10:00:00Z',
    ]
    expect(parsePakistanStockRow(row)).toEqual({
      item_id: 'abc-123',
      article: 'Hotel White Towel',
      size_cm: '50x100',
      gsm: 450,
      wt_pc: 0.35,
      cartons: 120,
      qty_total: 2400,
      status: 'available',
      created_at: '2026-07-12T10:00:00Z',
    })
  })

  it('parses out_of_stock status', () => {
    const row = ['xyz', 'Bath Sheet', '70x140', '500', '0.6', '80', '0', 'out_of_stock', '2026-07-12T11:00:00Z']
    expect(parsePakistanStockRow(row).status).toBe('out_of_stock')
    expect(parsePakistanStockRow(row).qty_total).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx jest pakistan-stock --no-coverage
```

Expected: FAIL — `parsePakistanStockRow` is not exported from `@/lib/sheets`.

- [ ] **Step 3: Add `parsePakistanStockRow` and the four sheet functions to `lib/sheets.ts`**

Add the import at the top of `lib/sheets.ts` (update the existing import line):

```ts
import type { Product, Order, ReservedRow, LineItem, Expense, PakistanStockItem, PakistanStockStatus } from '@/types'
```

Also add this import near the top of `lib/sheets.ts` (after the existing imports):

```ts
import { v4 as uuidv4 } from 'uuid'
```

Then append these functions at the bottom of `lib/sheets.ts`:

```ts
export function parsePakistanStockRow(row: string[]): PakistanStockItem {
  return {
    item_id: row[0],
    article: row[1],
    size_cm: row[2],
    gsm: Number(row[3]),
    wt_pc: Number(row[4]),
    cartons: Number(row[5]),
    qty_total: Number(row[6]),
    status: row[7] as PakistanStockStatus,
    created_at: row[8],
  }
}

async function readPakistanStockRaw(): Promise<string[][]> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'PakistanStock!A2:I',
  })
  return (res.data.values || []) as string[][]
}

export async function readPakistanStock(): Promise<PakistanStockItem[]> {
  const rows = await readPakistanStockRaw()
  return rows.filter(row => row[0]).map(parsePakistanStockRow)
}

export async function appendPakistanStockItem(
  item: Omit<PakistanStockItem, 'item_id' | 'created_at'>
): Promise<PakistanStockItem> {
  const full: PakistanStockItem = {
    ...item,
    item_id: uuidv4(),
    created_at: new Date().toISOString(),
  }
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'PakistanStock!A:I',
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        full.item_id, full.article, full.size_cm,
        full.gsm, full.wt_pc, full.cartons,
        full.qty_total, full.status, full.created_at,
      ]],
    },
  })
  return full
}

export async function updatePakistanStockItem(
  item_id: string,
  patch: Partial<Omit<PakistanStockItem, 'item_id' | 'created_at'>>
): Promise<PakistanStockItem> {
  const rows = await readPakistanStockRaw()
  const idx = rows.findIndex(row => row[0] === item_id)
  if (idx === -1) throw new Error(`PakistanStockItem ${item_id} not found`)
  const current = parsePakistanStockRow(rows[idx])
  const updated = { ...current, ...patch }
  const sheets = getSheetsClient()
  const sheetRow = idx + 2
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `PakistanStock!A${sheetRow}:I${sheetRow}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        updated.item_id, updated.article, updated.size_cm,
        updated.gsm, updated.wt_pc, updated.cartons,
        updated.qty_total, updated.status, updated.created_at,
      ]],
    },
  })
  return updated
}

export async function deletePakistanStockItem(item_id: string): Promise<void> {
  const rows = await readPakistanStockRaw()
  const idx = rows.findIndex(row => row[0] === item_id)
  if (idx === -1) throw new Error(`PakistanStockItem ${item_id} not found`)
  const sheets = getSheetsClient()
  const sheetRow = idx + 2
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `PakistanStock!A${sheetRow}:I${sheetRow}`,
    valueInputOption: 'RAW',
    requestBody: { values: [['', '', '', '', '', '', '', '', '']] },
  })
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
npx jest pakistan-stock --no-coverage
```

Expected: PASS — 2 tests pass.

- [ ] **Step 5: Confirm TypeScript still compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/sheets.ts __tests__/pakistan-stock.test.ts
git commit -m "feat: add Pakistan stock sheet functions with tests"
```

---

## Task 3: Public GET + admin POST API route

**Files:**
- Create: `app/api/pakistan-stock/route.ts`

- [ ] **Step 1: Create the directory and route file**

Create `app/api/pakistan-stock/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readPakistanStock, appendPakistanStockItem } from '@/lib/sheets'
import type { PakistanStockStatus } from '@/types'

export async function GET() {
  const items = await readPakistanStock()
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    article: string
    size_cm: string
    gsm: number
    wt_pc: number
    cartons: number
    qty_total: number
    status: PakistanStockStatus
  }

  const { article, size_cm, gsm, wt_pc, cartons, qty_total, status } = body
  if (!article || !size_cm || gsm == null || wt_pc == null || cartons == null || qty_total == null || !status) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (status !== 'available' && status !== 'out_of_stock') {
    return NextResponse.json({ error: 'status must be available or out_of_stock' }, { status: 400 })
  }

  const item = await appendPakistanStockItem({ article, size_cm, gsm, wt_pc, cartons, qty_total, status })
  return NextResponse.json(item, { status: 201 })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/pakistan-stock/route.ts
git commit -m "feat: add GET and POST API routes for Pakistan stock"
```

---

## Task 4: Admin PUT + DELETE API route

**Files:**
- Create: `app/api/pakistan-stock/[id]/route.ts`

- [ ] **Step 1: Create the dynamic route file**

Create `app/api/pakistan-stock/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updatePakistanStockItem, deletePakistanStockItem } from '@/lib/sheets'
import type { PakistanStockStatus } from '@/types'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    article?: string
    size_cm?: string
    gsm?: number
    wt_pc?: number
    cartons?: number
    qty_total?: number
    status?: PakistanStockStatus
  }

  if (body.status && body.status !== 'available' && body.status !== 'out_of_stock') {
    return NextResponse.json({ error: 'status must be available or out_of_stock' }, { status: 400 })
  }

  try {
    const updated = await updatePakistanStockItem(params.id, body)
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await deletePakistanStockItem(params.id)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/api/pakistan-stock/[id]/route.ts"
git commit -m "feat: add PUT and DELETE API routes for Pakistan stock"
```

---

## Task 5: PakistanStockTable public component

**Files:**
- Create: `components/PakistanStockTable.tsx`

- [ ] **Step 1: Create the component**

Create `components/PakistanStockTable.tsx`:

```tsx
'use client'
import { useEffect, useState } from 'react'
import type { PakistanStockItem } from '@/types'

export default function PakistanStockTable() {
  const [items, setItems] = useState<PakistanStockItem[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const res = await fetch('/api/pakistan-stock')
    const data = await res.json()
    setItems(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return <div className="text-sm py-6" style={{ color: '#aaa' }}>Loading…</div>
  }

  if (items.length === 0) {
    return (
      <div className="text-sm py-6 text-center" style={{ color: '#aaa' }}>
        No Pakistan stock listed at this time.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-[#f0e8e4] overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: '#1a1a2e', color: '#fff' }}>
            <th className="px-4 py-3 text-left font-semibold">Article</th>
            <th className="px-4 py-3 text-left font-semibold">Size</th>
            <th className="px-4 py-3 text-right font-semibold">GSM</th>
            <th className="px-4 py-3 text-right font-semibold">Wt/pc (kg)</th>
            <th className="px-4 py-3 text-right font-semibold">Cartons</th>
            <th className="px-4 py-3 text-right font-semibold">Qty Total</th>
            <th className="px-4 py-3 text-center font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr
              key={item.item_id}
              style={{
                opacity: item.status === 'out_of_stock' ? 0.45 : 1,
                background: i % 2 === 1 ? '#fdf3ef' : '#fff',
              }}
            >
              <td className="px-4 py-3 font-semibold" style={{ color: '#1a1a2e' }}>{item.article}</td>
              <td className="px-4 py-3" style={{ color: '#555' }}>{item.size_cm} cm</td>
              <td className="px-4 py-3 text-right" style={{ color: '#555' }}>{item.gsm}</td>
              <td className="px-4 py-3 text-right" style={{ color: '#555' }}>{item.wt_pc}</td>
              <td className="px-4 py-3 text-right" style={{ color: '#555' }}>{item.cartons}</td>
              <td className="px-4 py-3 text-right" style={{ color: '#555' }}>{item.qty_total.toLocaleString()}</td>
              <td className="px-4 py-3 text-center">
                {item.status === 'available' ? (
                  <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ background: '#e8f5e9', color: '#2e7d32' }}>
                    AVAILABLE
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ background: '#fce4e4', color: '#c62828' }}>
                    OUT OF STOCK
                  </span>
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

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/PakistanStockTable.tsx
git commit -m "feat: add PakistanStockTable public component"
```

---

## Task 6: Update public stock page

**Files:**
- Modify: `app/stock/page.tsx`

- [ ] **Step 1: Replace the content of `app/stock/page.tsx`**

```tsx
import StockTable from '@/components/StockTable'
import PakistanStockTable from '@/components/PakistanStockTable'

export default function StockPage() {
  return (
    <div className="min-h-screen py-10 px-4" style={{ background: '#f8f4f2' }}>
      <div className="max-w-5xl mx-auto">
        {/* Brand header */}
        <div className="mb-8 flex items-center gap-4">
          <div className="flex items-center gap-0">
            <span style={{ background: '#c0694a', color: '#fff', fontWeight: 800, fontSize: 20, padding: '4px 9px', letterSpacing: 1 }}>EN</span>
            <span style={{ background: '#1a1a2e', color: '#fff', fontWeight: 800, fontSize: 20, padding: '4px 9px', letterSpacing: 1 }}>ER</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#1a1a2e' }}>EN-ER Textile — Stock</h1>
            <p className="text-sm mt-0.5" style={{ color: '#888' }}>Warsaw warehouse · Pakistan ready-to-ship</p>
          </div>
        </div>

        {/* Warsaw section */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-lg">🏭</span>
            <h2 className="text-lg font-bold" style={{ color: '#1a1a2e' }}>Warsaw Warehouse</h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#e8f5e9', color: '#2e7d32' }}>
              LIVE STOCK
            </span>
          </div>
          <StockTable />
        </div>

        {/* Divider */}
        <div className="border-t my-10" style={{ borderColor: '#e8e0db' }} />

        {/* Pakistan section */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-lg">🇵🇰</span>
            <h2 className="text-lg font-bold" style={{ color: '#1a1a2e' }}>Pakistan — Ready to Ship</h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#fff3e0', color: '#e65100' }}>
              SUPPLIER STOCK
            </span>
          </div>
          <PakistanStockTable />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/stock/page.tsx
git commit -m "feat: add Pakistan stock section to public stock page"
```

---

## Task 7: Admin Pakistan Stock page

**Files:**
- Create: `app/admin/pakistan-stock/page.tsx`

- [ ] **Step 1: Create the admin page**

Create `app/admin/pakistan-stock/page.tsx`:

```tsx
'use client'
import { useCallback, useEffect, useState } from 'react'
import type { PakistanStockItem, PakistanStockStatus } from '@/types'

type FormData = {
  article: string
  size_cm: string
  gsm: string
  wt_pc: string
  cartons: string
  qty_total: string
  status: PakistanStockStatus
}

const emptyForm: FormData = {
  article: '',
  size_cm: '',
  gsm: '',
  wt_pc: '',
  cartons: '',
  qty_total: '',
  status: 'available',
}

function itemToForm(item: PakistanStockItem): FormData {
  return {
    article: item.article,
    size_cm: item.size_cm,
    gsm: String(item.gsm),
    wt_pc: String(item.wt_pc),
    cartons: String(item.cartons),
    qty_total: String(item.qty_total),
    status: item.status,
  }
}

const inputClass = 'border rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#c0694a]'
const labelClass = 'text-xs font-semibold text-gray-600 mb-1 block'

export default function PakistanStockPage() {
  const [items, setItems] = useState<PakistanStockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PakistanStockItem | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/pakistan-stock')
    const data = await res.json()
    setItems(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  function openAdd() {
    setEditingItem(null)
    setForm(emptyForm)
    setFormError('')
    setModalOpen(true)
  }

  function openEdit(item: PakistanStockItem) {
    setEditingItem(item)
    setForm(itemToForm(item))
    setFormError('')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingItem(null)
  }

  function setField(key: keyof FormData, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    const { article, size_cm, gsm, wt_pc, cartons, qty_total, status } = form
    if (!article.trim() || !size_cm.trim() || !gsm || !wt_pc || !cartons || !qty_total) {
      setFormError('All fields are required.')
      return
    }
    setSaving(true)
    try {
      const body = {
        article: article.trim(),
        size_cm: size_cm.trim(),
        gsm: Number(gsm),
        wt_pc: Number(wt_pc),
        cartons: Number(cartons),
        qty_total: Number(qty_total),
        status,
      }
      const url = editingItem ? `/api/pakistan-stock/${editingItem.item_id}` : '/api/pakistan-stock'
      const method = editingItem ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        setFormError(data.error ?? 'Failed to save item')
        return
      }
      closeModal()
      await fetchItems()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(item_id: string) {
    await fetch(`/api/pakistan-stock/${item_id}`, { method: 'DELETE' })
    setConfirmDeleteId(null)
    await fetchItems()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#1a1a2e' }}>Pakistan Stock</h1>
        <button
          onClick={openAdd}
          className="px-4 py-2 text-sm font-semibold rounded text-white"
          style={{ background: '#c0694a' }}
        >
          + Add Item
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-gray-400">No Pakistan stock items yet.</div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-[#f0e8e4] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#c0694a', color: '#fff' }}>
                <th className="px-4 py-3 text-left font-semibold">Article</th>
                <th className="px-4 py-3 text-left font-semibold">Size</th>
                <th className="px-4 py-3 text-right font-semibold">GSM</th>
                <th className="px-4 py-3 text-right font-semibold">Wt/pc</th>
                <th className="px-4 py-3 text-right font-semibold">Cartons</th>
                <th className="px-4 py-3 text-right font-semibold">Qty</th>
                <th className="px-4 py-3 text-center font-semibold">Status</th>
                <th className="px-4 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.item_id} style={i % 2 === 1 ? { background: '#fdf3ef' } : {}}>
                  <td className="px-4 py-3 font-semibold" style={{ color: '#1a1a2e' }}>{item.article}</td>
                  <td className="px-4 py-3">{item.size_cm}</td>
                  <td className="px-4 py-3 text-right">{item.gsm}</td>
                  <td className="px-4 py-3 text-right">{item.wt_pc}</td>
                  <td className="px-4 py-3 text-right">{item.cartons}</td>
                  <td className="px-4 py-3 text-right">{item.qty_total.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    {item.status === 'available' ? (
                      <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ background: '#e8f5e9', color: '#2e7d32' }}>AVAILABLE</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ background: '#fce4e4', color: '#c62828' }}>OUT OF STOCK</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {confirmDeleteId === item.item_id ? (
                      <span className="text-xs">
                        Delete?{' '}
                        <button onClick={() => handleDelete(item.item_id)} className="font-semibold" style={{ color: '#c62828' }}>Yes</button>
                        {' · '}
                        <button onClick={() => setConfirmDeleteId(null)} style={{ color: '#888' }}>No</button>
                      </span>
                    ) : (
                      <span className="text-xs flex gap-3 justify-center">
                        <button onClick={() => openEdit(item)} className="underline" style={{ color: '#1a1a2e' }}>Edit</button>
                        <button onClick={() => setConfirmDeleteId(item.item_id)} className="underline" style={{ color: '#c0694a' }}>Delete</button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold mb-4" style={{ color: '#1a1a2e' }}>
              {editingItem ? 'Edit Item' : 'Add Item'}
            </h2>
            {formError && <div className="text-red-600 text-sm mb-3">{formError}</div>}
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelClass}>Article</label>
                  <input type="text" value={form.article} onChange={e => setField('article', e.target.value)} className={inputClass} placeholder="e.g. Hotel White Towel" required />
                </div>
                <div>
                  <label className={labelClass}>Size (cm)</label>
                  <input type="text" value={form.size_cm} onChange={e => setField('size_cm', e.target.value)} className={inputClass} placeholder="e.g. 50x100" required />
                </div>
                <div>
                  <label className={labelClass}>GSM</label>
                  <input type="number" min="1" value={form.gsm} onChange={e => setField('gsm', e.target.value)} className={inputClass} placeholder="e.g. 450" required />
                </div>
                <div>
                  <label className={labelClass}>Wt/pc (kg)</label>
                  <input type="number" min="0.01" step="0.01" value={form.wt_pc} onChange={e => setField('wt_pc', e.target.value)} className={inputClass} placeholder="e.g. 0.35" required />
                </div>
                <div>
                  <label className={labelClass}>Cartons</label>
                  <input type="number" min="0" value={form.cartons} onChange={e => setField('cartons', e.target.value)} className={inputClass} placeholder="e.g. 120" required />
                </div>
                <div>
                  <label className={labelClass}>Qty Total</label>
                  <input type="number" min="0" value={form.qty_total} onChange={e => setField('qty_total', e.target.value)} className={inputClass} placeholder="e.g. 2400" required />
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select value={form.status} onChange={e => setField('status', e.target.value)} className={inputClass}>
                    <option value="available">Available</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6 justify-end">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm rounded border" style={{ color: '#555' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-semibold rounded text-white" style={{ background: '#c0694a', opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Saving…' : editingItem ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/admin/pakistan-stock/page.tsx
git commit -m "feat: add admin Pakistan stock page with CRUD and modal"
```

---

## Task 8: Add admin nav link

**Files:**
- Modify: `components/AdminNav.tsx`

- [ ] **Step 1: Add Pakistan Stock to the links array**

In `components/AdminNav.tsx`, update the `links` array to insert Pakistan Stock after Inventory:

```ts
const links = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/inventory', label: 'Inventory' },
  { href: '/admin/pakistan-stock', label: 'Pakistan Stock' },
  { href: '/admin/new-quotation', label: 'New Quotation' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/expenses', label: 'Expenses' },
  { href: '/admin/reports', label: 'Reports' },
]
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/AdminNav.tsx
git commit -m "feat: add Pakistan Stock link to admin nav"
```

---

## Final smoke test

- [ ] Start dev server: `npm run dev`
- [ ] Open `http://localhost:3000/stock` — confirm both sections appear: Warsaw (with pricing) on top, Pakistan below
- [ ] Log in at `http://localhost:3000/login`, go to Admin → Pakistan Stock
- [ ] Add an item via the modal — confirm it appears in the table and on the public `/stock` page
- [ ] Edit the item — confirm changes reflect
- [ ] Delete the item — confirm it disappears from both admin and public page
- [ ] Toggle status to "Out of Stock" — confirm it shows the red badge and is dimmed on the public page
