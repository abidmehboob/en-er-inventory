import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readOrders, readExpenses, readProducts, readReserved } from '@/lib/sheets'
import { calculateAvailable } from '@/lib/stock'
import { filterByDateRange, calcPnlRows } from '@/lib/reportHelpers'
import {
  buildSalesReportHTML, buildOrdersReportHTML, buildExpensesReportHTML,
  buildInventoryReportHTML, buildPnlReportHTML, generateReportPDF,
} from '@/lib/reportPdf'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, from, to } = await req.json() as { type: string; from?: string; to?: string }

  let html = ''

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
    html = buildSalesReportHTML(filtered, from, to)
  } else if (type === 'orders') {
    const orders = await readOrders()
    const filtered = orders.filter(o => {
      const d = o.created_at.slice(0, 10)
      if (from && d < from) return false
      if (to && d > to) return false
      return true
    })
    html = buildOrdersReportHTML(filtered, from, to)
  } else if (type === 'expenses') {
    const expenses = await readExpenses()
    html = buildExpensesReportHTML(filterByDateRange(expenses, from, to), from, to)
  } else if (type === 'inventory') {
    const [products, reserved] = await Promise.all([readProducts(), readReserved()])
    html = buildInventoryReportHTML(calculateAvailable(products, reserved))
  } else if (type === 'pnl') {
    const [orders, expenses] = await Promise.all([readOrders(), readExpenses()])
    const filteredOrders = orders.filter(o => {
      const d = o.created_at.slice(0, 10)
      if (from && d < from) return false
      if (to && d > to) return false
      return true
    })
    const pnlRows = calcPnlRows(filteredOrders, filterByDateRange(expenses, from, to))
    html = buildPnlReportHTML(pnlRows, from, to)
  } else {
    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
  }

  const pdf = await generateReportPDF(html)
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${type}-report.pdf"`,
    },
  })
}
