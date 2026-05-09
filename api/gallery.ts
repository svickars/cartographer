import { randomUUID } from 'crypto'

import { put } from '@vercel/blob'
import type { VercelRequest, VercelResponse } from '@vercel/node'

import { getNeonSql } from './galleryDb.js'
import { requireSiteAuth } from '../server/siteAuth.js'
import { normalizeMapStyleId } from '../src/lib/mapStyles.js'
import type {
  GalleryEntry,
  GalleryGenerationSnapshot,
} from '../src/types/gallery.js'
import { normalizeControls } from '../src/types/generativeControls.js'

async function ensureGalleryTable(
  sql: NonNullable<ReturnType<typeof getNeonSql>>,
) {
  await sql`
    CREATE TABLE IF NOT EXISTS gallery_entries (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      display_name text NOT NULL,
      sketch_url text NOT NULL,
      map_url text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `
  await sql`
    ALTER TABLE gallery_entries
    ADD COLUMN IF NOT EXISTS generation_json jsonb
  `
}

function stripDataUrl(input: string): { base64: string; ext: string } | null {
  const m = /^data:image\/(\w+);base64,([\s\S]+)$/i.exec(input)
  if (!m) return null
  const fmt = m[1].toLowerCase()
  const ext =
    fmt === 'jpeg' || fmt === 'jpg'
      ? 'jpg'
      : fmt === 'png'
        ? 'png'
        : fmt === 'webp'
          ? 'webp'
          : 'bin'
  return { base64: m[2].replace(/\s/g, ''), ext }
}

async function bytesFromImageRef(src: string): Promise<{
  buffer: Buffer
  filenameSuffix: string
  contentType: string
}> {
  if (src.startsWith('data:')) {
    const parsed = stripDataUrl(src)
    if (!parsed) throw new Error('Invalid sketch or map image data.')
    const ct =
      parsed.ext === 'jpg'
        ? 'image/jpeg'
        : parsed.ext === 'png'
          ? 'image/png'
          : parsed.ext === 'webp'
            ? 'image/webp'
            : 'application/octet-stream'
    return {
      buffer: Buffer.from(parsed.base64, 'base64'),
      filenameSuffix: parsed.ext === 'bin' ? 'png' : parsed.ext,
      contentType: ct,
    }
  }

  const res = await fetch(src)
  if (!res.ok) throw new Error('Could not download map image for upload.')
  const buf = Buffer.from(await res.arrayBuffer())
  const ct = (res.headers.get('content-type') || 'image/png').split(';')[0].trim()
  const suffix =
    ct.includes('jpeg') || ct.includes('jpg')
      ? 'jpg'
      : ct.includes('webp')
        ? 'webp'
        : 'png'
  return { buffer: buf, filenameSuffix: suffix, contentType: ct }
}

function parseGenerationJson(raw: unknown): GalleryGenerationSnapshot | undefined {
  if (raw == null) return undefined
  let v: unknown = raw
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v) as unknown
    } catch {
      return undefined
    }
  }
  if (!v || typeof v !== 'object') return undefined
  const o = v as Record<string, unknown>
  return {
    mapStyleId: normalizeMapStyleId(o.mapStyleId),
    controls: normalizeControls(
      o.controls as Partial<import('../src/types/generativeControls.js').GenerativeControls>,
    ),
  }
}

function rowToEntry(r: {
  id: string
  display_name: string
  sketch_url: string
  map_url: string
  created_at: Date | string
  generation_json: unknown | null
}): GalleryEntry {
  const created =
    r.created_at instanceof Date
      ? r.created_at.toISOString()
      : String(r.created_at)
  const gen = parseGenerationJson(r.generation_json)
  return {
    id: r.id,
    displayName: r.display_name,
    sketchUrl: r.sketch_url,
    mapUrl: r.map_url,
    createdAt: created,
    ...(gen ? { generation: gen } : {}),
  }
}

type DbRow = {
  id: string
  display_name: string
  sketch_url: string
  map_url: string
  created_at: Date | string
  generation_json: unknown | null
}

