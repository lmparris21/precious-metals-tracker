import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import db from '../db.js'
import upload from '../middleware/upload.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PHOTOS_DIR = path.join(__dirname, '../../data/photos')

const router = express.Router()

// GET /api/pieces — list all pieces with optional filters and sorting
router.get('/api/pieces', (req, res) => {
  const { metal_type, piece_type, is_graded, q, sort } = req.query

  const conditions: string[] = []
  const params: (string | number)[] = []

  if (metal_type) {
    conditions.push('p.metal_type = ?')
    params.push(metal_type as string)
  }
  if (piece_type) {
    conditions.push('p.piece_type = ?')
    params.push(piece_type as string)
  }
  if (is_graded !== undefined && is_graded !== '') {
    conditions.push('p.is_graded = ?')
    params.push(Number(is_graded))
  }
  if (q) {
    conditions.push('p.name LIKE ?')
    params.push(`%${q}%`)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const allowedSorts: Record<string, string> = {
    name: 'p.name',
    purchase_date: 'p.purchase_date',
    purchase_price: 'p.purchase_price',
    melt_value: 'melt_value',
    estimated_value: 'p.estimated_value',
  }
  const orderBy = sort && allowedSorts[sort as string]
    ? allowedSorts[sort as string]
    : 'p.created_at DESC'

  const sql = `
    SELECT
      p.*,
      ROUND(p.weight_oz * p.purity * COALESCE(sp.price_per_oz, 0), 2) AS melt_value,
      COUNT(pp.id) AS photo_count,
      MIN(pp.filename) AS first_photo
    FROM pieces p
    LEFT JOIN spot_prices sp ON sp.metal_type = p.metal_type
    LEFT JOIN piece_photos pp ON pp.piece_id = p.id
    ${whereClause}
    GROUP BY p.id
    ORDER BY ${orderBy}
  `

  const pieces = db.prepare(sql).all(...params)
  res.json(pieces)
})

// GET /api/pieces/:id — single piece with all photos and melt_value
router.get('/api/pieces/:id', (req, res) => {
  const { id } = req.params

  const piece = db.prepare(`
    SELECT
      p.*,
      ROUND(p.weight_oz * p.purity * COALESCE(sp.price_per_oz, 0), 2) AS melt_value
    FROM pieces p
    LEFT JOIN spot_prices sp ON sp.metal_type = p.metal_type
    WHERE p.id = ?
  `).get(id)

  if (!piece) {
    res.status(404).json({ error: 'Piece not found' })
    return
  }

  const photos = db.prepare('SELECT * FROM piece_photos WHERE piece_id = ? ORDER BY sort_order ASC').all(id)

  res.json({ ...piece as object, photos })
})

// POST /api/pieces — create piece
router.post('/api/pieces', (req, res) => {
  const {
    metal_type, piece_type, name, year, weight_oz, weight_unit,
    purity, is_graded, grading_service, grade, cert_number,
    purchase_price, purchase_date, estimated_value, notes
  } = req.body

  if (!metal_type || !piece_type || !name || weight_oz == null || purity == null) {
    res.status(400).json({ error: 'metal_type, piece_type, name, weight_oz, and purity are required' })
    return
  }

  const result = db.prepare(`
    INSERT INTO pieces (
      metal_type, piece_type, name, year, weight_oz, weight_unit,
      purity, is_graded, grading_service, grade, cert_number,
      purchase_price, purchase_date, estimated_value, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    metal_type, piece_type, name, year ?? null, weight_oz, weight_unit ?? 'oz',
    purity, is_graded ? 1 : 0, grading_service ?? null, grade ?? null, cert_number ?? null,
    purchase_price ?? null, purchase_date ?? null, estimated_value ?? null, notes ?? null
  )

  const newPiece = db.prepare(`
    SELECT
      p.*,
      ROUND(p.weight_oz * p.purity * COALESCE(sp.price_per_oz, 0), 2) AS melt_value
    FROM pieces p
    LEFT JOIN spot_prices sp ON sp.metal_type = p.metal_type
    WHERE p.id = ?
  `).get(result.lastInsertRowid)

  res.status(201).json(newPiece)
})

// PUT /api/pieces/:id — update piece
router.put('/api/pieces/:id', (req, res) => {
  const { id } = req.params
  const {
    metal_type, piece_type, name, year, weight_oz, weight_unit,
    purity, is_graded, grading_service, grade, cert_number,
    purchase_price, purchase_date, estimated_value, notes
  } = req.body

  const existing = db.prepare('SELECT id FROM pieces WHERE id = ?').get(id)
  if (!existing) {
    res.status(404).json({ error: 'Piece not found' })
    return
  }

  if (!metal_type || !piece_type || !name || weight_oz == null || purity == null) {
    res.status(400).json({ error: 'metal_type, piece_type, name, weight_oz, and purity are required' })
    return
  }

  db.prepare(`
    UPDATE pieces SET
      metal_type = ?, piece_type = ?, name = ?, year = ?, weight_oz = ?, weight_unit = ?,
      purity = ?, is_graded = ?, grading_service = ?, grade = ?, cert_number = ?,
      purchase_price = ?, purchase_date = ?, estimated_value = ?, notes = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    metal_type, piece_type, name, year ?? null, weight_oz, weight_unit ?? 'oz',
    purity, is_graded ? 1 : 0, grading_service ?? null, grade ?? null, cert_number ?? null,
    purchase_price ?? null, purchase_date ?? null, estimated_value ?? null, notes ?? null,
    id
  )

  const updated = db.prepare(`
    SELECT
      p.*,
      ROUND(p.weight_oz * p.purity * COALESCE(sp.price_per_oz, 0), 2) AS melt_value
    FROM pieces p
    LEFT JOIN spot_prices sp ON sp.metal_type = p.metal_type
    WHERE p.id = ?
  `).get(id)

  res.json(updated)
})

// DELETE /api/pieces/:id — delete piece and its photo files
router.delete('/api/pieces/:id', (req, res) => {
  const { id } = req.params

  const existing = db.prepare('SELECT id FROM pieces WHERE id = ?').get(id)
  if (!existing) {
    res.status(404).json({ error: 'Piece not found' })
    return
  }

  // Get all photo filenames before deletion
  const photos = db.prepare('SELECT filename FROM piece_photos WHERE piece_id = ?').all(id) as { filename: string }[]

  // Delete the piece (cascade deletes piece_photos rows)
  db.prepare('DELETE FROM pieces WHERE id = ?').run(id)

  // Delete photo files from disk
  for (const photo of photos) {
    try {
      fs.unlinkSync(path.join(PHOTOS_DIR, photo.filename))
    } catch {
      // File may already be gone
    }
  }

  res.json({ success: true })
})

// POST /api/pieces/:id/photos — upload photos
router.post('/api/pieces/:id/photos', upload.array('photos', 10), (req, res) => {
  const { id } = req.params

  const existing = db.prepare('SELECT id FROM pieces WHERE id = ?').get(id)
  if (!existing) {
    // Clean up files already written by multer before the 404 check
    const uploadedFiles = req.files as Express.Multer.File[] | undefined
    if (uploadedFiles) {
      for (const f of uploadedFiles) {
        try { fs.unlinkSync(f.path) } catch { /* already gone */ }
      }
    }
    res.status(404).json({ error: 'Piece not found' })
    return
  }

  const files = req.files as Express.Multer.File[]
  if (!files || files.length === 0) {
    res.status(400).json({ error: 'No files uploaded' })
    return
  }

  // Get current max sort_order for this piece
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) as max_order FROM piece_photos WHERE piece_id = ?').get(id) as { max_order: number }
  let sortOrder = maxOrder.max_order + 1

  const insertPhoto = db.prepare('INSERT INTO piece_photos (piece_id, filename, sort_order) VALUES (?, ?, ?)')
  const insertedPhotos: object[] = []

  for (const file of files) {
    const result = insertPhoto.run(id, file.filename, sortOrder++)
    const photo = db.prepare('SELECT * FROM piece_photos WHERE id = ?').get(result.lastInsertRowid)
    insertedPhotos.push(photo as object)
  }

  res.status(201).json(insertedPhotos)
})

