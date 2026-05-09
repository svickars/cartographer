import type {
  GalleryEntry,
  GalleryGenerationSnapshot,
} from '../types/gallery'
import { readJsonResponse } from './readJsonResponse'

const jsonHeaders = { 'Content-Type': 'application/json' }

export async function fetchGalleryEntries(params?: {
  limit?: number
  offset?: number
}): Promise<{ entries: GalleryEntry[]; total: number }> {
  const limit = params?.limit ?? 4
  const offset = params?.offset ?? 0
  const q = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  })
  const res = await fetch(`/api/gallery?${q}`, { credentials: 'include' })
  const data = await readJsonResponse<
    | { ok: true; entries: GalleryEntry[]; total: number }
    | { ok: false; error?: string }
  >(res)
  if (!res.ok || !data.ok || !('entries' in data) || typeof data.total !== 'number') {
    throw new Error(
      !data.ok && 'error' in data && data.error
        ? data.error
        : `Gallery failed (${res.status})`,
    )
  }
  return { entries: data.entries, total: data.total }
}

export type AppendGalleryResult =
  | { ok: true; entry: GalleryEntry; entries: GalleryEntry[]; total: number }
  | { ok: false; error: string }

export async function createGalleryEntry(entry: {
  displayName: string
  sketchDataUrl: string
  mapDataUrl: string
  generation: GalleryGenerationSnapshot
}): Promise<AppendGalleryResult> {
  const res = await fetch('/api/gallery', {
    method: 'POST',
    credentials: 'include',
    headers: jsonHeaders,
    body: JSON.stringify({
      displayName: entry.displayName,
      sketchDataUrl: entry.sketchDataUrl,
      mapDataUrl: entry.mapDataUrl,
      generation: entry.generation,
    }),
  })
  const data = await readJsonResponse<
    | {
        ok: true
        entry: GalleryEntry
        entries: GalleryEntry[]
        total: number
      }
    | { ok: false; error?: string }
  >(res)
  if (!res.ok || !data.ok) {
    const msg =
      !data.ok && 'error' in data && data.error
        ? data.error
        : `Could not save (${res.status})`
    return { ok: false, error: msg }
  }
  return {
    ok: true,
    entry: data.entry,
    entries: data.entries,
    total: data.total,
  }
}
