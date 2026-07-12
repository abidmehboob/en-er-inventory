# Mobile Responsive Design — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all pages (public and admin) work correctly on mobile browsers using only Tailwind CSS responsive classes and a hamburger menu toggle.

**Architecture:** Pure Tailwind breakpoint prefixes (`md:`) throughout. The only new behaviour is a `useState` open/close toggle in `AdminNav` for the mobile sidebar overlay. No new libraries, no new components. Tables get `overflow-x-auto` wrappers; grids get `grid-cols-1 md:grid-cols-N` breakpoints; the admin layout stacks vertically on mobile.

**Tech Stack:** Next.js 14, React, Tailwind CSS, TypeScript.

---

## File Map

| Action | File |
|--------|------|
| Modify | `components/AdminNav.tsx` — hamburger toggle + mobile overlay sidebar |
| Modify | `app/admin/layout.tsx` — flex-col on mobile, top padding for hamburger |
| Modify | `components/PakistanStockTable.tsx` — add overflow-x-auto |
| Modify | `app/admin/pakistan-stock/page.tsx` — overflow-x-auto on both tables + responsive form grids |
| Modify | `app/admin/expenses/page.tsx` — add overflow-x-auto |
| Modify | `app/admin/dashboard/page.tsx` — responsive stats grid + overflow-x-auto on orders table |
| Modify | `components/QuotationForm.tsx` — overflow-x-auto on both tables + responsive customer grid |
| Modify | `components/ExpenseForm.tsx` — responsive grid breakpoint |
| Modify | `app/admin/reports/page.tsx` — flex-wrap on tabs |
| Modify | `app/stock/page.tsx` — responsive document card layout |

---

## Task 1: AdminNav — hamburger menu

**Files:**
- Modify: `components/AdminNav.tsx`

- [ ] **Step 1: Replace the full contents of `components/AdminNav.tsx`**

```tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

const links = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/inventory', label: 'Inventory' },
  { href: '/admin/pakistan-stock', label: 'Pakistan Stock' },
  { href: '/admin/new-quotation', label: 'New Quotation' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/expenses', label: 'Expenses' },
  { href: '/admin/reports', label: 'Reports' },
]

function EnErLogo() {
  return (
    <div className="flex items-center gap-0 mb-8">
      <span style={{ background: '#c0694a', color: '#fff', fontWeight: 800, fontSize: 18, padding: '4px 8px', letterSpacing: 1 }}>EN</span>
      <span style={{ background: '#1a1a2e', color: '#fff', fontWeight: 800, fontSize: 18, padding: '4px 8px', letterSpacing: 1 }}>ER</span>
      <span style={{ color: '#1a1a2e', fontWeight: 700, fontSize: 13, marginLeft: 8, letterSpacing: 0.5 }}>TEXTILE</span>
    </div>
  )
}

export default function AdminNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden bg-white rounded shadow p-2"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1a1a2e" strokeWidth="2">
          <line x1="2" y1="5" x2="18" y2="5" />
          <line x1="2" y1="10" x2="18" y2="10" />
          <line x1="2" y1="15" x2="18" y2="15" />
        </svg>
      </button>

      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar — fixed overlay on mobile, static on desktop */}
      <nav
        className={[
          'fixed inset-y-0 left-0 z-40 w-56 bg-white flex flex-col py-6 px-4 shadow-xl transition-transform duration-200',
          'md:relative md:translate-x-0 md:shadow-sm md:z-auto md:flex-shrink-0',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        style={{ borderRight: '1px solid #f0e8e4' }}
      >
        <EnErLogo />
        <ul className="space-y-1 flex-1">
          {links.map(l => (
            <li key={l.href}>
              <Link
                href={l.href}
                onClick={() => setOpen(false)}
                className="block px-3 py-2 rounded text-sm transition-colors"
                style={pathname === l.href
                  ? { background: '#c0694a', color: '#fff' }
                  : { color: '#333' }}
                onMouseEnter={e => { if (pathname !== l.href) (e.target as HTMLElement).style.background = '#fdf3ef' }}
                onMouseLeave={e => { if (pathname !== l.href) (e.target as HTMLElement).style.background = '' }}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-sm text-left px-3 mt-4"
          style={{ color: '#888' }}
          onMouseEnter={e => { (e.target as HTMLElement).style.color = '#c0694a' }}
          onMouseLeave={e => { (e.target as HTMLElement).style.color = '#888' }}
        >
          Sign out
        </button>
      </nav>
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "E:\qaswa textile\inventory-management" && npx tsc --noEmit 2>&1 | grep -v "__tests__"
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd "E:\qaswa textile\inventory-management" && git add components/AdminNav.tsx && git commit -m "feat: add mobile hamburger menu to AdminNav"
```

