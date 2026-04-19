import type { Piece, Summary } from '../types/piece'

export async function getPieces(params?: {
  metal_type?: string
  piece_type?: string
  is_graded?: boolean
  q?: string
  sort?: string
}): Promise<Piece[]> {
  const query = new URLSearchParams()
  if (params?.metal_type) query.set('metal_type', params.metal_type)
  if (params?.piece_type) query.set('piece_type', params.piece_type)
  if (params?.is_graded !== undefined) query.set('is_graded', params.is_graded ? '1' : '0')
  if (params?.q) query.set('q', params.q)
  if (params?.sort) query.set('sort', params.sort)
  const res = await fetch(`/api/pieces?${query}`)
  if (!res.ok) throw new Error('Failed to fetch pieces')
  return res.json()
}

export async function getPiece(id: number): Promise<Piece> {
  const res = await fetch(`/api/pieces/${id}`)
  if (!res.ok) throw new Error('Failed to fetch piece')
  return res.json()
}

export async function createPiece(data: Partial<Piece>): Promise<Piece> {
  const res = await fetch('/api/pieces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to create piece')
  }
  return res.json()
}

export async function updatePiece(id: number, data: Partial<Piece>): Promise<Piece> {
  const res = await fetch(`/api/pieces/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to update piece')
  }
  return res.json()
}

export async function deletePiece(id: number): Promise<void> {
  const res = await fetch(`/api/pieces/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete piece')
}

export async function uploadPhotos(pieceId: number, files: File[]): Promise<void> {
  const formData = new FormData()
  for (const file of files) formData.append('photos', file)
  const res = await fetch(`/api/pieces/${pieceId}/photos`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) throw new Error('Failed to upload photos')
}

export async function deletePhoto(photoId: number): Promise<void> {
  const res = await fetch(`/api/photos/${photoId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete photo')
}

export async function getSummary(): Promise<Summary> {
  const res = await fetch('/api/summary')
  if (!res.ok) throw new Error('Failed to fetch summary')
  return res.json()
}
