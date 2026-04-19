import { useState, useRef, useCallback } from 'react'
import { uploadPhotos, deletePhoto } from '../../api/pieces'
import type { Photo } from '../../types/piece'

interface Props {
  pieceId: number
  initialPhotos?: Photo[]
  onPhotosChange?: () => void
}

export default function PhotoUpload({ pieceId, initialPhotos = [], onPhotosChange }: Props) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return
    setUploading(true)
    setError(null)
    try {
      await uploadPhotos(pieceId, files)
      // Re-fetch photos for this piece
      const res = await fetch(`/api/pieces/${pieceId}`)
      const data = await res.json()
      setPhotos(data.photos ?? [])
      onPhotosChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [pieceId, onPhotosChange])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    handleFiles(files)
  }

  async function handleDeletePhoto(photo: Photo) {
    if (!window.confirm('Delete this photo?')) return
    try {
      await deletePhoto(photo.id)
      setPhotos(p => p.filter(ph => ph.id !== photo.id))
      onPhotosChange?.()
    } catch {
      setError('Failed to delete photo')
    }
  }

  return (
    <div className="space-y-4">
      {/* Existing / uploaded thumbnails */}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {photos.map(photo => (
            <div key={photo.id} className="relative group">
              <img
                src={`/api/photos/${photo.filename}`}
                alt="Piece photo"
                className="w-24 h-24 object-cover rounded border border-gray-700"
              />
              <button
                type="button"
                onClick={() => handleDeletePhoto(photo)}
                className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-yellow-500 bg-yellow-500/5'
            : 'border-gray-700 hover:border-gray-500'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => {
            if (e.target.files) handleFiles(Array.from(e.target.files))
            e.target.value = '' // allow re-selecting same file
          }}
        />
        {uploading ? (
          <p className="text-gray-500">Uploading...</p>
        ) : (
          <>
            <p className="text-gray-400 text-sm">Drop photos here or click to select</p>
            <p className="text-gray-600 text-xs mt-1">JPEG, PNG, WEBP up to 10MB each</p>
          </>
        )}
      </div>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}
    </div>
  )
}
