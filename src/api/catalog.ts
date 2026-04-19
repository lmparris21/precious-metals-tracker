import type { CatalogItem } from '../types/piece'

export async function searchCatalog(q: string): Promise<CatalogItem[]> {
  if (!q.trim()) return []
  const res = await fetch(`/api/catalog?q=${encodeURIComponent(q)}`)
  if (!res.ok) throw new Error('Failed to search catalog')
  return res.json()
}
