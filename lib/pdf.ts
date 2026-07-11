import type { Order } from '@/types'

const SYMBOL: Record<string, string> = { USD: '$', EUR: '€', PLN: 'zł', GBP: '£' }

export function buildQuotationHTML(order: Order): string {
  const sym = SYMBOL[order.currency] ?? '$'
  const rows = order.items.map(item => `
    <tr>
      <td>${item.article}</td>
      <td>${item.size_cm}</td>
      <td>${item.gsm}</td>
      <td>${item.qty.toLocaleString()}</td>
      <td>${sym}${item.price_display.toFixed(2)}</td>
      <td>${sym}${(item.price_display * item.qty).toFixed(2)}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1a1a1a; background: #fff; }
  .logo { display: flex; align-items: center; gap: 0; margin-bottom: 4px; }
  .logo-en { background: #c0694a; color: #fff; font-weight: 800; font-size: 20px; padding: 4px 9px; letter-spacing: 1px; }
  .logo-er { background: #1a1a2e; color: #fff; font-weight: 800; font-size: 20px; padding: 4px 9px; letter-spacing: 1px; }
  .logo-text { color: #1a1a2e; font-weight: 700; font-size: 14px; margin-left: 10px; letter-spacing: 0.5px; }
  h1 { color: #1a1a2e; margin-bottom: 4px; font-size: 22px; }
  .meta { color: #888; font-size: 13px; margin-bottom: 24px; }
  .label { font-weight: 600; }
  hr { border: none; border-top: 1px solid #f0e8e4; margin: 16px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  th { background: #c0694a; color: white; padding: 10px; text-align: left; font-size: 13px; }
  td { padding: 9px 10px; border-bottom: 1px solid #f0e8e4; font-size: 13px; }
  tr:nth-child(even) { background: #fdf3ef; }
  .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; color: #1a1a2e; }
  .footer { margin-top: 40px; font-size: 12px; color: #aaa; border-top: 1px solid #f0e8e4; padding-top: 16px; }
</style>
</head>
<body>
  <div class="logo">
    <span class="logo-en">EN</span><span class="logo-er">ER</span>
    <span class="logo-text">TEXTILE</span>
  </div>
  <div class="meta">Premium Towel Wholesale · info@en-er-textile.pl</div>
  <hr/>
  <p><span class="label">Quotation ID:</span> ${order.order_id}</p>
  <p><span class="label">Date:</span> ${new Date(order.created_at).toLocaleDateString('en-GB')}</p>
  <p><span class="label">Customer:</span> ${order.customer_name}</p>
  <p><span class="label">Contact:</span> ${order.customer_contact}</p>
  <table>
    <thead>
      <tr><th>Article</th><th>Size</th><th>GSM</th><th>Qty (pcs)</th><th>Unit Price</th><th>Total</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="total">Grand Total: ${sym}${order.total_amount.toFixed(2)} ${order.currency}</div>
  <div class="footer">
    This quotation is valid for 7 days. Stock is reserved upon confirmation.<br/>
    EN-ER Textile · info@en-er-textile.pl
  </div>
</body>
</html>`
}

export async function generateQuotationPDF(order: Order): Promise<Buffer> {
  const puppeteer = await import('puppeteer')
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  try {
    const page = await browser.newPage()
    await page.setContent(buildQuotationHTML(order), { waitUntil: 'load' })
    const pdf = await page.pdf({ format: 'A4', margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}
