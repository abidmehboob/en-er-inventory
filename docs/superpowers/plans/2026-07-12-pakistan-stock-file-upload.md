# Pakistan Stock File Upload — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admin to upload PDF/Word/Excel files for Pakistan stock, and let guests view and download them from the public `/stock` page.

**Architecture:** Files are saved to `uploads/pakistan-stock/` on the server filesystem (outside `public/`) under UUID-based filenames. Metadata (display name, description, original filename, MIME type) is stored in a new `PakistanStockFiles` Google Sheets tab. A streaming API route serves file downloads. Admin manages uploads/deletes via a new section on the existing admin Pakistan stock page; guests see and download files from the existing `/stock` page.

**Tech Stack:** Next.js 14 App Router, TypeScript, Google Sheets API (`googleapis`), Node.js `fs/promises` + `path`, `uuid` (already in package.json), native `Request.formData()` for multipart upload.

---

## File Map

| Action | File |
|--------|------|
| Modify | `types/index.ts` — add `PakistanStockFile` interface |
| Modify | `lib/sheets.ts` — add `parsePakistanStockFileRow`, `readPakistanStockFiles`, `appendPakistanStockFile`, `deletePakistanStockFile` |
| Modify | `lib/__tests__/sheets.test.ts` — add tests for `parsePakistanStockFileRow` |
| Modify | `scripts/seed-sheets.ts` — add `PakistanStockFiles` tab creation + header row |
| Create | `uploads/pakistan-stock/.gitkeep` — ensure directory exists in git |
| Create | `app/api/pakistan-stock/files/route.ts` — `GET` list + `POST` upload |
| Create | `app/api/pakistan-stock/files/[id]/route.ts` — `DELETE` |
| Create | `app/api/pakistan-stock/files/[id]/download/route.ts` — `GET` stream |
| Modify | `app/admin/pakistan-stock/page.tsx` — add "Uploaded Files" section |
| Modify | `app/stock/page.tsx` — add "Pakistan Stock Documents" section |

---

## Task 1: Add `PakistanStockFile` type

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Add the type to `types/index.ts`**

Append at the bottom of the file:

```typescript
export interface PakistanStockFile {
  file_id: string           // UUID
  display_name: string      // Admin-set label
  description: string       // Admin-set description
  original_filename: string // Original name as uploaded
  stored_filename: string   // UUID-based name on disk
  mime_type: string         // e.g. 'application/pdf'
  uploaded_at: string       // ISO datetime
}
```

- [ ] **Step 2: Commit**

```bash
git add types/index.ts
git commit -m "feat: add PakistanStockFile type"
```

---

## Task 2: Add Sheet functions for `PakistanStockFiles`

**Files:**
- Modify: `lib/sheets.ts`
- Modify: `lib/__tests__/sheets.test.ts`

- [ ] **Step 1: Write the failing test in `lib/__tests__/sheets.test.ts`**

Add after the existing `parseOrderRow` describe block:

```typescript
describe('parsePakistanStockFileRow', () => {
  it('maps a raw Sheets row to a PakistanStockFile', () => {
    const row = [
      'file-uuid-1',
      'July 2026 Price List',
      'Full price sheet for July',
      'price_list_july.pdf',
      'file-uuid-1.pdf',
      'application/pdf',
      '2026-07-12T10:00:00.000Z',
    ]
    const file = parsePakistanStockFileRow(row)
    expect(file.file_id).toBe('file-uuid-1')
    expect(file.display_name).toBe('July 2026 Price List')
    expect(file.description).toBe('Full price sheet for July')
    expect(file.original_filename).toBe('price_list_july.pdf')
    expect(file.stored_filename).toBe('file-uuid-1.pdf')
    expect(file.mime_type).toBe('application/pdf')
    expect(file.uploaded_at).toBe('2026-07-12T10:00:00.000Z')
  })
})
```

Also update the import line at the top of the test file to include `parsePakistanStockFileRow`:

```typescript
import { parseProductRow, parseOrderRow, makeProductKey, parsePakistanStockFileRow } from '@/lib/sheets'
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest lib/__tests__/sheets.test.ts --testNamePattern="parsePakistanStockFileRow" --no-coverage
```

Expected: FAIL — `parsePakistanStockFileRow` is not exported from `@/lib/sheets`

- [ ] **Step 3: Add Sheet functions to `lib/sheets.ts`**

