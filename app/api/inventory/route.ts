import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readProducts, updateProductQty } from '@/lib/sheets'

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { article, size_cm, gsm, qty_total } = await req.json() as {
    article: string; size_cm: string; gsm: number; qty_total: number
  }

  const products = await readProducts()
  const product = products.find(p => p.article === article && p.size_cm === size_cm && p.gsm === gsm)
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  await updateProductQty(article, size_cm, gsm, qty_total, product.version + 1)
  return NextResponse.json({ success: true })
}
