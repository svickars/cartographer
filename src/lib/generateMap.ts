export interface GenerateMapResult {
  imageUrl: string
}

export type GenerateMapParams = {
  prompt: string
  model: string
  referenceImageBase64?: string
  schematicImageBase64?: string
  controls?: import('../types/generativeControls').GenerativeControls
}

export async function generateMap(
  params: GenerateMapParams | string,
  modelLegacy?: string,
): Promise<GenerateMapResult> {
  const body =
    typeof params === 'string'
      ? { prompt: params, model: modelLegacy as string }
      : params

  if (!body.model) {
    throw new Error('generateMap: model is required')
  }

  const res = await fetch('/api/generate', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const json = (await res.json()) as
    | ({ ok: true } & GenerateMapResult)
    | { ok: false; error: string }

  if (!res.ok || !json.ok) {
    const message =
      'error' in json ? json.error : `Generation failed (${res.status})`
    throw new Error(message)
  }

  return { imageUrl: json.imageUrl }
}
