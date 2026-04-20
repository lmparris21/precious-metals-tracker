import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPieces, deletePiece, getPiece } from '../../api/pieces'
import { useCurrency } from '../../context/CurrencyContext'
import type { Piece, Photo } from '../../types/piece'
import PhotoLightbox from '../pieces/PhotoLightbox'

type ViewMode = 'grid' | 'table'

interface LightboxState {
  photos: Photo[]
  index: number
  pieceName: string
}

const METAL_COLORS: Record<string, string> = {
  silver: 'bg-gray-600 text-gray-200',
  gold: 'bg-yellow-700 text-yellow-200',
  platinum: 'bg-blue-800 text-blue-200',
  palladium: 'bg-purple-800 text-purple-200',
  numismatic: 'bg-amber-800 text-amber-200',
}

const AMW_LABEL: Record<string, string> = {
  silver: 'ASW',
  gold: 'AGW',
  platinum: 'APW',
  palladium: 'APdW',
  numismatic: '',
}

export default function Collection() {
  const navigate = useNavigate()
  const { formatMoney, formatUserMoney, currency, rate } = useCurrency()
  const [pieces, setPieces] = useState<Piece[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [lightbox, setLightbox] = useState<LightboxState | null>(null)

  const [metalFilter, setMetalFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [gradedFilter, setGradedFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  function handleSort(col: string) {
    if (col === sortBy) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(col)
      setSortDir('asc')
    }
  }

  function SortTh({ col, children }: { col: string; children: React.ReactNode }) {
    const active = sortBy === col
    return (
      <th
        className="pb-2 pr-4 cursor-pointer select-none hover:text-gray-200 whitespace-nowrap"
        onClick={() => handleSort(col)}
      >
        {children}
        <span className="ml-1 text-xs">
          {active ? (sortDir === 'asc' ? '↑' : '↓') : <span className="opacity-30">↕</span>}
        </span>
      </th>
    )
  }

  const fetchPieces = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getPieces({
        metal_type: metalFilter || undefined,
        piece_type: typeFilter || undefined,
        is_graded: gradedFilter === 'graded' ? true : gradedFilter === 'raw' ? false : undefined,
        q: searchQuery || undefined,
        sort: sortBy,
        sort_dir: sortDir,
      })
      setPieces(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [metalFilter, typeFilter, gradedFilter, searchQuery, sortBy, sortDir])

  useEffect(() => { fetchPieces() }, [fetchPieces])

  async function openLightbox(e: React.MouseEvent, piece: Piece, startIndex = 0) {
    e.stopPropagation()
    const full = await getPiece(piece.id)
    if (full.photos && full.photos.length > 0) {
      setLightbox({ photos: full.photos, index: startIndex, pieceName: piece.name })
    }
  }

  function exportCSV() {
    const headers = [
      'Name', 'Year', 'Metal', 'Type', 'Weight (oz)', 'Weight Unit', 'Purity',
      'Quantity', 'Graded', 'Grading Service', 'Grade', 'Cert Number',
      `Purchase Price (${currency})`, 'Purchase Date', `Estimated Value (${currency})`,
      `Melt Value (${currency})`, 'Notes'
    ]

    const escape = (v: string | number | undefined | null) => {
      if (v == null) return ''
      const s = String(v)
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s
    }

    const rows = pieces.map(p => [
      escape(p.name),
      escape(p.year),
      escape(p.metal_type),
      escape(p.piece_type),
      escape(p.weight_oz),
      escape(p.weight_unit),
      escape(p.purity),
      escape(p.quantity),
      escape(p.is_graded ? 'Yes' : 'No'),
      escape(p.grading_service),
      escape(p.grade),
      escape(p.cert_number),
      escape(p.purchase_price),
      escape(p.purchase_date),
      escape(p.estimated_value),
      escape(p.metal_type === 'numismatic' ? '' : p.melt_value != null ? (p.melt_value * rate).toFixed(2) : undefined),
      escape(p.notes),
    ].join(','))

    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `metals-collection-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDelete(e: React.MouseEvent, piece: Piece) {
    e.stopPropagation()
    if (!window.confirm(`Delete "${piece.name}"? This cannot be undone.`)) return
    await deletePiece(piece.id)
    fetchPieces()
  }

  return (
    <div>
      {lightbox && (
        <PhotoLightbox
          photos={lightbox.photos}
          index={lightbox.index}
          pieceName={lightbox.pieceName}
          onClose={() => setLightbox(null)}
          onNavigate={i => setLightbox(lb => lb ? { ...lb, index: i } : null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-yellow-400">Collection</h1>
        <div className="flex gap-2">
          <button onClick={() => setViewMode('grid')}
            className={`px-3 py-1 rounded text-sm ${viewMode === 'grid' ? 'bg-yellow-500 text-gray-950 font-semibold' : 'bg-gray-800 text-gray-400'}`}>
            Grid
          </button>
          <button onClick={() => setViewMode('table')}
            className={`px-3 py-1 rounded text-sm ${viewMode === 'table' ? 'bg-yellow-500 text-gray-950 font-semibond' : 'bg-gray-800 text-gray-400'}`}>
            Table
          </button>
          {pieces.length > 0 && (
            <button onClick={exportCSV}
              className="px-3 py-1 rounded text-sm bg-gray-800 text-gray-400 hover:text-gray-200">
              ↓ CSV
            </button>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search pieces..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-yellow-500 flex-1 min-w-40"
        />
        <select value={metalFilter} onChange={e => setMetalFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-100">
          <option value="">All Metals</option>
          <option value="silver">Silver</option>
          <option value="gold">Gold</option>
          <option value="platinum">Platinum</option>
          <option value="palladium">Palladium</option>
          <option value="numismatic">Numismatic</option>
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-100">
          <option value="">All Types</option>
          <option value="coin">Coin</option>
          <option value="bar">Bar</option>
          <option value="round">Round</option>
          <option value="other">Other</option>
        </select>
        <select value={gradedFilter} onChange={e => setGradedFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-100">
          <option value="">Graded + Raw</option>
          <option value="graded">Graded Only</option>
          <option value="raw">Raw Only</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-100">
          <option value="created_at">Date Added</option>
          <option value="name">Name</option>
          <option value="melt_value">Melt Value</option>
          <option value="purchase_price">Purchase Price</option>
          <option value="estimated_value">Est. Value</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-gray-500 text-center py-16">Loading...</div>
      ) : pieces.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg mb-4">No pieces found</p>
          <button onClick={() => navigate('/pieces/new')}
            className="bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-semibold px-6 py-2 rounded">
            Add Your First Piece
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pieces.map(piece => (
            <div key={piece.id} className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden hover:border-gray-600 transition-colors">

              {/* Photo area — click opens lightbox */}
              {piece.photo_filenames ? (() => {
                const all = piece.photo_filenames!.split(',')
                const visible = all.slice(0, 2)
                const overflow = all.length - 2
                return (
                  <div className="flex bg-gray-800 h-40">
                    {visible.map((filename, i) => (
                      <div key={filename} className="relative flex-1 min-w-0 h-full" style={{ borderLeft: i > 0 ? '1px solid #111827' : undefined }}>
                        <img
                          src={`/api/photos/${filename}`}
                          alt={`${piece.name} photo ${i + 1}`}
                          onClick={e => openLightbox(e, piece, i)}
                          className="w-full h-full object-contain cursor-zoom-in hover:brightness-110 transition-all"
                        />
                        {i === 1 && overflow > 0 && (
                          <div
                            onClick={e => openLightbox(e, piece, 2)}
                            className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-zoom-in hover:bg-black/50 transition-colors"
                          >
                            <span className="text-white font-semibold text-lg">+{overflow}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              })() : (
                <div className="w-full h-40 bg-gray-800 flex items-center justify-center text-gray-600 text-4xl">🪙</div>
              )}

              {/* Card body — click goes to edit */}
              <div
                className="p-4 cursor-pointer"
                onClick={() => navigate(`/pieces/${piece.id}/edit`)}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="font-semibold text-gray-100 text-sm leading-tight">{piece.name}</p>
                    {!!piece.year && <p className="text-gray-500 text-xs">{piece.year}</p>}
                    {!!piece.is_graded && (
                      <p className="text-blue-400 text-xs">{piece.grading_service} {piece.grade}</p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${METAL_COLORS[piece.metal_type] ?? 'bg-gray-700 text-gray-300'}`}>
                    {piece.metal_type}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div>
                    <p className="text-gray-500">Melt Value</p>
                    <p className="text-green-400 font-medium">
                      {piece.metal_type === 'numismatic' ? '—' : formatMoney(piece.melt_value)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Est. Value</p>
                    <p className="text-gray-200 font-medium">{formatUserMoney(piece.estimated_value)}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  {piece.metal_type !== 'numismatic' ? (
                    <span className="text-gray-600 text-xs">
                      {piece.weight_oz}oz · {(Number(piece.purity) * 100).toFixed(1)}% · {AMW_LABEL[piece.metal_type] ?? 'AMW'} {(piece.weight_oz! * Number(piece.purity)).toFixed(4)}oz
                      {piece.quantity > 1 && <span className="ml-1 text-yellow-500 font-medium">×{piece.quantity} = {(piece.weight_oz! * piece.quantity).toFixed(4)}oz total</span>}
                    </span>
                  ) : (
                    <span className="text-gray-600 text-xs">Numismatic</span>
                  )}
                  <button
                    onClick={e => handleDelete(e, piece)}
                    className="text-red-600 hover:text-red-400 text-xs px-2 py-1 rounded hover:bg-red-900/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-left">
                <th className="pb-2 pr-4 w-20">Photos</th>
                <SortTh col="name">Name</SortTh>
                <th className="pb-2 pr-4">Metal</th>
                <th className="pb-2 pr-4">Type</th>
                <th className="pb-2 pr-4">Qty</th>
                <th className="pb-2 pr-4">Weight</th>
                <SortTh col="melt_value">Melt Value</SortTh>
                <SortTh col="estimated_value">Est. Value</SortTh>
                <SortTh col="purchase_price">Paid</SortTh>
                <SortTh col="purchase_date">Date</SortTh>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pieces.map(piece => (
                <tr key={piece.id}
                  onClick={() => navigate(`/pieces/${piece.id}/edit`)}
                  className="border-b border-gray-800/50 hover:bg-gray-900/50 cursor-pointer">

                  {/* Photos cell */}
                  <td className="py-2 pr-4" onClick={e => e.stopPropagation()}>
                    {piece.photo_filenames ? (() => {
                      const all = piece.photo_filenames!.split(',')
                      const visible = all.slice(0, 2)
                      const overflow = all.length - 2
                      return (
                        <div className="flex gap-1 items-center">
                          {visible.map((filename, i) => (
                            <div key={filename} className="relative">
                              <img
                                src={`/api/photos/${filename}`}
                                alt={piece.name}
                                onClick={e => openLightbox(e, piece, i)}
                                className="w-10 h-10 object-contain bg-gray-800 rounded cursor-zoom-in hover:ring-2 hover:ring-yellow-400"
                              />
                              {i === 1 && overflow > 0 && (
                                <div
                                  onClick={e => openLightbox(e, piece, 2)}
                                  className="absolute inset-0 bg-black/60 rounded flex items-center justify-center cursor-zoom-in"
                                >
                                  <span className="text-white text-xs font-semibold">+{overflow}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )
                    })() : (
                      <span className="text-gray-700 text-lg">🪙</span>
                    )}
                  </td>

                  <td className="py-2 pr-4">
                    <div className="text-gray-100">{piece.name}</div>
                    {!!piece.year && <div className="text-gray-500 text-xs">{piece.year}</div>}
                    {!!piece.is_graded && <div className="text-blue-400 text-xs">{piece.grading_service} {piece.grade}</div>}
                  </td>
                  <td className="py-2 pr-4">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${METAL_COLORS[piece.metal_type] ?? 'bg-gray-700 text-gray-300'}`}>
                      {piece.metal_type}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-gray-300 capitalize">{piece.piece_type}</td>
                  <td className="py-2 pr-4 text-gray-300">{piece.quantity ?? 1}</td>
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
                  <td className="py-2 pr-4 text-green-400">
                    {piece.metal_type === 'numismatic' ? <span className="text-gray-600">—</span> : formatMoney(piece.melt_value)}
                  </td>
                  <td className="py-2 pr-4 text-gray-200">{formatUserMoney(piece.estimated_value)}</td>
                  <td className="py-2 pr-4 text-gray-400">{formatUserMoney(piece.purchase_price)}</td>
                  <td className="py-2 pr-4 text-gray-500 text-xs whitespace-nowrap">
                    {piece.purchase_date
                      ? new Date(piece.purchase_date + 'T00:00:00').toLocaleDateString()
                      : new Date(piece.created_at + 'Z').toLocaleDateString()}
                  </td>
                  <td className="py-2" onClick={e => e.stopPropagation()}>
                    <button onClick={e => handleDelete(e, piece)}
                      className="text-red-600 hover:text-red-400 text-xs px-2 py-1 rounded hover:bg-red-900/20">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
