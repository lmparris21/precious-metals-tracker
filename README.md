# Precious Metals Tracker

A local web app for tracking your silver and gold collection — coins, bars, and rounds. Tracks melt value, purchase cost, grading info, and photos.

![Dashboard](https://img.shields.io/badge/stack-React%20%2B%20Express%20%2B%20SQLite-yellow)

## Features

- **Dashboard** — total pieces, melt value, gain/loss, breakdown by metal type, live spot prices
- **Collection** — grid and table views, filter by metal/type/graded, text search, sort
- **Add/Edit pieces** — searchable catalog auto-fills specs (74 built-in coins, bars, and rounds), conditional grading fields (PCGS, NGC, etc.), quantity support
- **Photos** — drag-and-drop upload, side-by-side display, full-screen lightbox with keyboard navigation
- **Spot prices** — manual override or auto-fetch from [metals.dev](https://metals.dev) API
- **Melt value** — computed live: `weight × purity × spot price × quantity`

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | React + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| Backend | Express.js + tsx |
| Database | SQLite via better-sqlite3 |
| Photos | Local filesystem (`./data/photos/`) |

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/lmparris21/precious-metals-tracker.git
cd precious-metals-tracker
npm install
```

### 2. Start the app

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

This starts both the Vite frontend (port 5173) and Express API (port 3001) together.

### 3. Optional: live spot prices

Get a free API key from [metals.dev](https://metals.dev), then create a `.env` file in the project root:

```
METALS_DEV_API_KEY=your_key_here
```

Then use the **Refresh from API** button on the Dashboard or Settings page.

## Data Storage

All your data lives in the `data/` folder (gitignored — never committed):

```
data/
├── collection.db   # SQLite database (all pieces, spot prices, catalog)
└── photos/         # Uploaded photos
```

**To back up:** copy the `data/` folder somewhere safe.

**To transfer to another machine:** clone the repo, run `npm install`, then drop your `data/` folder into the project root.

## Project Structure

```
precious-metals-tracker/
├── server/
│   ├── index.ts              # Express entry point (port 3001)
│   ├── db.ts                 # SQLite schema + migrations + seeding
│   ├── routes/
│   │   ├── pieces.ts         # CRUD, photos, summary
│   │   ├── spot-prices.ts    # Spot price management
│   │   └── catalog.ts        # Catalog search
│   ├── services/
│   │   └── spot-price-api.ts # metals.dev API integration
│   ├── seed/
│   │   └── catalog.ts        # 74 pre-seeded common pieces
│   └── middleware/upload.ts  # Multer photo upload config
├── src/
│   ├── api/                  # Fetch wrappers for all endpoints
│   ├── components/
│   │   ├── collection/       # Collection page with grid/table/filters
│   │   ├── dashboard/        # Dashboard with stats and spot prices
│   │   ├── pieces/           # PieceForm, CatalogSearch, PhotoUpload, PhotoLightbox
│   │   └── settings/         # Spot price management page
│   ├── types/piece.ts        # TypeScript interfaces
│   └── App.tsx               # Routes
├── data/                     # Gitignored — DB and photos live here
└── .env                      # Gitignored — put your API key here
```

## Built-in Catalog

The catalog includes ~74 common pieces that auto-fill specs when adding a piece:

- **US:** American Silver/Gold Eagle, Gold Buffalo, Morgan Dollar, Peace Dollar, junk silver (halves, quarters, dimes)
- **Canadian:** Silver/Gold/Platinum Maple Leaf
- **South African:** Krugerrand (1oz, 1/2oz, 1/4oz, 1/10oz)
- **UK:** Britannia (silver/gold), Sovereign, Half Sovereign
- **Austrian:** Vienna Philharmonic (silver/gold)
- **Chinese:** Silver/Gold Panda
- **Mexican:** Silver/Gold Libertad
- **Australian:** Silver Kangaroo/Kookaburra, Gold Kangaroo, Platinum Koala
- **Bars:** Generic and branded (PAMP Suisse, Credit Suisse) in common sizes
- **Rounds:** Generic, Walking Liberty, Buffalo, Sunshine Mint
