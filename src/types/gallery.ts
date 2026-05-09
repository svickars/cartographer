import type { MapStyleId } from '../lib/mapStyles'
import type { GenerativeControls } from './generativeControls'

/** Snapshot of style + generative controls at gallery save time. */
export type GalleryGenerationSnapshot = {
  mapStyleId: MapStyleId
  controls: GenerativeControls
}

export type GalleryEntry = {
  id: string
  displayName: string
  sketchUrl: string
  mapUrl: string
  createdAt: string
  /** Present for entries saved after generation metadata was added. */
  generation?: GalleryGenerationSnapshot
}
