'use client'
import { useEffect, useState } from 'react'
import StockTable from '@/components/StockTable'
import PakistanStockTable from '@/components/PakistanStockTable'
import type { PakistanStockFile } from '@/types'

export default function StockPage() {
  const [files, setFiles] = useState<PakistanStockFile[]>([])

  useEffect(() => {
    fetch('/api/pakistan-stock/files')
      .then(r => r.json())
      .then(setFiles)
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen py-10 px-4" style={{ background: '#f8f4f2' }}>
      <div className="max-w-5xl mx-auto">
        {/* Brand header */}
        <div className="mb-8 flex items-center gap-4">
          <div className="flex items-center gap-0">
            <span style={{ background: '#c0694a', color: '#fff', fontWeight: 800, fontSize: 20, padding: '4px 9px', letterSpacing: 1 }}>EN</span>
            <span style={{ background: '#1a1a2e', color: '#fff', fontWeight: 800, fontSize: 20, padding: '4px 9px', letterSpacing: 1 }}>ER</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#1a1a2e' }}>EN-ER Textile — Stock</h1>
            <p className="text-sm mt-0.5" style={{ color: '#888' }}>Warsaw warehouse · Pakistan ready-to-ship</p>
          </div>
        </div>

        {/* Warsaw section */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-lg">🏭</span>
            <h2 className="text-lg font-bold" style={{ color: '#1a1a2e' }}>Warsaw Warehouse</h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#e8f5e9', color: '#2e7d32' }}>
              LIVE STOCK
            </span>
          </div>
          <StockTable />
        </div>

        {/* Divider */}
        <div className="border-t my-10" style={{ borderColor: '#e8e0db' }} />

        {/* Pakistan section */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-lg">🇵🇰</span>
            <h2 className="text-lg font-bold" style={{ color: '#1a1a2e' }}>Pakistan — Ready to Ship</h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#fff3e0', color: '#e65100' }}>
              SUPPLIER STOCK
            </span>
          </div>
          <PakistanStockTable />
        </div>

        {/* Pakistan Stock Documents */}
        {files.length > 0 && (
          <>
            <div className="border-t my-10" style={{ borderColor: '#e8e0db' }} />
            <div>
              <div className="flex items-center gap-3 mb-5">
                <span className="text-lg">📄</span>
                <h2 className="text-lg font-bold" style={{ color: '#1a1a2e' }}>Pakistan Stock Documents</h2>
              </div>
              <div className="flex flex-col gap-3">
                {files.map(f => (
                  <div
                    key={f.file_id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white rounded-lg border border-[#f0e8e4] px-5 py-4 shadow-sm"
                  >
                    <div>
                      <div className="font-semibold text-sm" style={{ color: '#1a1a2e' }}>{f.display_name}</div>
                      {f.description && (
                        <div className="text-xs mt-0.5" style={{ color: '#888' }}>{f.description}</div>
                      )}
                    </div>
                    <a
                      href={`/api/pakistan-stock/files/${f.file_id}/download`}
                      className="px-4 py-2 text-sm font-semibold rounded text-white shrink-0"
                      style={{ background: '#c0694a' }}
                    >
                      Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
