import { readOrders } from '@/lib/sheets'
import { notFound } from 'next/navigation'

const SYMBOL: Record<string, string> = { USD: '$', EUR: '€', PLN: 'zł', GBP: '£' }

export const dynamic = 'force-dynamic'

export default async function QuotationViewPage({ params }: { params: { id: string } }) {
  const orders = await readOrders()
  const order = orders.find(o => o.order_id === params.id)
  if (!order) notFound()

  const sym = SYMBOL[order.currency] ?? '$'

  return (
    <div className="min-h-screen py-10 px-4" style={{ background: '#f8f4f2' }}>
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-8" style={{ border: '1px solid #f0e8e4' }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex items-center gap-0">
            <span style={{ background: '#c0694a', color: '#fff', fontWeight: 800, fontSize: 20, padding: '4px 9px', letterSpacing: 1 }}>EN</span>
            <span style={{ background: '#1a1a2e', color: '#fff', fontWeight: 800, fontSize: 20, padding: '4px 9px', letterSpacing: 1 }}>ER</span>
          </div>
          <span className="text-xl font-bold" style={{ color: '#1a1a2e' }}>EN-ER Textile</span>
        </div>
        <p className="mb-6 text-sm" style={{ color: '#888' }}>Premium Towel Wholesale</p>
        <hr style={{ borderColor: '#f0e8e4', marginBottom: '1.5rem' }} />
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div><span className="font-semibold">Quotation ID:</span> {order.order_id}</div>
          <div><span className="font-semibold">Date:</span> {new Date(order.created_at).toLocaleDateString('en-GB')}</div>
          <div><span className="font-semibold">Customer:</span> {order.customer_name}</div>
          <div><span className="font-semibold">Contact:</span> {order.customer_contact}</div>
          <div><span className="font-semibold">Status:</span> <span className="capitalize">{order.status}</span></div>
        </div>
        <table className="w-full text-sm border-collapse mb-6">
          <thead>
            <tr style={{ background: '#c0694a', color: '#fff' }}>
              {['Article', 'Size', 'GSM', 'Qty', 'Unit Price', 'Total'].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fdf3ef' : '#fff' }}>
                <td className="px-4 py-3">{item.article}</td>
                <td className="px-4 py-3">{item.size_cm}</td>
                <td className="px-4 py-3">{item.gsm}</td>
                <td className="px-4 py-3">{item.qty.toLocaleString()}</td>
                <td className="px-4 py-3">{sym}{item.price_display.toFixed(2)}</td>
                <td className="px-4 py-3 font-semibold">{sym}{(item.price_display * item.qty).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-right text-xl font-bold mb-8" style={{ color: '#1a1a2e' }}>
          Grand Total: {sym}{order.total_amount.toFixed(2)} {order.currency}
        </div>
        <p className="text-xs" style={{ color: '#aaa' }}>This quotation is valid for 7 days. Contact: info@en-er-textile.pl</p>
      </div>
    </div>
  )
}
