import { NextResponse } from 'next/server'
import { fetchRates } from '@/lib/currency'

export const revalidate = 3600

export async function GET() {
  try {
    const rates = await fetchRates()
    return NextResponse.json(rates)
  } catch {
    return NextResponse.json({ USD: 1, EUR: 0.92, PLN: 4.05, GBP: 0.79 })
  }
}
