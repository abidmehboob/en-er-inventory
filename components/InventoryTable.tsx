'use client'
import { useState } from 'react'
import type { Product } from '@/types'
import { useRouter } from 'next/navigation'

export default function InventoryTable({ products }: { products: Product[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<number | null>(null)
  const [newQty, setNewQty] = useState(0)
  const [saving, setSaving] = useState(false)

  async function saveQty(p: Product) {
    setSaving(true)
    await fetch('/api/inventory', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ article: p.article, size_cm: p.size_cm, gsm: p.gsm, qty_total: newQty }),
    })
    setSaving(false)
    setEditing(null)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            {['Article', 'Size', 'GSM', 'Wt/Pc', 'Cartons', 'Stock (pcs)', 'Available', 'Price USD', 'Min Price', ''].map(h => (
              <th key={h} className="px-4 py-3 text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => (
            <tr key={i} className="border-t">
              <td className="px-4 py-3 font-medium">{p.article}</td>
              <td className="px-4 py-3">{p.size_cm}</td>
              <td className="px-4 py-3">{p.gsm}</td>
              <td className="px-4 py-3">{p.wt_pc}g</td>
              <td className="px-4 py-3">{p.cartons}</td>
              <td className="px-4 py-3">
                {editing === i ? (
                  <input type="number" value={newQty} onChange={e => setNewQty(parseInt(e.target.value))}
                    className="w-24 border rounded px-2 py-1" />
                ) : p.qty_total.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-green-700 font-medium">{(p.available ?? p.qty_total).toLocaleString()}</td>
              <td className="px-4 py-3">${p.price_usd}</td>
              <td className="px-4 py-3 text-gray-400">${p.min_sale_usd}</td>
              <td className="px-4 py-3">
                {editing === i ? (
                  <div className="flex gap-2">
                    <button onClick={() => saveQty(p)} disabled={saving}
                      className="text-green-600 hover:underline text-xs">Save</button>
                    <button onClick={() => setEditing(null)}
                      className="text-gray-400 hover:underline text-xs">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => { setEditing(i); setNewQty(p.qty_total) }}
                    className="text-blue-600 hover:underline text-xs">Edit Qty</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
