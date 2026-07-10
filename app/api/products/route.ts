import { NextResponse } from 'next/server'
import { readProducts, readReserved } from '@/lib/sheets'
import { calculateAvailable } from '@/lib/stock'

export const revalidate = 60

export async function GET() {
  try {
    const [products, reserved] = await Promise.all([readProducts(), readReserved()])
    const withAvailable = calculateAvailable(products, reserved)
    return NextResponse.json(withAvailable)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}
