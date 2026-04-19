import express from 'express'
import db from '../db.js'

const router = express.Router()

// GET /api/catalog?q=eagle — search catalog items
router.get('/api/catalog', (req, res) => {
  const { q } = req.query

  if (!q || (q as string).trim() === '') {
    const items = db.prepare('SELECT * FROM catalog_items LIMIT 20').all()
    res.json(items)
    return
  }

  const items = db.prepare(
    'SELECT * FROM catalog_items WHERE name LIKE ? COLLATE NOCASE LIMIT 20'
  ).all(`%${q}%`)

  res.json(items)
})

export default router
