import { parseExpenseRow } from '@/lib/sheets'

describe('parseExpenseRow', () => {
  it('parses a full expense row', () => {
    const row = ['exp-1', '2026-07-12', 'Rent', '1500.50', 'PLN', 'Office July', '2026-07-12T10:00:00Z']
    expect(parseExpenseRow(row)).toEqual({
      expense_id: 'exp-1', date: '2026-07-12', category: 'Rent',
      amount: 1500.50, currency: 'PLN', notes: 'Office July', created_at: '2026-07-12T10:00:00Z',
    })
  })
  it('handles missing notes', () => {
    const row = ['exp-2', '2026-07-01', 'Shipping', '200', 'EUR', '', '2026-07-01T08:00:00Z']
    const result = parseExpenseRow(row)
    expect(result.notes).toBe('')
    expect(result.amount).toBe(200)
  })
})
