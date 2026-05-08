import { useState } from 'react'

import type { GalleryEntry } from '../types/gallery'

type Props = {
  entries: GalleryEntry[]
}

export function GalleryStrip({ entries }: Props) {
  if (entries.length === 0) return null

  return (
    <section className="border-t border-[#1a2744]/10 bg-[#ebe4d6]/60 px-6 py-12">
      <h2 className="font-serif text-2xl text-[#1a2744]">Gallery</h2>
      <p className="mt-1 font-sans text-sm text-[#1a2744]/65">
        Recent maps saved to the shared gallery.
      </p>
      <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((e) => (
          <GalleryCard key={e.id} entry={e} />
        ))}
      </div>
    </section>
  )
}

function GalleryCard({ entry }: { entry: GalleryEntry }) {
  const [showSketch, setShowSketch] = useState(false)
  const src = showSketch ? entry.sketchUrl : entry.mapUrl
  const alt = showSketch ? `Sketch by ${entry.displayName}` : `Map by ${entry.displayName}`

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-[#1a2744]/12 bg-[#faf7f0] shadow-sm">
      <div className="relative aspect-[4/3] bg-[#1a2744]/5">
        <img src={src} alt={alt} className="h-full w-full object-contain" />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="font-serif text-lg text-[#1a2744]">{entry.displayName}</p>
        <button
          type="button"
          onClick={() => setShowSketch((v) => !v)}
          className="mt-auto self-start rounded border border-[#2d4a3e]/40 px-3 py-1.5 font-sans text-sm text-[#2d4a3e] hover:bg-[#eef5f0]"
        >
          {showSketch ? 'View map' : 'View sketch'}
        </button>
      </div>
    </article>
  )
}
