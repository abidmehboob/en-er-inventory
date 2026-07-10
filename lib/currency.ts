import type { Currency, ExchangeRates } from '@/types'

let cache: ExchangeRates | null = null
const CACHE_TTL_MS = 60 * 60 * 1000

export async function fetchRates(): Promise<Record<Currency, number>> {
  if (cache && Date.now() - cache.fetched_at < CACHE_TTL_MS) {
    return cache.rates
  }
  const res = await fetch('https://open.er-api.com/v6/latest/USD')
  const data = await res.json() as { rates: Record<string, number> }
  cache = {
    base: 'USD',
    rates: { USD: 1, EUR: data.rates.EUR, PLN: data.rates.PLN, GBP: data.rates.GBP },
    fetched_at: Date.now(),
  }
  return cache.rates
}

export function convert(
  amount: number,
  from: Currency,
  to: Currency,
  rates: Record<Currency, number>
): number {
  const inUSD = amount / rates[from]
  return Math.round(inUSD * rates[to] * 100) / 100
}
