import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readPakistanStock, appendPakistanStockItem } from '@/lib/sheets'
import type { PakistanStockStatus } from '@/types'

export async function GET() {
  const items = await readPakistanStock()
  return NextResponse.json(items)
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
  if (status !== 'available' && status !== 'out_of_stock') {
    return NextResponse.json({ error: 'status must be available or out_of_stock' }, { status: 400 })
  }

  const item = await appendPakistanStockItem({ article, size_cm, gsm, wt_pc, cartons, qty_total, status })
  return NextResponse.json(item, { status: 201 })
}
