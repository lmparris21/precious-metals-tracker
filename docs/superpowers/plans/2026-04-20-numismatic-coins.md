# Numismatic Coins Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `'numismatic'` as a `metal_type` value so users can track rarity-valued coins (e.g. rare pennies) without weight, purity, or melt value fields.

**Architecture:** Extend the existing `metal_type` enum throughout DB, types, server, and UI. Numismatic pieces store `NULL` for `weight_oz` and `purity`; melt value naturally computes to 0 via `COALESCE`. The form hides irrelevant fields when `numismatic` is selected; the Collection and Dashboard show `—` instead of numeric metal-specific values.

**Tech Stack:** SQLite (better-sqlite3), Express, React 19, TypeScript, Tailwind CSS v4, Vite

---

## File Map

| File | Change |
|------|--------|
| `server/db.ts` | Two migrations: recreate `pieces` (nullable weight/purity, new CHECK), expand `catalog_items` CHECK |
| `src/types/piece.ts` | Add `'numismatic'` to `metal_type`; make `weight_oz` and `purity` `number \| null` |
| `server/routes/pieces.ts` | Conditional validation — skip weight/purity requirement for numismatic |
| `src/components/pieces/PieceForm.tsx` | Add Numismatic option; hide weight/purity/unit fields when selected |
| `src/components/collection/Collection.tsx` | Badge color, AMW hide, melt value `—`, filter option, weight line hide, CSV |
| `src/components/dashboard/Dashboard.tsx` | Show `—` for weight/purity/spot/melt columns on numismatic row |

---

## Task 1: DB Migration

**Files:**
- Modify: `server/db.ts`

- [ ] **Step 1: Add pieces table migration**

Open `server/db.ts`. After the existing `quantity` migration block (around line 76), add:

```typescript
// Migrate: support numismatic pieces (nullable weight_oz/purity, expanded metal_type CHECK)
const piecesColInfo = db.prepare("PRAGMA table_info(pieces)").all() as { name: string, notnull: number }[]
const weightOzCol = piecesColInfo.find(c => c.name === 'weight_oz')
if (weightOzCol && weightOzCol.notnull === 1) {
  db.pragma('foreign_keys = OFF')
  db.exec(`
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
    INSERT INTO pieces_new SELECT * FROM pieces;
    DROP TABLE pieces;
    ALTER TABLE pieces_new RENAME TO pieces;
  `)
  db.pragma('foreign_keys = ON')
}
```

- [ ] **Step 2: Add catalog_items table migration**

Immediately after the pieces migration block, add:

```typescript
// Migrate: expand catalog_items metal_type CHECK to include numismatic
const catalogSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='catalog_items'").get() as { sql: string } | undefined
if (catalogSchema && !catalogSchema.sql.includes('numismatic')) {
  db.exec(`
    CREATE TABLE catalog_items_new (
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
    INSERT INTO catalog_items_new SELECT * FROM catalog_items;
    DROP TABLE catalog_items;
    ALTER TABLE catalog_items_new RENAME TO catalog_items;
  `)
}
```

- [ ] **Step 3: Verify the server starts without errors**

```bash
npm run dev
```

Expected: Server starts, no SQLite errors in terminal. If the DB already existed, you should see the migration run silently (no output). If it's a fresh DB, the tables are created with the new schema directly.

- [ ] **Step 4: Commit**

```bash
git add server/db.ts
git commit -m "feat: migrate DB to support numismatic metal_type with nullable weight/purity"
```

---

## Task 2: TypeScript Types

**Files:**
- Modify: `src/types/piece.ts`

- [ ] **Step 1: Update the Piece interface**

In `src/types/piece.ts`, change lines 3, 8, and 9:

```typescript
export interface Piece {
  id: number
  metal_type: 'silver' | 'gold' | 'platinum' | 'palladium' | 'numismatic'
  piece_type: 'coin' | 'bar' | 'round' | 'other'
  name: string
  year?: number
  weight_oz: number | null
  weight_unit: 'oz' | 'g' | 'kg'
  purity: number | null
  quantity: number
  is_graded: boolean
  grading_service?: string
  grade?: string
  cert_number?: string
  purchase_price?: number
  purchase_date?: string
  estimated_value?: number
  melt_value?: number
  notes?: string
  created_at: string
  updated_at: string
  photos?: Photo[]
  photo_count?: number
  first_photo?: string
  photo_filenames?: string
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: Build succeeds (TypeScript errors will appear in later tasks as we update components — that's fine for now; just confirm `piece.ts` itself has no errors by checking the error list doesn't reference `piece.ts`).

- [ ] **Step 3: Commit**

```bash
git add src/types/piece.ts
git commit -m "feat: add numismatic to Piece metal_type; weight_oz and purity now nullable"
```

---

## Task 3: Server Validation

**Files:**
- Modify: `server/routes/pieces.ts`

- [ ] **Step 1: Update POST validation**

In `server/routes/pieces.ts`, find the POST handler validation (around line 101):

```typescript
// Before:
if (!metal_type || !piece_type || !name || weight_oz == null || purity == null) {
  res.status(400).json({ error: 'metal_type, piece_type, name, weight_oz, and purity are required' })
  return
}
```

Replace with:

```typescript
const needsWeightPurity = metal_type !== 'numismatic'
if (!metal_type || !piece_type || !name || (needsWeightPurity && (weight_oz == null || purity == null))) {
  res.status(400).json({ error: 'metal_type, piece_type, and name are required; weight_oz and purity are required for non-numismatic pieces' })
  return
}
```

- [ ] **Step 2: Update PUT validation**

Find the PUT handler validation (around line 145), same pattern:

```typescript
// Before:
if (!metal_type || !piece_type || !name || weight_oz == null || purity == null) {
  res.status(400).json({ error: 'metal_type, piece_type, name, weight_oz, and purity are required' })
  return
}
```

Replace with:

```typescript
const needsWeightPurity = metal_type !== 'numismatic'
if (!metal_type || !piece_type || !name || (needsWeightPurity && (weight_oz == null || purity == null))) {
  res.status(400).json({ error: 'metal_type, piece_type, and name are required; weight_oz and purity are required for non-numismatic pieces' })
  return
}
```

- [ ] **Step 3: Verify server still starts**

```bash
npm run dev
```

Expected: Server starts with no errors.

- [ ] **Step 4: Commit**

```bash
git add server/routes/pieces.ts
git commit -m "feat: allow null weight_oz/purity for numismatic pieces in server validation"
```

---

## Task 4: PieceForm — Add Numismatic Option

**Files:**
- Modify: `src/components/pieces/PieceForm.tsx`

- [ ] **Step 1: Update the Metal dropdown**

In `PieceForm.tsx`, find the Metal `<select>` (around line 195):

```tsx
<select value={form.metal_type} onChange={e => set('metal_type', e.target.value)} className={inputCls}>
  <option value="numismatic">Numismatic</option>
  <option value="silver">Silver</option>
  <option value="gold">Gold</option>
  <option value="platinum">Platinum</option>
  <option value="palladium">Palladium</option>
</select>
```

- [ ] **Step 2: Conditionally hide weight/unit/purity fields**

Find the grid that contains Weight, Unit, and Purity (around line 213). Wrap it:

```tsx
{form.metal_type !== 'numismatic' && (
  <div className="grid grid-cols-3 gap-4">
    <div>
      <label className={labelCls}>Weight *</label>
      <input required type="number" step="any" min="0" value={form.weight_oz}
        onChange={e => set('weight_oz', e.target.value)} className={inputCls} />
    </div>
    <div>
      <label className={labelCls}>Unit</label>
      <select value={form.weight_unit} onChange={e => set('weight_unit', e.target.value)} className={inputCls}>
        <option value="oz">oz (troy)</option>
        <option value="g">grams</option>
        <option value="kg">kg</option>
      </select>
    </div>
    <div>
      <label className={labelCls}>Purity *</label>
      <input required type="number" step="any" min="0" max="1" value={form.purity}
        onChange={e => set('purity', e.target.value)} placeholder="0.999" className={inputCls} />
    </div>
  </div>
)}
```

- [ ] **Step 3: Conditionally hide the AMW helper text**

Find the AMW helper paragraph (around line 233):

```tsx
{form.metal_type === 'oz' && Number(form.weight_oz) > 0 && ...}
```

The existing condition already uses `form.weight_unit === 'oz'` — since the weight fields are hidden for numismatic, this helper won't render. No change needed here.

- [ ] **Step 4: Submit null weight/purity for numismatic**

In the `handleSubmit` function, find where `data` is built (around line 108). Update the `weight_oz` and `purity` lines:

```typescript
const data: Partial<Piece> = {
  name: form.name,
  year: form.year ? Number(form.year) : undefined,
  metal_type: form.metal_type as Piece['metal_type'],
  piece_type: form.piece_type as Piece['piece_type'],
  weight_oz: form.metal_type === 'numismatic' ? null : Number(form.weight_oz),
  weight_unit: form.weight_unit as Piece['weight_unit'],
  purity: form.metal_type === 'numismatic' ? null : Number(form.purity),
  quantity: Number(form.quantity) || 1,
  is_graded: form.is_graded,
  grading_service: form.is_graded ? form.grading_service || undefined : undefined,
  grade: form.is_graded ? form.grade || undefined : undefined,
  cert_number: form.is_graded ? form.cert_number || undefined : undefined,
  purchase_price: form.purchase_price ? Number(form.purchase_price) : undefined,
  purchase_date: form.purchase_date || undefined,
  estimated_value: form.estimated_value ? Number(form.estimated_value) : undefined,
  notes: form.notes || undefined,
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npm run build
```

Expected: No errors in `PieceForm.tsx`. There may still be errors in Collection and Dashboard (addressed in later tasks).

- [ ] **Step 6: Manual smoke test — add a numismatic piece**

With the dev server running (`npm run dev`), open the app and navigate to Add New Piece:
- Select "Numismatic" in the Metal dropdown
- Confirm weight, unit, and purity fields disappear
- Fill in a name (e.g. "1909-S VDB Lincoln Cent"), year (1909), quantity (1)
- Set a purchase price and estimated value
- Click "Add Piece"
- Confirm it saves successfully and you land on the photo upload step

- [ ] **Step 7: Commit**

```bash
git add src/components/pieces/PieceForm.tsx
git commit -m "feat: add Numismatic option to PieceForm; hide weight/purity fields when selected"
```

---

## Task 5: Collection View Updates

**Files:**
- Modify: `src/components/collection/Collection.tsx`

- [ ] **Step 1: Update METAL_COLORS**

Find `METAL_COLORS` (around line 16):

```typescript
const METAL_COLORS: Record<string, string> = {
  silver: 'bg-gray-600 text-gray-200',
  gold: 'bg-yellow-700 text-yellow-200',
  platinum: 'bg-blue-800 text-blue-200',
  palladium: 'bg-purple-800 text-purple-200',
  numismatic: 'bg-amber-800 text-amber-200',
}
```

- [ ] **Step 2: Update AMW_LABEL**

Find `AMW_LABEL` (around line 23):

```typescript
const AMW_LABEL: Record<string, string> = {
  silver: 'ASW',
  gold: 'AGW',
  platinum: 'APW',
  palladium: 'APdW',
  numismatic: '',
}
```

- [ ] **Step 3: Update grid card — melt value display**

Find the grid card melt value line (around line 293):

```tsx
<div>
  <p className="text-gray-500">Melt Value</p>
  <p className="text-green-400 font-medium">
    {piece.metal_type === 'numismatic' ? '—' : formatMoney(piece.melt_value)}
  </p>
</div>
```

- [ ] **Step 4: Update grid card — weight/purity line**

Find the weight/purity/AMW line at the bottom of the grid card (around line 303):

```tsx
<div className="flex justify-between items-center">
  {piece.metal_type !== 'numismatic' && (
    <span className="text-gray-600 text-xs">
      {piece.weight_oz}oz · {(Number(piece.purity) * 100).toFixed(1)}% · {AMW_LABEL[piece.metal_type] ?? 'AMW'} {(piece.weight_oz! * Number(piece.purity)).toFixed(4)}oz
      {piece.quantity > 1 && <span className="ml-1 text-yellow-500 font-medium">×{piece.quantity} = {(piece.weight_oz! * piece.quantity).toFixed(4)}oz total</span>}
    </span>
  )}
  {piece.metal_type === 'numismatic' && (
    <span className="text-gray-600 text-xs">Numismatic</span>
  )}
  <button
    onClick={e => handleDelete(e, piece)}
    className="text-red-600 hover:text-red-400 text-xs px-2 py-1 rounded hover:bg-red-900/20"
  >
    Delete
  </button>
</div>
```

- [ ] **Step 5: Update table row — weight cell**

Find the Weight `<td>` in the table view (around line 386):

```tsx
<td className="py-2 pr-4 text-gray-300">
  {piece.metal_type === 'numismatic' ? (
    <span className="text-gray-600 text-xs">—</span>
  ) : (
    <>
      <div>{piece.weight_oz}oz{piece.quantity > 1 && <span className="text-yellow-600 text-xs ml-1">×{piece.quantity} = {(piece.weight_oz! * piece.quantity).toFixed(4)}oz</span>}</div>
      <div className="text-gray-500 text-xs">{AMW_LABEL[piece.metal_type] ?? 'AMW'} {(piece.weight_oz! * Number(piece.purity)).toFixed(4)}oz</div>
    </>
  )}
</td>
```

- [ ] **Step 6: Update table row — melt value cell**

Find the melt value `<td>` (around line 390):

```tsx
<td className="py-2 pr-4 text-green-400">
  {piece.metal_type === 'numismatic' ? <span className="text-gray-600">—</span> : formatMoney(piece.melt_value)}
</td>
```

- [ ] **Step 7: Add Numismatic option to the metal filter**

Find the metal filter `<select>` (around line 193):

```tsx
<select value={metalFilter} onChange={e => setMetalFilter(e.target.value)}
  className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-100">
  <option value="">All Metals</option>
  <option value="silver">Silver</option>
  <option value="gold">Gold</option>
  <option value="platinum">Platinum</option>
  <option value="palladium">Palladium</option>
  <option value="numismatic">Numismatic</option>
</select>
```

- [ ] **Step 8: Update CSV export — melt value column**

Find the CSV `escape(p.melt_value ...)` line (around line 130):

```typescript
escape(p.metal_type === 'numismatic' ? '' : p.melt_value != null ? (p.melt_value * rate).toFixed(2) : undefined),
```

- [ ] **Step 9: Verify TypeScript compiles**

```bash
npm run build
```

Expected: No errors in `Collection.tsx`.

- [ ] **Step 10: Manual smoke test — Collection view**

With dev server running:
- Navigate to Collection
- Confirm the numismatic piece added in Task 4 shows the amber "numismatic" badge
- Confirm its Melt Value shows `—`
- Confirm the weight/purity line is replaced with "Numismatic"
- Switch to Table view — confirm weight cell shows `—`, melt value shows `—`
- Test the "Numismatic" filter option

- [ ] **Step 11: Commit**

```bash
git add src/components/collection/Collection.tsx
git commit -m "feat: display numismatic pieces in Collection with amber badge, hide metal-specific fields"
```

---

## Task 6: Dashboard Updates

**Files:**
- Modify: `src/components/dashboard/Dashboard.tsx`

- [ ] **Step 1: Update the by-metal breakdown table row**

Find the table row in the `by_metal` map (around line 110). Update to show `—` for all metal-specific columns when `m.metal_type === 'numismatic'`:

```tsx
{summary.by_metal.map(m => (
  <tr key={m.metal_type} className="border-b border-gray-800/50">
    <td className="px-6 py-3 font-medium text-gray-100 capitalize">{m.metal_type}</td>
    <td className="px-6 py-3 text-gray-300">{m.count}</td>
    <td className="px-6 py-3 text-gray-300">
      {m.metal_type === 'numismatic' ? <span className="text-gray-600">—</span> : formatOz(m.total_weight_oz)}
    </td>
    <td className="px-6 py-3 text-gray-300">
      {m.metal_type === 'numismatic' ? <span className="text-gray-600">—</span> : formatOz(m.total_pure_oz)}
    </td>
    <td className="px-6 py-3 text-gray-400">
      {m.metal_type === 'numismatic' ? <span className="text-gray-600">—</span> : `${formatMoney(m.spot_price)}/oz`}
    </td>
    <td className="px-6 py-3 text-yellow-400 font-medium">
      {m.metal_type === 'numismatic' ? <span className="text-gray-600">—</span> : formatMoney(m.total_melt_value)}
    </td>
    <td className="px-6 py-3 text-gray-400">{formatUserMoney(m.total_purchase_cost)}</td>
    <td className="px-6 py-3 text-gray-200">{formatUserMoney(m.total_estimated_value)}</td>
  </tr>
))}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npm run build
```

Expected: Zero TypeScript errors across all files.

- [ ] **Step 3: Manual smoke test — Dashboard**

With dev server running:
- Navigate to Dashboard
- Confirm the "Breakdown by Metal" table has a "numismatic" row
- Confirm Total Weight, Pure Oz, Spot Price, and Melt Value all show `—` for that row
- Confirm Cost and Est. Value show the values you entered
- Confirm "Total Melt Value" at the top is not inflated by the numismatic piece

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/Dashboard.tsx
git commit -m "feat: hide metal-specific columns for numismatic row in Dashboard breakdown"
```

---

## Self-Review Notes

- **Spec coverage:** All sections covered — DB migration ✓, TypeScript types ✓, server validation ✓, form ✓, collection ✓, dashboard ✓, out-of-scope items intentionally excluded ✓
- **Migration safety:** `PRAGMA foreign_keys = OFF/ON` wraps the `pieces` table recreation; `piece_photos` FK relationship preserved
- **Null safety:** All `piece.weight_oz` and `piece.purity` usages in Collection are guarded with `piece.metal_type !== 'numismatic'` before arithmetic, avoiding `NaN`
- **Type consistency:** `weight_oz: number | null` defined in Task 2 and used with `!` non-null assertion only inside the `!== 'numismatic'` guards in Task 5