Update the import line at the top of `lib/sheets.ts` to include `PakistanStockFile`:

```typescript
import type { Product, Order, ReservedRow, LineItem, Expense, PakistanStockItem, PakistanStockStatus, PakistanStockFile } from '@/types'
```

Then append at the bottom of `lib/sheets.ts`:

```typescript
export function parsePakistanStockFileRow(row: string[]): PakistanStockFile {
  return {
    file_id: row[0],
    display_name: row[1],
    description: row[2],
    original_filename: row[3],
    stored_filename: row[4],
    mime_type: row[5],
    uploaded_at: row[6],
  }
}

async function readPakistanStockFilesRaw(): Promise<string[][]> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'PakistanStockFiles!A2:G',
  })
  return (res.data.values || []) as string[][]
}

export async function readPakistanStockFiles(): Promise<PakistanStockFile[]> {
  const rows = await readPakistanStockFilesRaw()
  return rows.filter(row => row[0] && row.length >= 7).map(parsePakistanStockFileRow)
}

export async function appendPakistanStockFile(
  file: Omit<PakistanStockFile, 'file_id' | 'uploaded_at'>
): Promise<PakistanStockFile> {
  const full: PakistanStockFile = {
    ...file,
    file_id: uuidv4(),
    uploaded_at: new Date().toISOString(),
  }
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'PakistanStockFiles!A:G',
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        full.file_id,
        full.display_name,
        full.description,
        full.original_filename,
        full.stored_filename,
        full.mime_type,
        full.uploaded_at,
      ]],
    },
  })
  return full
}

export async function deletePakistanStockFileById(file_id: string): Promise<string> {
  const rows = await readPakistanStockFilesRaw()
  const idx = rows.findIndex(row => row[0] === file_id)
  if (idx === -1) throw new Error(`PakistanStockFile ${file_id} not found`)
  const storedFilename = rows[idx][4]
  const sheets = getSheetsClient()
  const sheetRow = idx + 2
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `PakistanStockFiles!A${sheetRow}:G${sheetRow}`,
    valueInputOption: 'RAW',
    requestBody: { values: [['', '', '', '', '', '', '']] },
  })
  return storedFilename
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest lib/__tests__/sheets.test.ts --no-coverage
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/sheets.ts lib/__tests__/sheets.test.ts
git commit -m "feat: add PakistanStockFiles sheet functions"
```

---

## Task 3: Set up `PakistanStockFiles` Google Sheet tab

**Files:**
- Modify: `scripts/seed-sheets.ts`
- Create: `uploads/pakistan-stock/.gitkeep`

- [ ] **Step 1: Add `PakistanStockFiles` tab to the seed script**

In `scripts/seed-sheets.ts`, update the `tabsToCreate` line to include `PakistanStockFiles`:

```typescript
const tabsToCreate = ['Products', 'Orders', 'Reserved', 'Lock', 'PakistanStock', 'PakistanStockFiles'].filter(
  t => !existingTitles.includes(t)
)
```

Then add the header row for `PakistanStockFiles` after the existing Lock initialization block (before `console.log('\nGoogle Sheets seeded...')`):

```typescript
// PakistanStockFiles: headers only
await sheets.spreadsheets.values.update({
  spreadsheetId: SHEET_ID,
  range: 'PakistanStockFiles!A1:G1',
  valueInputOption: 'RAW',
  requestBody: {
    values: [['file_id', 'display_name', 'description', 'original_filename', 'stored_filename', 'mime_type', 'uploaded_at']],
  },
})
console.log('PakistanStockFiles headers set.')
```

- [ ] **Step 2: Run the seed script to create the tab**

```bash
npx ts-node --project tsconfig.json scripts/seed-sheets.ts
```

Expected output includes: `PakistanStockFiles headers set.`

If the tab already exists, the script skips creation (filtered by `existingTitles`).

- [ ] **Step 3: Create the uploads directory**

```bash
mkdir -p uploads/pakistan-stock
```

Then create `uploads/pakistan-stock/.gitkeep` as an empty file so git tracks the directory.

- [ ] **Step 4: Update `.gitignore` to ignore uploaded files but keep the directory**

Add these lines to `.gitignore`:

```
uploads/pakistan-stock/*
!uploads/pakistan-stock/.gitkeep
```

- [ ] **Step 5: Commit**

