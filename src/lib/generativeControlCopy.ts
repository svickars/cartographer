import type {
  GenerativeControls,
  NamingLanguage,
  NamingTheme,
} from '../types/generativeControls'
import type { MapStyleId } from './mapStyles'

function buildImaginationInterpretationGuidance(
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

function buildReliefInterpretationGuidance(controls: GenerativeControls): string {
  const r = controls.relief
  if (r <= 50) return ''
  if (r <= 75) {
    return `TERRAIN / RELIEF (${r}/100 — elevated):
Infer subtle to dramatic topography from sketch context where plausible; you may describe hill ranges, valleys, rivers, and coastlines beyond minimal strokes when they reasonably extend what is drawn. Still output valid JSON with honest confidence per terrain element.`
  }
  return `TERRAIN / RELIEF (${r}/100 — maximum):
Infer and invent dramatic terrain features — mountain ranges, valleys, coastlines, rivers, weather — even if not clearly present in the sketch, while staying loosely anchored to the drawing. Still output valid JSON and confidence per element.`
}

function buildNamingInterpretationGuidance(controls: GenerativeControls): string {
  const i = controls.naming.intensity
  if (i === 0) {
    return `TOPONOMY (intensity 0/100):
In roads[].label, landmarks[].name, and the labels[] array, use ONLY text visibly written by the user in the sketch (transcribed faithfully). If a feature has no written name, use null for label/name and do not invent names. Do not add invented toponyms to labels[].`
  }
  if (i <= 40) {
    return `TOPONOMY (intensity ${i}/100 — gaps only):
Preserve every user-written label exactly where present. Invent names only for obvious gaps: unnamed roads, unlabelled landmarks. Prefer null over guessing when unclear.`
  }
  if (i <= 70) {
    return `TOPONOMY (intensity ${i}/100 — liberal):
You may freely invent names for most features. Populate roads[].label and landmarks[].name where helpful; keep user labels when they exist unless replacing improves consistency.`
  }
  return `TOPONOMY (intensity ${i}/100 — full invention):
Invent names for everything as needed for a complete map description. User-written labels in the sketch may be ignored or replaced by invented toponyms in JSON (roads[].label, landmarks[].name, labels[]).`
}

/** Extra guidance for Claude vision — appended to the fixed JSON schema prompt. */
export function buildInterpretationControlGuidance(
  controls: GenerativeControls,
): string {
  return [
    buildImaginationInterpretationGuidance(controls),
    buildReliefInterpretationGuidance(controls),
    buildNamingInterpretationGuidance(controls),
  ]
    .filter(Boolean)
    .join('\n\n')
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

export function buildReliefImageClause(controls: GenerativeControls): string {
  const r = controls.relief
  if (r <= 20) {
    return `Relief ${r}/100: flat cartographic treatment, no dramatic elevation, minimal terrain shading`
  }
  if (r <= 50) {
    return `Relief ${r}/100: gentle hillshading, implied topography, subtle contour suggestion`
  }
  if (r <= 75) {
    return `Relief ${r}/100: dramatic terrain, exaggerated relief, prominent elevation features, painterly hillshading`
  }
  return `Relief ${r}/100: epic landscape cartography, dramatic peaks and valleys, cinematic terrain, visible atmospheric perspective`
}

export function buildFormalityImageClause(controls: GenerativeControls): string {
  const f = controls.formality
  if (f <= 20) {
    return `Formality ${f}/100: loose illustrated style, no cartographic furniture, no grid, no legend, painterly and expressive`
  }
  if (f <= 40) {
    return `Formality ${f}/100: light cartographic conventions, compass rose only, minimal labelling system, illustrated character preserved`
  }
  if (f <= 60) {
    return `Formality ${f}/100: standard cartographic furniture — compass rose, simple legend, scale bar, consistent symbology`
  }
  if (f <= 80) {
    return `Formality ${f}/100: formal surveyed map style — full legend, grid lines, scale bar, coordinate markings, consistent line weights and symbology`
  }
  return `Formality ${f}/100: technical cartographic precision — full marginalia, neat lines, projection notation, contour intervals labelled, authoritative survey aesthetic`
}

const THEME_CLAUSE: Record<Exclude<NamingTheme, 'Realistic'>, string> = {
  American:
    'place names in the style of American Midwest towns — compound words, directional suffixes, named after founders',
  British:
    'place names in the style of English villages — -wick, -ford, -bury, -on-the-something suffixes, understated',
  Fantasy:
    'place names evocative of high fantasy — dramatic, ancient-sounding, meaningful in an invented tongue',
  Ancient:
    'place names derived from Latin, Greek, or Mesopotamian roots',
  Nautical:
    'place names referencing the sea, navigation, tides, and maritime history',
  'Sci-Fi':
    'place names that suggest planetary survey designations, sector codes, colony numbering systems',
  Folklore:
    "place names drawn from local myth — the Widow's Hill, the Drowning Road, the Saint's Crossing",
}

function namingLanguageDisplay(language: NamingLanguage): string {
  if (language === 'Mandarin') return 'Mandarin'
  return language
}

export function buildNamingImageClause(controls: GenerativeControls): string {
  const { intensity, language, theme } = controls.naming
  if (intensity === 0) {
    return `Toponymy intensity 0/100: Use only labels and names from the interpretation and the user's sketch; invent no new place names, street names, or map labels.`
  }

  let band: string
  if (intensity <= 40) {
    band = `Toponymy intensity ${intensity}/100: invent names only where the user has left obvious gaps (unnamed roads, unlabelled landmarks); otherwise keep user-written labels.`
  } else if (intensity <= 70) {
    band = `Toponymy intensity ${intensity}/100: freely invent names for most features while keeping the map coherent.`
  } else {
    band = `Toponymy intensity ${intensity}/100: invent names for everything; user-written labels on the sketch may be ignored.`
  }

  const langClause =
    language === 'Invented'
      ? 'Use invented place names with a consistent Tolkien-esque phonetic style.'
      : `all map labels and place names written in ${namingLanguageDisplay(language)}`

  const themeClause =
    theme === 'Realistic'
      ? ''
      : THEME_CLAUSE[theme as Exclude<NamingTheme, 'Realistic'>]

  return [band, langClause, themeClause].filter(Boolean).join(' ')
}

/** Insert before control clauses so slider-driven instructions can override the core prompt. */
export function controlPrecedenceParagraph(): string {
  return [
    '',
    'CONTROL PRECEDENCE:',
    'The CONTROL SETTINGS lines appended below override any conflicting instructions above (terrain invention, invented geography, label toponymy, and cartographic furniture such as legends, grids, scale bars, marginalia, and compass treatment).',
  ].join('\n')
}

export type AppendControlClausesOptions = {
  mapStyleId?: MapStyleId
}

/**
 * Control clauses appended after the core prompt, in order:
 * imagination → relief → richness → era → formality → naming
 * (Era omitted when mapStyleId is sketch — conflicts with sketch aesthetic.)
 */
export function appendControlClauses(
  base: string,
  controls: GenerativeControls,
  options?: AppendControlClausesOptions,
): string {
  const eraClause =
    options?.mapStyleId === 'sketch' ? '' : buildEraImageClause(controls)
  return [
    base,
    '',
    buildImaginationImageClause(controls),
    buildReliefImageClause(controls),
    buildRichnessImageClause(controls),
    eraClause,
    buildFormalityImageClause(controls),
    buildNamingImageClause(controls),
  ]
    .filter(Boolean)
    .join('\n')
}
