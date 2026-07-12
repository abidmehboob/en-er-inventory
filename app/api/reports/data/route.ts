import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readOrders, readExpenses, readProducts, readReserved } from '@/lib/sheets'
import { calculateAvailable } from '@/lib/stock'
import { filterByDateRange, calcPnlRows } from '@/lib/reportHelpers'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'sales'
  const from = searchParams.get('from') ?? undefined
  const to = searchParams.get('to') ?? undefined

  if (type === 'sales') {
    const orders = await readOrders()
    const filtered = orders
      .filter(o => o.status === 'confirmed' || o.status === 'shipped')
      .filter(o => {
        const d = o.created_at.slice(0, 10)
        if (from && d < from) return false
        if (to && d > to) return false
        return true
      })
    return NextResponse.json(filtered)
  }

  if (type === 'orders') {
    const orders = await readOrders()
    const filtered = orders.filter(o => {
      const d = o.created_at.slice(0, 10)
      if (from && d < from) return false
      if (to && d > to) return false
      return true
    })
    return NextResponse.json(filtered)
  }

  if (type === 'expenses') {
    const expenses = await readExpenses()
    const filtered = filterByDateRange(expenses, from, to)
    return NextResponse.json(filtered)
  }

  if (type === 'inventory') {
    const [products, reserved] = await Promise.all([readProducts(), readReserved()])
    const withAvailable = calculateAvailable(products, reserved)
    return NextResponse.json(withAvailable)
  }

  if (type === 'pnl') {
    const [orders, expenses] = await Promise.all([readOrders(), readExpenses()])
    const filteredOrders = orders.filter(o => {
      const d = o.created_at.slice(0, 10)
      if (from && d < from) return false
      if (to && d > to) return false
      return true
    })
    const filteredExpenses = filterByDateRange(expenses, from, to)
    const rows = calcPnlRows(filteredOrders, filteredExpenses)
    return NextResponse.json(rows)
  }

  return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
}
