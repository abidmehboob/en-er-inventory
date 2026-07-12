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

  if (body.gsm != null && (isNaN(body.gsm) || body.gsm <= 0)) {
    return NextResponse.json({ error: 'gsm must be a positive number' }, { status: 400 })
  }
  if (body.wt_pc != null && (isNaN(body.wt_pc) || body.wt_pc <= 0)) {
    return NextResponse.json({ error: 'wt_pc must be a positive number' }, { status: 400 })
  }
  if (body.cartons != null && (isNaN(body.cartons) || body.cartons < 0)) {
    return NextResponse.json({ error: 'cartons must be non-negative' }, { status: 400 })
  }
  if (body.qty_total != null && (isNaN(body.qty_total) || body.qty_total < 0)) {
    return NextResponse.json({ error: 'qty_total must be non-negative' }, { status: 400 })
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
