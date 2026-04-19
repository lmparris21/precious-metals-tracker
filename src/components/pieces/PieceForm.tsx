import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { createPiece, updatePiece, getPiece } from '../../api/pieces'
import CatalogSearch from './CatalogSearch'
import PhotoUpload from './PhotoUpload'
import type { CatalogItem, Piece, Photo } from '../../types/piece'

interface FormState {
  name: string
  year: string
  metal_type: string
  piece_type: string
  weight_oz: string
  weight_unit: string
  purity: string
  quantity: string
  is_graded: boolean
  grading_service: string
  grade: string
  cert_number: string
  purchase_price: string
  purchase_date: string
  estimated_value: string
  notes: string
}

const DEFAULT_FORM: FormState = {
  name: '',
  year: '',
  metal_type: 'silver',
  piece_type: 'coin',
  weight_oz: '1',
  weight_unit: 'oz',
  purity: '0.999',
  quantity: '1',
  is_graded: false,
  grading_service: '',
  grade: '',
  cert_number: '',
  purchase_price: '',
  purchase_date: '',
  estimated_value: '',
  notes: '',
}

export default function PieceForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = Boolean(id)

  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedPieceId, setSavedPieceId] = useState<number | null>(null)
  const [savedPiecePhotos, setSavedPiecePhotos] = useState<Photo[]>([])

  useEffect(() => {
    if (!isEditing || !id) return
    getPiece(Number(id)).then(piece => {
      setForm({
        name: piece.name,
        year: piece.year?.toString() ?? '',
        metal_type: piece.metal_type,
        piece_type: piece.piece_type,
        weight_oz: piece.weight_oz.toString(),
        weight_unit: piece.weight_unit,
        purity: piece.purity.toString(),
        quantity: piece.quantity?.toString() ?? '1',
        is_graded: Boolean(piece.is_graded),
        grading_service: piece.grading_service ?? '',
        grade: piece.grade ?? '',
        cert_number: piece.cert_number ?? '',
        purchase_price: piece.purchase_price?.toString() ?? '',
        purchase_date: piece.purchase_date ?? '',
        estimated_value: piece.estimated_value?.toString() ?? '',
        notes: piece.notes ?? '',
      })
    }).catch(() => setError('Failed to load piece'))
  }, [id, isEditing])

  function handleCatalogSelect(item: CatalogItem) {
    setForm(f => ({
      ...f,
      metal_type: item.metal_type,
      piece_type: item.piece_type,
      weight_oz: item.weight_oz.toString(),
      purity: item.purity.toString(),
      name: f.name || item.name, // only auto-fill name if empty
    }))
  }

  function set(field: keyof FormState, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const data: Partial<Piece> = {
      name: form.name,
      year: form.year ? Number(form.year) : undefined,
      metal_type: form.metal_type as Piece['metal_type'],
      piece_type: form.piece_type as Piece['piece_type'],
      weight_oz: Number(form.weight_oz),
      weight_unit: form.weight_unit as Piece['weight_unit'],
      purity: Number(form.purity),
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

    try {
      const piece = isEditing && id
        ? await updatePiece(Number(id), data)
        : await createPiece(data)

      // Fetch photos first, then reveal the photo step in one render so
      // PhotoUpload mounts with the correct initialPhotos already set
      const fullPiece = await getPiece(piece.id)
      setSavedPiecePhotos(fullPiece.photos ?? [])
      setSavedPieceId(piece.id)
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save piece')
      setLoading(false)
    }
  }

  // Helper for input class
  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-yellow-500'
  const labelCls = 'block text-sm text-gray-400 mb-1'

  if (savedPieceId !== null) {
    return (
      <div className="max-w-2xl">
        <div className="bg-green-900/30 border border-green-700 text-green-300 rounded px-4 py-3 mb-6">
          Piece saved! Add photos below or click Done.
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-200 mb-4">Photos</h2>
          <PhotoUpload pieceId={savedPieceId} initialPhotos={savedPiecePhotos} />
        </div>
        <button onClick={() => navigate('/collection')}
          className="bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-semibold px-6 py-2 rounded">
          Done
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-yellow-400 mb-6">
        {isEditing ? 'Edit Piece' : 'Add New Piece'}
      </h1>

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 rounded px-4 py-3 mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Catalog search */}
        <CatalogSearch onSelect={handleCatalogSelect} />

        {/* Basic info */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-200">Piece Details</h2>

          <div>
            <label className={labelCls}>Name *</label>
            <input required value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="e.g. 2024 American Silver Eagle" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Metal *</label>
              <select value={form.metal_type} onChange={e => set('metal_type', e.target.value)} className={inputCls}>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
                <option value="palladium">Palladium</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Type *</label>
              <select value={form.piece_type} onChange={e => set('piece_type', e.target.value)} className={inputCls}>
                <option value="coin">Coin</option>
                <option value="bar">Bar</option>
                <option value="round">Round</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Year</label>
              <input type="number" min="1700" max="2100" value={form.year}
                onChange={e => set('year', e.target.value)} placeholder="e.g. 2024" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Quantity</label>
              <input required type="number" min="1" step="1" value={form.quantity}
                onChange={e => set('quantity', e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>

        {/* Grading */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-3">
            <input type="checkbox" id="is_graded" checked={form.is_graded}
              onChange={e => set('is_graded', e.target.checked)}
              className="w-4 h-4 accent-yellow-500" />
            <label htmlFor="is_graded" className="text-gray-200 font-medium cursor-pointer">
              Graded piece (PCGS, NGC, etc.)
            </label>
          </div>

          {form.is_graded && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Grading Service</label>
                  <input value={form.grading_service} onChange={e => set('grading_service', e.target.value)}
                    placeholder="e.g. PCGS, NGC" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Grade</label>
                  <input value={form.grade} onChange={e => set('grade', e.target.value)}
                    placeholder="e.g. MS70, PR69" className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Cert Number</label>
                <input value={form.cert_number} onChange={e => set('cert_number', e.target.value)}
                  placeholder="Certification number" className={inputCls} />
              </div>
            </div>
          )}
        </div>

        {/* Financials */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-200">Financial Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Purchase Price ($)</label>
              <input type="number" step="any" min="0" value={form.purchase_price}
                onChange={e => set('purchase_price', e.target.value)} placeholder="0.00" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Purchase Date</label>
              <input type="date" value={form.purchase_date}
                onChange={e => set('purchase_date', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Estimated Value ($)</label>
            <input type="number" step="any" min="0" value={form.estimated_value}
              onChange={e => set('estimated_value', e.target.value)} placeholder="0.00" className={inputCls} />
          </div>
        </div>

        {/* Notes */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <label className={labelCls}>Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
            rows={3} placeholder="Any notes about this piece..."
            className={`${inputCls} resize-none`} />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-gray-950 font-semibold px-6 py-2 rounded">
            {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Piece'}
          </button>
          <button type="button" onClick={() => navigate(-1)}
            className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-6 py-2 rounded">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
