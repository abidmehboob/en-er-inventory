'use client'
import { useState } from 'react'
import type { ExpenseCategory, ExpenseCurrency } from '@/types'

const CATEGORIES: ExpenseCategory[] = ['Rent', 'Shipping', 'Utilities', 'Salaries', 'Other']

export default function ExpenseForm({ onAdded }: { onAdded: () => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [category, setCategory] = useState<ExpenseCategory>('Rent')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<ExpenseCurrency>('PLN')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!date || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Please enter a valid date and positive amount.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, category, amount: Number(amount), currency, notes }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to add expense')
        return
      }
      setAmount('')
      setNotes('')
      setDate(today)
      onAdded()
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "border rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#c0694a]"
  const labelClass = "text-xs font-semibold text-gray-600 mb-1 block"

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-[#f0e8e4] p-6 mb-8">
      <h2 className="text-lg font-bold mb-4" style={{ color: '#1a1a2e' }}>Add Expense</h2>
      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div>
          <label className={labelClass}>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} required />
        </div>
        <div>
          <label className={labelClass}>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)} className={inputClass}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Amount</label>
          <input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={inputClass} placeholder="0.00" required />
        </div>
        <div>
          <label className={labelClass}>Currency</label>
          <div className="flex gap-2 mt-1">
            {(['PLN', 'EUR'] as ExpenseCurrency[]).map(c => (
              <button key={c} type="button" onClick={() => setCurrency(c)}
                className="flex-1 py-2 text-sm font-semibold rounded border transition-colors"
                style={currency === c ? { background: '#c0694a', color: '#fff', borderColor: '#c0694a' } : { background: '#fff', color: '#333', borderColor: '#ddd' }}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4">
        <label className={labelClass}>Notes (optional)</label>
        <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className={inputClass} placeholder="e.g. Office rent July" />
      </div>
      <button type="submit" disabled={loading}
        className="mt-4 px-6 py-2 text-sm font-semibold rounded text-white transition-opacity"
        style={{ background: '#c0694a', opacity: loading ? 0.6 : 1 }}>
        {loading ? 'Adding…' : 'Add Expense'}
      </button>
    </form>
  )
}
