# Pakistan Ready-to-Ship Stock — Design Spec

**Date:** 2026-07-12
**Status:** Approved

## Overview

EN-ER Textile receives stock availability lists from Pakistan suppliers via PDF, Word, and Excel files. This feature lets admin manually enter those items into the system and display them to customers on the public stock page alongside the existing Warsaw warehouse stock. No prices are shown for Pakistan stock — only product details and availability status.

---

## Data Model

### Google Sheet tab: `PakistanStock`

New tab added to the existing Google Sheet. Columns:

| Col | Field | Type | Notes |
|-----|-------|------|-------|
| A | item_id | string | UUID generated on creation — stable ID |
| B | article | string | e.g. "Hotel White Towel" |
| C | size_cm | string | e.g. "50x100" |
| D | gsm | number | e.g. 450 |
| E | wt_pc | number | weight per piece in kg |
| F | cartons | number | number of cartons |
| G | qty_total | number | total pieces |
| H | status | string | `available` or `out_of_stock` |
| I | created_at | string | ISO datetime, set on creation |

Row 1 is a header row. Data starts from row 2. `item_id` is a UUID generated server-side on creation — this keeps IDs stable when rows are deleted (unlike row index, which shifts).

### TypeScript types (`types/index.ts`)

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

---

## API Routes

All routes live under `app/api/pakistan-stock/`.

### `GET /api/pakistan-stock`
- **Auth:** None (public)
- **Returns:** `PakistanStockItem[]` from `PakistanStock!A2:I`
- **Used by:** Public stock page

### `POST /api/pakistan-stock`
- **Auth:** Admin session required
- **Body:** `{ article, size_cm, gsm, wt_pc, cartons, qty_total, status }`
- **Action:** Generates a UUID for `item_id`, appends a new row, sets `created_at`
- **Returns:** Created `PakistanStockItem`

### `PUT /api/pakistan-stock/[id]`
- **Auth:** Admin session required
- **Param:** `id` — `item_id` UUID
- **Body:** Any subset of item fields including `status`
- **Action:** Finds the row where column A = `id`, updates it in place
- **Returns:** Updated `PakistanStockItem`

### `DELETE /api/pakistan-stock/[id]`
- **Auth:** Admin session required
- **Param:** `id` — `item_id` UUID
- **Action:** Finds the row where column A = `id`, deletes it from the sheet
- **Returns:** `{ ok: true }`

---

## Sheet Functions (`lib/sheets.ts`)

Four new functions following the existing pattern:

```ts
readPakistanStock(): Promise<PakistanStockItem[]>
// Reads PakistanStock!A2:I, maps each row to PakistanStockItem

appendPakistanStockItem(item: Omit<PakistanStockItem, 'item_id' | 'created_at'>): Promise<PakistanStockItem>
// Generates UUID for item_id, appends row, returns full item

updatePakistanStockItem(item_id: string, patch: Partial<Omit<PakistanStockItem, 'item_id' | 'created_at'>>): Promise<PakistanStockItem>
// Reads all rows, finds the row where col A = item_id, writes updated values back

deletePakistanStockItem(item_id: string): Promise<void>
// Reads all rows, finds the row where col A = item_id, deletes it via batchUpdate
```

---

## Public Stock Page

### Layout: Stacked sections

`app/stock/page.tsx` is updated to show two clearly separated sections on a single page.

**Data fetching** (parallel):
```ts
const [products, reserved, pakistanStock] = await Promise.all([
  readProducts(), readReserved(), readPakistanStock()
])
```

**Section 1 — Warsaw Warehouse**
- Section heading: warehouse icon + "Warsaw Warehouse" + green "LIVE STOCK" badge
- Content: existing `<StockTable />` component, unchanged

**Section 2 — Pakistan — Ready to Ship**
- Section heading: Pakistan flag + "Pakistan — Ready to Ship" + orange "SUPPLIER STOCK" badge
- Content: new `<PakistanStockTable items={pakistanStock} />` component
- Visual divider between the two sections

### `PakistanStockTable` component (`components/PakistanStockTable.tsx`)

- **Columns:** Article, Size, GSM, Wt/pc, Cartons, Qty Total, Status
- **Status badge:** green `AVAILABLE` or red `OUT OF STOCK`
- **Out-of-stock rows:** visually dimmed (reduced opacity)
- **No prices, no currency selector, no quotation/cart actions** — read-only display
- **Theme:** matches existing terracotta (#c0694a) / navy (#1a1a2e) colour scheme
- If no items exist, shows a subtle empty state message

---

## Admin Interface

### New page: `app/admin/pakistan-stock/page.tsx`

Added as "Pakistan Stock" to `components/AdminNav.tsx` (positioned after Inventory).

#### Table view
- Columns: Article, Size, GSM, Wt/pc, Cartons, Qty, Status, Actions
- Status shown as coloured badge (green/red)
- Per-row actions: **Edit** (opens modal pre-filled) and **Delete** (inline confirmation before removing)
- **"+ Add Item"** button in the page header, top-right

#### Modal form (add & edit)
All fields required:

| Field | Input type |
|-------|-----------|
| Article | text |
| Size (cm) | text |
| GSM | number |
| Wt/pc (kg) | number |
| Cartons | number |
| Qty Total | number |
| Status | select: Available / Out of Stock |

- Add → `POST /api/pakistan-stock`
- Edit → `PUT /api/pakistan-stock/[id]`
- On success: close modal, refresh table (client-side state update)
- Follows existing admin visual style (no new design patterns introduced)

---

## File Checklist

| File | Change |
|------|--------|
| `types/index.ts` | Add `PakistanStockStatus` and `PakistanStockItem` |
| `lib/sheets.ts` | Add 4 sheet functions |
| `app/api/pakistan-stock/route.ts` | GET + POST |
| `app/api/pakistan-stock/[id]/route.ts` | PUT + DELETE |
| `app/stock/page.tsx` | Add Pakistan section, parallel data fetch |
| `components/PakistanStockTable.tsx` | New component |
| `app/admin/pakistan-stock/page.tsx` | New admin page |
| `components/AdminNav.tsx` | Add nav link |

---

## Out of Scope

- Automatic parsing of PDF/Word/Excel files — admin enters data manually
- Prices for Pakistan stock — not shown to customers
- Quotation or order flow for Pakistan stock — display only
- Grouping by supplier — items are flat, no supplier field
