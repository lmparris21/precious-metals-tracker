import express from 'express'
import db from '../db.js'

const router = express.Router()

const SUPPORTED_CURRENCIES = [
  'USD', 'GBP', 'EUR', 'CAD', 'AUD', 'CHF', 'JPY', 'NZD', 'SGD', 'HKD', 'ZAR', 'INR', 'SEK', 'NOK', 'DKK',
]

function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
  const map: Record<string, string> = {}
  for (const row of rows) map[row.key] = row.value
  return {
    currency: map.currency ?? 'USD',
    exchange_rate: parseFloat(map.exchange_rate ?? '1'),
    rate_updated_at: map.rate_updated_at ?? '',
  }
}

router.get('/api/settings', (_req, res) => {
  res.json(getSettings())
})

router.put('/api/settings', (req, res) => {
  const { currency, exchange_rate } = req.body

  if (currency !== undefined && !SUPPORTED_CURRENCIES.includes(currency)) {
    res.status(400).json({ error: 'Unsupported currency' })
    return
  }

  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')

  if (currency !== undefined) {
    upsert.run('currency', currency)
    // Reset rate to 1 when switching to USD, keep existing otherwise
    if (currency === 'USD') {
      upsert.run('exchange_rate', '1')
      upsert.run('rate_updated_at', '')
    }
  }

  if (exchange_rate !== undefined) {
    const rate = parseFloat(exchange_rate)
    if (isNaN(rate) || rate <= 0) {
      res.status(400).json({ error: 'Invalid exchange rate' })
      return
    }
    upsert.run('exchange_rate', rate.toString())
    upsert.run('rate_updated_at', new Date().toISOString())
  }

  res.json(getSettings())
})

router.post('/api/settings/refresh-rate', async (_req, res) => {
  const { currency } = getSettings()

  if (currency === 'USD') {
    const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    upsert.run('exchange_rate', '1')
    upsert.run('rate_updated_at', new Date().toISOString())
    res.json(getSettings())
    return
  }

  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD')
    if (!response.ok) throw new Error('Exchange rate API returned an error')
    const data = await response.json() as { result: string; rates: Record<string, number> }

    if (data.result !== 'success') throw new Error('Exchange rate API request failed')

    const rate = data.rates[currency]
    if (!rate) throw new Error(`Currency ${currency} not supported by exchange rate API`)

    const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    upsert.run('exchange_rate', rate.toString())
    upsert.run('rate_updated_at', new Date().toISOString())

    res.json(getSettings())
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Failed to fetch exchange rate' })
  }
})

export default router
