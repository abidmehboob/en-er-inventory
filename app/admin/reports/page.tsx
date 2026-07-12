'use client'
import { useState, useCallback } from 'react'
import type { Order, Expense } from '@/types'
import type { PnlRow } from '@/lib/reportHelpers'

type ReportType = 'sales' | 'orders' | 'expenses' | 'inventory' | 'pnl'

const TABS: { id: ReportType; label: string }[] = [
  { id: 'sales', label: 'Sales' },
  { id: 'orders', label: 'Orders' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'pnl', label: 'Profit & Loss' },
]

const STATUS_COLORS: Record<string, string> = {
  draft: '#888', reserved: '#c0694a', confirmed: '#1a8a1a', shipped: '#1a1a2e', cancelled: '#aaa',
}

type InventoryItem = { article: string; size_cm: string; gsm: number; qty_total: number; available?: number; price_usd: number }

export default function ReportsPage() {
  const today = new Date().toISOString().slice(0, 10)
  const firstOfMonth = today.slice(0, 7) + '-01'

  const [tab, setTab] = useState<ReportType>('sales')
  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo] = useState(today)
  const [data, setData] = useState<Order[] | Expense[] | InventoryItem[] | PnlRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  const fetchData = useCallback(async (type: ReportType, f: string, t: string) => {
    setLoading(true)
    setData(null)
    const params = new URLSearchParams({ type })
    if (type !== 'inventory') { params.set('from', f); params.set('to', t) }
    const res = await fetch(`/api/reports/data?${params}`)
    const json = await res.json()
    setData(json)
    setLoading(false)
  }, [])

  function handleTabChange(newTab: ReportType) {
    setTab(newTab)
    fetchData(newTab, from, to)
  }

  function handleFetch() {
    fetchData(tab, from, to)
  }

  async function handleExportPdf() {
    setPdfLoading(true)
    try {
      const res = await fetch('/api/reports/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: tab, from: tab !== 'inventory' ? from : undefined, to: tab !== 'inventory' ? to : undefined }),
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${tab}-report.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setPdfLoading(false)
    }
  }

  const thClass = "px-4 py-3 text-left font-semibold text-sm"
  const tdClass = "px-4 py-3 text-sm"

  function renderTable() {
    if (!data) return <div className="p-6 text-sm text-gray-400">Click &quot;Run Report&quot; to load data.</div>

    if (tab === 'sales' || tab === 'orders') {
      const orders = data as Order[]
      if (orders.length === 0) return <div className="p-6 text-sm text-gray-400">No orders found for this period.</div>
      const byCurrency: Record<string, number> = {}
      orders.forEach(o => { byCurrency[o.currency] = (byCurrency[o.currency] ?? 0) + o.total_amount })
      return (
        <>
          <table className="w-full text-sm">
            <thead><tr style={{ background: '#c0694a', color: '#fff' }}>
              <th className={thClass}>Order ID</th><th className={thClass}>Date</th>
              <th className={thClass}>Customer</th>
              {tab === 'orders' && <th className={thClass}>Status</th>}
              <th className={thClass}>Items</th><th className={thClass}>Total</th>
            </tr></thead>
            <tbody>
              {orders.map((o, i) => (
                <tr key={o.order_id} style={i % 2 === 1 ? { background: '#fdf3ef' } : {}}>
                  <td className={tdClass}>{o.order_id.slice(0, 8)}</td>
                  <td className={tdClass}>{o.created_at.slice(0, 10)}</td>
                  <td className={tdClass}>{o.customer_name}</td>
                  {tab === 'orders' && <td className={tdClass} style={{ color: STATUS_COLORS[o.status], fontWeight: 600 }}>{o.status}</td>}
                  <td className={tdClass}>{o.items.length} item{o.items.length !== 1 ? 's' : ''}</td>
                  <td className={tdClass}>{o.total_amount.toFixed(2)} {o.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 text-right font-bold text-sm" style={{ color: '#1a1a2e' }}>
            {tab === 'orders'
              ? `Total: ${orders.length} orders`
              : `Revenue: ${Object.entries(byCurrency).map(([c, v]) => `${v.toFixed(2)} ${c}`).join(' | ')}`}
          </div>
        </>
      )
    }

    if (tab === 'expenses') {
      const expenses = data as Expense[]
      if (expenses.length === 0) return <div className="p-6 text-sm text-gray-400">No expenses found for this period.</div>
      const totalPLN = expenses.filter(e => e.currency === 'PLN').reduce((s, e) => s + e.amount, 0)
      const totalEUR = expenses.filter(e => e.currency === 'EUR').reduce((s, e) => s + e.amount, 0)
      return (
        <>
          <table className="w-full text-sm">
            <thead><tr style={{ background: '#c0694a', color: '#fff' }}>
              <th className={thClass}>Date</th><th className={thClass}>Category</th>
              <th className={thClass}>Amount</th><th className={thClass}>Currency</th><th className={thClass}>Notes</th>
            </tr></thead>
            <tbody>
              {expenses.map((e, i) => (
                <tr key={e.expense_id} style={i % 2 === 1 ? { background: '#fdf3ef' } : {}}>
                  <td className={tdClass}>{e.date}</td><td className={tdClass}>{e.category}</td>
                  <td className={tdClass}>{e.amount.toFixed(2)}</td><td className={tdClass}>{e.currency}</td>
                  <td className={tdClass} style={{ color: '#888' }}>{e.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 text-right font-bold text-sm" style={{ color: '#1a1a2e' }}>
            {totalPLN > 0 && `PLN: ${totalPLN.toFixed(2)} zł  `}{totalEUR > 0 && `EUR: ${totalEUR.toFixed(2)} €`}
          </div>
        </>
      )
    }

    if (tab === 'inventory') {
      const products = data as InventoryItem[]
      return (
        <table className="w-full text-sm">
          <thead><tr style={{ background: '#c0694a', color: '#fff' }}>
            <th className={thClass}>Article</th><th className={thClass}>Size (cm)</th><th className={thClass}>GSM</th>
            <th className={thClass}>Total Qty</th><th className={thClass}>Reserved</th><th className={thClass}>Available</th><th className={thClass}>Price (USD)</th>
          </tr></thead>
          <tbody>
            {products.map((p, i) => (
              <tr key={`${p.article}-${p.size_cm}-${p.gsm}`} style={i % 2 === 1 ? { background: '#fdf3ef' } : {}}>
                <td className={tdClass}>{p.article}</td><td className={tdClass}>{p.size_cm}</td><td className={tdClass}>{p.gsm}</td>
                <td className={tdClass}>{p.qty_total.toLocaleString()}</td>
                <td className={tdClass}>{(p.qty_total - (p.available ?? p.qty_total)).toLocaleString()}</td>
                <td className={tdClass}>{(p.available ?? p.qty_total).toLocaleString()}</td>
                <td className={tdClass}>${p.price_usd.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    }

    if (tab === 'pnl') {
      const rows = data as PnlRow[]
      if (rows.length === 0) return <div className="p-6 text-sm text-gray-400">No data found for this period.</div>
      const totRevUSD = rows.reduce((s, r) => s + r.revenueUSD, 0)
      const totRevEUR = rows.reduce((s, r) => s + r.revenueEUR, 0)
      const totExpPLN = rows.reduce((s, r) => s + r.expensesPLN, 0)
      const totExpEUR = rows.reduce((s, r) => s + r.expensesEUR, 0)
      const netEUR = Math.round((totRevEUR - totExpEUR) * 100) / 100
      return (
        <>
          <table className="w-full text-sm">
            <thead><tr style={{ background: '#c0694a', color: '#fff' }}>
              <th className={thClass}>Month</th><th className={thClass}>Revenue USD</th><th className={thClass}>Revenue EUR</th>
              <th className={thClass}>Revenue PLN</th><th className={thClass}>Expenses PLN</th><th className={thClass}>Expenses EUR</th>
              <th className={thClass}>Net EUR</th><th className={thClass}>Net PLN</th>
            </tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.month} style={i % 2 === 1 ? { background: '#fdf3ef' } : {}}>
                  <td className={tdClass} style={{ fontWeight: 600 }}>{r.month}</td>
                  <td className={tdClass}>{r.revenueUSD > 0 ? '$' + r.revenueUSD.toFixed(2) : '—'}</td>
                  <td className={tdClass}>{r.revenueEUR > 0 ? '€' + r.revenueEUR.toFixed(2) : '—'}</td>
                  <td className={tdClass}>{r.revenuePLN > 0 ? 'zł' + r.revenuePLN.toFixed(2) : '—'}</td>
                  <td className={tdClass}>{r.expensesPLN > 0 ? 'zł' + r.expensesPLN.toFixed(2) : '—'}</td>
                  <td className={tdClass}>{r.expensesEUR > 0 ? '€' + r.expensesEUR.toFixed(2) : '—'}</td>
                  <td className={tdClass} style={{ fontWeight: 600, color: r.netEUR >= 0 ? '#1a8a1a' : '#c0694a' }}>
                    {r.netEUR !== 0 ? (r.netEUR >= 0 ? '+' : '') + '€' + r.netEUR.toFixed(2) : '—'}
                  </td>
                  <td className={tdClass} style={{ fontWeight: 600, color: r.netPLN >= 0 ? '#1a8a1a' : '#c0694a' }}>
                    {r.netPLN !== 0 ? (r.netPLN >= 0 ? '+' : '') + 'zł' + r.netPLN.toFixed(2) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 text-right font-bold text-sm" style={{ color: '#1a1a2e' }}>
            Revenue: {totRevUSD > 0 ? '$' + totRevUSD.toFixed(2) : ''} {totRevEUR > 0 ? '€' + totRevEUR.toFixed(2) : ''} &nbsp;|&nbsp;
            Expenses: {totExpPLN > 0 ? 'zł' + totExpPLN.toFixed(2) : ''} {totExpEUR > 0 ? '€' + totExpEUR.toFixed(2) : ''} &nbsp;|&nbsp;
            Net EUR: <span style={{ color: netEUR >= 0 ? '#1a8a1a' : '#c0694a' }}>{(netEUR >= 0 ? '+' : '') + '€' + netEUR.toFixed(2)}</span>
          </div>
        </>
      )
    }

    return null
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Reports</h1>

      <div className="flex flex-wrap gap-1 mb-6 border-b border-[#f0e8e4]">
        {TABS.map(t => (
          <button key={t.id} onClick={() => handleTabChange(t.id)}
            className="px-4 py-2 text-sm font-semibold rounded-t transition-colors"
            style={tab === t.id ? { background: '#c0694a', color: '#fff' } : { color: '#555' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex items-end gap-4 mb-6 flex-wrap">
        {tab !== 'inventory' && (
          <>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">From</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#c0694a]" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">To</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)}
                className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#c0694a]" />
            </div>
          </>
        )}
        <button onClick={handleFetch} disabled={loading}
          className="px-4 py-2 text-sm font-semibold rounded text-white"
          style={{ background: '#1a1a2e', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Loading…' : 'Run Report'}
        </button>
        {data && (
          <button onClick={handleExportPdf} disabled={pdfLoading}
            className="px-4 py-2 text-sm font-semibold rounded border"
            style={{ borderColor: '#c0694a', color: '#c0694a', opacity: pdfLoading ? 0.6 : 1 }}>
            {pdfLoading ? 'Generating…' : 'Export PDF'}
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-[#f0e8e4] overflow-x-auto">
        {loading
          ? <div className="p-6 text-sm text-gray-400">Loading…</div>
          : renderTable()}
      </div>
    </div>
  )
}
