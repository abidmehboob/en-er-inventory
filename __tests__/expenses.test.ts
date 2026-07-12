import { parseExpenseRow } from '@/lib/sheets'
import { filterByDateRange, calcPnlRows } from '@/lib/reportHelpers'
import type { PnlRow } from '@/lib/reportHelpers'
import type { Order, Expense } from '@/types'

describe('parseExpenseRow', () => {
  it('parses a full expense row', () => {
    const row = ['exp-1', '2026-07-12', 'Rent', '1500.50', 'PLN', 'Office July', '2026-07-12T10:00:00Z']
    const result = parseExpenseRow(row)
    expect(result).toEqual({
      expense_id: 'exp-1',
      date: '2026-07-12',
      category: 'Rent',
      amount: 1500.50,
      currency: 'PLN',
      notes: 'Office July',
      created_at: '2026-07-12T10:00:00Z',
    })
  })

  it('handles missing notes', () => {
    const row = ['exp-2', '2026-07-01', 'Shipping', '200', 'EUR', '', '2026-07-01T08:00:00Z']
    const result = parseExpenseRow(row)
    expect(result.notes).toBe('')
    expect(result.amount).toBe(200)
  })
})

const makeOrder = (overrides: Partial<Order>): Order => ({
  order_id: 'o1',
  created_at: '2026-07-10T10:00:00Z',
  customer_name: 'Test',
  customer_contact: '',
  status: 'confirmed',
  currency: 'USD',
  items: [],
  total_amount: 100,
  confirmed_at: null,
  ...overrides,
})

describe('filterByDateRange', () => {
  const items = [
    { date: '2026-07-01' },
    { date: '2026-07-15' },
    { date: '2026-08-01' },
  ]

  it('includes items within range', () => {
    const result = filterByDateRange(items, '2026-07-01', '2026-07-31')
    expect(result).toHaveLength(2)
  })

  it('is inclusive on both ends', () => {
    const result = filterByDateRange(items, '2026-07-15', '2026-07-15')
    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('2026-07-15')
  })

  it('returns all items when no dates given', () => {
    const result = filterByDateRange(items, undefined, undefined)
    expect(result).toHaveLength(3)
  })
})

describe('calcPnlRows', () => {
  const orders: Order[] = [
    makeOrder({ created_at: '2026-07-05T00:00:00Z', currency: 'USD', total_amount: 500, status: 'confirmed' }),
    makeOrder({ created_at: '2026-07-20T00:00:00Z', currency: 'EUR', total_amount: 300, status: 'shipped' }),
    makeOrder({ created_at: '2026-07-10T00:00:00Z', currency: 'USD', total_amount: 200, status: 'cancelled' }),
  ]
  const expenses: Expense[] = [
    { expense_id: 'e1', date: '2026-07-10', category: 'Rent', amount: 1500, currency: 'PLN', notes: '', created_at: '' },
    { expense_id: 'e2', date: '2026-07-15', category: 'Shipping', amount: 100, currency: 'EUR', notes: '', created_at: '' },
  ]

  it('calculates correct monthly P&L', () => {
    const rows = calcPnlRows(orders, expenses)
    expect(rows).toHaveLength(1)
    const july = rows[0]
    expect(july.month).toBe('2026-07')
    expect(july.revenueUSD).toBe(500)
    expect(july.revenueEUR).toBe(300)
    expect(july.expensesPLN).toBe(1500)
    expect(july.expensesEUR).toBe(100)
    expect(july.netEUR).toBe(200)
  })
})
