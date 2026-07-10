import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updateOrderStatus, readOrders } from '@/lib/sheets'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { order_id } = await req.json() as { order_id: string }
  const orders = await readOrders()
  const order = orders.find(o => o.order_id === order_id)
  if (!order || order.status !== 'confirmed') {
    return NextResponse.json({ error: 'Order must be confirmed before marking shipped' }, { status: 400 })
  }
  await updateOrderStatus(order_id, 'shipped')
  return NextResponse.json({ success: true })
}
