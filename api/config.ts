import type { VercelRequest, VercelResponse } from '@vercel/node'

import { requireSiteAuth } from '../server/siteAuth'

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!requireSiteAuth(req, res)) return

  return res.status(200).json({
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    anthropicConfigured: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
    replicateConfigured: Boolean(process.env.REPLICATE_API_TOKEN?.trim()),
  })
}
