import { readProducts, readOrders, readReserved } from '@/lib/sheets'
import { calculateAvailable } from '@/lib/stock'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const [products, orders, reserved] = await Promise.all([
    readProducts(), readOrders(), readReserved(),
  ])
  const withAvailable = calculateAvailable(products, reserved)

  const totalStockValueUSD = withAvailable.reduce((sum, p) => sum + p.price_usd * p.qty_total, 0)
  const lowStock = withAvailable.filter(p => (p.available ?? 0) < 200)
  const recentOrders = [...orders].reverse().slice(0, 5)
  const pendingCount = orders.filter(o => o.status === 'reserved').length

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-5 rounded-lg shadow">
          <p className="text-sm text-gray-500">Total Stock Value</p>
          <p className="text-2xl font-bold">${totalStockValueUSD.toLocaleString('en-US', { minimumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow">
          <p className="text-sm text-gray-500">Pending Orders</p>
          <p className="text-2xl font-bold">{pendingCount}</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow">
          <p className="text-sm text-gray-500">Low Stock Items</p>
          <p className={`text-2xl font-bold ${lowStock.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {lowStock.length}
          </p>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
          <h2 className="font-semibold text-red-700 mb-2">Low Stock Alerts</h2>
          <ul className="space-y-1">
            {lowStock.map((p, i) => (
              <li key={i} className="text-sm text-red-600">
                {p.article} {p.size_cm} {p.gsm}gsm — {p.available} pcs remaining
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-5">
        <div className="flex justify-between mb-4">
          <h2 className="font-semibold">Recent Orders</h2>
          <Link href="/admin/orders" className="text-sm hover:underline" style={{ color: '#c0694a' }}>View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-gray-500 text-xs uppercase">
              <tr>
                {['ID', 'Customer', 'Status', 'Currency', 'Total', 'Date'].map(h => (
                  <th key={h} className="text-left py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(o => (
                <tr key={o.order_id} className="border-t">
                  <td className="py-2 font-mono text-xs">{o.order_id.slice(0, 8)}…</td>
                  <td className="py-2">{o.customer_name}</td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      o.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                      o.status === 'reserved' ? 'bg-yellow-100 text-yellow-700' :
                      o.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="py-2">{o.currency}</td>
                  <td className="py-2 font-semibold">{o.total_amount.toFixed(2)}</td>
                  <td className="py-2 text-gray-500">{new Date(o.created_at).toLocaleDateString('en-GB')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
