# Mobile Responsive Design — Spec

**Date:** 2026-07-12
**Status:** Approved

## Overview

Make all pages (public and admin) work correctly on mobile browsers using Tailwind CSS responsive breakpoint prefixes only. No new libraries or component frameworks. The only new behaviour is a hamburger menu toggle for the admin sidebar.

---

## Section 1: Admin Navigation

**File:** `components/AdminNav.tsx`

- Add `useState(false)` for `open` (sidebar visibility on mobile)
- On `md:` and above: sidebar always visible, `relative`, `w-56` — unchanged from current
- On mobile (below `md:`):
  - Sidebar hidden by default (`hidden md:flex`)
  - Fixed `☰` button in top-left corner (`fixed top-4 left-4 z-50 md:hidden`)
  - When open: sidebar renders as a fixed overlay (`fixed inset-y-0 left-0 z-40 w-56`)
  - Dark semi-transparent backdrop covers the rest of the screen (`fixed inset-0 z-30 bg-black/40 md:hidden`)
  - Tapping backdrop closes the sidebar
  - Nav links close the sidebar on tap (call `setOpen(false)` in onClick)

**File:** `app/admin/layout.tsx`

- Change `flex min-h-screen` → `flex flex-col md:flex-row min-h-screen`
- Main content area gets `flex-1 min-w-0` to prevent overflow

---

## Section 2: Tables — Add `overflow-x-auto`

Add `overflow-x-auto` to the wrapping `div` of every table that is missing it. The inner table remains unchanged — horizontal scroll handles narrow viewports.

| File | Current class on wrapper | Fix |
|------|--------------------------|-----|
| `components/PakistanStockTable.tsx` | `overflow-hidden` | add `overflow-x-auto` |
| `app/admin/pakistan-stock/page.tsx` (stock table) | `overflow-hidden` | add `overflow-x-auto` |
| `app/admin/pakistan-stock/page.tsx` (files table) | `overflow-hidden` | add `overflow-x-auto` |
| `app/admin/expenses/page.tsx` | `overflow-hidden` | add `overflow-x-auto` |
| `app/admin/dashboard/page.tsx` (recent orders) | no wrapper | wrap in `overflow-x-auto` div |
| `components/QuotationForm.tsx` (product table) | no wrapper | wrap in `overflow-x-auto` div |
| `components/QuotationForm.tsx` (cart table) | no wrapper | wrap in `overflow-x-auto` div |
| `app/admin/reports/page.tsx` (all 4 tables) | no wrapper | wrap each in `overflow-x-auto` div |

---

## Section 3: Grids & Forms

**Dashboard stats grid** (`app/admin/dashboard/page.tsx`):
- `grid grid-cols-3 gap-4` → `grid grid-cols-1 md:grid-cols-3 gap-4`

**Pakistan stock modal form** (`app/admin/pakistan-stock/page.tsx`):
- `grid grid-cols-2 gap-4` → `grid grid-cols-1 md:grid-cols-2 gap-4`

**Pakistan stock upload form** (`app/admin/pakistan-stock/page.tsx`):
- `grid grid-cols-2 gap-4` → `grid grid-cols-1 md:grid-cols-2 gap-4`

**Quotation form** (`components/QuotationForm.tsx`):
- `grid grid-cols-2 gap-4` → `grid grid-cols-1 md:grid-cols-2 gap-4`

**Expense form** (`components/ExpenseForm.tsx`):
- `grid grid-cols-2 md:grid-cols-4` → `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4`

**Reports tabs** (`app/admin/reports/page.tsx`):
- Tab button row: add `flex-wrap` so 5 buttons wrap to second line on narrow screens

**Public stock documents** (`app/stock/page.tsx`):
- Document card inner flex: `flex items-center justify-between` → `flex flex-col sm:flex-row items-start sm:items-center gap-3`
- Remove `ml-6` from Download button (gap handles spacing)

---

## Out of Scope

- Changing table column visibility on mobile (hiding columns) — scrolling is sufficient
- Font size scaling per breakpoint
- Bottom navigation bar or any navigation pattern other than hamburger
- Any admin pages not listed above
