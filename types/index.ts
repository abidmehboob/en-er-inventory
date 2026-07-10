export type Currency = 'USD' | 'EUR' | 'PLN' | 'GBP'

export interface Product {
  article: string        // e.g. "HAND TOWEL"
  size_cm: string        // e.g. "50x100"
  gsm: number
  wt_pc: number
  cartons: number
  qty_total: number
  price_usd: number
  version: number
  min_sale_usd: number
  available?: number     // computed: qty_total - reserved
}

export interface LineItem {
  article: string
  size_cm: string
  gsm: number
  qty: number
  price_usd: number
  price_display: number  // in selected currency
}

export interface Order {
  order_id: string
  created_at: string
  customer_name: string
  customer_contact: string
  status: 'draft' | 'reserved' | 'confirmed' | 'shipped' | 'cancelled'
  currency: Currency
  items: LineItem[]
  total_amount: number
  confirmed_at: string | null
}

export interface ReservedRow {
  article_size_key: string  // e.g. "HAND_TOWEL_50x100_460"
  reserved_qty: number
  order_id: string
}

export interface ExchangeRates {
  base: 'USD'
  rates: Record<Currency, number>
  fetched_at: number
}