// DELETE /api/photos/:id — delete single photo
router.delete('/api/photos/:id', (req, res) => {
  const { id } = req.params

  const photo = db.prepare('SELECT * FROM piece_photos WHERE id = ?').get(id) as { filename: string } | undefined
  if (!photo) {
    res.status(404).json({ error: 'Photo not found' })
    return
  }

  db.prepare('DELETE FROM piece_photos WHERE id = ?').run(id)

  try {
    fs.unlinkSync(path.join(PHOTOS_DIR, photo.filename))
  } catch {
    // File may already be gone
  }

  res.json({ success: true })
})

// GET /api/photos/:filename — serve photo file
router.get('/api/photos/:filename', (req, res) => {
  const { filename } = req.params
  const resolvedDir = path.resolve(PHOTOS_DIR)
  const filePath = path.resolve(PHOTOS_DIR, filename)

  if (!filePath.startsWith(resolvedDir + path.sep)) {
    res.status(400).json({ error: 'Invalid filename' })
    return
  }

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Photo not found' })
    return
  }

  res.sendFile(filePath)
})

// GET /api/summary — aggregate stats
router.get('/api/summary', (_req, res) => {
  const totals = db.prepare(`
    SELECT
      COUNT(*) AS total_pieces,
      SUM(CASE WHEN is_graded = 1 THEN 1 ELSE 0 END) AS graded_count,
      SUM(CASE WHEN is_graded = 0 THEN 1 ELSE 0 END) AS raw_count,
      COALESCE(SUM(purchase_price), 0) AS total_purchase_cost,
      COALESCE(SUM(estimated_value), 0) AS total_estimated_value
    FROM pieces
  `).get() as {
    total_pieces: number
    graded_count: number
    raw_count: number
    total_purchase_cost: number
    total_estimated_value: number
  }

  const byMetal = db.prepare(`
    SELECT
      p.metal_type,
      COUNT(*) AS count,
      COALESCE(SUM(p.weight_oz), 0) AS total_weight_oz,
      COALESCE(SUM(p.weight_oz * p.purity), 0) AS total_pure_oz,
      COALESCE(SUM(p.purchase_price), 0) AS total_purchase_cost,
      COALESCE(SUM(ROUND(p.weight_oz * p.purity * COALESCE(sp.price_per_oz, 0), 2)), 0) AS total_melt_value,
      COALESCE(SUM(p.estimated_value), 0) AS total_estimated_value,
      COALESCE(sp.price_per_oz, 0) AS spot_price
    FROM pieces p
    LEFT JOIN spot_prices sp ON sp.metal_type = p.metal_type
    GROUP BY p.metal_type, sp.price_per_oz
    ORDER BY p.metal_type
  `).all()

  const totalMeltValue = (byMetal as { total_melt_value: number }[]).reduce(
    (sum, row) => sum + row.total_melt_value, 0
  )

  const summary = {
    ...totals,
    gain_loss: totals.total_estimated_value - totals.total_purchase_cost,
    total_melt_value: Math.round(totalMeltValue * 100) / 100,
    by_metal: byMetal,
  }

  res.json(summary)
})

export default router
