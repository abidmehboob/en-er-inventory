import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateQuotationPDF } from '@/lib/pdf'
import { readOrders } from '@/lib/sheets'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { order_id } = await req.json() as { order_id: string }
  const orders = await readOrders()
  const order = orders.find(o => o.order_id === order_id)
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const pdf = await generateQuotationPDF(order)
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="quotation-${order_id}.pdf"`,
    },
  })
}
