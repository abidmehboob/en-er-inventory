import { convert } from '@/lib/currency'
import type { Currency } from '@/types'

const rates: Record<Currency, number> = { USD: 1, EUR: 0.92, PLN: 4.05, GBP: 0.79 }

describe('convert', () => {
  it('returns same amount for USD to USD', () => {
    expect(convert(10, 'USD', 'USD', rates)).toBe(10)
  })

  it('converts USD to PLN', () => {
    expect(convert(10, 'USD', 'PLN', rates)).toBeCloseTo(40.5, 1)
  })

  it('converts USD to GBP', () => {
    expect(convert(4.89, 'USD', 'GBP', rates)).toBeCloseTo(3.86, 1)
  })

  it('converts USD to EUR', () => {
    expect(convert(100, 'USD', 'EUR', rates)).toBeCloseTo(92, 1)
  })

  it('rounds to 2 decimal places', () => {
    const result = convert(1.99, 'USD', 'PLN', rates)
    expect(result.toString()).toMatch(/^\d+\.\d{1,2}$/)
  })
})
