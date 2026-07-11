# Qaswa Textile Inventory Management — Docs Index

Quick reference for all project documentation. Load only the file you need to keep context lean.

---

## Brainstorming & Specs

| File | What's inside | When to load |
|------|---------------|--------------|
| [2026-07-10-inventory-design.md](superpowers/specs/2026-07-10-inventory-design.md) | Full design spec: architecture, data model, features, user flows, tech stack, hosting | Before implementing any feature; source of truth for all decisions |

---

## Implementation Plans

| File | What's inside | When to load |
|------|---------------|--------------|
| [2026-07-10-inventory-implementation.md](superpowers/plans/2026-07-10-inventory-implementation.md) | 19 tasks: scaffold → types → Sheets lib → lock → stock calc → currency → API routes → auth → public pages → admin pages → PDF → orders → deploy | Before starting or resuming implementation |

---

## Session Summaries
_(one-paragraph summaries of completed work sessions — add here to avoid reloading full spec)_

| Date | Summary | Files touched |
|------|---------|---------------|
| 2026-07-10 | Brainstorming session complete. Full design spec approved covering architecture, Google Sheets data model (4 tabs), CAP theorem mutex strategy, public stock page, admin dashboard, PDF quotations, multi-currency (USD/EUR/PLN/GBP), Plesk hosting. | docs/superpowers/specs/2026-07-10-inventory-design.md |
| 2026-07-10 | Full implementation complete. All 19 tasks built and passing. 18 tests, clean build, 19 routes. App ready for Plesk deployment — needs real .env.local credentials and `npx ts-node scripts/seed-sheets.ts` to seed Google Sheet. | All source files in root |

---

## Context Loading Guide

> **Start of every session:** Read this INDEX.md first. Then load only the specific doc you need.
> Do NOT load all docs at once — load on demand to preserve context window.

| Situation | Load |
|-----------|------|
| Starting implementation | implementation plan file |
| Checking a design decision | 2026-07-10-inventory-design.md → relevant section only |
| Continuing previous session | Session Summaries table above |
| Adding a new feature | design spec → then update implementation plan |
