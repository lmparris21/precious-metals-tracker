import type Database from 'better-sqlite3'

interface CatalogRow {
  name: string
  metal_type: string
  piece_type: string
  weight_oz: number
  purity: number
  year_start: number | null
  year_end: number | null
  mint: string | null
}

const CATALOG_ITEMS: CatalogRow[] = [
  // US Silver
  { name: 'American Silver Eagle', metal_type: 'silver', piece_type: 'coin', weight_oz: 1, purity: 0.999, year_start: 1986, year_end: null, mint: 'US Mint' },
  { name: 'America the Beautiful Quarter (Silver)', metal_type: 'silver', piece_type: 'coin', weight_oz: 0.2009, purity: 0.900, year_start: 2010, year_end: 2021, mint: 'US Mint' },
  { name: 'Morgan Dollar', metal_type: 'silver', piece_type: 'coin', weight_oz: 0.8594, purity: 0.900, year_start: 1878, year_end: 1921, mint: null },
  { name: 'Peace Dollar', metal_type: 'silver', piece_type: 'coin', weight_oz: 0.8594, purity: 0.900, year_start: 1921, year_end: 1935, mint: null },
  { name: 'Walking Liberty Half Dollar', metal_type: 'silver', piece_type: 'coin', weight_oz: 0.4019, purity: 0.900, year_start: 1916, year_end: 1947, mint: null },
  { name: 'Mercury Dime', metal_type: 'silver', piece_type: 'coin', weight_oz: 0.0804, purity: 0.900, year_start: 1916, year_end: 1945, mint: null },
  { name: 'Washington Quarter', metal_type: 'silver', piece_type: 'coin', weight_oz: 0.2009, purity: 0.900, year_start: 1932, year_end: 1964, mint: null },
  { name: 'Roosevelt Dime (Silver)', metal_type: 'silver', piece_type: 'coin', weight_oz: 0.0804, purity: 0.900, year_start: 1946, year_end: 1964, mint: null },
  { name: 'Franklin Half Dollar', metal_type: 'silver', piece_type: 'coin', weight_oz: 0.4019, purity: 0.900, year_start: 1948, year_end: 1963, mint: null },

  // US Gold
  { name: 'American Gold Eagle 1oz', metal_type: 'gold', piece_type: 'coin', weight_oz: 1.0909, purity: 0.9167, year_start: 1986, year_end: null, mint: 'US Mint' },
  { name: 'American Gold Eagle 1/2oz', metal_type: 'gold', piece_type: 'coin', weight_oz: 0.5455, purity: 0.9167, year_start: 1986, year_end: null, mint: 'US Mint' },
  { name: 'American Gold Eagle 1/4oz', metal_type: 'gold', piece_type: 'coin', weight_oz: 0.2727, purity: 0.9167, year_start: 1986, year_end: null, mint: 'US Mint' },
  { name: 'American Gold Eagle 1/10oz', metal_type: 'gold', piece_type: 'coin', weight_oz: 0.1091, purity: 0.9167, year_start: 1986, year_end: null, mint: 'US Mint' },
  { name: 'American Gold Buffalo 1oz', metal_type: 'gold', piece_type: 'coin', weight_oz: 1, purity: 0.9999, year_start: 2006, year_end: null, mint: 'US Mint' },
  { name: 'Saint-Gaudens Double Eagle', metal_type: 'gold', piece_type: 'coin', weight_oz: 1.0750, purity: 0.900, year_start: 1907, year_end: 1933, mint: null },
  { name: 'Liberty Head Double Eagle', metal_type: 'gold', piece_type: 'coin', weight_oz: 1.0750, purity: 0.900, year_start: 1849, year_end: 1907, mint: null },

  // Canadian
  { name: 'Canadian Silver Maple Leaf 1oz', metal_type: 'silver', piece_type: 'coin', weight_oz: 1, purity: 0.9999, year_start: 1988, year_end: null, mint: 'Royal Canadian Mint' },
  { name: 'Canadian Gold Maple Leaf 1oz', metal_type: 'gold', piece_type: 'coin', weight_oz: 1, purity: 0.9999, year_start: 1979, year_end: null, mint: 'Royal Canadian Mint' },
  { name: 'Canadian Gold Maple Leaf 1/2oz', metal_type: 'gold', piece_type: 'coin', weight_oz: 0.5, purity: 0.9999, year_start: 1979, year_end: null, mint: 'Royal Canadian Mint' },
  { name: 'Canadian Gold Maple Leaf 1/4oz', metal_type: 'gold', piece_type: 'coin', weight_oz: 0.25, purity: 0.9999, year_start: 1979, year_end: null, mint: 'Royal Canadian Mint' },
  { name: 'Canadian Gold Maple Leaf 1/10oz', metal_type: 'gold', piece_type: 'coin', weight_oz: 0.1, purity: 0.9999, year_start: 1979, year_end: null, mint: 'Royal Canadian Mint' },
  { name: 'Canadian Platinum Maple Leaf 1oz', metal_type: 'platinum', piece_type: 'coin', weight_oz: 1, purity: 0.9995, year_start: null, year_end: null, mint: 'Royal Canadian Mint' },

  // South African
  { name: 'Krugerrand 1oz', metal_type: 'gold', piece_type: 'coin', weight_oz: 1.0909, purity: 0.9167, year_start: 1967, year_end: null, mint: 'South African Mint' },
  { name: 'Krugerrand 1/2oz', metal_type: 'gold', piece_type: 'coin', weight_oz: 0.5455, purity: 0.9167, year_start: null, year_end: null, mint: null },
  { name: 'Krugerrand 1/4oz', metal_type: 'gold', piece_type: 'coin', weight_oz: 0.2727, purity: 0.9167, year_start: null, year_end: null, mint: null },
  { name: 'Krugerrand 1/10oz', metal_type: 'gold', piece_type: 'coin', weight_oz: 0.1091, purity: 0.9167, year_start: null, year_end: null, mint: null },

  // UK
  { name: 'Britannia Silver 1oz', metal_type: 'silver', piece_type: 'coin', weight_oz: 1, purity: 0.999, year_start: 1997, year_end: null, mint: 'Royal Mint' },
  { name: 'Britannia Gold 1oz', metal_type: 'gold', piece_type: 'coin', weight_oz: 1, purity: 0.9999, year_start: 1987, year_end: null, mint: 'Royal Mint' },
  { name: 'Britannia Gold 1/2oz', metal_type: 'gold', piece_type: 'coin', weight_oz: 0.5, purity: 0.9999, year_start: 1987, year_end: null, mint: 'Royal Mint' },
  { name: 'Britannia Gold 1/4oz', metal_type: 'gold', piece_type: 'coin', weight_oz: 0.25, purity: 0.9999, year_start: 1987, year_end: null, mint: 'Royal Mint' },
  { name: 'Britannia Gold 1/10oz', metal_type: 'gold', piece_type: 'coin', weight_oz: 0.1, purity: 0.9999, year_start: 1987, year_end: null, mint: 'Royal Mint' },
  { name: 'Sovereign', metal_type: 'gold', piece_type: 'coin', weight_oz: 0.2568, purity: 0.9167, year_start: 1817, year_end: null, mint: 'Royal Mint' },
  { name: 'Half Sovereign', metal_type: 'gold', piece_type: 'coin', weight_oz: 0.1284, purity: 0.9167, year_start: null, year_end: null, mint: 'Royal Mint' },

  // Austrian
  { name: 'Vienna Philharmonic Silver 1oz', metal_type: 'silver', piece_type: 'coin', weight_oz: 1, purity: 0.999, year_start: 2008, year_end: null, mint: 'Austrian Mint' },
  { name: 'Vienna Philharmonic Gold 1oz', metal_type: 'gold', piece_type: 'coin', weight_oz: 1, purity: 0.9999, year_start: 1989, year_end: null, mint: 'Austrian Mint' },
  { name: 'Vienna Philharmonic Gold 1/2oz', metal_type: 'gold', piece_type: 'coin', weight_oz: 0.5, purity: 0.9999, year_start: 1989, year_end: null, mint: 'Austrian Mint' },
  { name: 'Vienna Philharmonic Gold 1/4oz', metal_type: 'gold', piece_type: 'coin', weight_oz: 0.25, purity: 0.9999, year_start: 1989, year_end: null, mint: 'Austrian Mint' },
  { name: 'Vienna Philharmonic Gold 1/10oz', metal_type: 'gold', piece_type: 'coin', weight_oz: 0.1, purity: 0.9999, year_start: 1989, year_end: null, mint: 'Austrian Mint' },

  // Chinese
  { name: 'Chinese Silver Panda 1oz', metal_type: 'silver', piece_type: 'coin', weight_oz: 1, purity: 0.999, year_start: 1983, year_end: null, mint: 'China Mint' },
  { name: 'Chinese Gold Panda 1oz', metal_type: 'gold', piece_type: 'coin', weight_oz: 1, purity: 0.999, year_start: 1982, year_end: null, mint: 'China Mint' },
  { name: 'Chinese Gold Panda 1/2oz', metal_type: 'gold', piece_type: 'coin', weight_oz: 0.5, purity: 0.999, year_start: 1982, year_end: null, mint: 'China Mint' },

  // Mexican
  { name: 'Mexican Silver Libertad 1oz', metal_type: 'silver', piece_type: 'coin', weight_oz: 1, purity: 0.999, year_start: 1982, year_end: null, mint: 'Casa de Moneda' },
  { name: 'Mexican Gold Libertad 1oz', metal_type: 'gold', piece_type: 'coin', weight_oz: 1, purity: 0.999, year_start: 1981, year_end: null, mint: 'Casa de Moneda' },

  // Australian
  { name: 'Australian Silver Kangaroo 1oz', metal_type: 'silver', piece_type: 'coin', weight_oz: 1, purity: 0.9999, year_start: 2016, year_end: null, mint: 'Perth Mint' },
  { name: 'Australian Silver Kookaburra 1oz', metal_type: 'silver', piece_type: 'coin', weight_oz: 1, purity: 0.999, year_start: 1990, year_end: null, mint: 'Perth Mint' },
  { name: 'Australian Gold Kangaroo/Nugget 1oz', metal_type: 'gold', piece_type: 'coin', weight_oz: 1, purity: 0.9999, year_start: 1987, year_end: null, mint: 'Perth Mint' },
  { name: 'Australian Gold Kangaroo 1/2oz', metal_type: 'gold', piece_type: 'coin', weight_oz: 0.5, purity: 0.9999, year_start: 1987, year_end: null, mint: 'Perth Mint' },
  { name: 'Australian Gold Kangaroo 1/4oz', metal_type: 'gold', piece_type: 'coin', weight_oz: 0.25, purity: 0.9999, year_start: 1987, year_end: null, mint: 'Perth Mint' },
  { name: 'Australian Gold Kangaroo 1/10oz', metal_type: 'gold', piece_type: 'coin', weight_oz: 0.1, purity: 0.9999, year_start: 1987, year_end: null, mint: 'Perth Mint' },
  { name: 'Australian Platinum Koala 1oz', metal_type: 'platinum', piece_type: 'coin', weight_oz: 1, purity: 0.9995, year_start: 1988, year_end: null, mint: 'Perth Mint' },

  // Generic Silver Bars
  { name: 'Generic Silver Bar 1oz', metal_type: 'silver', piece_type: 'bar', weight_oz: 1, purity: 0.999, year_start: null, year_end: null, mint: null },
  { name: 'Generic Silver Bar 5oz', metal_type: 'silver', piece_type: 'bar', weight_oz: 5, purity: 0.999, year_start: null, year_end: null, mint: null },
  { name: 'Generic Silver Bar 10oz', metal_type: 'silver', piece_type: 'bar', weight_oz: 10, purity: 0.999, year_start: null, year_end: null, mint: null },
  { name: 'Generic Silver Bar 100oz', metal_type: 'silver', piece_type: 'bar', weight_oz: 100, purity: 0.999, year_start: null, year_end: null, mint: null },
  { name: 'Generic Silver Bar 1kg', metal_type: 'silver', piece_type: 'bar', weight_oz: 32.1507, purity: 0.999, year_start: null, year_end: null, mint: null },
  { name: 'PAMP Suisse Silver Bar 1oz', metal_type: 'silver', piece_type: 'bar', weight_oz: 1, purity: 0.999, year_start: null, year_end: null, mint: 'PAMP Suisse' },
  { name: 'PAMP Suisse Silver Bar 10oz', metal_type: 'silver', piece_type: 'bar', weight_oz: 10, purity: 0.999, year_start: null, year_end: null, mint: 'PAMP Suisse' },

  // Generic Gold Bars
  { name: 'Generic Gold Bar 1g', metal_type: 'gold', piece_type: 'bar', weight_oz: 0.03215, purity: 0.9999, year_start: null, year_end: null, mint: null },
  { name: 'Generic Gold Bar 5g', metal_type: 'gold', piece_type: 'bar', weight_oz: 0.16075, purity: 0.9999, year_start: null, year_end: null, mint: null },
  { name: 'Generic Gold Bar 10g', metal_type: 'gold', piece_type: 'bar', weight_oz: 0.3215, purity: 0.9999, year_start: null, year_end: null, mint: null },
  { name: 'Generic Gold Bar 1oz', metal_type: 'gold', piece_type: 'bar', weight_oz: 1, purity: 0.9999, year_start: null, year_end: null, mint: null },
  { name: 'Generic Gold Bar 10oz', metal_type: 'gold', piece_type: 'bar', weight_oz: 10, purity: 0.9999, year_start: null, year_end: null, mint: null },
  { name: 'Generic Gold Bar 1kg', metal_type: 'gold', piece_type: 'bar', weight_oz: 32.1507, purity: 0.9999, year_start: null, year_end: null, mint: null },
  { name: 'PAMP Suisse Gold Bar 1oz', metal_type: 'gold', piece_type: 'bar', weight_oz: 1, purity: 0.9999, year_start: null, year_end: null, mint: 'PAMP Suisse' },
  { name: 'Credit Suisse Gold Bar 1oz', metal_type: 'gold', piece_type: 'bar', weight_oz: 1, purity: 0.9999, year_start: null, year_end: null, mint: 'Credit Suisse' },

  // Generic Silver Rounds
  { name: 'Generic Silver Round 1oz', metal_type: 'silver', piece_type: 'round', weight_oz: 1, purity: 0.999, year_start: null, year_end: null, mint: null },
  { name: 'Walking Liberty Silver Round 1oz', metal_type: 'silver', piece_type: 'round', weight_oz: 1, purity: 0.999, year_start: null, year_end: null, mint: null },
  { name: 'Buffalo Silver Round 1oz', metal_type: 'silver', piece_type: 'round', weight_oz: 1, purity: 0.999, year_start: null, year_end: null, mint: null },
  { name: 'Sunshine Mint Silver Round 1oz', metal_type: 'silver', piece_type: 'round', weight_oz: 1, purity: 0.999, year_start: null, year_end: null, mint: 'Sunshine Mint' },
]

export function seedCatalog(db: InstanceType<typeof Database>): void {
  const insert = db.prepare(
    'INSERT INTO catalog_items (name, metal_type, piece_type, weight_oz, purity, year_start, year_end, mint) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )

  const insertMany = db.transaction(() => {
    for (const item of CATALOG_ITEMS) {
      insert.run(
        item.name,
        item.metal_type,
        item.piece_type,
        item.weight_oz,
        item.purity,
        item.year_start,
        item.year_end,
        item.mint
      )
    }
  })

  insertMany()
}
