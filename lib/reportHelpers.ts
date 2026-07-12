import type { Order, Expense } from '@/types'

export interface PnlRow {
  month: string
  revenueUSD: number
  revenueEUR: number
  revenuePLN: number
  expensesPLN: number
  expensesEUR: number
  netUSD: number
  netEUR: number
  netPLN: number
}

export function filterByDateRange<T extends { date: string }>(
  items: T[],
  from: string | undefined,
  to: string | undefined
): T[] {
  return items.filter(item => {
    if (from && item.date < from) return false
    if (to && item.date > to) return false
    return true
  })
}

export function orderDateToYYYYMM(isoDatetime: string): string {
  return isoDatetime.slice(0, 7)
}

export function calcPnlRows(orders: Order[], expenses: Expense[]): PnlRow[] {
  const months = new Set<string>()
  const salesOrders = orders.filter(o => o.status === 'confirmed' || o.status === 'shipped')
  salesOrders.forEach(o => months.add(orderDateToYYYYMM(o.created_at)))
  expenses.forEach(e => months.add(e.date.slice(0, 7)))

  return Array.from(months).sort().map(month => {
    const monthOrders = salesOrders.filter(o => orderDateToYYYYMM(o.created_at) === month)
    const monthExpenses = expenses.filter(e => e.date.slice(0, 7) === month)

    const revenueUSD = monthOrders.filter(o => o.currency === 'USD').reduce((s, o) => s + o.total_amount, 0)
    const revenueEUR = monthOrders.filter(o => o.currency === 'EUR').reduce((s, o) => s + o.total_amount, 0)
    const revenuePLN = monthOrders.filter(o => o.currency === 'PLN').reduce((s, o) => s + o.total_amount, 0)
    const expensesPLN = monthExpenses.filter(e => e.currency === 'PLN').reduce((s, e) => s + e.amount, 0)
    const expensesEUR = monthExpenses.filter(e => e.currency === 'EUR').reduce((s, e) => s + e.amount, 0)

    return {
      month,
      revenueUSD,
      revenueEUR,
      revenuePLN,
      expensesPLN,
      expensesEUR,
      netUSD: revenueUSD,
      netEUR: Math.round((revenueEUR - expensesEUR) * 100) / 100,
      netPLN: Math.round((revenuePLN - expensesPLN) * 100) / 100,
    }
  })
}
