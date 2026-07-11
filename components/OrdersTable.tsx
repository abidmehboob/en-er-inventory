'use client'
import { useState } from 'react'
import type { Order } from '@/types'
import { useRouter } from 'next/navigation'

const STATUS_COLORS: Record<string, string> = {
  reserved: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  shipped: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-600',
  draft: 'bg-gray-100 text-gray-600',
}

export default function OrdersTable({ orders }: { orders: Order[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<string>('all')
  const [loading, setLoading] = useState<string | null>(null)

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  async function action(order_id: string, endpoint: string) {
    setLoading(order_id + endpoint)
    await fetch(`/api/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id }),
    })
    setLoading(null)
    router.refresh()
  }

  async function downloadPDF(order_id: string) {
    const res = await fetch('/api/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id }),
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `quotation-${order_id}.pdf`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {['all', 'reserved', 'confirmed', 'shipped', 'cancelled'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className="px-3 py-1 rounded text-sm capitalize font-medium"
            style={filter === s
              ? { background: '#c0694a', color: '#fff' }
              : { background: '#f3ede9', color: '#555' }}>
            {s}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              {['ID', 'Customer', 'Contact', 'Status', 'Currency', 'Total', 'Date', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.order_id} className="border-t">
                <td className="px-4 py-3 font-mono text-xs">{o.order_id.slice(0, 8)}…</td>
                <td className="px-4 py-3 font-medium">{o.customer_name}</td>
                <td className="px-4 py-3 text-gray-500">{o.customer_contact}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[o.status] ?? ''}`}>
                    {o.status}
                  </span>
                </td>
                <td className="px-4 py-3">{o.currency}</td>
                <td className="px-4 py-3 font-semibold">{o.total_amount.toFixed(2)}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(o.created_at).toLocaleDateString('en-GB')}</td>
                <td className="px-4 py-3 flex gap-2 flex-wrap">
                  <button onClick={() => downloadPDF(o.order_id)}
                    className="text-xs font-medium hover:underline" style={{ color: '#c0694a' }}>PDF</button>
                  {o.status === 'reserved' && (
                    <>
                      <button onClick={() => action(o.order_id, 'confirm')}
                        disabled={loading !== null}
                        className="text-green-600 hover:underline text-xs">Confirm</button>
                      <button onClick={() => action(o.order_id, 'cancel')}
                        disabled={loading !== null}
                        className="text-red-500 hover:underline text-xs">Cancel</button>
                    </>
                  )}
                  {o.status === 'confirmed' && (
                    <button onClick={() => action(o.order_id, 'ship')}
                      disabled={loading !== null}
                      className="text-xs font-medium hover:underline" style={{ color: '#c0694a' }}>Mark Shipped</button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">No orders found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
