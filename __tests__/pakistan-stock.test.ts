import { parsePakistanStockRow } from '@/lib/sheets'

describe('parsePakistanStockRow', () => {
  it('parses all fields correctly', () => {
    const row = [
      'abc-123',
      'Hotel White Towel',
      '50x100',
      '450',
      '0.35',
      '120',
      '2400',
      'available',
      '2026-07-12T10:00:00Z',
    ]
    expect(parsePakistanStockRow(row)).toEqual({
      item_id: 'abc-123',
      article: 'Hotel White Towel',
      size_cm: '50x100',
      gsm: 450,
      wt_pc: 0.35,
      cartons: 120,
      qty_total: 2400,
      status: 'available',
      created_at: '2026-07-12T10:00:00Z',
    })
  })

  it('parses out_of_stock status', () => {
    const row = ['xyz', 'Bath Sheet', '70x140', '500', '0.6', '80', '0', 'out_of_stock', '2026-07-12T11:00:00Z']
    expect(parsePakistanStockRow(row).status).toBe('out_of_stock')
    expect(parsePakistanStockRow(row).qty_total).toBe(0)
  })
})
