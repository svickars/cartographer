import type { VercelRequest, VercelResponse } from '@vercel/node'

import {
  clearSessionCookie,
  comparePassword,
  createSessionToken,
  getCookie,
  getSessionSecretForSigning,
  passwordProtectionEnabled,
  setSessionCookie,
  SITE_SESSION_COOKIE,
  verifySessionToken,
} from './siteAuth'

type AuthStatusBody = {
  passwordRequired: boolean
  authenticated: boolean
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const pwd = passwordProtectionEnabled()
      const secret = getSessionSecretForSigning()
      const token = getCookie(req, SITE_SESSION_COOKIE)
      const authenticated =
        !pwd || (secret ? verifySessionToken(token, secret) : false)
      const body: AuthStatusBody = {
        passwordRequired: pwd,
        authenticated,
      }
      return res.status(200).json(body)
    }

    if (req.method === 'POST') {
      if (!passwordProtectionEnabled()) {
        return res.status(200).json({ ok: true })
      }

      const secret = getSessionSecretForSigning()
      if (!secret) {
        return res.status(500).json({
          ok: false,
          error:
            'Set GALLERY_SESSION_SECRET (long random string) alongside GALLERY_SITE_PASSWORD.',
        })
      }

      const expected = process.env.GALLERY_SITE_PASSWORD ?? ''
      const raw = req.body as { password?: string } | string | undefined
      let password = ''
      if (typeof raw === 'string') {
        try {
          password =
            (JSON.parse(raw) as { password?: string }).password ?? ''
        } catch {
          password = ''
        }
      } else {
        password = raw?.password ?? ''
      }
      if (!comparePassword(password, expected)) {
        return res.status(401).json({ ok: false, error: 'Invalid password.' })
      }

      const token = createSessionToken(secret)
      setSessionCookie(res, token)
      return res.status(200).json({ ok: true })
    }

    if (req.method === 'DELETE') {
      clearSessionCookie(res)
      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', 'GET, POST, DELETE')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    console.error('api/auth error', e)
    return res.status(500).json({
      ok: false,
      error: e instanceof Error ? e.message : 'Auth handler failed.',
    })
  }
}
