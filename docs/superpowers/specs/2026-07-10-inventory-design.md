---
name: Qaswa Textile Inventory Management — Full Design Spec
description: Complete architecture, data model, features, and user flows for the towel inventory + quotation system
type: spec
status: approved
date: 2026-07-10
---

# Qaswa Textile Inventory Management — Design Spec

## Overview

A web-based inventory and quotation system for a towel wholesale business. Staff manage stock and generate PDF quotations internally. Customers see live stock levels publicly. Google Sheets is the database.

**Approved stack:** Next.js 14 + Google Sheets API + NextAuth.js + Puppeteer + Tailwind CSS  
**Hosting:** Plesk (eu1.limitless.cyou) + PM2  
**Currencies:** USD (base), EUR, PLN, GBP  
**Exchange rates:** open.er-api.com (free, daily updates)

---

## Section 1: Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTS                              │
│                                                             │
│   Customers (public)            Admin / Staff (login)       │
│   - Browse stock levels         - Manage inventory          │
│   - No login needed             - Create & confirm orders   │
│                                 - View all quotations       │
└──────────────┬──────────────────────────┬───────────────────┘
               │ HTTPS                    │ HTTPS + Session
               ▼                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js App  (Node.js on Plesk / PM2)          │
│                                                             │
│  Public Pages                Admin Pages (auth-guarded)     │
│  ├── /stock                  ├── /admin/dashboard           │
│  └── /quotation/[id]         ├── /admin/inventory           │
│                              ├── /admin/orders              │
│                              ├── /admin/new-quotation       │
│                              └── /admin/login               │
│                                                             │
│  API Routes (server-side only)                              │
│  ├── GET  /api/products    → read stock                     │
│  ├── POST /api/quotation   → reserve stock (atomic lock)    │
│  ├── POST /api/confirm     → deduct stock + mark shipped    │
│  └── POST /api/pdf         → generate & return PDF          │
└──────────────┬──────────────────────────┬───────────────────┘
               │ Sheets API               │ ExchangeRate API
               ▼                          ▼
┌──────────────────────────┐   ┌─────────────────────┐
│     Google Sheets        │   │  open.er-api.com     │
│                          │   │  (USD base rates)    │
│  Tab 1: Products         │   │  EUR, PLN, GBP       │
│  Tab 2: Orders           │   └─────────────────────┘
│  Tab 3: Reserved Stock   │
│  Tab 4: Lock (CAP)       │
└──────────────────────────┘
```

---

## Section 2: CAP Theorem & Data Integrity

Google Sheets has no native transactions. Concurrent writes risk corrupting stock counts.

**Strategy chosen: CP (Consistency + Partition Tolerance)**

- **Tab 4 "Lock"** — single-cell mutex. API sets `LOCKED + timestamp` before any write, releases after. Requests wait up to 3 retries (300ms apart) if locked. Lock auto-expires after 10 seconds to self-heal from crashes.
- **Optimistic version check** — every Products row has a `version` integer. API reads version → does math → writes back only if version unchanged. Rejects and retries if version has changed.
- **Read caching** — public `/stock` page caches data for 60 seconds. Eventual consistency is acceptable for reads; strict consistency only enforced on writes.

---

## Section 3: Data Structure (Google Sheets Tabs)

### Tab 1: Products
| Column | Field | Notes |
|--------|-------|-------|
| A | article | e.g. HAND TOWEL, BATH TOWEL |
| B | size_cm | e.g. 50x100, 70x140 |
| C | gsm | grams per square metre |
| D | wt_pc | weight per piece (grams) |
| E | cartons | number of cartons |
| F | qty_total | total pieces in stock |
| G | price_usd | sale price in USD |
| H | version | integer, incremented on every write |
| I | min_sale_usd | minimum allowed sale price in USD |

**Initial data (from product sheet):**
- HAND TOWEL 50x100 460gsm — 1,840 pcs — $1.80 (min)
- BATH TOWEL 70x140 460gsm — 1,840 pcs — $3.12
- HAND TOWEL 50x100 500gsm — 1,840 pcs — $1.92
- BATH TOWEL 70x140 500gsm — 2,000 pcs — $3.36
- BATH SHEET 100x150 500gsm — 420 pcs — $4.91
- POOL TOWEL 90x180 440gsm — 448 pcs — $4.89
- BATHMAT 50x70 550gsm — 1,040 pcs — $1.64
- BATHMAT 50x70 650gsm — 1,120 pcs — $1.87

### Tab 2: Orders
| Column | Field | Notes |
|--------|-------|-------|
| A | order_id | UUID generated at creation |
| B | created_at | ISO timestamp |
| C | customer_name | free text |
| D | customer_contact | phone or email |
| E | status | draft → reserved → confirmed → shipped → cancelled |
| F | currency | USD / EUR / PLN / GBP |
| G | items_json | JSON array of line items |
| H | total_amount | in selected currency |
| I | confirmed_at | ISO timestamp, filled on confirmation |

`items_json` example:
```json
[
  {"article":"BATH TOWEL","size":"70x140","gsm":460,"qty":200,"price_usd":3.12,"price_display":11.39}
]
```

### Tab 3: Reserved Stock
| Column | Field | Notes |
|--------|-------|-------|
| A | article_size_key | e.g. BATH_TOWEL_70x140_460 |
| B | reserved_qty | pieces held |
| C | order_id | links back to Tab 2 |

Available stock formula: `qty_total − SUM(reserved_qty for this key)`
Note: `qty_total` is decremented directly when an order is confirmed, so no separate sold_qty column is needed.

### Tab 4: Lock
| Column | Field | Notes |
|--------|-------|-------|
| A | status | FREE or LOCKED |
| B | locked_at | ISO timestamp of lock acquisition |

Single row only. Lock expires if `locked_at` is more than 10 seconds ago.

---

## Section 4: Core Features

### Public (no login)
- **`/stock`** — live product table: Article, Size, GSM, Available Qty, Price. Currency toggle (USD/EUR/PLN/GBP). Auto-refreshes every 60 seconds.
- **`/quotation/[id]`** — read-only view of a specific quotation for the customer to review online.

### Admin (login required via NextAuth credentials)
- **Dashboard** — total stock value, low-stock alerts, recent order activity
- **Inventory** — view/edit all product rows, adjust qty manually (stock arrivals), set low-stock thresholds
- **New Quotation** — product picker with qty input, live currency conversion, min-price validation, PDF download, auto-reserves stock
- **Orders** — filter by status, confirm (deducts stock), mark shipped, cancel (releases reserved)
- **Settings** — manage admin usernames/passwords, set low-stock alert thresholds per product

### PDF Quotation includes:
- Qaswa Textile branding header
- Quotation ID, date, customer name + contact
- Line items table: Article | Size | GSM | Qty | Unit Price | Line Total
- Grand total in selected currency
- Footer: valid-for note, contact details

---

## Section 5: User Flows

### Flow 1 — Customer views stock
```
GET /stock
  → API reads Products + Reserved (cached 60s)
  → Calculates available = qty_total - reserved
  → Renders table with currency toggle
