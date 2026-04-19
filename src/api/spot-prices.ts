import type { SpotPrice } from '../types/piece'

export async function getSpotPrices(): Promise<SpotPrice[]> {
  const res = await fetch('/api/spot-prices')
  if (!res.ok) throw new Error('Failed to fetch spot prices')
  return res.json()
}

export async function setSpotPrice(metal: string, price_per_oz: number): Promise<SpotPrice> {
  const res = await fetch(`/api/spot-prices/${metal}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ price_per_oz }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to update spot price')
  }
  return res.json()
}

export async function refreshSpotPrices(): Promise<SpotPrice[]> {
  const res = await fetch('/api/spot-prices/refresh', { method: 'POST' })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to refresh spot prices')
  }
  return res.json()
}
