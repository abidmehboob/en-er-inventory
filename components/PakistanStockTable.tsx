'use client'
import { useEffect, useState } from 'react'
import type { PakistanStockItem } from '@/types'

export default function PakistanStockTable() {
  const [items, setItems] = useState<PakistanStockItem[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const res = await fetch('/api/pakistan-stock')
    const data = await res.json()
    setItems(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return <div className="text-sm py-6" style={{ color: '#aaa' }}>Loading…</div>
  }

  if (items.length === 0) {
    return (
      <div className="text-sm py-6 text-center" style={{ color: '#aaa' }}>
        No Pakistan stock listed at this time.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-[#f0e8e4] overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: '#1a1a2e', color: '#fff' }}>
            <th className="px-4 py-3 text-left font-semibold">Article</th>
            <th className="px-4 py-3 text-left font-semibold">Size</th>
            <th className="px-4 py-3 text-right font-semibold">GSM</th>
            <th className="px-4 py-3 text-right font-semibold">Wt/pc (kg)</th>
            <th className="px-4 py-3 text-right font-semibold">Cartons</th>
            <th className="px-4 py-3 text-right font-semibold">Qty Total</th>
            <th className="px-4 py-3 text-center font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr
              key={item.item_id}
              style={{
                opacity: item.status === 'out_of_stock' ? 0.45 : 1,
                background: i % 2 === 1 ? '#fdf3ef' : '#fff',
              }}
            >
              <td className="px-4 py-3 font-semibold" style={{ color: '#1a1a2e' }}>{item.article}</td>
              <td className="px-4 py-3" style={{ color: '#555' }}>{item.size_cm} cm</td>
              <td className="px-4 py-3 text-right" style={{ color: '#555' }}>{item.gsm}</td>
              <td className="px-4 py-3 text-right" style={{ color: '#555' }}>{item.wt_pc}</td>
              <td className="px-4 py-3 text-right" style={{ color: '#555' }}>{item.cartons}</td>
              <td className="px-4 py-3 text-right" style={{ color: '#555' }}>{item.qty_total.toLocaleString()}</td>
              <td className="px-4 py-3 text-center">
                {item.status === 'available' ? (
                  <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ background: '#e8f5e9', color: '#2e7d32' }}>
                    AVAILABLE
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ background: '#fce4e4', color: '#c62828' }}>
                    OUT OF STOCK
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
