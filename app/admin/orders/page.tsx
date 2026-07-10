import { readOrders } from '@/lib/sheets'
import OrdersTable from '@/components/OrdersTable'

export const dynamic = 'force-dynamic'

export default async function OrdersPage() {
  const orders = await readOrders()
  const sorted = [...orders].reverse()
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Orders</h1>
      <OrdersTable orders={sorted} />
    </div>
  )
}