function sanitizeGenerationBody(raw: unknown): GalleryGenerationSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  return {
    mapStyleId: normalizeMapStyleId(o.mapStyleId),
    controls: normalizeControls(
      o.controls as Partial<import('../src/types/generativeControls.js').GenerativeControls>,
    ),
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    return res.status(503).json({
      ok: false,
      error:
        'Vercel Blob is not configured. Add the Blob store and BLOB_READ_WRITE_TOKEN.',
      code: 'BLOB_MISSING',
    })
  }

  const sql = getNeonSql()
  if (!sql) {
    return res.status(503).json({
      ok: false,
      error:
        'Database not configured. Add Neon (or Postgres) and set POSTGRES_URL.',
      code: 'POSTGRES_MISSING',
    })
  }

  if (req.method === 'GET') {
    if (!requireSiteAuth(req, res)) return
    try {
      await ensureGalleryTable(sql)
      const limitRaw = Number(
        (req.query as { limit?: string }).limit ?? '4',
      )
      const offsetRaw = Number(
        (req.query as { offset?: string }).offset ?? '0',
      )
      const limit = Number.isFinite(limitRaw)
        ? Math.min(50, Math.max(1, Math.floor(limitRaw)))
        : 4
      const offset = Number.isFinite(offsetRaw)
        ? Math.max(0, Math.floor(offsetRaw))
        : 0

      const countRows = (await sql`
        SELECT COUNT(*)::int AS n FROM gallery_entries
      `) as { n: number }[]
      const total = countRows[0]?.n ?? 0

      const rows = (await sql`
        SELECT id, display_name, sketch_url, map_url, created_at, generation_json
        FROM gallery_entries
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `) as DbRow[]
      const entries = rows.map((r) => rowToEntry(r))
      return res.status(200).json({ ok: true, entries, total })
    } catch (e) {
      console.error(e)
      const message = e instanceof Error ? e.message : 'Gallery load failed.'
      return res.status(500).json({ ok: false, error: message })
    }
  }

  if (req.method === 'POST') {
    if (!requireSiteAuth(req, res)) return

    const body = req.body as
      | {
          displayName?: string
          sketchDataUrl?: string
          mapDataUrl?: string
          generation?: unknown
        }
      | undefined

    const displayName = body?.displayName?.trim() ?? ''
    const sketchDataUrl = body?.sketchDataUrl
    const mapDataUrl = body?.mapDataUrl

    if (!displayName || displayName.length > 200) {
      return res.status(400).json({
        ok: false,
        error: 'displayName is required (max 200 characters).',
      })
    }
    if (!sketchDataUrl || typeof sketchDataUrl !== 'string') {
      return res.status(400).json({ ok: false, error: 'sketchDataUrl is required.' })
    }
    if (!mapDataUrl || typeof mapDataUrl !== 'string') {
      return res.status(400).json({ ok: false, error: 'mapDataUrl is required.' })
    }

    const generation = sanitizeGenerationBody(body?.generation)
    if (!generation) {
      return res.status(400).json({
        ok: false,
        error: 'generation with mapStyleId and controls is required.',
      })
    }

    try {
      await ensureGalleryTable(sql)

      const entryId = randomUUID()
      const prefix = `gallery/${entryId}`

      const sketchBin = await bytesFromImageRef(sketchDataUrl)
      const mapBin = await bytesFromImageRef(mapDataUrl)

      const sketchBlob = await put(
        `${prefix}/sketch.${sketchBin.filenameSuffix}`,
        sketchBin.buffer,
        {
          access: 'public',
          contentType: sketchBin.contentType,
        },
      )

      const mapBlob = await put(
        `${prefix}/map.${mapBin.filenameSuffix}`,
        mapBin.buffer,
        {
          access: 'public',
          contentType: mapBin.contentType,
        },
      )

      const inserted = (await sql`
        INSERT INTO gallery_entries (id, display_name, sketch_url, map_url, generation_json)
        VALUES (
          ${entryId},
          ${displayName},
          ${sketchBlob.url},
          ${mapBlob.url},
          ${JSON.stringify(generation)}
        )
        RETURNING id, display_name, sketch_url, map_url, created_at, generation_json
      `) as DbRow[]

      const row = inserted[0]
      if (!row) {
        return res.status(500).json({ ok: false, error: 'Insert returned no row.' })
      }
      const entry = rowToEntry(row)

      const countRows = (await sql`
        SELECT COUNT(*)::int AS n FROM gallery_entries
      `) as { n: number }[]
      const total = countRows[0]?.n ?? 0

      const firstPage = (await sql`
        SELECT id, display_name, sketch_url, map_url, created_at, generation_json
        FROM gallery_entries
        ORDER BY created_at DESC
        LIMIT 4
        OFFSET 0
      `) as DbRow[]
      const entries = firstPage.map((r) => rowToEntry(r))

      return res.status(200).json({ ok: true, entry, entries, total })
    } catch (e) {
      console.error(e)
      const message =
        e instanceof Error ? e.message : 'Could not save to gallery.'
      return res.status(500).json({ ok: false, error: message })
    }
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ ok: false, error: 'Method not allowed' })
}
