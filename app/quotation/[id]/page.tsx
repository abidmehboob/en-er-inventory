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
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold text-blue-700 mb-1">Qaswa Textile</h1>
        <p className="text-gray-500 mb-6">Premium Towel Wholesale</p>
        <hr className="mb-6" />
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div><span className="font-semibold">Quotation ID:</span> {order.order_id}</div>
          <div><span className="font-semibold">Date:</span> {new Date(order.created_at).toLocaleDateString('en-GB')}</div>
          <div><span className="font-semibold">Customer:</span> {order.customer_name}</div>
          <div><span className="font-semibold">Contact:</span> {order.customer_contact}</div>
          <div><span className="font-semibold">Status:</span> <span className="capitalize">{order.status}</span></div>
        </div>
        <table className="w-full text-sm border-collapse mb-6">
          <thead>
            <tr className="bg-blue-600 text-white">
              {['Article', 'Size', 'GSM', 'Qty', 'Unit Price', 'Total'].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
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
        <div className="text-right text-xl font-bold mb-8">
          Grand Total: {sym}{order.total_amount.toFixed(2)} {order.currency}
        </div>
        <p className="text-gray-400 text-xs">This quotation is valid for 7 days. Contact: info@qaswatextile.com</p>
      </div>
    </div>
  )
}
