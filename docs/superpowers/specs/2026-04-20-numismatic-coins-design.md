# Numismatic Coins Support

**Date:** 2026-04-20  
**Status:** Approved

## Summary

Add support for non-precious-metal coins (e.g. rare pennies) that are valuable due to rarity, not metal content. These are purely numismatic — no weight, purity, or melt value tracking needed. They appear in the same Collection and Dashboard views as precious metals, distinguished by a "Numismatic" category badge.

## Approach

Add `'numismatic'` as a new valid `metal_type` value. This slots into the existing dispatch pattern (badge colors, labels, filters) with minimal disruption. No separate table or flag needed.

## Data Model

### `pieces` table migration
SQLite doesn't support `ALTER COLUMN`, so the migration recreates the table:

1. `PRAGMA foreign_keys = OFF` (required — `piece_photos` references `pieces(id)`)
2. Create `pieces_new` with updated constraints:
   - `metal_type CHECK(metal_type IN ('silver', 'gold', 'platinum', 'palladium', 'numismatic'))`
   - `weight_oz REAL` (nullable — was `NOT NULL`)
   - `purity REAL` (nullable — was `NOT NULL`)
3. Copy all existing data from `pieces` to `pieces_new`
4. Drop `pieces`, rename `pieces_new` to `pieces`
5. `PRAGMA foreign_keys = ON`

Numismatic pieces store `NULL` for `weight_oz` and `purity`. The melt value formula (`weight_oz * purity * spot_price * quantity`) returns `NULL` for these, and `COALESCE(..., 0)` produces `0` — no special-casing needed in SQL.

### `catalog_items` table
Expand the `metal_type` constraint to include `'numismatic'` (same migration pattern). No catalog entries seeded for numismatic items initially.

### `spot_prices` table
Unchanged. No numismatic spot price entry needed.

## TypeScript Types (`src/types/piece.ts`)

- `metal_type`: `'silver' | 'gold' | 'platinum' | 'palladium' | 'numismatic'`
- `weight_oz`: `number | null` (was `number`)
- `purity`: `number | null` (was `number`)

## Server (`server/routes/pieces.ts`)

- POST and PUT validation: only require `weight_oz` and `purity` when `metal_type !== 'numismatic'`
- All SQL queries unchanged — `COALESCE(sp.price_per_oz, 0)` and `NULL` arithmetic already handle missing weight/purity gracefully

## Add/Edit Form (`src/components/pieces/PieceForm.tsx`)

- Metal dropdown gains `<option value="numismatic">Numismatic</option>` at the top
- When `metal_type === 'numismatic'`:
  - Hide the Weight, Unit, and Purity fields
  - Hide the AMW/total weight helper text
  - Submit `weight_oz: null` and `purity: null`
- `DEFAULT_FORM` remains `metal_type: 'silver'` — numismatic is opt-in
- `required` attribute removed from weight/purity inputs (they're conditionally rendered anyway)
- Piece Type dropdown (coin/bar/round/other) stays visible

## Collection View (`src/components/collection/Collection.tsx`)

- `METAL_COLORS`: add `numismatic: 'bg-amber-800 text-amber-200'`
- `AMW_LABEL`: add `numismatic: ''` — weight/purity line hidden when empty
- Grid cards and table rows: show `—` for melt value when `piece.metal_type === 'numismatic'`
- Metal filter dropdown: add "Numismatic" option
- CSV export: melt value column is empty string for numismatic pieces

## Dashboard (`src/components/dashboard/Dashboard.tsx`)

- The `by_metal` summary row for numismatic will have `total_melt_value: 0` — render `—` in the melt value column for that row
- Total melt value across all metals is unaffected (numismatic contributes `0`)

## Out of Scope

- Denomination or country-of-origin fields
- Numismatic catalog entries
- Copper/nickel spot price tracking
