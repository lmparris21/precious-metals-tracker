import { useState, useEffect, useRef } from 'react'
import type { CatalogItem } from '../../types/piece'
import { searchCatalog } from '../../api/catalog'

interface Props {
  onSelect: (item: CatalogItem) => void
}

export default function CatalogSearch({ onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CatalogItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setResults([])
      setIsOpen(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const items = await searchCatalog(query)
        setResults(items)
        setIsOpen(items.length > 0)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(item: CatalogItem) {
    setQuery(item.name)
    setIsOpen(false)
    onSelect(item)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm text-gray-400 mb-1">Search catalog (auto-fill specs)</label>
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="e.g. American Eagle, Maple Leaf, Krugerrand..."
        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-yellow-500"
      />
      {loading && <div className="absolute right-3 top-9 text-gray-500 text-sm">...</div>}
      {isOpen && (
        <ul className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg max-h-64 overflow-y-auto">
          {results.map(item => (
            <li
              key={item.id}
              onClick={() => handleSelect(item)}
              className="px-3 py-2 hover:bg-gray-700 cursor-pointer"
            >
              <div className="text-gray-100 text-sm font-medium">{item.name}</div>
              <div className="text-gray-500 text-xs">
                {item.metal_type} · {item.piece_type} · {item.weight_oz}oz · {(item.purity * 100).toFixed(1)}% pure
                {item.mint ? ` · ${item.mint}` : ''}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
