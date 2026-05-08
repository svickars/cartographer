import type { GalleryEntry } from '../types/gallery'
import { readJsonResponse } from './readJsonResponse'

const jsonHeaders = { 'Content-Type': 'application/json' }

export async function fetchGalleryEntries(): Promise<GalleryEntry[]> {
  const res = await fetch('/api/gallery', { credentials: 'include' })
  const data = await readJsonResponse<
    | { ok: true; entries: GalleryEntry[] }
    | { ok: false; error?: string }
  >(res)
  if (!res.ok || !data.ok || !('entries' in data)) {
    throw new Error(
      !data.ok && 'error' in data && data.error
        ? data.error
        : `Gallery failed (${res.status})`,
    )
  }
  return data.entries
}

export type AppendGalleryResult =
  | { ok: true; entries: GalleryEntry[] }
  | { ok: false; error: string }

export async function createGalleryEntry(entry: {
  displayName: string
  sketchDataUrl: string
  mapDataUrl: string
}): Promise<AppendGalleryResult> {
  const res = await fetch('/api/gallery', {
    method: 'POST',
    credentials: 'include',
    headers: jsonHeaders,
    body: JSON.stringify({
      displayName: entry.displayName,
      sketchDataUrl: entry.sketchDataUrl,
      mapDataUrl: entry.mapDataUrl,
    }),
  })
  const data = await readJsonResponse<
    | { ok: true; entries: GalleryEntry[] }
    | { ok: false; error?: string }
  >(res)
  if (!res.ok || !data.ok) {
    const msg =
      !data.ok && 'error' in data && data.error
        ? data.error
        : `Could not save (${res.status})`
    return { ok: false, error: msg }
  }
  return { ok: true, entries: data.entries }
}
