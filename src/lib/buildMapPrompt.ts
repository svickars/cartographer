import type { SketchInterpretation } from '../types/interpretation'
import type { GenerativeControls } from '../types/generativeControls'
import {
  appendControlClauses,
  controlPrecedenceParagraph,
} from './generativeControlCopy'
import { keepForPrompt } from './confidence'
import { MAP_STYLES, type MapStyleId } from './mapStyles'
import { buildSpatialBrief } from './buildSpatialBrief'
import { buildTopologyHints } from './buildTopologyHints'

function styleBlock(styleId: MapStyleId, controls: GenerativeControls): string {
  const style = MAP_STYLES.find((s) => s.id === styleId)
  const label = style?.label ?? styleId
  const summary = style?.summary ?? ''
  const lines = [`Rendering style — ${label}:`, summary]

  if (styleId === 'streetMap' && style?.generationClause) {
    if (controls.formality < 50) {
      lines.push(
        'clean modern illustrated map with digital cartography influence',
      )
    } else {
      lines.push(style.generationClause)
    }
  } else if (styleId === 'sketch' && style?.generationClause) {
    lines.push(style.generationClause)
    lines.push(
      'Ignore any historical period or Era styling elsewhere in the prompt — the hand-drawn sketch map aesthetic overrides period-specific labels, palettes, or ornaments.',
    )
  }

  return lines.join('\n')
}

function formatRoads(data: SketchInterpretation): string {
  const rows = data.roads.filter((r) => keepForPrompt(r.confidence))
  if (rows.length === 0) return '- (none above low-confidence threshold)'
  return rows
    .map((r) => {
      const tag = r.label ? ` — label “${r.label}”` : ''
      return `- ${r.description}${tag}`
    })
    .join('\n')
}

function formatWater(data: SketchInterpretation): string {
  const rows = data.water.filter((w) => keepForPrompt(w.confidence))
  if (rows.length === 0) return '- (none above low-confidence threshold)'
  return rows.map((w) => `- ${w.description}`).join('\n')
}

function formatLandmarks(data: SketchInterpretation): string {
  const rows = data.landmarks.filter((l) => keepForPrompt(l.confidence))
  if (rows.length === 0) return '- (none above low-confidence threshold)'
  return rows
    .map((l) => {
      const name = l.name ? `${l.name}: ` : ''
      return `- ${name}${l.description}`
    })
    .join('\n')
}

function formatTerrain(data: SketchInterpretation): string {
  const rows = data.terrain.filter((t) => keepForPrompt(t.confidence))
  if (rows.length === 0) return '- (none above low-confidence threshold)'
  return rows.map((t) => `- ${t.description}`).join('\n')
}

const appendOpts = (styleId: MapStyleId) => ({ mapStyleId: styleId })

/**
 * User emoji on the sketch are semantic markers; the image model must not paste literal emoji art.
 */
function emojiIntentInstructionsForImage(styleId: MapStyleId): string {
  const flatOrDigital =
    styleId === 'streetMap' || styleId === 'tourist'
      ? ' For this flat, legible style, show those intents only with map-native elements (small POI marks, simple flat pictograms, typography, or area fills) exactly as that style would on a real street or visitor map — never the colorful Unicode emoji artwork from the sketch.'
      : ''

  return [
    'EMOJI AND ICON MARKERS: If the sketch or notes show emoji or other phone-style symbols the user dropped on the canvas, treat them ONLY as lightweight markers for WHAT belongs at that position (feature type or intent). They are not artwork directions.',
    'Do NOT draw the literal emoji characters, glossy pictographs, sticker outlines, or duplicate those symbols in the finished map. Translate each marker into cartographic content that fully matches the Rendering style and CONTROL SETTINGS below — same linework, colour system, and level of abstraction as the rest of the map.',
    flatOrDigital,
  ]
    .join('\n')
    .trim()
}

