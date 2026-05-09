export type MapStyleId =
  | 'illustrated'
  | 'topographic'
  | 'tourist'
  | 'streetMap'
  | 'sketch'

export interface MapStyleOption {
  id: MapStyleId
  label: string
  /** One-line hint in the style picker (cards). */
  cardBlurb: string
  /** Short UI / prompt lead-in (StylePicker, style block header). */
  summary: string
  /** Long aesthetic clause for image generation (omit from compact UI). */
  generationClause?: string
}

/** Sketch mode: omit Era from appended control clauses (conflicts with hand-drawn look). */
export function styleSuppressesEra(id: MapStyleId): boolean {
  return id === 'sketch'
}

const STREET_MAP_GENERATION_CLAUSE =
  'rendered in the style of a modern digital street map, extremely close to Google Maps visual language. Off-white land areas (#F5F5F5), white road surfaces with fine light-grey outlines, arterial roads slightly wider and warmer. Parks and green spaces in muted sage green. Water in calm desaturated blue. Building footprints shown as flat mid-grey blocks. Dense, crisp Roboto-style sans-serif labelling at multiple hierarchy levels — large bold labels for regions, medium for streets, small for points of interest. No decorative elements, no illustration, no texture. Pixel-perfect linework. High information density. Clinical, functional, precise.'

const SKETCH_GENERATION_CLAUSE =
  'rendered as a refined hand-drawn sketch map. Pencil or fine-liner aesthetic. Consistent ink linework with slight variation in stroke weight — heavier for outlines, lighter for interior detail. Cross-hatching and stippling for terrain and shading. No colour or only very subtle watercolour washes as a secondary layer. Slightly off-white paper texture visible. Labels in a clean hand-lettered style, consistent baseline. Feels like the output of a skilled cartographer sketching in a field notebook — more refined than a rough draft but unmistakably hand-drawn. No digital crispness. No gradients.'

export const MAP_STYLES: readonly MapStyleOption[] = [
  {
    id: 'illustrated',
    label: 'Illustrated',
    cardBlurb: 'Warm parchment, ink linework, gentle shading.',
    summary:
      'Warm parchment tone, clear ink linework, subtle hill shading. Same sketch topology; restrained ornament only where it does not invent geography.',
  },
  {
    id: 'topographic',
    label: 'Topographic',
    cardBlurb: 'Contours and relief — trail-map legibility.',
    summary:
      'Shaded relief and contour language, earthy greens and tans, hiking-map legibility. Preserve sketch layout; no invented terrain.',
  },
  {
    id: 'tourist',
    label: 'Tourist',
    cardBlurb: 'Bold flat colour and clear type — visitor style.',
    summary:
      'Bold flat regions, simple icons, highly legible type — modern visitor-map styling without adding streets or symbols not implied by the sketch.',
  },
  {
    id: 'streetMap',
    label: 'Street Map',
    cardBlurb: 'Clean, precise, familiar — like a modern digital street map.',
    summary:
      'Clean, precise, and familiar. Rendered like a modern digital street map.',
    generationClause: STREET_MAP_GENERATION_CLAUSE,
  },
  {
    id: 'sketch',
    label: 'Sketch',
    cardBlurb: 'Refined linework, hatching, pencil texture — still hand-drawn.',
    summary:
      'Looks like your drawing, but refined. Consistent linework, hatching, pencil texture.',
    generationClause: SKETCH_GENERATION_CLAUSE,
  },
]

const MAP_STYLE_IDS = new Set<MapStyleId>(MAP_STYLES.map((s) => s.id))

/** Coerce API/JSON values to a known map style id. */
export function normalizeMapStyleId(value: unknown): MapStyleId {
  if (typeof value === 'string' && MAP_STYLE_IDS.has(value as MapStyleId)) {
    return value as MapStyleId
  }
  return 'illustrated'
}
