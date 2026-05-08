import type { SketchInterpretation } from '../types/interpretation'
import type { GenerativeControls } from '../types/generativeControls'

export type InterpretResponse =
  | { ok: true; interpretation: SketchInterpretation }
  | { ok: false; error: string }

export async function interpretSketch(
  pngBase64: string,
  controls: GenerativeControls,
): Promise<SketchInterpretation> {
  const res = await fetch('/api/interpret', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: pngBase64, controls }),
  })

  const body = (await res.json()) as InterpretResponse

  if (!res.ok || !body.ok) {
    const message =
      !body.ok && 'error' in body
        ? body.error
        : `Interpret failed (${res.status})`
    throw new Error(message)
  }

  return body.interpretation
}
