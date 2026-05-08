import type { SketchInterpretation } from '../types/interpretation'
import type { GenerativeControls } from '../types/generativeControls'
import { appendControlClauses } from './generativeControlCopy'
import { keepForPrompt } from './confidence'
import { MAP_STYLES, type MapStyleId } from './mapStyles'
import { buildSpatialBrief } from './buildSpatialBrief'
import { buildTopologyHints } from './buildTopologyHints'

function styleBlock(styleId: MapStyleId): string {
  const style = MAP_STYLES.find((s) => s.id === styleId)
  const label = style?.label ?? styleId
  const summary = style?.summary ?? ''
  return [`Rendering style — ${label}:`, summary].join('\n')
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
    'LAYOUT CONTRACT — illustrated map only, edge-to-edge artwork (no frame, no browser UI, no watermark, no legend panel, no decorative border).',
    'Do NOT add cities, roads, rivers, lakes, forests, or landmarks that are not described below.',
    'Do NOT rotate or mirror the scene relative to the stated orientation.',
    'No ornate compass rose, sea monsters, cartouches, or extras unless clearly implied by the labels below.',
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
    styleBlock(styleId),
  ].join('\n')

  return appendControlClauses(core, controls)
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
    'Preserve the sketch topology: keep the same roads, water, terrain regions, landmark placements, and handwritten labels in the same positions. Do not add towns, roads, lakes, or landmarks that are not already implied by the drawing.',
    `Orientation reference: ${interpretation.orientation}`,
    summary,
    'No decorative border, no legend panel, no UI, no watermark. Cartographic polish only — colour, shading, cleaner linework — without inventing new geography.',
  ].join(' ')

  const full = appendControlClauses(core, controls)
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
    'Preserve topology: roads, water, terrain regions, landmark placements, and handwritten labels remain in the same relative positions. Do not add towns, roads, lakes, or landmarks not implied by the sketch.',
    'Apply cartographic polish only: colour, shading, cleaner linework — no decorative frames, legend panels, UI, watermarks, or invented geography.',
    '',
    buildSpatialBrief(interpretation),
    '',
    buildTopologyHints(interpretation),
    '',
    `Orientation (must stay consistent with this): ${interpretation.orientation}`,
    '',
    styleBlock(styleId),
  ].join('\n')

  return appendControlClauses(core, controls)
}
