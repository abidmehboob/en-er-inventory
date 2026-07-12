import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updatePakistanStockItem, deletePakistanStockItem } from '@/lib/sheets'
import type { PakistanStockStatus } from '@/types'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    article?: string
    size_cm?: string
    gsm?: number
    wt_pc?: number
    cartons?: number
    qty_total?: number
    status?: PakistanStockStatus
  }

  if (body.status && body.status !== 'available' && body.status !== 'out_of_stock') {
    return NextResponse.json({ error: 'status must be available or out_of_stock' }, { status: 400 })
  }

  try {
    const updated = await updatePakistanStockItem(params.id, body)
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await deletePakistanStockItem(params.id)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }
}
