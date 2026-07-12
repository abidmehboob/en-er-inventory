import type { Order, Expense } from '@/types'
import type { PnlRow } from '@/lib/reportHelpers'

const HEADER = `
  <div class="logo">
    <span class="logo-en">EN</span><span class="logo-er">ER</span>
    <span class="logo-text">TEXTILE</span>
  </div>
  <div class="meta">Premium Towel Wholesale · info@en-er-textile.pl</div>
  <hr/>
`

const BASE_STYLES = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1a1a1a; background: #fff; }
  .logo { display: flex; align-items: center; gap: 0; margin-bottom: 4px; }
  .logo-en { background: #c0694a; color: #fff; font-weight: 800; font-size: 20px; padding: 4px 9px; letter-spacing: 1px; }
  .logo-er { background: #1a1a2e; color: #fff; font-weight: 800; font-size: 20px; padding: 4px 9px; letter-spacing: 1px; }
  .logo-text { color: #1a1a2e; font-weight: 700; font-size: 14px; margin-left: 10px; letter-spacing: 0.5px; }
  h1 { color: #1a1a2e; margin-bottom: 4px; font-size: 22px; }
  .meta { color: #888; font-size: 13px; margin-bottom: 24px; }
  hr { border: none; border-top: 1px solid #f0e8e4; margin: 16px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  th { background: #c0694a; color: white; padding: 10px; text-align: left; font-size: 13px; }
  td { padding: 9px 10px; border-bottom: 1px solid #f0e8e4; font-size: 13px; }
  tr:nth-child(even) td { background: #fdf3ef; }
  .summary { text-align: right; font-size: 15px; font-weight: bold; margin-top: 20px; color: #1a1a2e; }
  .footer { margin-top: 40px; font-size: 12px; color: #aaa; border-top: 1px solid #f0e8e4; padding-top: 16px; }
  .range { font-size: 13px; color: #666; margin-bottom: 16px; }
`

function wrap(title: string, range: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${BASE_STYLES}</style></head><body>
  ${HEADER}
  <h1>${title}</h1>
  ${range ? `<div class="range">${range}</div>` : ''}
  ${body}
  <div class="footer">EN-ER Textile · info@en-er-textile.pl · Generated ${new Date().toLocaleDateString('en-GB')}</div>
  </body></html>`
}

function rangeLabel(from?: string, to?: string): string {
  if (!from && !to) return ''
  if (from && to) return `Period: ${from} to ${to}`
  if (from) return `From: ${from}`
  return `To: ${to!}`
}

export function buildSalesReportHTML(orders: Order[], from?: string, to?: string): string {
  const rows = orders.map(o => {
    const itemCount = o.items.length
    return `<tr>
      <td>${o.order_id.slice(0, 8)}</td>
      <td>${o.created_at.slice(0, 10)}</td>
      <td>${o.customer_name}</td>
      <td>${itemCount} item${itemCount !== 1 ? 's' : ''}</td>
      <td>${o.status}</td>
      <td>${o.total_amount.toFixed(2)} ${o.currency}</td>
    </tr>`
  }).join('')

  const byCurrency: Record<string, number> = {}
  orders.forEach(o => { byCurrency[o.currency] = (byCurrency[o.currency] ?? 0) + o.total_amount })
  const totals = Object.entries(byCurrency).map(([c, v]) => `${v.toFixed(2)} ${c}`).join(' | ')

  const body = `
    <table>
      <thead><tr><th>Order ID</th><th>Date</th><th>Customer</th><th>Items</th><th>Status</th><th>Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="summary">Total Revenue: ${totals || '—'}</div>`
  return wrap('Sales Report', rangeLabel(from, to), body)
}

export function buildOrdersReportHTML(orders: Order[], from?: string, to?: string): string {
  const STATUS_COLORS: Record<string, string> = {
    draft: '#888', reserved: '#c0694a', confirmed: '#1a8a1a', shipped: '#1a1a2e', cancelled: '#aaa',
  }
  const rows = orders.map(o => `<tr>
    <td>${o.order_id.slice(0, 8)}</td>
    <td>${o.created_at.slice(0, 10)}</td>
    <td>${o.customer_name}</td>
    <td style="color:${STATUS_COLORS[o.status] ?? '#333'};font-weight:600">${o.status}</td>
    <td>${o.total_amount.toFixed(2)} ${o.currency}</td>
  </tr>`).join('')

  const statusCounts: Record<string, number> = {}
  orders.forEach(o => { statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1 })
  const summary = Object.entries(statusCounts).map(([s, c]) => `${s}: ${c}`).join(' · ')

  const body = `
    <table>
      <thead><tr><th>Order ID</th><th>Date</th><th>Customer</th><th>Status</th><th>Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="summary">Total Orders: ${orders.length} &nbsp;|&nbsp; ${summary}</div>`
  return wrap('Orders Report', rangeLabel(from, to), body)
}

export function buildExpensesReportHTML(expenses: Expense[], from?: string, to?: string): string {
  const rows = expenses.map(e => `<tr>
    <td>${e.date}</td>
    <td>${e.category}</td>
    <td>${e.amount.toFixed(2)}</td>
    <td>${e.currency}</td>
    <td>${e.notes}</td>
  </tr>`).join('')

  const totalPLN = expenses.filter(e => e.currency === 'PLN').reduce((s, e) => s + e.amount, 0)
  const totalEUR = expenses.filter(e => e.currency === 'EUR').reduce((s, e) => s + e.amount, 0)

  const body = `
    <table>
      <thead><tr><th>Date</th><th>Category</th><th>Amount</th><th>Currency</th><th>Notes</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="summary">
      ${totalPLN > 0 ? `Total PLN: ${totalPLN.toFixed(2)} zł &nbsp; ` : ''}
      ${totalEUR > 0 ? `Total EUR: ${totalEUR.toFixed(2)} €` : ''}
    </div>`
  return wrap('Expenses Report', rangeLabel(from, to), body)
}

export function buildInventoryReportHTML(products: Array<{ article: string; size_cm: string; gsm: number; qty_total: number; available?: number; price_usd: number }>): string {
  const rows = products.map(p => `<tr>
    <td>${p.article}</td>
    <td>${p.size_cm}</td>
    <td>${p.gsm}</td>
    <td>${p.qty_total.toLocaleString()}</td>
    <td>${(p.qty_total - (p.available ?? p.qty_total)).toLocaleString()}</td>
    <td>${(p.available ?? p.qty_total).toLocaleString()}</td>
    <td>$${p.price_usd.toFixed(2)}</td>
  </tr>`).join('')

  const body = `
    <table>
      <thead><tr><th>Article</th><th>Size (cm)</th><th>GSM</th><th>Total Qty</th><th>Reserved</th><th>Available</th><th>Price (USD)</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`
  return wrap('Inventory Report', 'Current stock snapshot', body)
}

export function buildPnlReportHTML(rows: PnlRow[], from?: string, to?: string): string {
  const tableRows = rows.map(r => `<tr>
    <td>${r.month}</td>
    <td>${r.revenueUSD > 0 ? '$' + r.revenueUSD.toFixed(2) : '—'}</td>
    <td>${r.revenueEUR > 0 ? '€' + r.revenueEUR.toFixed(2) : '—'}</td>
    <td>${r.revenuePLN > 0 ? 'zł' + r.revenuePLN.toFixed(2) : '—'}</td>
    <td>${r.expensesPLN > 0 ? 'zł' + r.expensesPLN.toFixed(2) : '—'}</td>
    <td>${r.expensesEUR > 0 ? '€' + r.expensesEUR.toFixed(2) : '—'}</td>
    <td style="font-weight:600;color:${r.netEUR >= 0 ? '#1a8a1a' : '#c0694a'}">${r.netEUR !== 0 ? (r.netEUR >= 0 ? '+' : '') + '€' + r.netEUR.toFixed(2) : '—'}</td>
    <td style="font-weight:600;color:${r.netPLN >= 0 ? '#1a8a1a' : '#c0694a'}">${r.netPLN !== 0 ? (r.netPLN >= 0 ? '+' : '') + 'zł' + r.netPLN.toFixed(2) : '—'}</td>
  </tr>`).join('')

  const totRevUSD = rows.reduce((s, r) => s + r.revenueUSD, 0)
  const totRevEUR = rows.reduce((s, r) => s + r.revenueEUR, 0)
  const totExpPLN = rows.reduce((s, r) => s + r.expensesPLN, 0)
  const totExpEUR = rows.reduce((s, r) => s + r.expensesEUR, 0)
  const netEUR = Math.round((totRevEUR - totExpEUR) * 100) / 100

  const body = `
    <table>
      <thead><tr><th>Month</th><th>Revenue USD</th><th>Revenue EUR</th><th>Revenue PLN</th><th>Expenses PLN</th><th>Expenses EUR</th><th>Net EUR</th><th>Net PLN</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
    <div class="summary">
      Total Revenue: ${totRevUSD > 0 ? '$' + totRevUSD.toFixed(2) : ''} ${totRevEUR > 0 ? '€' + totRevEUR.toFixed(2) : ''}<br/>
      Total Expenses: ${totExpPLN > 0 ? 'zł' + totExpPLN.toFixed(2) : ''} ${totExpEUR > 0 ? '€' + totExpEUR.toFixed(2) : ''}<br/>
      Net EUR: <span style="color:${netEUR >= 0 ? '#1a8a1a' : '#c0694a'}">${(netEUR >= 0 ? '+' : '') + '€' + netEUR.toFixed(2)}</span>
    </div>`
  return wrap('Profit & Loss Report', rangeLabel(from, to), body)
}

export async function generateReportPDF(html: string): Promise<Buffer> {
  const puppeteer = await import('puppeteer')
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load' })
    const pdf = await page.pdf({ format: 'A4', margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}
