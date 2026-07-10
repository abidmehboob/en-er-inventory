import { calculateAvailable } from '@/lib/stock'
import type { Product, ReservedRow } from '@/types'

const baseProduct: Product = {
  article: 'BATH TOWEL', size_cm: '70x140', gsm: 460, wt_pc: 451, cartons: 46,
  qty_total: 1840, price_usd: 3.12, version: 1, min_sale_usd: 2.50,
}

describe('calculateAvailable', () => {
  it('returns qty_total as available when nothing reserved', () => {
    const result = calculateAvailable([baseProduct], [])
    expect(result[0].available).toBe(1840)
  })

  it('subtracts reserved qty for matching key', () => {
    const reserved: ReservedRow[] = [
      { article_size_key: 'BATH_TOWEL_70x140_460', reserved_qty: 200, order_id: 'ord-1' },
    ]
    const result = calculateAvailable([baseProduct], reserved)
    expect(result[0].available).toBe(1640)
  })

  it('sums multiple reservations for same product', () => {
    const reserved: ReservedRow[] = [
      { article_size_key: 'BATH_TOWEL_70x140_460', reserved_qty: 100, order_id: 'ord-1' },
      { article_size_key: 'BATH_TOWEL_70x140_460', reserved_qty: 150, order_id: 'ord-2' },
    ]
    const result = calculateAvailable([baseProduct], reserved)
    expect(result[0].available).toBe(1590)
  })

  it('never returns negative available', () => {
    const reserved: ReservedRow[] = [
      { article_size_key: 'BATH_TOWEL_70x140_460', reserved_qty: 9999, order_id: 'ord-1' },
    ]
    const result = calculateAvailable([baseProduct], reserved)
    expect(result[0].available).toBe(0)
  })

  it('does not affect other products', () => {
    const products: Product[] = [
      baseProduct,
      { ...baseProduct, article: 'HAND TOWEL', size_cm: '50x100', gsm: 460, qty_total: 500 },
    ]
    const reserved: ReservedRow[] = [
      { article_size_key: 'BATH_TOWEL_70x140_460', reserved_qty: 200, order_id: 'ord-1' },
    ]
    const result = calculateAvailable(products, reserved)
    expect(result[0].available).toBe(1640)
    expect(result[1].available).toBe(500)
  })
})