```bash
git add scripts/seed-sheets.ts uploads/pakistan-stock/.gitkeep .gitignore
git commit -m "feat: add PakistanStockFiles sheet tab setup and uploads directory"
```

---

## Task 4: API — GET list + POST upload

**Files:**
- Create: `app/api/pakistan-stock/files/route.ts`

- [ ] **Step 1: Create `app/api/pakistan-stock/files/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readPakistanStockFiles, appendPakistanStockFile } from '@/lib/sheets'
import { writeFile, mkdir } from 'fs/promises'
import { join, extname } from 'path'
import { v4 as uuidv4 } from 'uuid'

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'pakistan-stock')

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])

export async function GET() {
  try {
    const files = await readPakistanStockFiles()
    return NextResponse.json(files)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const display_name = (formData.get('display_name') as string | null)?.trim()
  const description = (formData.get('description') as string | null)?.trim() ?? ''

  if (!file || !display_name) {
    return NextResponse.json({ error: 'file and display_name are required' }, { status: 400 })
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Only PDF, Word, and Excel files are allowed' }, { status: 400 })
  }

  const ext = extname(file.name) || ''
  const storedFilename = `${uuidv4()}${ext}`

  try {
    await mkdir(UPLOAD_DIR, { recursive: true })
    const bytes = await file.arrayBuffer()
    await writeFile(join(UPLOAD_DIR, storedFilename), Buffer.from(bytes))
  } catch {
    return NextResponse.json({ error: 'Failed to save file' }, { status: 500 })
  }

  try {
    const saved = await appendPakistanStockFile({
      display_name,
      description,
      original_filename: file.name,
      stored_filename: storedFilename,
      mime_type: file.type,
    })
    return NextResponse.json(saved, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to save metadata' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/api/pakistan-stock/files/route.ts
git commit -m "feat: add GET list and POST upload API for Pakistan stock files"
```

---

## Task 5: API — DELETE file

**Files:**
- Create: `app/api/pakistan-stock/files/[id]/route.ts`

- [ ] **Step 1: Create `app/api/pakistan-stock/files/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { deletePakistanStockFileById } from '@/lib/sheets'
import { unlink } from 'fs/promises'
import { join } from 'path'

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'pakistan-stock')

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let storedFilename: string
  try {
    storedFilename = await deletePakistanStockFileById(params.id)
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  try {
    await unlink(join(UPLOAD_DIR, storedFilename))
  } catch {
    // File already gone from disk — metadata already cleared, so continue
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/api/pakistan-stock/files/[id]/route.ts
git commit -m "feat: add DELETE API for Pakistan stock files"
```

---

## Task 6: API — Stream file download

**Files:**
- Create: `app/api/pakistan-stock/files/[id]/download/route.ts`

- [ ] **Step 1: Create `app/api/pakistan-stock/files/[id]/download/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { readPakistanStockFiles } from '@/lib/sheets'
import { readFile } from 'fs/promises'
import { join } from 'path'

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'pakistan-stock')

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  let files: Awaited<ReturnType<typeof readPakistanStockFiles>>
  try {
    files = await readPakistanStockFiles()
  } catch {
    return NextResponse.json({ error: 'Failed to fetch file list' }, { status: 500 })
  }

  const file = files.find(f => f.file_id === params.id)
  if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 })

  let buffer: Buffer
  try {
    buffer = await readFile(join(UPLOAD_DIR, file.stored_filename))
  } catch {
    return NextResponse.json({ error: 'File not found on disk' }, { status: 404 })
  }

  const encodedName = encodeURIComponent(file.original_filename)

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': file.mime_type,
      'Content-Disposition': `attachment; filename="${file.original_filename}"; filename*=UTF-8''${encodedName}`,
    },
  })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/api/pakistan-stock/files/[id]/download/route.ts
git commit -m "feat: add file download streaming API for Pakistan stock files"
```

---

## Task 7: Admin UI — Uploaded Files section

**Files:**
- Modify: `app/admin/pakistan-stock/page.tsx`

- [ ] **Step 1: Add `PakistanStockFile` import and file state to the admin page**

At the top of `app/admin/pakistan-stock/page.tsx`, update the import:

```typescript
import type { PakistanStockItem, PakistanStockStatus, PakistanStockFile } from '@/types'
```

