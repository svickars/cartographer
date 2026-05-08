import type { GenerativeControls } from '../types/generativeControls'

/** Extra guidance for Claude vision — appended to the fixed JSON schema prompt. */
export function buildInterpretationControlGuidance(
  controls: GenerativeControls,
): string {
  const n = controls.imagination
  if (n <= 30) {
    return `INTERPRETATION MODE (Imagination ${n}/100 — conservative):
Only describe elements you can identify with high confidence. Omit speculative geography.
Prefer fewer roads/water/landmarks with confidence "high" over risky guesses.
Keep notes conservative and flag uncertainty in overall_confidence and notes.`
  }
  if (n <= 69) {
    return `INTERPRETATION MODE (Imagination ${n}/100 — balanced):
Describe the sketch fairly completely; use confidence levels honestly for ambiguous strokes.
Balance completeness with fidelity to what is drawn.`
  }
  return `INTERPRETATION MODE (Imagination ${n}/100 — expansive):
Infer and extrapolate plausible geography beyond minimal strokes where reasonable.
Fill gaps imaginatively while staying loosely anchored to the sketch; richer notes and landmarks allowed.
Still output valid JSON and confidence per element.`
}

/** Image-generation imagination overlay (client-side prompts). */
export function buildImaginationImageClause(
  controls: GenerativeControls,
): string {
  const n = controls.imagination
  if (n <= 30) {
    return `Imagination level ${n}/100: Render only what the interpretation references; do not add unreferenced towns, roads, water bodies, or decorative geography beyond the described elements.`
  }
  if (n <= 69) {
    return `Imagination level ${n}/100: Stay faithful to the interpretation; modest embellishment only where it clarifies legibility.`
  }
  return `Imagination level ${n}/100: Expand on the sketch — invent plausible geography, enrich with coherent detail, secondary paths, and texture where it fits the map.`
}

export function buildRichnessImageClause(
  controls: GenerativeControls,
): string {
  const r = controls.richness
  if (r <= 33) {
    return `Richness ${r}/100: Sparse map — only major routes and regions, generous empty parchment, minimal labels and icons.`
  }
  if (r <= 66) {
    return `Richness ${r}/100: Moderate detail — readable hierarchy, selective secondary features.`
  }
  return `Richness ${r}/100: Dense, lively map — alleys, market texture, secondary roads, landmarks, topographic detail where appropriate.`
}

export function buildEraImageClause(controls: GenerativeControls): string {
  switch (controls.era) {
    case 'ancient':
      return `Era — Ancient: rendered as an ancient hand-drawn map, Roman or Greek cartographic conventions, latin labels, weathered parchment.`
    case 'medieval':
      return `Era — Medieval: medieval illuminated manuscript style, hand-lettered, decorative borders, sea monsters in open water.`
    case '1800s':
      return `Era — 19th century: 19th century engraved survey map, fine crosshatching, sepia tones, imperial cartography.`
    case 'modern':
      return `Era — Modern: contemporary illustrated map, clean linework, bold colour blocks, modern sans-serif labels.`
    case 'future':
      return `Era — Future: speculative futurist cartography, grid overlays, alien geography, neon accents on dark ground.`
    default:
      return ''
  }
}

export function appendControlClauses(
  base: string,
  controls: GenerativeControls,
): string {
  return [
    base,
    '',
    buildImaginationImageClause(controls),
    buildRichnessImageClause(controls),
    buildEraImageClause(controls),
  ]
    .filter(Boolean)
    .join('\n')
}
