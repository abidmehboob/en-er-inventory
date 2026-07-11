import StockTable from '@/components/StockTable'

export default function StockPage() {
  return (
    <div className="min-h-screen py-10 px-4" style={{ background: '#f8f4f2' }}>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex items-center gap-0">
            <span style={{ background: '#c0694a', color: '#fff', fontWeight: 800, fontSize: 20, padding: '4px 9px', letterSpacing: 1 }}>EN</span>
            <span style={{ background: '#1a1a2e', color: '#fff', fontWeight: 800, fontSize: 20, padding: '4px 9px', letterSpacing: 1 }}>ER</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#1a1a2e' }}>EN-ER Textile — Live Stock</h1>
            <p className="text-sm mt-0.5" style={{ color: '#888' }}>Available inventory · prices in selected currency</p>
          </div>
        </div>
        <StockTable />
      </div>
    </div>
  )
}
