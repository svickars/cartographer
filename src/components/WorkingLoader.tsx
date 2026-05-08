import { useEffect, useState } from 'react'

const LINES = [
  'Interpreting your sketch…',
  'Plotting a course…',
  'Working some magic…',
  'Exploring…',
]

type Props = {
  active: boolean
}

export function WorkingLoader({ active }: Props) {
  const [lineIndex, setLineIndex] = useState(0)

  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => {
      setLineIndex((i) => (i + 1) % LINES.length)
    }, 2200)
    return () => window.clearInterval(id)
  }, [active])

  if (!active) return null

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 py-16">
      <h2 className="font-serif text-4xl tracking-tight text-[#1a2744] md:text-5xl">
        Working…
      </h2>
      <p
        key={lineIndex}
        className="mt-6 max-w-md text-center font-sans text-lg text-[#1a2744]/75 transition-opacity duration-500"
      >
        {LINES[lineIndex]}
      </p>
    </div>
  )
}
