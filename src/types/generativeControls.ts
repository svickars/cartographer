export type EraStop = 'ancient' | 'medieval' | '1800s' | 'modern' | 'future'

export type GenerativeControls = {
  /** 0–100 */
  imagination: number
  /** 0–100 */
  richness: number
  era: EraStop
}

export const DEFAULT_CONTROLS: GenerativeControls = {
  imagination: 40,
  richness: 50,
  era: 'modern',
}

export const ERA_STOPS: readonly { id: EraStop; label: string }[] = [
  { id: 'ancient', label: 'Ancient' },
  { id: 'medieval', label: 'Medieval' },
  { id: '1800s', label: '1800s' },
  { id: 'modern', label: 'Modern' },
  { id: 'future', label: 'Future' },
]

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function normalizeControls(
  c: Partial<GenerativeControls> | undefined,
): GenerativeControls {
  if (!c) return { ...DEFAULT_CONTROLS }
  return {
    imagination: clamp(
      Math.round(c.imagination ?? DEFAULT_CONTROLS.imagination),
      0,
      100,
    ),
    richness: clamp(
      Math.round(c.richness ?? DEFAULT_CONTROLS.richness),
      0,
      100,
    ),
    era: c.era ?? DEFAULT_CONTROLS.era,
  }
}
