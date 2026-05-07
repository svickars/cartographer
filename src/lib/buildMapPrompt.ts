import type { SketchInterpretation } from '../types/interpretation'
import { MAP_STYLES, type MapStyleId } from './mapStyles'

function styleBlock(styleId: MapStyleId): string {
  const style = MAP_STYLES.find((s) => s.id === styleId)
  const label = style?.label ?? styleId
  const summary = style?.summary ?? ''
  return `Visual style: ${label}. ${summary}`
}

/** Builds a single detailed prompt for the image generator from Claude JSON + UI style. */
export function buildMapPrompt(
  interpretation: SketchInterpretation,
  styleId: MapStyleId,
): string {
  const roads =
    interpretation.roads.length > 0
      ? interpretation.roads
          .map(
            (r) =>
              `- ${r.description}${r.label ? ` (“${r.label}”, confidence ${r.confidence})` : ` (confidence ${r.confidence})`}`,
          )
          .join('\n')
      : '- (none noted)'

  const water =
    interpretation.water.length > 0
      ? interpretation.water
          .map((w) => `- ${w.description} (confidence ${w.confidence})`)
          .join('\n')
      : '- (none noted)'

  const landmarks =
    interpretation.landmarks.length > 0
      ? interpretation.landmarks
          .map(
            (l) =>
              `- ${l.name ? `${l.name}: ` : ''}${l.description} (confidence ${l.confidence})`,
          )
          .join('\n')
      : '- (none noted)'

  const terrain =
    interpretation.terrain.length > 0
      ? interpretation.terrain
          .map((t) => `- ${t.description} (confidence ${t.confidence})`)
          .join('\n')
      : '- (none noted)'

  const labels =
    interpretation.labels.length > 0
      ? interpretation.labels.map((t) => `- “${t}”`).join('\n')
      : '- (none drawn)'

  return [
    'Create a single illustrated map image from this interpreted sketch. No UI, no frame, no watermark — only the map artwork.',
    styleBlock(styleId),
    '',
    'Overall layout & orientation:',
    interpretation.orientation,
    '',
    'Roads & paths:',
    roads,
    '',
    'Water:',
    water,
    '',
    'Landmarks / points of interest:',
    landmarks,
    '',
    'Terrain:',
    terrain,
    '',
    'Handwritten or drawn labels to honour:',
    labels,
    '',
    `Cartographer notes (optional): ${interpretation.notes}`,
    `Overall interpretation confidence: ${interpretation.overall_confidence}.`,
    '',
    'Composition: fill the frame edge-to-edge with the map; north consistent with the orientation description; readable hierarchy for routes water terrain and landmarks.',
  ].join('\n')
}
