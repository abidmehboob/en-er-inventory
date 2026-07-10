import StockTable from '@/components/StockTable'

export default function StockPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Qaswa Textile — Stock</h1>
          <p className="text-gray-500 mt-1">Live available inventory</p>
        </div>
        <StockTable />
      </div>
    </div>
  )
}
