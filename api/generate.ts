import OpenAI from 'openai'
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const body = req.body as { prompt?: string; model?: string } | undefined
  const prompt = body?.prompt
  const model = body?.model

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ ok: false, error: 'Expected JSON body { prompt, model }' })
  }
  if (!model || typeof model !== 'string') {
    return res.status(400).json({ ok: false, error: 'Expected JSON body { prompt, model }' })
  }

  try {
    switch (model) {
      case 'dalle3': {
        const key = process.env.OPENAI_API_KEY
        if (!key) {
          return res.status(500).json({
            ok: false,
            error: 'Missing OPENAI_API_KEY on the server.',
          })
        }
        const openai = new OpenAI({ apiKey: key })
        const img = await openai.images.generate({
          model: 'dall-e-3',
          prompt,
          n: 1,
          size: '1024x1024',
        })
        const url = img.data?.[0]?.url
        if (!url) {
          return res.status(502).json({
            ok: false,
            error: 'Image provider returned no URL.',
          })
        }
        return res.status(200).json({ ok: true, imageUrl: url })
      }

      // Future: case 'flux-pro': { … new env var … }

      default:
        return res.status(400).json({
          ok: false,
          error: `Unknown model "${model}".`,
        })
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Generation failed'
    console.error(e)
    return res.status(500).json({ ok: false, error: message })
  }
}