```

### Flow 2 — Admin creates quotation
```
Admin → /admin/new-quotation
  → Selects products + quantities
  → Validates: qty ≤ available AND price ≥ min_sale_usd
  → Enters customer name + contact
  → Selects currency → prices convert live
  → Clicks "Save & Reserve"
      ↓ POST /api/quotation
      ↓ Acquire Lock (Tab 4)
      ↓ Write Orders row (status: reserved)
      ↓ Write Reserved rows (Tab 3)
      ↓ Release Lock
  → PDF generated → downloaded
  → Admin shares PDF with customer (WhatsApp / email)
```

### Flow 3 — Admin confirms order
```
Admin → Orders list → Confirm
  ↓ POST /api/confirm
  ↓ Acquire Lock
  ↓ Read qty_total + version from Products
  ↓ Deduct confirmed qty, increment version
  ↓ Remove rows from Reserved tab
  ↓ Update Orders tab: status → confirmed
  ↓ Release Lock
Stock on /stock now shows reduced quantity
```

### Flow 4 — Admin cancels order
```
Admin → Orders list → Cancel
  ↓ Remove rows from Reserved tab
  ↓ Orders tab: status → cancelled
  ↓ qty_total unchanged (stock returns to available)
```

---

## Section 6: Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | Next.js 14 (App Router) | Frontend + API in one repo; easy Plesk deploy |
| Auth | NextAuth.js (credentials provider) | Simple username/password; no OAuth needed |
| Sheets client | `googleapis` npm package | Official Google Sheets API v4 |
| PDF | Puppeteer (headless Chrome) | Best PDF quality from HTML template |
| Currency | open.er-api.com (free tier) | No API key needed, daily rate updates |
| Styling | Tailwind CSS | Fast, clean, responsive UI |
| Hosting | Plesk + PM2 | Keeps Next.js alive as persistent Node process |
| Lock TTL | 10-second auto-expire | Self-heals if API crashes mid-write |

---

## Section 7: Hosting Deployment Notes

**Target:** `https://eu1.limitless.cyou:2222/evo/` (Plesk control panel)

Deployment steps (to be detailed in implementation plan):
1. SSH into server, install Node.js 18+ if not present
2. Clone repo, `npm install`, `npm run build`
3. Configure PM2: `pm2 start npm --name qaswa-inventory -- start`
4. Set PM2 to auto-restart on reboot: `pm2 startup && pm2 save`
5. Configure Plesk reverse proxy: domain → `localhost:3000`
6. Set environment variables in Plesk (Google credentials, NextAuth secret)

---

## Open Questions (resolved)
- ✅ Purpose: stock tracking + PDF quotations
- ✅ Users: admin/staff internal + customers see public stock
- ✅ Customer output: PDF quotation (downloaded, shared manually)
- ✅ Interface: web browser
- ✅ Currencies: USD, EUR, PLN, GBP
- ✅ Stock deduction: two-step (reserve on quote, deduct on confirm)
- ✅ CAP: CP model with mutex lock + optimistic versioning
- ✅ Hosting: Plesk + PM2
