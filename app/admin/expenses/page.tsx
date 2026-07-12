'use client'
import { useCallback, useEffect, useState } from 'react'
import ExpenseForm from '@/components/ExpenseForm'
import type { Expense } from '@/types'

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  const fetchExpenses = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/expenses')
    const data = await res.json()
    setExpenses(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchExpenses() }, [fetchExpenses])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Expenses</h1>
      <ExpenseForm onAdded={fetchExpenses} />
      {loading ? (
        <div className="text-sm text-gray-400">Loading…</div>
      ) : expenses.length === 0 ? (
        <div className="text-sm text-gray-400">No expenses recorded yet.</div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-[#f0e8e4] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#c0694a', color: '#fff' }}>
                <th className="px-4 py-3 text-left font-semibold">Date</th>
                <th className="px-4 py-3 text-left font-semibold">Category</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                <th className="px-4 py-3 text-left font-semibold">Currency</th>
                <th className="px-4 py-3 text-left font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e, i) => (
                <tr key={e.expense_id} style={i % 2 === 1 ? { background: '#fdf3ef' } : {}}>
                  <td className="px-4 py-3">{e.date}</td>
                  <td className="px-4 py-3">{e.category}</td>
                  <td className="px-4 py-3 text-right font-semibold">{e.amount.toFixed(2)}</td>
                  <td className="px-4 py-3">{e.currency}</td>
                  <td className="px-4 py-3 text-gray-500">{e.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
