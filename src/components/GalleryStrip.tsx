import { useCallback, useEffect, useState } from 'react'

import {
  namingIntensityReadout,
  sliderReadout,
} from '../lib/controlSliderLabels'
import { MAP_STYLES, type MapStyleId } from '../lib/mapStyles'
import type { GalleryEntry, GalleryGenerationSnapshot } from '../types/gallery'
import {
  ERA_STOPS,
  NAMING_LANGUAGES,
  NAMING_THEMES,
} from '../types/generativeControls'

type Props = {
  entries: GalleryEntry[]
  total: number
  /** False until first gallery fetch settles. */
  ready: boolean
  loadingMore: boolean
  onLoadMore: () => void
  onApplyGeneration: (snap: GalleryGenerationSnapshot) => void
}

function mapStyleLabel(id: MapStyleId): string {
  return MAP_STYLES.find((s) => s.id === id)?.label ?? id
}

function eraLabel(era: string): string {
  return ERA_STOPS.find((e) => e.id === era)?.label ?? era
}

function GalleryGenerationPopover({
  generation,
  onApply,
  onClose,
}: {
  generation: GalleryGenerationSnapshot
  onApply: () => void
  onClose: () => void
}) {
  const c = generation.controls
  const namingLines =
    c.naming.intensity > 0
      ? [
          `Toponymy: ${namingIntensityReadout(c.naming.intensity)}`,
          `Language: ${NAMING_LANGUAGES.find((x) => x.id === c.naming.language)?.label ?? c.naming.language}`,
          `Theme: ${NAMING_THEMES.find((x) => x.id === c.naming.theme)?.label ?? c.naming.theme}`,
        ]
      : [`Toponymy: ${namingIntensityReadout(c.naming.intensity)}`]

  return (
    <div
      className="absolute left-0 top-full z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-[#1a2744]/15 bg-[#faf7f0] p-4 shadow-xl ring-1 ring-black/5"
      role="dialog"
      aria-label="Saved map settings"
    >
      <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.1em] text-[#1a2744]/45">
        Settings when saved
      </p>
      <ul className="mt-3 space-y-1.5 font-sans text-xs leading-snug text-[#1a2744]/85">
        <li>Imagination: {sliderReadout(c.imagination, 'imagination')}</li>
        <li>Relief: {sliderReadout(c.relief, 'relief')}</li>
        <li>Richness: {sliderReadout(c.richness, 'richness')}</li>
        <li>Era: {eraLabel(c.era)}</li>
        <li>Formality: {sliderReadout(c.formality, 'formality')}</li>
        {namingLines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            onApply()
            onClose()
          }}
          className="rounded border border-[#2d4a3e] bg-[#2d4a3e] px-3 py-1.5 font-sans text-xs font-medium text-[#f4efe6] hover:bg-[#243d30]"
        >
          Use these settings
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-[#1a2744]/25 bg-white px-3 py-1.5 font-sans text-xs text-[#1a2744] hover:bg-[#f4efe6]"
        >
          Close
        </button>
      </div>
    </div>
  )
}

