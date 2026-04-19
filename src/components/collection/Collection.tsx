import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPieces, deletePiece } from '../../api/pieces'
import type { Piece } from '../../types/piece'

type ViewMode = 'grid' | 'table'

const METAL_COLORS: Record<string, string> = {
  silver: 'bg-gray-600 text-gray-200',
  gold: 'bg-yellow-700 text-yellow-200',
  platinum: 'bg-blue-800 text-blue-200',
  palladium: 'bg-purple-800 text-purple-200',
}

function formatCurrency(n: number | undefined) {
  if (n == null) return '—'
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function Collection() {
  const navigate = useNavigate()
  const [pieces, setPieces] = useState<Piece[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  // Filters
  const [metalFilter, setMetalFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [gradedFilter, setGradedFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('created_at')

  const fetchPieces = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getPieces({
        metal_type: metalFilter || undefined,
        piece_type: typeFilter || undefined,
        is_graded: gradedFilter === 'graded' ? true : gradedFilter === 'raw' ? false : undefined,
        q: searchQuery || undefined,
        sort: sortBy,
      })
      setPieces(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [metalFilter, typeFilter, gradedFilter, searchQuery, sortBy])

  useEffect(() => { fetchPieces() }, [fetchPieces])

  async function handleDelete(e: React.MouseEvent, piece: Piece) {
    e.stopPropagation()
    if (!window.confirm(`Delete "${piece.name}"? This cannot be undone.`)) return
    await deletePiece(piece.id)
    fetchPieces()
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-yellow-400">Collection</h1>
        <div className="flex gap-2">
          <button onClick={() => setViewMode('grid')}
            className={`px-3 py-1 rounded text-sm ${viewMode === 'grid' ? 'bg-yellow-500 text-gray-950 font-semibold' : 'bg-gray-800 text-gray-400'}`}>
            Grid
          </button>
          <button onClick={() => setViewMode('table')}
            className={`px-3 py-1 rounded text-sm ${viewMode === 'table' ? 'bg-yellow-500 text-gray-950 font-semibold' : 'bg-gray-800 text-gray-400'}`}>
            Table
          </button>
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
            <div key={piece.id}
              onClick={() => navigate(`/pieces/${piece.id}/edit`)}
              className="bg-gray-900 border border-gray-800 rounded-lg p-4 cursor-pointer hover:border-gray-600 transition-colors">
              {piece.first_photo ? (
                <img src={`/api/photos/${piece.first_photo}`} alt={piece.name}
                  className="w-full h-36 object-cover rounded mb-3" />
              ) : (
                <div className="w-full h-36 bg-gray-800 rounded mb-3 flex items-center justify-center text-gray-600 text-3xl">🪙</div>
              )}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-100 text-sm leading-tight">{piece.name}</p>
                  {piece.year && <p className="text-gray-500 text-xs">{piece.year}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${METAL_COLORS[piece.metal_type] ?? 'bg-gray-700 text-gray-300'}`}>
                  {piece.metal_type}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-gray-500">Melt Value</p>
                  <p className="text-green-400 font-medium">{formatCurrency(piece.melt_value)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Est. Value</p>
                  <p className="text-gray-200 font-medium">{formatCurrency(piece.estimated_value)}</p>
                </div>
              </div>
              {piece.is_graded && (
                <div className="mt-2 text-xs text-blue-400">
                  {piece.grading_service} {piece.grade}
                </div>
              )}
              <div className="mt-3 flex justify-between items-center">
                <span className="text-gray-600 text-xs">{piece.weight_oz}oz · {(Number(piece.purity) * 100).toFixed(1)}%</span>
                <button
                  onClick={e => handleDelete(e, piece)}
                  className="text-red-600 hover:text-red-400 text-xs px-2 py-1 rounded hover:bg-red-900/20">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-left">
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Metal</th>
                <th className="pb-2 pr-4">Type</th>
                <th className="pb-2 pr-4">Weight</th>
                <th className="pb-2 pr-4">Melt Value</th>
                <th className="pb-2 pr-4">Est. Value</th>
                <th className="pb-2 pr-4">Paid</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pieces.map(piece => (
                <tr key={piece.id}
                  onClick={() => navigate(`/pieces/${piece.id}/edit`)}
                  className="border-b border-gray-800/50 hover:bg-gray-900 cursor-pointer">
                  <td className="py-2 pr-4">
                    <div className="text-gray-100">{piece.name}</div>
                    {piece.year && <div className="text-gray-500 text-xs">{piece.year}</div>}
                    {piece.is_graded && <div className="text-blue-400 text-xs">{piece.grading_service} {piece.grade}</div>}
                  </td>
                  <td className="py-2 pr-4">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${METAL_COLORS[piece.metal_type] ?? 'bg-gray-700 text-gray-300'}`}>
                      {piece.metal_type}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-gray-300 capitalize">{piece.piece_type}</td>
                  <td className="py-2 pr-4 text-gray-300">{piece.weight_oz}oz</td>
                  <td className="py-2 pr-4 text-green-400">{formatCurrency(piece.melt_value)}</td>
                  <td className="py-2 pr-4 text-gray-200">{formatCurrency(piece.estimated_value)}</td>
                  <td className="py-2 pr-4 text-gray-400">{formatCurrency(piece.purchase_price)}</td>
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
