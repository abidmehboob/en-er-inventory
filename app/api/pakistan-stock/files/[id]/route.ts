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
