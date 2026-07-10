'use client'
import type { Currency } from '@/types'

const CURRENCIES: Currency[] = ['USD', 'EUR', 'PLN', 'GBP']

export default function CurrencyToggle({
  value, onChange,
}: { value: Currency; onChange: (c: Currency) => void }) {
  return (
    <div className="flex gap-2">
      {CURRENCIES.map(c => (
        <button key={c} onClick={() => onChange(c)}
          className={`px-3 py-1 rounded text-sm font-medium ${value === c ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          {c}
        </button>
      ))}
    </div>
  )
}
