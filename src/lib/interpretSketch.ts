import type { SketchInterpretation } from '../types/interpretation'

export type InterpretResponse =
  | { ok: true; interpretation: SketchInterpretation }
  | { ok: false; error: string }

export async function interpretSketch(
  pngBase64: string,
): Promise<SketchInterpretation> {
  const res = await fetch('/api/interpret', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: pngBase64 }),
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