Inside the `PakistanStockPage` component, add these state variables after the existing `confirmDeleteId` state:

```typescript
const [files, setFiles] = useState<PakistanStockFile[]>([])
const [filesLoading, setFilesLoading] = useState(true)
const [fileForm, setFileForm] = useState({ display_name: '', description: '' })
const [fileInput, setFileInput] = useState<File | null>(null)
const [uploading, setUploading] = useState(false)
const [uploadError, setUploadError] = useState('')
const [confirmDeleteFileId, setConfirmDeleteFileId] = useState<string | null>(null)
```

- [ ] **Step 2: Add `fetchFiles` function and call it on mount**

Add this function after `fetchItems`:

```typescript
const fetchFiles = useCallback(async () => {
  setFilesLoading(true)
  const res = await fetch('/api/pakistan-stock/files')
  const data = await res.json()
  setFiles(data)
  setFilesLoading(false)
}, [])

useEffect(() => { fetchFiles() }, [fetchFiles])
```

- [ ] **Step 3: Add upload and delete handlers**

Add these functions after `handleDelete`:

```typescript
async function handleUpload(e: React.FormEvent) {
  e.preventDefault()
  setUploadError('')
  if (!fileInput || !fileForm.display_name.trim()) {
    setUploadError('File and display name are required.')
    return
  }
  setUploading(true)
  try {
    const fd = new FormData()
    fd.append('file', fileInput)
    fd.append('display_name', fileForm.display_name.trim())
    fd.append('description', fileForm.description.trim())
    const res = await fetch('/api/pakistan-stock/files', { method: 'POST', body: fd })
    if (!res.ok) {
      const data = await res.json()
      setUploadError(data.error ?? 'Upload failed')
      return
    }
    setFileForm({ display_name: '', description: '' })
    setFileInput(null)
    ;(document.getElementById('file-input') as HTMLInputElement).value = ''
    await fetchFiles()
  } finally {
    setUploading(false)
  }
}

async function handleDeleteFile(file_id: string) {
  await fetch(`/api/pakistan-stock/files/${file_id}`, { method: 'DELETE' })
  setConfirmDeleteFileId(null)
  await fetchFiles()
}
```

- [ ] **Step 4: Add the "Uploaded Files" section to the JSX**

In the `return` block of `PakistanStockPage`, append this section after the closing `</div>` of the modal but before the final `</div>`:

```tsx
{/* Uploaded Files Section */}
<div className="mt-10">
  <h2 className="text-xl font-bold mb-4" style={{ color: '#1a1a2e' }}>Uploaded Files</h2>

  {/* Upload form */}
  <div className="bg-white rounded-lg shadow-sm border border-[#f0e8e4] p-5 mb-6">
    <h3 className="text-sm font-semibold mb-3" style={{ color: '#1a1a2e' }}>Upload New File</h3>
    {uploadError && <div className="text-red-600 text-sm mb-3">{uploadError}</div>}
    <form onSubmit={handleUpload}>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={labelClass}>File (PDF, Word, Excel)</label>
          <input
            id="file-input"
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx"
            onChange={e => setFileInput(e.target.files?.[0] ?? null)}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Display Name</label>
          <input
            type="text"
            value={fileForm.display_name}
            onChange={e => setFileForm(f => ({ ...f, display_name: e.target.value }))}
            className={inputClass}
            placeholder="e.g. July 2026 Price List"
            required
          />
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <input
            type="text"
            value={fileForm.description}
            onChange={e => setFileForm(f => ({ ...f, description: e.target.value }))}
            className={inputClass}
            placeholder="Optional description"
          />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={uploading}
          className="px-4 py-2 text-sm font-semibold rounded text-white"
          style={{ background: '#c0694a', opacity: uploading ? 0.6 : 1 }}
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </div>
    </form>
  </div>

  {/* Files table */}
  {filesLoading ? (
    <div className="text-sm text-gray-400">Loading files…</div>
  ) : files.length === 0 ? (
    <div className="text-sm text-gray-400">No files uploaded yet.</div>
  ) : (
    <div className="bg-white rounded-lg shadow-sm border border-[#f0e8e4] overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: '#c0694a', color: '#fff' }}>
            <th className="px-4 py-3 text-left font-semibold">Display Name</th>
            <th className="px-4 py-3 text-left font-semibold">Description</th>
            <th className="px-4 py-3 text-left font-semibold">Original Filename</th>
            <th className="px-4 py-3 text-left font-semibold">Uploaded</th>
            <th className="px-4 py-3 text-center font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {files.map((f, i) => (
            <tr key={f.file_id} style={i % 2 === 1 ? { background: '#fdf3ef' } : {}}>
              <td className="px-4 py-3 font-semibold" style={{ color: '#1a1a2e' }}>{f.display_name}</td>
              <td className="px-4 py-3 text-gray-600">{f.description || '—'}</td>
              <td className="px-4 py-3 text-gray-500 text-xs">{f.original_filename}</td>
              <td className="px-4 py-3 text-gray-500 text-xs">{new Date(f.uploaded_at).toLocaleDateString()}</td>
              <td className="px-4 py-3 text-center">
                {confirmDeleteFileId === f.file_id ? (
                  <span className="text-xs">
                    Delete?{' '}
                    <button onClick={() => handleDeleteFile(f.file_id)} className="font-semibold" style={{ color: '#c62828' }}>Yes</button>
                    {' · '}
                    <button onClick={() => setConfirmDeleteFileId(null)} style={{ color: '#888' }}>No</button>
                  </span>
                ) : (
                  <button onClick={() => setConfirmDeleteFileId(f.file_id)} className="text-xs underline" style={{ color: '#c0694a' }}>Delete</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</div>
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add app/admin/pakistan-stock/page.tsx
git commit -m "feat: add Uploaded Files section to admin Pakistan stock page"
```