/** Full text prompt for text-only image models (e.g. DALL·E 3). Geometry blocks first. */
export function buildMapPrompt(
  interpretation: SketchInterpretation,
  styleId: MapStyleId,
  controls: GenerativeControls,
): string {
  const spatial = buildSpatialBrief(interpretation)
  const topology = buildTopologyHints(interpretation)

  const notesLine =
    interpretation.notes.trim().length > 0
      ? `Interpreter notes (hint only; must not override layout above): ${interpretation.notes}`
      : 'Interpreter notes: (none)'

  const core = [
    'LAYOUT CONTRACT — illustrated map only, edge-to-edge artwork (no frame, no browser UI, no watermark). Omit a separate legend panel and decorative border unless CONTROL SETTINGS below require cartographic furniture.',
    'Do NOT add cities, roads, rivers, lakes, forests, or landmarks that clearly contradict what is described below, unless CONTROL SETTINGS below call for invention.',
    'Do NOT rotate or mirror the scene relative to the stated orientation.',
    'No ornate compass rose, sea monsters, cartouches, or extras unless clearly implied by the labels below or required by CONTROL SETTINGS below.',
    '',
    emojiIntentInstructionsForImage(styleId),
    '',
    spatial,
    '',
    topology,
    '',
    'DETAIL LIST (same sketch — expanded wording):',
    'Roads & paths:',
    formatRoads(interpretation),
    '',
    'Water:',
    formatWater(interpretation),
    '',
    'Landmarks:',
    formatLandmarks(interpretation),
    '',
    'Terrain:',
    formatTerrain(interpretation),
    '',
    interpretation.labels.length > 0
      ? `Labels to honour (placement & spelling): ${interpretation.labels.map((t) => `“${t}”`).join(', ')}`
      : 'Labels: none detected.',
    '',
    notesLine,
    `Overall interpretation confidence: ${interpretation.overall_confidence}. Prefer omitting ambiguous detail over inventing geography.`,
    '',
    styleBlock(styleId, controls),
  ].join('\n')

  return appendControlClauses(
    core + controlPrecedenceParagraph(),
    controls,
    appendOpts(styleId),
  )
}

/** Short prompt for DALL·E 2 `images.edit` (max 1000 chars). */
export function buildSketchEditPrompt(
  interpretation: SketchInterpretation,
  styleId: MapStyleId,
  controls: GenerativeControls,
): string {
  const style = MAP_STYLES.find((s) => s.id === styleId)
  const label = style?.label ?? styleId
  const summary = style?.summary ?? ''

  const core = [
    `Turn this hand-drawn map sketch into a polished ${label} finished map.`,
    'Dropped emoji or phone-style symbols on the sketch mark WHAT to show at that spot only — render as map-native features in this style, never as literal emoji artwork.',
    'Preserve the sketch topology: keep the same roads, water, terrain regions, landmark placements, and handwritten labels in the same positions unless CONTROL SETTINGS below allow otherwise.',
    `Orientation reference: ${interpretation.orientation}`,
    summary,
    'No decorative border, no UI, no watermark. Cartographic polish — colour, shading, cleaner linework. Omit legend panels unless CONTROL SETTINGS below require them; avoid inventing geography unless CONTROL SETTINGS below call for it.',
  ].join(' ')

  const full = appendControlClauses(
    core + controlPrecedenceParagraph(),
    controls,
    appendOpts(styleId),
  )
  return full.length > 1000 ? `${full.slice(0, 997)}...` : full
}

/** GPT Image `images.edit` — long-form; optional dual-image (sketch + schematic) preamble. */
export function buildGptImageEditPrompt(
  interpretation: SketchInterpretation,
  styleId: MapStyleId,
  controls: GenerativeControls,
  options?: { useDualReference?: boolean },
): string {
  const dual =
    options?.useDualReference === true
      ? [
          'INPUT IMAGES:',
          '- First image: the user’s original freehand sketch (authoritative for stroke placement).',
          '- Second image: a simplified schematic topology diagram generated from the same interpretation — use it when layout is ambiguous; prefer outcomes where sketch and schematic agree.',
          '',
        ].join('\n')
      : ''

  const core = [
    dual,
    'TASK: Transform the sketch into a polished illustrated map while preserving geography.',
    'Preserve topology: roads, water, terrain regions, landmark placements, and labels from the interpretation stay in the same relative positions unless CONTROL SETTINGS below explicitly allow renaming, invention, or dramatic terrain.',
    'Prefer features implied by the sketch; avoid towns, roads, lakes, or landmarks that clearly contradict the drawing unless CONTROL SETTINGS below call for invention or relief exaggeration.',
    'Apply polish: colour, shading, cleaner linework. No UI or watermarks. Omit decorative frames and separate legend panels unless CONTROL SETTINGS below require cartographic furniture.',
    '',
    emojiIntentInstructionsForImage(styleId),
    '',
    buildSpatialBrief(interpretation),
    '',
    buildTopologyHints(interpretation),
    '',
    `Orientation (must stay consistent with this): ${interpretation.orientation}`,
    '',
    styleBlock(styleId, controls),
    controlPrecedenceParagraph(),
  ].join('\n')

  return appendControlClauses(core, controls, appendOpts(styleId))
}
