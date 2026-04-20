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
    metal_type TEXT NOT NULL CHECK(metal_type IN ('silver', 'gold', 'platinum', 'palladium', 'numismatic')),
    piece_type TEXT NOT NULL CHECK(piece_type IN ('coin', 'bar', 'round', 'other')),
    name TEXT NOT NULL,
    year INTEGER,
    weight_oz REAL,
    weight_unit TEXT NOT NULL DEFAULT 'oz' CHECK(weight_unit IN ('oz', 'g', 'kg')),
    purity REAL,
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

// Migrate: add quantity column and check weight_oz nullability (single PRAGMA query)
const colInfo = db.prepare("PRAGMA table_info(pieces)").all() as { name: string, notnull: number }[]
if (!colInfo.some(c => c.name === 'quantity')) {
  db.exec("ALTER TABLE pieces ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1")
}

// Migrate: support numismatic pieces (nullable weight_oz/purity, expanded metal_type CHECK)
const weightOzCol = colInfo.find(c => c.name === 'weight_oz')
if (weightOzCol && weightOzCol.notnull === 1) {
  db.pragma('foreign_keys = OFF')
  try {
    db.transaction(() => {
      db.exec(`
        DROP TABLE IF EXISTS pieces_new;
        CREATE TABLE pieces_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          metal_type TEXT NOT NULL CHECK(metal_type IN ('silver', 'gold', 'platinum', 'palladium', 'numismatic')),
          piece_type TEXT NOT NULL CHECK(piece_type IN ('coin', 'bar', 'round', 'other')),
          name TEXT NOT NULL,
          year INTEGER,
          weight_oz REAL,
          weight_unit TEXT NOT NULL DEFAULT 'oz' CHECK(weight_unit IN ('oz', 'g', 'kg')),
          purity REAL,
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
        INSERT INTO pieces_new (id, metal_type, piece_type, name, year, weight_oz, weight_unit, purity, is_graded, grading_service, grade, cert_number, purchase_price, purchase_date, estimated_value, quantity, notes, created_at, updated_at)
          SELECT id, metal_type, piece_type, name, year, weight_oz, weight_unit, purity, is_graded, grading_service, grade, cert_number, purchase_price, purchase_date, estimated_value, quantity, notes, created_at, updated_at FROM pieces;
        DROP TABLE pieces;
        ALTER TABLE pieces_new RENAME TO pieces;
      `)
    })()
  } finally {
    db.pragma('foreign_keys = ON')
  }
}

// Migrate: fix catalog and piece weights from ASW to gross (purity was double-counted in melt formula)
const morgRec = db.prepare("SELECT weight_oz FROM catalog_items WHERE name = 'Morgan Dollar'").get() as { weight_oz: number } | undefined
if (morgRec && morgRec.weight_oz === 0.7735) {
  const weightFixes = [
    { name: 'Morgan Dollar',                          oldW: 0.7735, newW: 0.8594 },
    { name: 'Peace Dollar',                           oldW: 0.7735, newW: 0.8594 },
    { name: 'Walking Liberty Half Dollar',            oldW: 0.3618, newW: 0.4019 },
    { name: 'Franklin Half Dollar',                   oldW: 0.3618, newW: 0.4019 },
    { name: 'Washington Quarter',                     oldW: 0.1808, newW: 0.2009 },
    { name: 'America the Beautiful Quarter (Silver)', oldW: 0.1808, newW: 0.2009 },
    { name: 'Mercury Dime',                           oldW: 0.0723, newW: 0.0804 },
    { name: 'Roosevelt Dime (Silver)',                oldW: 0.0723, newW: 0.0804 },
    { name: 'American Gold Eagle 1oz',                oldW: 1.0,    newW: 1.0909 },
    { name: 'American Gold Eagle 1/2oz',              oldW: 0.5,    newW: 0.5455 },
    { name: 'American Gold Eagle 1/4oz',              oldW: 0.25,   newW: 0.2727 },
    { name: 'American Gold Eagle 1/10oz',             oldW: 0.1,    newW: 0.1091 },
    { name: 'Krugerrand 1oz',                         oldW: 1.0,    newW: 1.0909 },
    { name: 'Krugerrand 1/2oz',                       oldW: 0.5,    newW: 0.5455 },
    { name: 'Krugerrand 1/4oz',                       oldW: 0.25,   newW: 0.2727 },
    { name: 'Krugerrand 1/10oz',                      oldW: 0.1,    newW: 0.1091 },
    { name: 'Sovereign',                              oldW: 0.2354, newW: 0.2568 },
    { name: 'Half Sovereign',                         oldW: 0.1177, newW: 0.1284 },
    { name: 'Saint-Gaudens Double Eagle',             oldW: 0.9675, newW: 1.0750 },
    { name: 'Liberty Head Double Eagle',              oldW: 0.9675, newW: 1.0750 },
  ]
  const updCatalog = db.prepare('UPDATE catalog_items SET weight_oz = ? WHERE name = ? AND weight_oz = ?')
  const updPiece   = db.prepare('UPDATE pieces SET weight_oz = ? WHERE name = ? AND weight_oz = ?')
  db.transaction(() => {
    for (const fix of weightFixes) {
      updCatalog.run(fix.newW, fix.name, fix.oldW)
      updPiece.run(fix.newW, fix.name, fix.oldW)
    }
  })()
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

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`)
const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
insertSetting.run('currency', 'USD')
insertSetting.run('exchange_rate', '1')
insertSetting.run('rate_updated_at', '')

export default db
