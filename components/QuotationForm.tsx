'use client'
import { useState, useEffect } from 'react'
import type { Product, Currency } from '@/types'
import CurrencyToggle from './CurrencyToggle'

const SYMBOL: Record<Currency, string> = { USD: '$', EUR: '€', PLN: 'zł', GBP: '£' }

interface CartItem { product: Product; qty: number; price_usd: number }

export default function QuotationForm() {
  const [products, setProducts] = useState<Product[]>([])
  const [rates, setRates] = useState<Record<Currency, number>>({ USD: 1, EUR: 0.92, PLN: 4.05, GBP: 0.79 })
  const [currency, setCurrency] = useState<Currency>('USD')
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerContact, setCustomerContact] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/products').then(r => r.json()),
      fetch('/api/rates').then(r => r.json()),
    ]).then(([p, r]) => { setProducts(p); setRates(r) })
  }, [])

  function addToCart(product: Product) {
    setCart(prev => {
      const exists = prev.some(i => i.product.article === product.article && i.product.size_cm === product.size_cm && i.product.gsm === product.gsm)
      if (exists) return prev
      return [...prev, { product, qty: 1, price_usd: product.price_usd }]
    })
  }

  function updateQty(index: number, qty: number) {
    setCart(prev => prev.map((item, i) => i === index ? { ...item, qty: Math.max(1, qty) } : item))
  }

  function updatePrice(index: number, price_usd: number) {
    setCart(prev => prev.map((item, i) => i === index ? { ...item, price_usd } : item))
  }

  function removeFromCart(index: number) {
    setCart(prev => prev.filter((_, i) => i !== index))
  }

  function convertPrice(price_usd: number) {
    return ((price_usd / rates['USD']) * rates[currency]).toFixed(2)
  }

  function grandTotal() {
    return cart.reduce((sum, item) => {
      const display = (item.price_usd / rates['USD']) * rates[currency]
      return sum + display * item.qty
    }, 0).toFixed(2)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (cart.length === 0) { setError('Add at least one product'); return }

    for (const item of cart) {
      if (item.price_usd < item.product.min_sale_usd) {
        setError(`Price for ${item.product.article} is below minimum $${item.product.min_sale_usd}`)
        return
      }
      if (item.qty > (item.product.available ?? 0)) {
        setError(`${item.product.article}: only ${item.product.available} pcs available`)
        return
      }
    }

    setLoading(true)
    const res = await fetch('/api/quotation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: customerName,
        customer_contact: customerContact,
        currency,
        items: cart.map(i => ({
          article: i.product.article,
          size_cm: i.product.size_cm,
          gsm: i.product.gsm,
          qty: i.qty,
          price_usd: i.price_usd,
        })),
      }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) { setError(data.error); return }
    setSuccess(data.order_id)
  }

  async function downloadPDF() {
    if (!success) return
    const res = await fetch('/api/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: success }),
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `quotation-${success}.pdf`; a.click()
    URL.revokeObjectURL(url)
  }

  if (success) return (
    <div className="text-center py-20">
      <h2 className="text-2xl font-bold mb-2" style={{ color: '#2d7a3a' }}>Quotation Reserved!</h2>
      <p className="text-gray-500 mb-6">ID: {success}</p>
      <button onClick={downloadPDF}
        className="text-white px-6 py-3 rounded mr-3 font-medium"
        style={{ background: '#c0694a' }}>
        Download PDF
      </button>
      <button onClick={() => { setSuccess(null); setCart([]) }}
        className="bg-gray-100 text-gray-700 px-6 py-3 rounded hover:bg-gray-200">
        New Quotation
      </button>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Customer Name</label>
          <input value={customerName} onChange={e => setCustomerName(e.target.value)} required
            className="w-full border rounded px-3 py-2 outline-none text-sm"
            style={{ borderColor: '#e0d4cc' }}
            onFocus={e => { e.target.style.borderColor = '#c0694a' }}
            onBlur={e => { e.target.style.borderColor = '#e0d4cc' }}
            placeholder="e.g. ABC Retail Ltd" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Customer Contact</label>
          <input value={customerContact} onChange={e => setCustomerContact(e.target.value)} required
            className="w-full border rounded px-3 py-2 outline-none text-sm"
            style={{ borderColor: '#e0d4cc' }}
            onFocus={e => { e.target.style.borderColor = '#c0694a' }}
            onBlur={e => { e.target.style.borderColor = '#e0d4cc' }}
            placeholder="Phone or email" />
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="font-semibold">Select Products</h2>
        <CurrencyToggle value={currency} onChange={setCurrency} />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              {['Article', 'Size', 'GSM', 'Available', `Price (${currency})`, 'Min Price (USD)', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => (
              <tr key={i} className="border-t">
                <td className="px-4 py-2 font-medium">{p.article}</td>
                <td className="px-4 py-2">{p.size_cm}</td>
                <td className="px-4 py-2">{p.gsm}</td>
                <td className="px-4 py-2">{(p.available ?? 0).toLocaleString()}</td>
                <td className="px-4 py-2">{SYMBOL[currency]}{convertPrice(p.price_usd)}</td>
                <td className="px-4 py-2 text-gray-400">${p.min_sale_usd}</td>
                <td className="px-4 py-2">
                  <button type="button" onClick={() => addToCart(p)}
                    disabled={(p.available ?? 0) === 0}
                    className="text-sm font-medium disabled:text-gray-300"
                    style={{ color: '#c0694a' }}>
                    Add
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {cart.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <h2 className="font-semibold p-4 border-b">Quotation Items</h2>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                {['Article', 'Size', 'GSM', 'Qty', 'Price USD', `Display (${currency})`, 'Line Total', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cart.map((item, i) => {
                const displayPrice = convertPrice(item.price_usd)
                const lineTotal = (parseFloat(displayPrice) * item.qty).toFixed(2)
                const belowMin = item.price_usd < item.product.min_sale_usd
                return (
                  <tr key={i} className={`border-t ${belowMin ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-2">{item.product.article}</td>
                    <td className="px-4 py-2">{item.product.size_cm}</td>
                    <td className="px-4 py-2">{item.product.gsm}</td>
                    <td className="px-4 py-2">
                      <input type="number" min={1} max={item.product.available ?? 0}
                        value={item.qty} onChange={e => updateQty(i, parseInt(e.target.value))}
                        className="w-20 border rounded px-2 py-1" />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" step="0.01" value={item.price_usd}
                        onChange={e => updatePrice(i, parseFloat(e.target.value))}
                        className={`w-24 border rounded px-2 py-1 ${belowMin ? 'border-red-400' : ''}`} />
                      {belowMin && <p className="text-red-500 text-xs">Below min ${item.product.min_sale_usd}</p>}
                    </td>
                    <td className="px-4 py-2">{SYMBOL[currency]}{displayPrice}</td>
                    <td className="px-4 py-2 font-semibold">{SYMBOL[currency]}{lineTotal}</td>
                    <td className="px-4 py-2">
                      <button type="button" onClick={() => removeFromCart(i)} className="text-red-500 hover:underline text-xs">Remove</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t" style={{ background: '#fdf3ef' }}>
                <td colSpan={6} className="px-4 py-3 text-right font-bold">Grand Total</td>
                <td className="px-4 py-3 font-bold text-lg" style={{ color: '#1a1a2e' }}>{SYMBOL[currency]}{grandTotal()} {currency}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button type="submit" disabled={loading || cart.length === 0}
        className="text-white px-8 py-3 rounded font-medium disabled:opacity-50"
        style={{ background: '#c0694a' }}>
        {loading ? 'Saving...' : 'Save & Reserve Stock'}
      </button>
    </form>
  )
}
