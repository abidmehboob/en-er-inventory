import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readPakistanStock, appendPakistanStockItem } from '@/lib/sheets'
import type { PakistanStockStatus } from '@/types'

export async function GET() {
  try {
    const items = await readPakistanStock()
    return NextResponse.json(items)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch stock' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    article: string
    size_cm: string
    gsm: number
    wt_pc: number
    cartons: number
    qty_total: number
    status: PakistanStockStatus
  }

  const { article, size_cm, gsm, wt_pc, cartons, qty_total, status } = body
  if (!article || !size_cm || gsm == null || wt_pc == null || cartons == null || qty_total == null || !status) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (isNaN(gsm) || isNaN(wt_pc) || isNaN(cartons) || isNaN(qty_total)) {
    return NextResponse.json({ error: 'Numeric fields must be valid numbers' }, { status: 400 })
  }
  if (gsm <= 0 || wt_pc <= 0 || cartons < 0 || qty_total < 0) {
    return NextResponse.json({ error: 'gsm and wt_pc must be positive; cartons and qty_total must be non-negative' }, { status: 400 })
  }
  if (status !== 'available' && status !== 'out_of_stock') {
    return NextResponse.json({ error: 'status must be available or out_of_stock' }, { status: 400 })
  }

  try {
    const item = await appendPakistanStockItem({ article, size_cm, gsm, wt_pc, cartons, qty_total, status })
    return NextResponse.json(item, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to save item' }, { status: 500 })
  }
}
