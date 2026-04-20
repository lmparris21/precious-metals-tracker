import { config } from 'dotenv'
config()

import express from 'express'
import cors from 'cors'
import pieceRoutes from './routes/pieces.js'
import catalogRoutes from './routes/catalog.js'
import spotPriceRoutes from './routes/spot-prices.js'
import settingsRoutes from './routes/settings.js'
import './db.js' // ensure DB is initialized

const app = express()
const PORT = 3001

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'] }))
app.use(express.json())

app.use(pieceRoutes)
app.use(catalogRoutes)
app.use(spotPriceRoutes)
app.use(settingsRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'Internal Server Error' })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
