import { type FormEvent, type ReactNode, useEffect, useState } from 'react'

type GateState = 'loading' | 'locked' | 'open'

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text()
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(
      res.ok
        ? 'Unexpected response from server.'
        : text.startsWith('<')
          ? `Server error (${res.status}). Try again or check deployment logs.`
          : text.slice(0, 180),
    )
  }
}

export function SitePasswordGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>('loading')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth', { credentials: 'include' })
      .then((r) =>
        readJson<{ passwordRequired: boolean; authenticated: boolean }>(r),
      )
      .then((d) => {
        if (!d.passwordRequired) setState('open')
        else if (d.authenticated) setState('open')
        else setState('locked')
      })
      .catch(() => setState('locked'))
  }, [])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    void fetch('/api/auth', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
      .then(async (r) => {
        const j = await readJson<{ ok?: boolean; error?: string }>(r)
        if (!r.ok) throw new Error(j.error || 'Sign-in failed.')
        setState('open')
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Sign-in failed.')
      })
  }

  if (state === 'loading') {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#ebe4d6] text-[#1a2744]">
        <p className="font-sans text-sm">Loading…</p>
      </div>
    )
  }

  if (state === 'locked') {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#ebe4d6] px-4 text-[#1a2744]">
        <h1 className="font-serif text-3xl tracking-tight">Cartographer</h1>
        <p className="mt-2 max-w-md text-center font-sans text-sm text-[#1a2744]/75">
          Enter the site password to continue.
        </p>
        <form onSubmit={submit} className="mt-8 w-full max-w-sm space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border border-[#1a2744]/25 bg-white px-3 py-2 font-sans text-[#1a2744]"
            placeholder="Password"
            autoComplete="current-password"
          />
          {error && (
            <p className="font-sans text-sm text-[#8b2942]" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="w-full rounded border border-[#1a2744] bg-[#1a2744] px-4 py-2 font-sans text-sm font-medium text-[#f4efe6]"
          >
            Continue
          </button>
        </form>
      </div>
    )
  }

  return <>{children}</>
}
