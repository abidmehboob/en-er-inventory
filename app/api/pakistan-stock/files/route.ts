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
