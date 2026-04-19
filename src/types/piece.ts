export interface Piece {
  id: number
  metal_type: 'silver' | 'gold' | 'platinum' | 'palladium'
  piece_type: 'coin' | 'bar' | 'round' | 'other'
  name: string
  year?: number
  weight_oz: number
  weight_unit: 'oz' | 'g' | 'kg'
  purity: number
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

export interface Photo {
  id: number
  piece_id: number
  filename: string
  sort_order: number
  created_at: string
}

export interface SpotPrice {
  id: number
  metal_type: string
  price_per_oz: number
  source: 'manual' | 'api'
  updated_at: string
}

export interface CatalogItem {
  id: number
  name: string
  metal_type: string
  piece_type: string
  weight_oz: number
  purity: number
  year_start?: number
  year_end?: number
  mint?: string
}

export interface Summary {
  total_pieces: number
  graded_count: number
  raw_count: number
  total_purchase_cost: number
  total_estimated_value: number
  gain_loss: number
  total_melt_value: number
  by_metal: MetalSummary[]
}

export interface MetalSummary {
  metal_type: string
  count: number
  total_weight_oz: number
  total_pure_oz: number
  total_purchase_cost: number
  total_melt_value: number
  total_estimated_value: number
  spot_price: number
}
