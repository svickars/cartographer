import Anthropic from '@anthropic-ai/sdk'
import type { VercelRequest, VercelResponse } from '@vercel/node'

import { requireSiteAuth } from '../server/siteAuth.js'
import { buildInterpretationControlGuidance } from '../src/lib/generativeControlCopy.js'
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

function buildUserText(controls: GenerativeControls): string {
  const guidance = buildInterpretationControlGuidance(controls)
  return `${INTERPRET_PROMPT}\n\n${guidance}`
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
    | { imageBase64?: string; controls?: Partial<GenerativeControls> }
    | undefined
  const raw = body?.imageBase64
  if (!raw || typeof raw !== 'string') {
    return res.status(400).json({
      ok: false,
      error: 'Expected JSON body { imageBase64, controls? }',
    })
  }

  const controls = normalizeControls(body?.controls)

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
              text: buildUserText(controls),
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
