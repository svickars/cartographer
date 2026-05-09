import type { CanvasAnnotation, InterpretAnnotation } from '../types/canvasAnnotations'

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

export function toInterpretAnnotations(
  list: CanvasAnnotation[],
): InterpretAnnotation[] {
  return list.map((a) => {
    if (a.type === 'emoji') {
      return {
        type: 'emoji',
        content: a.content,
        x: clamp01(a.x),
        y: clamp01(a.y),
        scale: Math.min(4, Math.max(0.25, a.scale)),
      }
    }
    return {
      type: 'text',
      content: a.content,
      x: clamp01(a.x),
      y: clamp01(a.y),
      style: a.style,
    }
  })
}
