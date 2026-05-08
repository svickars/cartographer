export type MapStyleId = 'illustrated' | 'topographic' | 'tourist'

export interface MapStyleOption {
  id: MapStyleId
  label: string
  /** One-line hint in the style picker (cards). */
  cardBlurb: string
  /** Used in generation prompts — topology fidelity first, aesthetic second */
  summary: string
}

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
]
