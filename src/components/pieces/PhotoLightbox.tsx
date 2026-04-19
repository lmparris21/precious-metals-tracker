import { useEffect, useCallback } from 'react'
import type { Photo } from '../../types/piece'

interface Props {
  photos: Photo[]
  index: number
  pieceName: string
  onClose: () => void
  onNavigate: (index: number) => void
}

export default function PhotoLightbox({ photos, index, pieceName, onClose, onNavigate }: Props) {
  const photo = photos[index]

  const prev = useCallback(() => {
    if (index > 0) onNavigate(index - 1)
  }, [index, onNavigate])

  const next = useCallback(() => {
    if (index < photos.length - 1) onNavigate(index + 1)
  }, [index, photos.length, onNavigate])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, prev, next])

  if (!photo) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center"
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-gray-400 hover:text-white text-3xl leading-none"
      >
        ×
      </button>

      {/* Caption */}
      <p className="absolute top-4 left-4 text-gray-400 text-sm">
        {pieceName} · {index + 1} / {photos.length}
      </p>

      {/* Image */}
      <div className="flex items-center gap-4 px-16 max-h-[80vh]" onClick={e => e.stopPropagation()}>
        <button
          onClick={prev}
          disabled={index === 0}
          className="text-gray-400 hover:text-white disabled:opacity-20 text-4xl px-2"
        >
          ‹
        </button>
        <img
          src={`/api/photos/${photo.filename}`}
          alt={pieceName}
          className="max-h-[80vh] max-w-[80vw] object-contain rounded shadow-2xl"
        />
        <button
          onClick={next}
          disabled={index === photos.length - 1}
          className="text-gray-400 hover:text-white disabled:opacity-20 text-4xl px-2"
        >
          ›
        </button>
      </div>

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div className="absolute bottom-6 flex gap-2" onClick={e => e.stopPropagation()}>
          {photos.map((p, i) => (
            <img
              key={p.id}
              src={`/api/photos/${p.filename}`}
              alt=""
              onClick={() => onNavigate(i)}
              className={`w-14 h-14 object-cover rounded cursor-pointer transition-all ${
                i === index ? 'ring-2 ring-yellow-400 opacity-100' : 'opacity-50 hover:opacity-80'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
