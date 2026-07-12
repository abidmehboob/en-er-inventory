'use client'
import { useCallback, useEffect, useState } from 'react'
import type { PakistanStockItem, PakistanStockStatus, PakistanStockFile } from '@/types'

type FormData = {
  article: string
  size_cm: string
  gsm: string
  wt_pc: string
  cartons: string
  qty_total: string
  status: PakistanStockStatus
}

const emptyForm: FormData = {
  article: '',
  size_cm: '',
  gsm: '',
  wt_pc: '',
  cartons: '',
  qty_total: '',
  status: 'available',
}

function itemToForm(item: PakistanStockItem): FormData {
  return {
    article: item.article,
    size_cm: item.size_cm,
    gsm: String(item.gsm),
    wt_pc: String(item.wt_pc),
    cartons: String(item.cartons),
    qty_total: String(item.qty_total),
    status: item.status,
  }
}

const inputClass = 'border rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#c0694a]'
const labelClass = 'text-xs font-semibold text-gray-600 mb-1 block'

export default function PakistanStockPage() {
  const [items, setItems] = useState<PakistanStockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PakistanStockItem | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [files, setFiles] = useState<PakistanStockFile[]>([])
  const [filesLoading, setFilesLoading] = useState(true)
  const [fileForm, setFileForm] = useState({ display_name: '', description: '' })
  const [fileInput, setFileInput] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [confirmDeleteFileId, setConfirmDeleteFileId] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/pakistan-stock')
    const data = await res.json()
    setItems(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  const fetchFiles = useCallback(async () => {
    setFilesLoading(true)
    const res = await fetch('/api/pakistan-stock/files')
    const data = await res.json()
    setFiles(data)
    setFilesLoading(false)
  }, [])

  useEffect(() => { fetchFiles() }, [fetchFiles])

  function openAdd() {
    setEditingItem(null)
    setForm(emptyForm)
    setFormError('')
    setModalOpen(true)
  }

  function openEdit(item: PakistanStockItem) {
    setEditingItem(item)
    setForm(itemToForm(item))
    setFormError('')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingItem(null)
  }

  function setField(key: keyof FormData, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    const { article, size_cm, gsm, wt_pc, cartons, qty_total, status } = form
    if (!article.trim() || !size_cm.trim() || !gsm || !wt_pc || cartons === '' || qty_total === '') {
      setFormError('All fields are required.')
      return
    }
    setSaving(true)
    try {
      const body = {
        article: article.trim(),
        size_cm: size_cm.trim(),
        gsm: Number(gsm),
        wt_pc: Number(wt_pc),
        cartons: Number(cartons),
        qty_total: Number(qty_total),
        status,
      }
      const url = editingItem ? `/api/pakistan-stock/${editingItem.item_id}` : '/api/pakistan-stock'
      const method = editingItem ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        setFormError(data.error ?? 'Failed to save item')
        return
      }
      closeModal()
      await fetchItems()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(item_id: string) {
    await fetch(`/api/pakistan-stock/${item_id}`, { method: 'DELETE' })
    setConfirmDeleteId(null)
    await fetchItems()
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    setUploadError('')
    if (!fileInput || !fileForm.display_name.trim()) {
      setUploadError('File and display name are required.')
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', fileInput)
      fd.append('display_name', fileForm.display_name.trim())
      fd.append('description', fileForm.description.trim())
      const res = await fetch('/api/pakistan-stock/files', { method: 'POST', body: fd })
      if (!res.ok) {
        const data = await res.json()
        setUploadError(data.error ?? 'Upload failed')
        return
      }
      setFileForm({ display_name: '', description: '' })
      setFileInput(null)
      ;(document.getElementById('file-input') as HTMLInputElement).value = ''
      await fetchFiles()
    } finally {
      setUploading(false)
    }
  }

  async function handleDeleteFile(file_id: string) {
    await fetch(`/api/pakistan-stock/files/${file_id}`, { method: 'DELETE' })
    setConfirmDeleteFileId(null)
    await fetchFiles()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#1a1a2e' }}>Pakistan Stock</h1>
        <button
          onClick={openAdd}
          className="px-4 py-2 text-sm font-semibold rounded text-white"
          style={{ background: '#c0694a' }}
        >
          + Add Item
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-gray-400">No Pakistan stock items yet.</div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-[#f0e8e4] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#c0694a', color: '#fff' }}>
                <th className="px-4 py-3 text-left font-semibold">Article</th>
                <th className="px-4 py-3 text-left font-semibold">Size</th>
                <th className="px-4 py-3 text-right font-semibold">GSM</th>
                <th className="px-4 py-3 text-right font-semibold">Wt/pc</th>
                <th className="px-4 py-3 text-right font-semibold">Cartons</th>
                <th className="px-4 py-3 text-right font-semibold">Qty</th>
                <th className="px-4 py-3 text-center font-semibold">Status</th>
                <th className="px-4 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.item_id} style={i % 2 === 1 ? { background: '#fdf3ef' } : {}}>
                  <td className="px-4 py-3 font-semibold" style={{ color: '#1a1a2e' }}>{item.article}</td>
                  <td className="px-4 py-3">{item.size_cm}</td>
                  <td className="px-4 py-3 text-right">{item.gsm}</td>
                  <td className="px-4 py-3 text-right">{item.wt_pc}</td>
                  <td className="px-4 py-3 text-right">{item.cartons}</td>
                  <td className="px-4 py-3 text-right">{item.qty_total.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    {item.status === 'available' ? (
                      <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ background: '#e8f5e9', color: '#2e7d32' }}>AVAILABLE</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ background: '#fce4e4', color: '#c62828' }}>OUT OF STOCK</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {confirmDeleteId === item.item_id ? (
                      <span className="text-xs">
                        Delete?{' '}
                        <button onClick={() => handleDelete(item.item_id)} className="font-semibold" style={{ color: '#c62828' }}>Yes</button>
                        {' · '}
                        <button onClick={() => setConfirmDeleteId(null)} style={{ color: '#888' }}>No</button>
                      </span>
                    ) : (
                      <span className="text-xs flex gap-3 justify-center">
                        <button onClick={() => openEdit(item)} className="underline" style={{ color: '#1a1a2e' }}>Edit</button>
                        <button onClick={() => setConfirmDeleteId(item.item_id)} className="underline" style={{ color: '#c0694a' }}>Delete</button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold mb-4" style={{ color: '#1a1a2e' }}>
              {editingItem ? 'Edit Item' : 'Add Item'}
            </h2>
            {formError && <div className="text-red-600 text-sm mb-3">{formError}</div>}
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={labelClass}>Article</label>
                  <input type="text" value={form.article} onChange={e => setField('article', e.target.value)} className={inputClass} placeholder="e.g. Hotel White Towel" required />
                </div>
                <div>
                  <label className={labelClass}>Size (cm)</label>
                  <input type="text" value={form.size_cm} onChange={e => setField('size_cm', e.target.value)} className={inputClass} placeholder="e.g. 50x100" required />
                </div>
                <div>
                  <label className={labelClass}>GSM</label>
                  <input type="number" min="1" value={form.gsm} onChange={e => setField('gsm', e.target.value)} className={inputClass} placeholder="e.g. 450" required />
                </div>
                <div>
                  <label className={labelClass}>Wt/pc (kg)</label>
                  <input type="number" min="0.01" step="0.01" value={form.wt_pc} onChange={e => setField('wt_pc', e.target.value)} className={inputClass} placeholder="e.g. 0.35" required />
                </div>
                <div>
                  <label className={labelClass}>Cartons</label>
                  <input type="number" min="0" value={form.cartons} onChange={e => setField('cartons', e.target.value)} className={inputClass} placeholder="e.g. 120" required />
                </div>
                <div>
                  <label className={labelClass}>Qty Total</label>
                  <input type="number" min="0" value={form.qty_total} onChange={e => setField('qty_total', e.target.value)} className={inputClass} placeholder="e.g. 2400" required />
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select value={form.status} onChange={e => setField('status', e.target.value)} className={inputClass}>
                    <option value="available">Available</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6 justify-end">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm rounded border" style={{ color: '#555' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-semibold rounded text-white" style={{ background: '#c0694a', opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Saving…' : editingItem ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Uploaded Files Section */}
      <div className="mt-10">
        <h2 className="text-xl font-bold mb-4" style={{ color: '#1a1a2e' }}>Uploaded Files</h2>

        {/* Upload form */}
        <div className="bg-white rounded-lg shadow-sm border border-[#f0e8e4] p-5 mb-6">
          <h3 className="text-sm font-semibold mb-3" style={{ color: '#1a1a2e' }}>Upload New File</h3>
          {uploadError && <div className="text-red-600 text-sm mb-3">{uploadError}</div>}
          <form onSubmit={handleUpload}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={labelClass}>File (PDF, Word, Excel)</label>
                <input
                  id="file-input"
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  onChange={e => setFileInput(e.target.files?.[0] ?? null)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Display Name</label>
                <input
                  type="text"
                  value={fileForm.display_name}
                  onChange={e => setFileForm(f => ({ ...f, display_name: e.target.value }))}
                  className={inputClass}
                  placeholder="e.g. July 2026 Price List"
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <input
                  type="text"
                  value={fileForm.description}
                  onChange={e => setFileForm(f => ({ ...f, description: e.target.value }))}
                  className={inputClass}
                  placeholder="Optional description"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={uploading}
                className="px-4 py-2 text-sm font-semibold rounded text-white"
                style={{ background: '#c0694a', opacity: uploading ? 0.6 : 1 }}
              >
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          </form>
        </div>

        {/* Files table */}
        {filesLoading ? (
          <div className="text-sm text-gray-400">Loading files…</div>
        ) : files.length === 0 ? (
          <div className="text-sm text-gray-400">No files uploaded yet.</div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-[#f0e8e4] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#c0694a', color: '#fff' }}>
                  <th className="px-4 py-3 text-left font-semibold">Display Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Description</th>
                  <th className="px-4 py-3 text-left font-semibold">Original Filename</th>
                  <th className="px-4 py-3 text-left font-semibold">Uploaded</th>
                  <th className="px-4 py-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((f, i) => (
                  <tr key={f.file_id} style={i % 2 === 1 ? { background: '#fdf3ef' } : {}}>
                    <td className="px-4 py-3 font-semibold" style={{ color: '#1a1a2e' }}>{f.display_name}</td>
                    <td className="px-4 py-3 text-gray-600">{f.description || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{f.original_filename}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(f.uploaded_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-center">
                      {confirmDeleteFileId === f.file_id ? (
                        <span className="text-xs">
                          Delete?{' '}
                          <button onClick={() => handleDeleteFile(f.file_id)} className="font-semibold" style={{ color: '#c62828' }}>Yes</button>
                          {' · '}
                          <button onClick={() => setConfirmDeleteFileId(null)} style={{ color: '#888' }}>No</button>
                        </span>
                      ) : (
                        <button onClick={() => setConfirmDeleteFileId(f.file_id)} className="text-xs underline" style={{ color: '#c0694a' }}>Delete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
