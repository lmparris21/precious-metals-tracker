import express from 'express'
import db from '../db.js'
import { fetchSpotPrices } from '../services/spot-price-api.js'

const router = express.Router()

router.get('/api/spot-prices', (_req, res) => {
  const prices = db.prepare('SELECT * FROM spot_prices ORDER BY metal_type').all()
  res.json(prices)
})

router.put('/api/spot-prices/:metal', (req, res) => {
  const { metal } = req.params
  const { price_per_oz } = req.body

  const validMetals = ['silver', 'gold', 'platinum', 'palladium']
  if (!validMetals.includes(metal)) {
    res.status(400).json({ error: `Invalid metal. Must be one of: ${validMetals.join(', ')}` })
    return
  }

  if (price_per_oz == null || typeof price_per_oz !== 'number' || price_per_oz <= 0) {
    res.status(400).json({ error: 'price_per_oz must be a positive number' })
    return
  }

  db.prepare(`
    UPDATE spot_prices SET price_per_oz = ?, source = 'manual', updated_at = datetime('now')
    WHERE metal_type = ?
  `).run(price_per_oz, metal)

  const updated = db.prepare('SELECT * FROM spot_prices WHERE metal_type = ?').get(metal)
  res.json(updated)
})

router.post('/api/spot-prices/refresh', async (_req, res) => {
  try {
    const prices = await fetchSpotPrices()

    const updatePrice = db.prepare(`
      UPDATE spot_prices SET price_per_oz = ?, source = 'api', updated_at = datetime('now')
      WHERE metal_type = ?
    `)

    for (const [metal, price] of Object.entries(prices)) {
      updatePrice.run(price, metal)
    }

    const updated = db.prepare('SELECT * FROM spot_prices ORDER BY metal_type').all()
    res.json(updated)
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to fetch spot prices' })
  }
})

export default router
