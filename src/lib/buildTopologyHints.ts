import type { SketchInterpretation } from '../types/interpretation'

/** Lightweight compass / framing cues from the orientation string (English keywords). */
function sectorHintsFromOrientation(orientation: string): string[] {
  const o = orientation.toLowerCase()
  const hints: string[] = []
  if (/\bnorth\b|↑|n\b/i.test(o)) {
    hints.push(
      'Orientation text mentions north — keep “north” consistent with that description (do not rotate the map arbitrarily).',
    )
  }
  if (/\bsouth\b|↓|s\b/i.test(o)) {
    hints.push(
      'Interpretation references south — preserve southward relationships between regions.',
    )
  }
  if (/\beast\b|\beastern\b|→|e\b/i.test(o)) {
    hints.push('Preserve east–west ordering implied by the interpretation.')
  }
  if (/\bwest\b|\bwestern\b|←|w\b/i.test(o)) {
    hints.push('Preserve west–east ordering implied by the interpretation.')
  }
  return hints
}

/**
 * Deterministic relational bullets to reduce invented geography.
 * Used in DALL·E 3 prompts and GPT Image edit prompts.
 */
export function buildTopologyHints(data: SketchInterpretation): string {
  const lines: string[] = [
    'TOPOLOGY HINTS (same sketch — preserve relative placement and size):',
    '- Do not merge separate roads or water bodies; keep distinct features visually distinct.',
    '- Preserve approximate proportions between regions (large sketch regions stay large).',
    '- Connectivity matters more than artistic embellishment: roads meet where described; water borders land as described.',
  ]

  lines.push(...sectorHintsFromOrientation(data.orientation))

  const n =
    data.roads.filter((r) => r.confidence?.toLowerCase() !== 'low').length +
    data.water.filter((w) => w.confidence?.toLowerCase() !== 'low').length +
    data.landmarks.filter((l) => l.confidence?.toLowerCase() !== 'low').length

  if (n > 0) {
    lines.push(
      `- Feature count guardrail: at least ${n} interpreted non-low-confidence geographic elements — do not collapse or replace them with unrelated features.`,
    )
  }

  return lines.join('\n')
}
