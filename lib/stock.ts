import { makeProductKey } from '@/lib/sheets'
import type { Product, ReservedRow } from '@/types'

export function calculateAvailable(products: Product[], reserved: ReservedRow[]): Product[] {
  const reservedMap = new Map<string, number>()
  for (const row of reserved) {
    reservedMap.set(row.article_size_key, (reservedMap.get(row.article_size_key) ?? 0) + row.reserved_qty)
  }
  return products.map(p => {
    const key = makeProductKey(p.article, p.size_cm, p.gsm)
    const totalReserved = reservedMap.get(key) ?? 0
    return { ...p, available: Math.max(0, p.qty_total - totalReserved) }
  })
}
