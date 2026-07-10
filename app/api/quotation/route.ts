import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { withLock } from '@/lib/lock'
import { readProducts, readReserved, appendOrderRow, appendReservedRows, makeProductKey } from '@/lib/sheets'
import { calculateAvailable } from '@/lib/stock'
import { fetchRates, convert } from '@/lib/currency'
import { v4 as uuidv4 } from 'uuid'
import type { LineItem, Currency } from '@/types'

interface QuotationRequest {
  customer_name: string
  customer_contact: string
  currency: Currency
  items: Array<{ article: string; size_cm: string; gsm: number; qty: number; price_usd: number }>
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as QuotationRequest

  try {
    const order_id = await withLock(async () => {
      const [products, reserved, rates] = await Promise.all([
        readProducts(), readReserved(), fetchRates(),
      ])
      const available = calculateAvailable(products, reserved)

      for (const item of body.items) {
        const product = available.find(
          p => p.article === item.article && p.size_cm === item.size_cm && p.gsm === item.gsm
        )
        if (!product) throw new Error(`Product not found: ${item.article} ${item.size_cm}`)
        if ((product.available ?? 0) < item.qty) {
          throw new Error(`Insufficient stock for ${item.article} ${item.size_cm}: available ${product.available}, requested ${item.qty}`)
        }
        if (item.price_usd < product.min_sale_usd) {
          throw new Error(`Price $${item.price_usd} is below minimum $${product.min_sale_usd} for ${item.article}`)
        }
      }

      const lineItems: LineItem[] = body.items.map(item => ({
        article: item.article,
        size_cm: item.size_cm,
        gsm: item.gsm,
        qty: item.qty,
        price_usd: item.price_usd,
        price_display: convert(item.price_usd, 'USD', body.currency, rates),
      }))

      const total_amount = lineItems.reduce((sum, i) => sum + i.price_display * i.qty, 0)
      const id = uuidv4()

      await appendOrderRow({
        order_id: id,
        created_at: new Date().toISOString(),
        customer_name: body.customer_name,
        customer_contact: body.customer_contact,
        status: 'reserved',
        currency: body.currency,
        items: lineItems,
        total_amount: Math.round(total_amount * 100) / 100,
        confirmed_at: null,
      })

      await appendReservedRows(body.items.map(item => ({
        article_size_key: makeProductKey(item.article, item.size_cm, item.gsm),
        reserved_qty: item.qty,
        order_id: id,
      })))

      return id
    })

    return NextResponse.json({ order_id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create quotation'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
