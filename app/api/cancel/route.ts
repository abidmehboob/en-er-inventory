import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { deleteReservedByOrderId, updateOrderStatus, readOrders } from '@/lib/sheets'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { order_id } = await req.json() as { order_id: string }

  try {
    const orders = await readOrders()
    const order = orders.find(o => o.order_id === order_id)
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (!['reserved', 'draft'].includes(order.status)) {
      return NextResponse.json({ error: 'Only reserved or draft orders can be cancelled' }, { status: 400 })
    }

    await deleteReservedByOrderId(order_id)
    await updateOrderStatus(order_id, 'cancelled')
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to cancel order'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
