export type MapStyleId = 'illustrated' | 'topographic' | 'tourist'

export interface MapStyleOption {
  id: MapStyleId
  label: string
  /** Used in prompts + UI */
  summary: string
}

export const MAP_STYLES: readonly MapStyleOption[] = [
  {
    id: 'illustrated',
    label: 'Illustrated',
    summary: 'Vintage fantasy / travel map — parchment warmth, hand-inked linework, decorative compass rose energy.',
  },
  {
    id: 'topographic',
    label: 'Topographic',
    summary: 'Contour emphasis, earthy greens and tans, shaded relief, hiking-map clarity.',
  },
  {
    id: 'tourist',
    label: 'Tourist',
    summary: 'Clean modern visitor map — bold flat colours, simple icons, legible labels.',
  },
]
