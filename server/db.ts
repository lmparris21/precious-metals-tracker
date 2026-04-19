import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { seedCatalog } from './seed/catalog.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '../data/collection.db')
const PHOTOS_DIR = path.join(__dirname, '../data/photos')

// Ensure photos directory exists
if (!fs.existsSync(PHOTOS_DIR)) {
  fs.mkdirSync(PHOTOS_DIR, { recursive: true })
}

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS pieces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metal_type TEXT NOT NULL CHECK(metal_type IN ('silver', 'gold', 'platinum', 'palladium')),
    piece_type TEXT NOT NULL CHECK(piece_type IN ('coin', 'bar', 'round', 'other')),
    name TEXT NOT NULL,
    year INTEGER,
    weight_oz REAL NOT NULL,
    weight_unit TEXT NOT NULL DEFAULT 'oz' CHECK(weight_unit IN ('oz', 'g', 'kg')),
    purity REAL NOT NULL,
    is_graded INTEGER NOT NULL DEFAULT 0,
    grading_service TEXT,
    grade TEXT,
    cert_number TEXT,
    purchase_price REAL,
    purchase_date TEXT,
    estimated_value REAL,
    quantity INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS piece_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    piece_id INTEGER NOT NULL REFERENCES pieces(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS spot_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metal_type TEXT NOT NULL UNIQUE CHECK(metal_type IN ('silver', 'gold', 'platinum', 'palladium')),
    price_per_oz REAL NOT NULL,
    source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('manual', 'api')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS catalog_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    metal_type TEXT NOT NULL,
    piece_type TEXT NOT NULL,
    weight_oz REAL NOT NULL,
    purity REAL NOT NULL,
    year_start INTEGER,
    year_end INTEGER,
    mint TEXT
  );
`)

// Migrate: add quantity column if it doesn't exist (for existing DBs)
const cols = db.prepare("PRAGMA table_info(pieces)").all() as { name: string }[]
if (!cols.some(c => c.name === 'quantity')) {
  db.exec("ALTER TABLE pieces ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1")
}

// Seed spot prices if not present
const existingSpotPrices = db.prepare('SELECT COUNT(*) as count FROM spot_prices').get() as { count: number }
if (existingSpotPrices.count === 0) {
  const insertSpot = db.prepare('INSERT INTO spot_prices (metal_type, price_per_oz, source) VALUES (?, ?, ?)')
  insertSpot.run('silver', 32.50, 'manual')
  insertSpot.run('gold', 3200.00, 'manual')
  insertSpot.run('platinum', 1050.00, 'manual')
  insertSpot.run('palladium', 1100.00, 'manual')
}

// Seed catalog if not present
const existingCatalog = db.prepare('SELECT COUNT(*) as count FROM catalog_items').get() as { count: number }
if (existingCatalog.count === 0) {
  seedCatalog(db)
}

export default db
