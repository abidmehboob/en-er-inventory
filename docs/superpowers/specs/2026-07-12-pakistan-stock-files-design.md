# Pakistan Stock File Upload — Design Spec

**Date:** 2026-07-12
**Status:** Approved

## Overview

Admin can upload stock detail files (PDF, Word, Excel) to the Pakistan Stock section. Guest users can view and download those files from the public `/stock` page.

---

## File Storage

- Files stored on the local server filesystem at `uploads/pakistan-stock/` (project root, outside `public/`)
- Each file renamed at upload time to a UUID-based filename (e.g. `a3f1c2d4-uuid.pdf`) to prevent collisions
- Original filename preserved in metadata only

---

## Metadata Storage

New Google Sheets tab: **`PakistanStockFiles`**

Columns (in order):

| Column | Field | Notes |
|--------|-------|-------|
| A | `file_id` | UUID, generated at upload |
| B | `display_name` | Admin-set label shown to guests |
| C | `description` | Admin-set description shown to guests |
| D | `original_filename` | Original file name as uploaded |
| E | `stored_filename` | UUID-based filename on disk |
| F | `mime_type` | e.g. `application/pdf` |
| G | `uploaded_at` | ISO datetime |

---

## API Routes

### Public (no auth required)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/pakistan-stock/files` | Returns list of all file metadata |
| GET | `/api/pakistan-stock/files/[id]/download` | Streams file with `Content-Disposition: attachment` |

### Admin only (session required)

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/pakistan-stock/files` | `multipart/form-data`: file + `display_name` + `description` |
| DELETE | `/api/pakistan-stock/files/[id]` | Deletes file from disk + removes Sheets row |

---

## Admin UI (`app/admin/pakistan-stock/page.tsx`)

New **"Uploaded Files"** section below the stock items table:

- File upload form: file picker (`.pdf,.doc,.docx,.xls,.xlsx`), display name input, description input, Upload button
- Files table: Display Name, Description, Original Filename, Upload Date, Delete button
- Delete shows inline confirmation (same pattern as existing item delete)
- Upload button shows loading state during upload

---

## Public UI (`app/stock/page.tsx`)

New **"Pakistan Stock Documents"** section below the Pakistan stock table:

- List of files: display name, description, Download button per file
- Download button hits `GET /api/pakistan-stock/files/[id]/download`
- Section hidden entirely if no files have been uploaded
- Styled with existing brand colors (terracotta `#c0694a`, navy `#1a1a2e`, cream `#f8f4f2`)

---

## Out of Scope

- Parsing file contents (admin enters stock data manually as before)
- File size enforcement beyond browser defaults
- Access control on downloads (all uploaded files are publicly downloadable by design)
- File versioning or update (delete and re-upload to replace)
