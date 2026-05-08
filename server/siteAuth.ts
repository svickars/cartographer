import { createHash, createHmac, timingSafeEqual } from 'crypto'

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

/** URL-safe base64 without relying on Buffer encoding names that vary by Node version. */
function bufferToBase64Url(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function base64UrlToBuffer(s: string): Buffer {
  let b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4
  if (pad) b64 += '='.repeat(4 - pad)
  return Buffer.from(b64, 'base64')
}

/** Hex HMAC — avoids `digest('base64url')`, which is not supported on some Node runtimes. */
function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

export function createSessionToken(secret: string): string {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000
  const payload = bufferToBase64Url(
    Buffer.from(JSON.stringify({ exp, v: 1 }), 'utf8'),
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
  const expectedHex = signPayload(payload, secret)
  const sb = Buffer.from(sig, 'hex')
  const eb = Buffer.from(expectedHex, 'hex')
  if (sb.length !== eb.length || sb.length === 0) return false
  try {
    if (!timingSafeEqual(sb, eb)) return false
  } catch {
    return false
  }
  try {
    const json = JSON.parse(base64UrlToBuffer(payload).toString('utf8')) as {
      exp?: number
      v?: number
    }
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
    if (k === name) {
      try {
        return decodeURIComponent(s.slice(i + 1))
      } catch {
        return undefined
      }
    }
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