---

## Task 8: Public UI — Pakistan Stock Documents section

**Files:**
- Modify: `app/stock/page.tsx`

- [ ] **Step 1: Convert `app/stock/page.tsx` to a client component and add file download section**

Replace the entire contents of `app/stock/page.tsx` with:

```tsx
'use client'
import { useEffect, useState } from 'react'
import StockTable from '@/components/StockTable'
import PakistanStockTable from '@/components/PakistanStockTable'
import type { PakistanStockFile } from '@/types'

export default function StockPage() {
  const [files, setFiles] = useState<PakistanStockFile[]>([])

  useEffect(() => {
    fetch('/api/pakistan-stock/files')
      .then(r => r.json())
      .then(setFiles)
      .catch(() => {})
  }, [])

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

        {/* Pakistan Stock Documents */}
        {files.length > 0 && (
          <>
            <div className="border-t my-10" style={{ borderColor: '#e8e0db' }} />
            <div>
              <div className="flex items-center gap-3 mb-5">
                <span className="text-lg">📄</span>
                <h2 className="text-lg font-bold" style={{ color: '#1a1a2e' }}>Pakistan Stock Documents</h2>
              </div>
              <div className="flex flex-col gap-3">
                {files.map(f => (
                  <div
                    key={f.file_id}
                    className="flex items-center justify-between bg-white rounded-lg border border-[#f0e8e4] px-5 py-4 shadow-sm"
                  >
                    <div>
                      <div className="font-semibold text-sm" style={{ color: '#1a1a2e' }}>{f.display_name}</div>
                      {f.description && (
                        <div className="text-xs mt-0.5" style={{ color: '#888' }}>{f.description}</div>
                      )}
                    </div>
                    <a
                      href={`/api/pakistan-stock/files/${f.file_id}/download`}
                      className="ml-6 px-4 py-2 text-sm font-semibold rounded text-white shrink-0"
                      style={{ background: '#c0694a' }}
                    >
                      Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Run all tests to confirm nothing is broken**

```bash
npx jest --no-coverage
```

Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add app/stock/page.tsx
git commit -m "feat: add Pakistan Stock Documents download section to public stock page"
```

---

## Final Verification

- [ ] Start the dev server: `npm run dev`
- [ ] Log in as admin and go to `/admin/pakistan-stock`
- [ ] Verify the "Uploaded Files" section appears below the stock table
- [ ] Upload a PDF — confirm it appears in the files table
- [ ] Upload a Word doc and an Excel file — confirm both upload and appear
- [ ] Visit `/stock` as a guest (incognito window) — confirm the "Pakistan Stock Documents" section appears with a Download button
- [ ] Click Download — confirm the file downloads with the correct name
- [ ] Delete a file from the admin panel — confirm it disappears from admin table and from the public page
- [ ] With no files uploaded, visit `/stock` — confirm the Documents section is hidden entirely
