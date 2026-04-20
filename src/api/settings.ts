import type { CurrencySettings } from '../types/piece'

export async function getCurrencySettings(): Promise<CurrencySettings> {
  const res = await fetch('/api/settings')
  if (!res.ok) throw new Error('Failed to fetch settings')
  return res.json()
}

export async function updateCurrencySettings(data: { currency?: string; exchange_rate?: number }): Promise<CurrencySettings> {
  const res = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to update settings')
  }
  return res.json()
}

export async function refreshExchangeRate(): Promise<CurrencySettings> {
  const res = await fetch('/api/settings/refresh-rate', { method: 'POST' })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to refresh exchange rate')
  }
  return res.json()
}
