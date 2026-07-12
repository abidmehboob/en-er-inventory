jest.mock('googleapis', () => ({
  google: {
    auth: { GoogleAuth: jest.fn() },
    sheets: jest.fn(() => ({
      spreadsheets: {
        values: {
          get: jest.fn(),
          update: jest.fn(),
          append: jest.fn(),
        },
      },
    })),
  },
}))

import { parseProductRow, parseOrderRow, makeProductKey, parsePakistanStockFileRow } from '@/lib/sheets'

describe('parseProductRow', () => {
  it('maps a raw Sheets row array to a Product', () => {
    const row = ['HAND TOWEL', '50x100', '460', '230', '23', '1840', '1.80', '1', '1.60']
    const product = parseProductRow(row)
    expect(product.article).toBe('HAND TOWEL')
    expect(product.size_cm).toBe('50x100')
    expect(product.gsm).toBe(460)
    expect(product.qty_total).toBe(1840)
    expect(product.price_usd).toBe(1.80)
    expect(product.version).toBe(1)
    expect(product.min_sale_usd).toBe(1.60)
  })
})

describe('makeProductKey', () => {
  it('creates a consistent key from article, size, gsm', () => {
    expect(makeProductKey('HAND TOWEL', '50x100', 460)).toBe('HAND_TOWEL_50x100_460')
  })
  it('replaces spaces with underscores in article', () => {
    expect(makeProductKey('BATH SHEET', '100x150', 500)).toBe('BATH_SHEET_100x150_500')
  })
})

describe('parseOrderRow', () => {
  it('parses an order row correctly', () => {
    const row = ['ord-1', '2026-07-10T00:00:00Z', 'John', 'john@test.com', 'reserved', 'USD', '[]', '100', '']
    const order = parseOrderRow(row)
    expect(order.order_id).toBe('ord-1')
    expect(order.status).toBe('reserved')
    expect(order.items).toEqual([])
    expect(order.confirmed_at).toBeNull()
  })
})

describe('parsePakistanStockFileRow', () => {
  it('maps a raw Sheets row to a PakistanStockFile', () => {
    const row = [
      'file-uuid-1',
      'July 2026 Price List',
      'Full price sheet for July',
      'price_list_july.pdf',
      'file-uuid-1.pdf',
      'application/pdf',
      '2026-07-12T10:00:00.000Z',
    ]
    const file = parsePakistanStockFileRow(row)
    expect(file.file_id).toBe('file-uuid-1')
    expect(file.display_name).toBe('July 2026 Price List')
    expect(file.description).toBe('Full price sheet for July')
    expect(file.original_filename).toBe('price_list_july.pdf')
    expect(file.stored_filename).toBe('file-uuid-1.pdf')
    expect(file.mime_type).toBe('application/pdf')
    expect(file.uploaded_at).toBe('2026-07-12T10:00:00.000Z')
  })
})
