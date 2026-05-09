import { useEffect, useState } from 'react'

const LINES = [
  'Interpreting your sketch…',
  'Plotting a course…',
  'Working some magic…',
  'Exploring…',
]

const CHAR_MS = 38
const HOLD_AFTER_FULL_MS = 720
const FADE_MS = 420
const PAUSE_BEFORE_NEXT_MS = 120

type Props = {
  active: boolean
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function WorkingLoader({ active }: Props) {
  const [lineIndex, setLineIndex] = useState(0)
  const [visibleCount, setVisibleCount] = useState(0)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    if (!active) {
      setLineIndex(0)
      setVisibleCount(0)
      setFading(false)
    }
  }, [active])

  /** Rotate full lines on an interval when motion is reduced. */
  useEffect(() => {
    if (!active || !prefersReducedMotion()) return

    const id = window.setInterval(() => {
      setLineIndex((i) => (i + 1) % LINES.length)
    }, 2800)
    return () => window.clearInterval(id)
  }, [active])

  /** Typewriter → hold → fade → next line. */
  useEffect(() => {
    if (!active || prefersReducedMotion()) return

    const line = LINES[lineIndex]

    let charInterval: ReturnType<typeof setInterval> | undefined
    let holdTimeout: ReturnType<typeof setTimeout> | undefined
    let fadeTimeout: ReturnType<typeof setTimeout> | undefined
    let nextTimeout: ReturnType<typeof setTimeout> | undefined

    setVisibleCount(0)
    setFading(false)

    const finishLine = () => {
      holdTimeout = window.setTimeout(() => {
        setFading(true)
        fadeTimeout = window.setTimeout(() => {
          nextTimeout = window.setTimeout(() => {
            setLineIndex((i) => (i + 1) % LINES.length)
          }, PAUSE_BEFORE_NEXT_MS)
        }, FADE_MS)
      }, HOLD_AFTER_FULL_MS)
    }

    if (line.length === 0) {
      finishLine()
    } else {
      setVisibleCount(1)
      let n = 1
      if (n >= line.length) {
        finishLine()
      } else {
        charInterval = window.setInterval(() => {
          n += 1
          setVisibleCount(n)
          if (n >= line.length) {
            if (charInterval) window.clearInterval(charInterval)
            finishLine()
          }
        }, CHAR_MS)
      }
    }

    return () => {
      if (charInterval) window.clearInterval(charInterval)
      if (holdTimeout) window.clearTimeout(holdTimeout)
      if (fadeTimeout) window.clearTimeout(fadeTimeout)
      if (nextTimeout) window.clearTimeout(nextTimeout)
    }
  }, [active, lineIndex])

  if (!active) return null

  const reduced = prefersReducedMotion()

  const text = reduced
    ? LINES[lineIndex]
    : LINES[lineIndex].slice(0, visibleCount)

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 py-16">
      <h2 className="font-serif text-4xl tracking-tight text-[#1a2744] md:text-5xl">
        Working…
      </h2>
      <p
        key={lineIndex}
        className={`mt-6 min-h-[1.75rem] max-w-md text-center font-sans text-lg text-[#1a2744]/75 transition-opacity duration-[420ms] ease-out motion-reduce:transition-none ${
          !reduced && fading ? 'opacity-0' : 'opacity-100'
        }`}
        aria-live="polite"
      >
        {text}
      </p>
    </div>
  )
}
