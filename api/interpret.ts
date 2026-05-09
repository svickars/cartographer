import Anthropic from '@anthropic-ai/sdk'
import type { VercelRequest, VercelResponse } from '@vercel/node'

import { requireSiteAuth } from '../server/siteAuth.js'
import { buildInterpretationControlGuidance } from '../src/lib/generativeControlCopy.js'
import type { InterpretAnnotation } from '../src/types/canvasAnnotations.js'
import type { SketchInterpretation } from '../src/types/interpretation.js'
import {
  normalizeControls,
  type GenerativeControls,
} from '../src/types/generativeControls.js'

const INTERPRET_PROMPT = `You are a cartographer's assistant. A user has drawn a freehand sketch of a place from memory or imagination. Interpret the sketch and produce a structured description suitable for generating a styled illustrated map.
Identify:

Overall layout and orientation
Roads and paths (rough routes and any labels)
Water features (rivers, lakes, coastline)
Landmarks or points of interest
Terrain (hills, flat areas, forests)
Any text or labels the user has written
Your confidence level per element: high / medium / low

Respond ONLY with valid JSON. No preamble, no markdown. Schema:
{
"orientation": string,
"roads": [{ "description": string, "label": string | null, "confidence": string }],
"water": [{ "description": string, "confidence": string }],
"landmarks": [{ "name": string | null, "description": string, "confidence": string }],
"terrain": [{ "description": string, "confidence": string }],
"labels": [string],
"overall_confidence": string,
"notes": string
}`

function stripBase64Prefix(input: string): string {
  const m = /^data:image\/\w+;base64,/.exec(input)
  return m ? input.slice(m[0].length) : input
}

function extractJsonObject(text: string): string {
  const fence = /```(?:json)?\s*([\s\S]*?)```/
  const fenced = fence.exec(text)
  if (fenced?.[1]) return fenced[1].trim()
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end > start) return text.slice(start, end + 1)
  return text.trim()
}

function normalizeAnnotations(raw: unknown): InterpretAnnotation[] {
  if (!Array.isArray(raw)) return []
  const out: InterpretAnnotation[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const t = o.type
    const x = Number(o.x)
    const y = Number(o.y)
    if (t !== 'emoji' && t !== 'text') continue
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    if (t === 'emoji') {
      const content = typeof o.content === 'string' ? o.content : ''
      const scale = Number(o.scale)
      if (!content) continue
      out.push({
        type: 'emoji',
        content,
        x: Math.min(1, Math.max(0, x)),
        y: Math.min(1, Math.max(0, y)),
        scale:
          Number.isFinite(scale) && scale > 0
            ? Math.min(4, Math.max(0.25, scale))
            : 1,
      })
    } else {
      const content = typeof o.content === 'string' ? o.content : ''
      const style = o.style
      const okStyle =
        style === 'header' ||
        style === 'subheader' ||
        style === 'label' ||
        style === 'small' ||
        style === 'decorative'
      if (!content || !okStyle) continue
      out.push({
        type: 'text',
        content,
        x: Math.min(1, Math.max(0, x)),
        y: Math.min(1, Math.max(0, y)),
        style,
      })
    }
  }
  return out
}

function buildAnnotationGroundTruthBlock(annotations: InterpretAnnotation[]): string {
  if (annotations.length === 0) return ''
  const json = JSON.stringify(annotations, null, 2)
  return `USER ANNOTATIONS (structured — treat as ground truth for placement and meaning):
The user placed the following on the map using annotation tools. Each entry uses x and y as fractions of image width and height (0–1, origin top-left).
For every annotation, treat the content at that location as HIGH confidence intent: do not second-guess, reinterpret away, or omit it. Merge this information with the sketch interpretation; if sketch strokes are ambiguous at an annotated location, prefer the annotation.
${json}

Emoji annotations ("type":"emoji"): the string in "content" is a compact hint for WHAT belongs at those coordinates (e.g. woodland, peak, harbour, building), not a specification for how the finished map should look. Describe the intended geographic or cartographic feature in neutral map-making language in roads/water/landmarks/terrain/labels/notes as appropriate. Do not write descriptions that tell a later image model to paint the emoji glyph, a phone-style sticker, or glossy pictograph art — downstream rendering will follow the user's chosen map style, not the emoji's visual design.`
}

function buildUserText(
  controls: GenerativeControls,
  annotations: InterpretAnnotation[],
): string {
  const guidance = buildInterpretationControlGuidance(controls)
  const annBlock = buildAnnotationGroundTruthBlock(annotations)
  const parts = [INTERPRET_PROMPT]
  if (annBlock) {
    parts.push('', annBlock)
  }
  parts.push('', guidance)
  return parts.join('\n')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  if (!requireSiteAuth(req, res)) return

  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    return res.status(500).json({
      ok: false,
      error: 'Missing ANTHROPIC_API_KEY on the server.',
    })
  }

  const body = req.body as
    | {
        imageBase64?: string
        image?: string
        annotations?: unknown
        controls?: Partial<GenerativeControls>
      }
    | undefined
  const raw =
    typeof body?.imageBase64 === 'string'
      ? body.imageBase64
      : typeof body?.image === 'string'
        ? body.image
        : undefined
  if (!raw || typeof raw !== 'string') {
    return res.status(400).json({
      ok: false,
      error:
        'Expected JSON body { imageBase64 (or image), controls?, annotations? }',
    })
  }

  const controls = normalizeControls(body?.controls)
  const annotations = normalizeAnnotations(body?.annotations)

  const pngBase64 = stripBase64Prefix(raw)

  const anthropic = new Anthropic({ apiKey: key })

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: pngBase64,
              },
            },
            {
              type: 'text',
              text: buildUserText(controls, annotations),
            },
          ],
        },
      ],
    })

    const textBlocks = message.content.filter((b) => b.type === 'text')
    const combined = textBlocks.map((b) => b.text).join('\n')
    const jsonStr = extractJsonObject(combined)
    const parsed = JSON.parse(jsonStr) as SketchInterpretation

    return res.status(200).json({ ok: true, interpretation: parsed })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Interpretation failed'
    console.error(e)
    return res.status(500).json({ ok: false, error: message })
  }
}
