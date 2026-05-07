export interface GenerateMapResult {
  imageUrl: string
}

export async function generateMap(
  prompt: string,
  model: string,
): Promise<GenerateMapResult> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, model }),
  })

  const body = (await res.json()) as
    | ({ ok: true } & GenerateMapResult)
    | { ok: false; error: string }

  if (!res.ok || !body.ok) {
    const message =
      'error' in body ? body.error : `Generation failed (${res.status})`
    throw new Error(message)
  }

  return { imageUrl: body.imageUrl }
}
