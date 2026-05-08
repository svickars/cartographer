import OpenAI, { toFile } from 'openai'
import type { ImagesResponse } from 'openai/resources/images'
import type { VercelRequest, VercelResponse } from '@vercel/node'

import { requireSiteAuth } from '../server/siteAuth'

function stripBase64Prefix(input: string): string {
  const m = /^data:image\/\w+;base64,/.exec(input)
  return m ? input.slice(m[0].length) : input
}

function dalle3Quality(): 'standard' | 'hd' {
  const q = process.env.OPENAI_DALLE3_QUALITY?.toLowerCase()
  return q === 'standard' ? 'standard' : 'hd'
}

function dalle3Style(): 'natural' | 'vivid' {
  const s = process.env.OPENAI_DALLE3_STYLE?.toLowerCase()
  return s === 'vivid' ? 'vivid' : 'natural'
}

function gptImageModel(): string {
  const m = process.env.OPENAI_GPT_IMAGE_MODEL?.trim()
  return m || 'gpt-image-1.5'
}

function gptImageQuality(): 'low' | 'medium' | 'high' | 'auto' {
  const q = process.env.OPENAI_GPT_IMAGE_QUALITY?.toLowerCase()
  if (q === 'low' || q === 'medium' || q === 'high' || q === 'auto') return q
  return 'high'
}

function gptImageSize(): '1024x1024' | '1024x1536' | '1536x1024' | 'auto' {
  const s = process.env.OPENAI_GPT_IMAGE_SIZE?.toLowerCase()
  if (
    s === '1024x1024' ||
    s === '1024x1536' ||
    s === '1536x1024' ||
    s === 'auto'
  ) {
    return s
  }
  return '1024x1024'
}

/** GPT image models return `b64_json` by default; DALL·E may return `url`. */
function firstImageDisplayUrl(img: ImagesResponse): string | null {
  const d = img.data?.[0]
  if (!d) return null
  if (d.url) return d.url
  if (d.b64_json) {
    const fmt = img.output_format
    const mime =
      fmt === 'jpeg' ? 'image/jpeg' : fmt === 'webp' ? 'image/webp' : 'image/png'
    return `data:${mime};base64,${d.b64_json}`
  }
  return null
}

type GenerateBody = {
  prompt?: string
  model?: string
  referenceImageBase64?: string
  schematicImageBase64?: string
  /** Echoed from client for logging / future server-side prompt assembly */
  controls?: Record<string, unknown>
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  if (!requireSiteAuth(req, res)) return

  const body = req.body as GenerateBody | undefined
  const prompt = body?.prompt
  const model = body?.model
  const referenceRaw = body?.referenceImageBase64
  const schematicRaw = body?.schematicImageBase64

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ ok: false, error: 'Expected JSON body { prompt, model }' })
  }
  if (!model || typeof model !== 'string') {
    return res.status(400).json({ ok: false, error: 'Expected JSON body { prompt, model }' })
  }

  if (model === 'flux-control') {
    if (!process.env.REPLICATE_API_TOKEN?.trim()) {
      return res.status(501).json({
        ok: false,
        error:
          'Flux ControlNet is not configured. Set REPLICATE_API_TOKEN in the server environment to enable this experimental path (pipeline not yet wired).',
      })
    }
    return res.status(501).json({
      ok: false,
      error:
        'Flux ControlNet integration is not implemented yet. Token is set — hook up a Replicate model in api/generate.ts when ready.',
    })
  }

  const key = process.env.OPENAI_API_KEY
  if (!key) {
    return res.status(500).json({
      ok: false,
      error: 'Missing OPENAI_API_KEY on the server.',
    })
  }

  const openai = new OpenAI({ apiKey: key })

  try {
    switch (model) {
      case 'dalle3': {
        const img = await openai.images.generate({
          model: 'dall-e-3',
          prompt,
          n: 1,
          size: '1024x1024',
          quality: dalle3Quality(),
          style: dalle3Style(),
        })
        const url = firstImageDisplayUrl(img)
        if (!url) {
          return res.status(502).json({
            ok: false,
            error: 'Image provider returned no image data.',
          })
        }
        return res.status(200).json({ ok: true, imageUrl: url })
      }

      case 'dalle2-edit': {
        if (!referenceRaw || typeof referenceRaw !== 'string') {
          return res.status(400).json({
            ok: false,
            error:
              'Model dalle2-edit requires referenceImageBase64 (square PNG base64 from the client).',
          })
        }
        const png = stripBase64Prefix(referenceRaw)
        const buffer = Buffer.from(png, 'base64')
        const file = await toFile(buffer, 'sketch.png', { type: 'image/png' })

        const img = await openai.images.edit({
          model: 'dall-e-2',
          image: file,
          prompt,
          n: 1,
          size: '1024x1024',
          response_format: 'url',
        })
        const url = firstImageDisplayUrl(img)
        if (!url) {
          return res.status(502).json({
            ok: false,
            error: 'Image provider returned no image data.',
          })
        }
        return res.status(200).json({ ok: true, imageUrl: url })
      }

      case 'gpt-image-edit': {
        if (!referenceRaw || typeof referenceRaw !== 'string') {
          return res.status(400).json({
            ok: false,
            error:
              'Model gpt-image-edit requires referenceImageBase64 (square PNG base64 from the client).',
          })
        }
        const png = stripBase64Prefix(referenceRaw)
        const sketchBuffer = Buffer.from(png, 'base64')
        const sketchFile = await toFile(sketchBuffer, 'sketch.png', {
          type: 'image/png',
        })

        const images =
          schematicRaw && typeof schematicRaw === 'string'
            ? [
                sketchFile,
                await toFile(
                  Buffer.from(stripBase64Prefix(schematicRaw), 'base64'),
                  'schematic.png',
                  { type: 'image/png' },
                ),
              ]
            : sketchFile

        const img = await openai.images.edit({
          model: gptImageModel(),
          image: images,
          prompt,
          n: 1,
          input_fidelity: 'high',
          quality: gptImageQuality(),
          size: gptImageSize(),
        })

        const url = firstImageDisplayUrl(img)
        if (!url) {
          return res.status(502).json({
            ok: false,
            error: 'Image provider returned no image data.',
          })
        }
        return res.status(200).json({ ok: true, imageUrl: url })
      }

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
