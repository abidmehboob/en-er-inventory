import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { withLock } from '@/lib/lock'
import { readProducts, readOrders, updateProductQty, deleteReservedByOrderId, updateOrderStatus } from '@/lib/sheets'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { order_id } = await req.json() as { order_id: string }

  try {
    await withLock(async () => {
      const [orders, products] = await Promise.all([readOrders(), readProducts()])
      const order = orders.find(o => o.order_id === order_id)
      if (!order) throw new Error('Order not found')
      if (order.status !== 'reserved') throw new Error('Order is not in reserved status')

      for (const item of order.items) {
        const product = products.find(
          p => p.article === item.article && p.size_cm === item.size_cm && p.gsm === item.gsm
        )
        if (!product) throw new Error(`Product not found: ${item.article}`)
        await updateProductQty(
          item.article, item.size_cm, item.gsm,
          product.qty_total - item.qty,
          product.version + 1
        )
      }

      await deleteReservedByOrderId(order_id)
      await updateOrderStatus(order_id, 'confirmed', new Date().toISOString())
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to confirm order'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
