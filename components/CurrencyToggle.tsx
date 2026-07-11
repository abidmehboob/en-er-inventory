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
          className="px-3 py-1 rounded text-sm font-medium transition-colors"
          style={value === c
            ? { background: '#c0694a', color: '#fff' }
            : { background: '#f3ede9', color: '#555' }}>
          {c}
        </button>
      ))}
    </div>
  )
}
