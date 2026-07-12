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

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': file.mime_type,
      'Content-Disposition': `attachment; filename="${file.original_filename}"; filename*=UTF-8''${encodedName}`,
    },
  })
}
