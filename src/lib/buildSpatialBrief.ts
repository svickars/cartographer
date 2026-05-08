import type { SketchInterpretation } from '../types/interpretation'
import { keepForPrompt } from './confidence'

/** Deterministic spatial checklist — geometry before artistic style in the main prompt. */
export function buildSpatialBrief(data: SketchInterpretation): string {
  const lines: string[] = [
    'SPATIAL LAYOUT (must match — same connectivity and rough placement):',
    `- Orientation / overall framing: ${data.orientation}`,
  ]

  const roads = data.roads.filter((r) => keepForPrompt(r.confidence))
  if (roads.length > 0) {
    lines.push('Roads & paths (preserve routes and labels):')
    for (const r of roads) {
      const label = r.label ? ` — label “${r.label}”` : ''
      lines.push(`  - ${r.description}${label}`)
    }
  } else {
    lines.push('Roads & paths: none specified (do not invent major roads).')
  }

  const water = data.water.filter((w) => keepForPrompt(w.confidence))
  if (water.length > 0) {
    lines.push('Water (preserve shorelines and bodies):')
    for (const w of water) {
      lines.push(`  - ${w.description}`)
    }
  } else {
    lines.push('Water: none specified (do not invent lakes/oceans).')
  }

  const landmarks = data.landmarks.filter((l) => keepForPrompt(l.confidence))
  if (landmarks.length > 0) {
    lines.push('Landmarks / focal points:')
    for (const l of landmarks) {
      const name = l.name ? `${l.name}: ` : ''
      lines.push(`  - ${name}${l.description}`)
    }
  } else {
    lines.push('Landmarks: none specified (do not invent POIs).')
  }

  const terrain = data.terrain.filter((t) => keepForPrompt(t.confidence))
  if (terrain.length > 0) {
    lines.push('Terrain / land cover:')
    for (const t of terrain) {
      lines.push(`  - ${t.description}`)
    }
  }

  if (data.labels.length > 0) {
    lines.push(`Written labels on the sketch (preserve spelling/placement): ${data.labels.map((x) => `“${x}”`).join(', ')}`)
  }

  return lines.join('\n')
}