---

## Task 2: Admin layout — mobile stack + top padding

**Files:**
- Modify: `app/admin/layout.tsx`

- [ ] **Step 1: Replace the contents of `app/admin/layout.tsx`**

```tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminNav from '@/components/AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="flex flex-col md:flex-row min-h-screen" style={{ background: '#f8f4f2' }}>
      <AdminNav />
      <main className="flex-1 p-4 pt-16 md:p-8 md:pt-8 min-w-0">{children}</main>
    </div>
  )
}
```

> `pt-16` on mobile pushes content below the fixed hamburger button. `md:pt-8` restores normal padding on desktop. `min-w-0` prevents flex children from overflowing.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "E:\qaswa textile\inventory-management" && npx tsc --noEmit 2>&1 | grep -v "__tests__"
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd "E:\qaswa textile\inventory-management" && git add app/admin/layout.tsx && git commit -m "feat: make admin layout stack vertically on mobile"
```

---

## Task 3: Tables — add `overflow-x-auto`

**Files:**
- Modify: `components/PakistanStockTable.tsx`
- Modify: `app/admin/pakistan-stock/page.tsx`
- Modify: `app/admin/expenses/page.tsx`
- Modify: `app/admin/dashboard/page.tsx`
- Modify: `components/QuotationForm.tsx`

### `components/PakistanStockTable.tsx`

- [ ] **Step 1: Add `overflow-x-auto` to the wrapper div**

Change line 35:
```tsx
<div className="bg-white rounded-lg shadow-sm border border-[#f0e8e4] overflow-hidden">
```
to:
```tsx
<div className="bg-white rounded-lg shadow-sm border border-[#f0e8e4] overflow-x-auto">
```

### `app/admin/pakistan-stock/page.tsx`

- [ ] **Step 2: Fix both table wrappers**

The stock items table wrapper (inside the `items.length > 0` block):
```tsx
<div className="bg-white rounded-lg shadow-sm border border-[#f0e8e4] overflow-hidden">
```
Change to:
```tsx
<div className="bg-white rounded-lg shadow-sm border border-[#f0e8e4] overflow-x-auto">
```

The uploaded files table wrapper (inside the `files.length > 0` block — same class pattern):
```tsx
<div className="bg-white rounded-lg shadow-sm border border-[#f0e8e4] overflow-hidden">
```
Change to:
```tsx
<div className="bg-white rounded-lg shadow-sm border border-[#f0e8e4] overflow-x-auto">
```

### `app/admin/expenses/page.tsx`

- [ ] **Step 3: Add `overflow-x-auto` to the expenses table wrapper**

Change:
```tsx
<div className="bg-white rounded-lg shadow-sm border border-[#f0e8e4] overflow-hidden">
```
to:
```tsx
<div className="bg-white rounded-lg shadow-sm border border-[#f0e8e4] overflow-x-auto">
```

### `app/admin/dashboard/page.tsx`

- [ ] **Step 4: Wrap the recent orders table in `overflow-x-auto`**

Change:
```tsx
<table className="w-full text-sm">
```
to:
```tsx
<div className="overflow-x-auto">
<table className="w-full text-sm">
```
And close the div after `</table>` — making sure it wraps only the `<table>` element inside the `bg-white rounded-lg shadow p-5` card:
```tsx
        </table>
      </div>
    </div>
```

### `components/QuotationForm.tsx`

- [ ] **Step 5: Add `overflow-x-auto` to both table wrappers**

The products table wrapper (line 157):
```tsx
<div className="bg-white rounded-lg shadow overflow-hidden">
```
Change to:
```tsx
<div className="bg-white rounded-lg shadow overflow-x-auto">
```

The cart table is rendered inside a `space-y-6` section. Find the cart table (`<table className="w-full text-sm border-collapse">` or similar) and wrap it:
```tsx
<div className="overflow-x-auto">
  <table className="w-full text-sm border-collapse">
    {/* ... existing cart table content ... */}
  </table>
