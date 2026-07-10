'use client'
import { useEffect, useState } from 'react'
import type { Currency, Product } from '@/types'
import CurrencyToggle from './CurrencyToggle'

const SYMBOL: Record<Currency, string> = { USD: '$', EUR: '€', PLN: 'zł', GBP: '£' }

export default function StockTable() {
  const [products, setProducts] = useState<Product[]>([])
  const [rates, setRates] = useState<Record<Currency, number>>({ USD: 1, EUR: 0.92, PLN: 4.05, GBP: 0.79 })
  const [currency, setCurrency] = useState<Currency>('USD')
  const [loading, setLoading] = useState(true)

  async function load() {
    const [pRes, rRes] = await Promise.all([
      fetch('/api/products').then(r => r.json()),
      fetch('/api/rates').then(r => r.json()),
    ])
    setProducts(pRes)
    setRates(rRes)
    setLoading(false)
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [])

  function price(p: Product) {
    const converted = (p.price_usd / rates['USD']) * rates[currency]
    return `${SYMBOL[currency]}${converted.toFixed(2)}`
  }

  if (loading) return <p className="text-gray-500">Loading stock...</p>

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">Auto-refreshes every 60 seconds</p>
        <CurrencyToggle value={currency} onChange={setCurrency} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full bg-white rounded-lg shadow text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              {['Article', 'Size', 'GSM', 'Wt/Pc (g)', 'Available (pcs)', 'Price'].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => (
              <tr key={i} className={`border-t ${(p.available ?? 0) === 0 ? 'bg-red-50' : ''}`}>
                <td className="px-4 py-3 font-medium">{p.article}</td>
                <td className="px-4 py-3">{p.size_cm}</td>
                <td className="px-4 py-3">{p.gsm}</td>
                <td className="px-4 py-3">{p.wt_pc}</td>
                <td className="px-4 py-3">
                  {(p.available ?? 0) === 0
                    ? <span className="text-red-500 font-semibold">Out of stock</span>
                    : p.available?.toLocaleString()}
                </td>
                <td className="px-4 py-3 font-semibold">{price(p)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
