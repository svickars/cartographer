import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

import type { VercelRequest, VercelResponse } from '@vercel/node'

export const SITE_SESSION_COOKIE = 'cartographer_site'

export function passwordProtectionEnabled(): boolean {
  return Boolean(process.env.GALLERY_SITE_PASSWORD?.trim())
}

function sessionSecret(): string | null {
  const s = process.env.GALLERY_SESSION_SECRET?.trim()
  return s || null
}

function hashPassword(s: string): Buffer {
  return createHash('sha256').update(s, 'utf8').digest()
}

export function comparePassword(input: string, expected: string): boolean {
  const a = hashPassword(input)
  const b = hashPassword(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

export function createSessionToken(secret: string): string {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000
  const payload = Buffer.from(JSON.stringify({ exp, v: 1 }), 'utf8').toString(
    'base64url',
  )
  const sig = signPayload(payload, secret)
  return `${payload}.${sig}`
}

export function verifySessionToken(
  token: string | undefined,
  secret: string,
): boolean {
  if (!token) return false
  const dot = token.lastIndexOf('.')
  if (dot === -1) return false
  const payload = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = signPayload(payload, secret)
  const sb = Buffer.from(sig)
  const eb = Buffer.from(expected)
  if (sb.length !== eb.length) return false
  try {
    if (!timingSafeEqual(sb, eb)) return false
  } catch {
    return false
  }
  try {
    const json = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as { exp?: number; v?: number }
    if (json.v !== 1) return false
    if (typeof json.exp !== 'number' || json.exp < Date.now()) return false
    return true
  } catch {
    return false
  }
}

export function getCookie(req: VercelRequest, name: string): string | undefined {
  const raw = req.headers.cookie
  if (!raw) return undefined
  const parts = raw.split(';')
  for (const p of parts) {
    const s = p.trim()
    const i = s.indexOf('=')
    if (i === -1) continue
    const k = s.slice(0, i)
    if (k === name) return decodeURIComponent(s.slice(i + 1))
  }
  return undefined
}

export function setSessionCookie(res: VercelResponse, token: string): void {
  const secure = process.env.NODE_ENV === 'production'
  const maxAge = 7 * 24 * 60 * 60
  const segments = [
    `${SITE_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ]
  if (secure) segments.push('Secure')
  res.setHeader('Set-Cookie', segments.join('; '))
}

export function clearSessionCookie(res: VercelResponse): void {
  const secure = process.env.NODE_ENV === 'production'
  const segments = [
    `${SITE_SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ]
  if (secure) segments.push('Secure')
  res.setHeader('Set-Cookie', segments.join('; '))
}

export function requireSiteAuth(req: VercelRequest, res: VercelResponse): boolean {
  if (!passwordProtectionEnabled()) return true

  const secret = sessionSecret()
  if (!secret) {
    res.status(500).json({
      ok: false,
      error:
        'Server misconfiguration: set GALLERY_SESSION_SECRET when GALLERY_SITE_PASSWORD is set.',
      code: 'AUTH_CONFIG',
    })
    return false
  }

  const token = getCookie(req, SITE_SESSION_COOKIE)
  if (verifySessionToken(token, secret)) return true

  res.status(401).json({
    ok: false,
    error: 'Unauthorized',
    code: 'SITE_AUTH_REQUIRED',
  })
  return false
}

export function getSessionSecretForSigning(): string | null {
  return sessionSecret()
}