</div>
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd "E:\qaswa textile\inventory-management" && npx tsc --noEmit 2>&1 | grep -v "__tests__"
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
cd "E:\qaswa textile\inventory-management" && git add components/PakistanStockTable.tsx app/admin/pakistan-stock/page.tsx app/admin/expenses/page.tsx app/admin/dashboard/page.tsx components/QuotationForm.tsx && git commit -m "feat: add overflow-x-auto to all tables for mobile scrolling"
```

---

## Task 4: Grids, forms, tabs, and public stock page

**Files:**
- Modify: `app/admin/dashboard/page.tsx`
- Modify: `app/admin/pakistan-stock/page.tsx`
- Modify: `components/QuotationForm.tsx`
- Modify: `components/ExpenseForm.tsx`
- Modify: `app/admin/reports/page.tsx`
- Modify: `app/stock/page.tsx`

### `app/admin/dashboard/page.tsx` — stats grid

- [ ] **Step 1: Make the 3-column stats grid responsive**

Change:
```tsx
<div className="grid grid-cols-3 gap-4 mb-8">
```
to:
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
```

### `app/admin/pakistan-stock/page.tsx` — modal form + upload form grids

- [ ] **Step 2: Make the modal item form grid responsive**

Change (inside the modal form, the `grid grid-cols-2 gap-4` for the item fields):
```tsx
<div className="grid grid-cols-2 gap-4">
```
to:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
```

- [ ] **Step 3: Make the upload form grid responsive**

Change (inside the upload form card, the `grid grid-cols-2 gap-4` for display name + description):
```tsx
<div className="grid grid-cols-2 gap-4">
```
to:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
```

### `components/QuotationForm.tsx` — customer grid

- [ ] **Step 4: Make the customer name/contact grid responsive**

Change (line 131):
```tsx
<div className="grid grid-cols-2 gap-4">
```
to:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
```

### `components/ExpenseForm.tsx` — expense form grid

- [ ] **Step 5: Make the expense form grid stack on mobile**

Change (line 52):
```tsx
<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
```
to:
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
```

### `app/admin/reports/page.tsx` — tabs row

- [ ] **Step 6: Allow report tabs to wrap on mobile**

Change (line 218):
```tsx
<div className="flex gap-1 mb-6 border-b border-[#f0e8e4]">
```
to:
```tsx
<div className="flex flex-wrap gap-1 mb-6 border-b border-[#f0e8e4]">
```

### `app/stock/page.tsx` — document cards

- [ ] **Step 7: Make document cards stack on small screens**

Change the inner div of each document card from:
```tsx
<div
  key={f.file_id}
  className="flex items-center justify-between bg-white rounded-lg border border-[#f0e8e4] px-5 py-4 shadow-sm"
>
```
to:
```tsx
<div
  key={f.file_id}
  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white rounded-lg border border-[#f0e8e4] px-5 py-4 shadow-sm"
>
```

And remove the `ml-6` from the Download anchor:
```tsx
<a
  href={`/api/pakistan-stock/files/${f.file_id}/download`}
  className="px-4 py-2 text-sm font-semibold rounded text-white shrink-0"
  style={{ background: '#c0694a' }}
>
  Download
</a>
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
cd "E:\qaswa textile\inventory-management" && npx tsc --noEmit 2>&1 | grep -v "__tests__"
```

Expected: No errors.

- [ ] **Step 9: Run all tests**

```bash
cd "E:\qaswa textile\inventory-management" && npx jest --no-coverage 2>&1
```

Expected: All tests PASS.

- [ ] **Step 10: Commit**

```bash
cd "E:\qaswa textile\inventory-management" && git add app/admin/dashboard/page.tsx app/admin/pakistan-stock/page.tsx components/QuotationForm.tsx components/ExpenseForm.tsx app/admin/reports/page.tsx app/stock/page.tsx && git commit -m "feat: responsive grids, form layouts, tabs, and public stock documents"
```

---

## Final Verification

- [ ] Build and restart: `npm run build && pm2 restart en-er-inventory`
- [ ] Open browser DevTools → toggle device toolbar (mobile view, ~390px wide)
- [ ] `/stock` — Pakistan stock table scrolls horizontally, document cards stack vertically
- [ ] `/admin/dashboard` — hamburger ☰ visible, tap opens sidebar; stats show 1 column; orders table scrolls
- [ ] `/admin/pakistan-stock` — tables scroll; Add Item modal fields stack single column
- [ ] `/admin/expenses` — expenses table scrolls; expense form fields stack
- [ ] `/admin/reports` — 5 tab buttons wrap to 2 lines; tables scroll
- [ ] `/admin/new-quotation` — customer fields stack; product table scrolls
- [ ] Tap outside sidebar backdrop → sidebar closes
- [ ] On desktop (≥768px) — sidebar always visible, all grids multi-column as before