function GalleryLightbox({
  entry,
  showSketch,
  onToggleSketch,
  onClose,
}: {
  entry: GalleryEntry
  showSketch: boolean
  onToggleSketch: () => void
  onClose: () => void
}) {
  const src = showSketch ? entry.sketchUrl : entry.mapUrl
  const alt = showSketch
    ? `Sketch — ${entry.displayName}`
    : `Map — ${entry.displayName}`

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal
        aria-label={`Gallery — ${entry.displayName}`}
        className="relative flex max-h-[min(92vh,880px)] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-[#1a2744]/20 bg-[#faf7f0] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full border border-[#1a2744]/20 bg-[#faf7f0]/95 px-3 py-1 font-sans text-xs text-[#1a2744] shadow-sm hover:bg-white"
        >
          Close
        </button>
        <div className="flex min-h-0 flex-1 flex-col bg-[#1a2744]/5 p-3 pt-12 sm:p-4 sm:pt-14">
          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-md bg-[#1a2744]/8">
            <img
              src={src}
              alt={alt}
              className="max-h-[min(72vh,720px)] w-full object-contain"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#1a2744]/10 pt-3">
            <p className="font-serif text-lg text-[#1a2744]">{entry.displayName}</p>
            <button
              type="button"
              onClick={onToggleSketch}
              className="rounded border border-[#2d4a3e]/45 px-3 py-1.5 font-sans text-sm text-[#2d4a3e] hover:bg-[#eef5f0]"
            >
              {showSketch ? 'View map' : 'View sketch'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function GalleryCard({
  entry,
  panelOpen,
  onTogglePanel,
  onApplyGeneration,
  onOpenLightbox,
}: {
  entry: GalleryEntry
  panelOpen: boolean
  onTogglePanel: () => void
  onApplyGeneration: (snap: GalleryGenerationSnapshot) => void
  onOpenLightbox: () => void
}) {
  const gen = entry.generation

  return (
    <article
      id={gen ? `gallery-style-${entry.id}` : undefined}
      className="relative flex flex-col overflow-visible rounded-lg border border-[#1a2744]/12 bg-[#faf7f0] shadow-sm"
    >
      <button
        type="button"
        onClick={onOpenLightbox}
        className="group relative block w-full cursor-zoom-in text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d4a3e]"
        aria-label={`Open large view — ${entry.displayName}`}
      >
        <div className="relative aspect-[4/3] bg-[#1a2744]/5">
          <img
            src={entry.mapUrl}
            alt={`Map by ${entry.displayName}`}
            className="h-full w-full object-contain transition group-hover:opacity-95"
          />
          <span className="pointer-events-none absolute bottom-2 right-2 rounded bg-[#1a2744]/75 px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-wide text-[#f4efe6] opacity-0 transition group-hover:opacity-100">
            Enlarge
          </span>
        </div>
      </button>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="font-serif text-lg text-[#1a2744]">{entry.displayName}</p>
        <div className="relative mt-auto flex flex-wrap items-center gap-2">
          {gen && (
            <>
              <button
                type="button"
                aria-expanded={panelOpen}
                onClick={onTogglePanel}
                className="rounded-full border border-[#1a2744]/20 bg-[#ebe4d6] px-2.5 py-1 font-sans text-xs font-medium text-[#1a2744] hover:border-[#1a2744]/40 hover:bg-[#e4dccf]"
              >
                {mapStyleLabel(gen.mapStyleId)}
              </button>
              {panelOpen && (
                <GalleryGenerationPopover
                  generation={gen}
                  onApply={() => onApplyGeneration(gen)}
                  onClose={onTogglePanel}
                />
              )}
            </>
          )}
        </div>
      </div>
    </article>
  )
}

export function GalleryStrip({
  entries,
  total,
  ready,
  loadingMore,
  onLoadMore,
  onApplyGeneration,
}: Props) {
  const [lightboxEntry, setLightboxEntry] = useState<GalleryEntry | null>(null)
  const [lightboxSketch, setLightboxSketch] = useState(false)
  const [openPanelId, setOpenPanelId] = useState<string | null>(null)

  useEffect(() => {
    if (!openPanelId) return
    const close = (e: MouseEvent) => {
      const t = e.target as Node
      const el = document.getElementById(`gallery-style-${openPanelId}`)
      if (el && !el.contains(t)) setOpenPanelId(null)
    }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [openPanelId])

  const openLightbox = useCallback((e: GalleryEntry) => {
    setOpenPanelId(null)
    setLightboxSketch(false)
    setLightboxEntry(e)
  }, [])

  const closeLightbox = useCallback(() => {
    setLightboxEntry(null)
    setLightboxSketch(false)
  }, [])

  useEffect(() => {
    if (!lightboxEntry) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [lightboxEntry])

  if (!ready) {
    return (
      <section className="border-t border-[#1a2744]/10 bg-[#ebe4d6]/60 px-6 py-12">
        <h2 className="font-serif text-2xl text-[#1a2744]">Gallery</h2>
        <p className="mt-3 font-sans text-sm text-[#1a2744]/55">Loading gallery…</p>
      </section>
    )
  }

  if (entries.length === 0) return null

  const hasMore = entries.length < total

  return (
    <>
      {lightboxEntry && (
        <GalleryLightbox
          entry={lightboxEntry}
          showSketch={lightboxSketch}
          onToggleSketch={() => setLightboxSketch((v) => !v)}
          onClose={closeLightbox}
        />
      )}
      <section className="border-t border-[#1a2744]/10 bg-[#ebe4d6]/60 px-6 py-12">
        <h2 className="font-serif text-2xl text-[#1a2744]">Gallery</h2>
        <p className="mt-1 font-sans text-sm text-[#1a2744]/65">
          Recent maps saved to the shared gallery. Click a map to enlarge; use the
          style tag to see saved settings.
        </p>
        <p className="mt-2 font-sans text-xs text-[#1a2744]/50">
          Showing {entries.length} of {total}
        </p>
        <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((e) => (
            <GalleryCard
              key={e.id}
              entry={e}
              panelOpen={openPanelId === e.id}
              onTogglePanel={() =>
                setOpenPanelId((id) => (id === e.id ? null : e.id))
              }
              onApplyGeneration={onApplyGeneration}
              onOpenLightbox={() => openLightbox(e)}
            />
          ))}
        </div>
        {hasMore && (
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => void onLoadMore()}
              className="cursor-pointer rounded-full border border-[#1a2744]/25 bg-white px-6 py-2.5 font-sans text-sm font-medium text-[#1a2744] shadow-sm transition hover:border-[#1a2744]/40 hover:bg-[#f4efe6] disabled:cursor-wait disabled:pointer-events-none disabled:opacity-50"
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </section>
    </>
  )
}
