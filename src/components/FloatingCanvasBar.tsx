import type { CSSProperties } from 'react'
import { useLayoutEffect, useRef } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Eraser,
  Images,
  Pencil,
  RotateCcw,
  Trash2,
} from 'lucide-react'

import type { CanvasTool } from './Canvas'

export type FloatingBarVariant = 'draw' | 'styleNav' | 'modelNav' | 'result'

type Props = {
  variant: FloatingBarVariant
  tool?: CanvasTool
  onToolChange?: (t: CanvasTool) => void
  brushSize?: number
  onBrushSizeChange?: (n: number) => void
  onDownloadSketch?: () => void
  onClearSketch?: () => void
  onPrimary?: () => void
  primaryLabel?: string
  primaryDisabled?: boolean
  onBack?: () => void
  backDisabled?: boolean
  onDownloadMap?: () => void
  onTryAgain?: () => void
  onAddGallery?: () => void
  mapDownloadDisabled?: boolean
  tryAgainDisabled?: boolean
  addGalleryDisabled?: boolean
  /** Merged onto the outer bar wrapper (e.g. z-index tweaks). */
  className?: string
  /** `inline` sits in document flow below the canvas; `fixed` pins to the viewport. */
  dock?: 'fixed' | 'inline'
  /** When `dock` is `fixed`, shifts the bar up by this amount (use `window.scrollY` on the homepage). */
  viewportScrollY?: number
}

export function FloatingCanvasBar({
  variant,
  tool = 'pen',
  onToolChange,
  brushSize = 6,
  onBrushSizeChange,
  onDownloadSketch,
  onClearSketch,
  onPrimary,
  primaryLabel = 'Go',
  primaryDisabled,
  onBack,
  backDisabled,
  onDownloadMap,
  onTryAgain,
  onAddGallery,
  mapDownloadDisabled,
  tryAgainDisabled,
  addGalleryDisabled,
  className = '',
  dock = 'fixed',
  viewportScrollY = 0,
}: Props) {
  const pillRef = useRef<HTMLDivElement>(null)
  const prevSizeRef = useRef<{ w: number; h: number } | null>(null)

  useLayoutEffect(() => {
    const el = pillRef.current
    if (!el) return

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const rect = el.getBoundingClientRect()
    const prev = prevSizeRef.current

    const changed =
      !!prev &&
      (Math.abs(prev.w - rect.width) > 0.5 ||
        Math.abs(prev.h - rect.height) > 0.5)

    if (!reduced && changed && prev) {
      const sx = prev.w / rect.width
      const sy = prev.h / rect.height

      el.style.transformOrigin = '50% 100%'
      el.style.transform = `scale(${sx}, ${sy})`
      void el.offsetHeight

      let finished = false
      const settle = () => {
        if (finished) return
        finished = true
        el.style.transition = ''
        el.style.transform = ''
        const r = el.getBoundingClientRect()
        prevSizeRef.current = { w: r.width, h: r.height }
      }

      const onTransitionEnd = (e: TransitionEvent) => {
        if (e.propertyName === 'transform') settle()
      }

      let settleTimeout: ReturnType<typeof setTimeout> | undefined

      const raf = requestAnimationFrame(() => {
        el.style.transition =
          'transform 300ms cubic-bezier(0.34, 1.15, 0.64, 1)'
        el.style.transform = 'scale(1, 1)'
        el.addEventListener('transitionend', onTransitionEnd)
        settleTimeout = window.setTimeout(settle, 450)
      })

      return () => {
        cancelAnimationFrame(raf)
        if (settleTimeout !== undefined) clearTimeout(settleTimeout)
        el.removeEventListener('transitionend', onTransitionEnd)
        el.style.transition = ''
        el.style.transform = ''
        const r = el.getBoundingClientRect()
        prevSizeRef.current = { w: r.width, h: r.height }
      }
    }

    prevSizeRef.current = { w: rect.width, h: rect.height }
  }, [variant])

  const dockClass =
    dock === 'fixed'
      ? 'fixed bottom-6 left-1/2 z-50'
      : 'relative z-10 mx-auto justify-center'
  const fixedStyle: CSSProperties | undefined =
    dock === 'fixed'
      ? {
          transform: `translate(-50%, ${-viewportScrollY}px)`,
        }
      : undefined

  const pillClass = `inline-flex w-max max-w-[calc(100vw-1.5rem)] flex-nowrap items-center gap-2 rounded-full border border-[#1a2744]/15 bg-[#faf7f0]/95 px-3 py-2 shadow-[0_8px_30px_rgba(26,39,68,0.15)] backdrop-blur-md ${
    variant === 'styleNav' || variant === 'modelNav'
      ? 'justify-center'
      : variant === 'result'
        ? 'max-w-[calc(100vw-1.5rem)] flex-wrap justify-center sm:flex-nowrap'
        : ''
  }`

  return (
    <div style={fixedStyle} className={`${dockClass} ${className}`}>
      <div ref={pillRef} className={pillClass}>
      {variant === 'draw' && (
        <>
          <button
            type="button"
            title="Pen"
            onClick={() => onToolChange?.('pen')}
            className={`cursor-pointer shrink-0 rounded-full p-2.5 transition ${
              tool === 'pen'
                ? 'bg-[#1a2744] text-[#f4efe6]'
                : 'text-[#1a2744] hover:bg-[#1a2744]/10'
            }`}
          >
            <Pencil className="h-5 w-5" strokeWidth={2} />
          </button>
          <button
            type="button"
            title="Eraser"
            onClick={() => onToolChange?.('eraser')}
            className={`cursor-pointer shrink-0 rounded-full p-2.5 transition ${
              tool === 'eraser'
                ? 'bg-[#1a2744] text-[#f4efe6]'
                : 'text-[#1a2744] hover:bg-[#1a2744]/10'
            }`}
          >
            <Eraser className="h-5 w-5" strokeWidth={2} />
          </button>
          <input
            title="Stroke width"
            type="range"
            min={2}
            max={48}
            value={brushSize}
            onChange={(e) =>
              onBrushSizeChange?.(Number(e.target.value))
            }
            className="mx-1 h-2 w-24 shrink-0 cursor-pointer accent-[#2d4a3e]"
          />
          <button
            type="button"
            title="Clear canvas"
            onClick={onClearSketch}
            className="shrink-0 cursor-pointer rounded-full p-2.5 text-[#6b1f33] hover:bg-[#fceff2]"
          >
            <Trash2 className="h-5 w-5" strokeWidth={2} />
          </button>
          <button
            type="button"
            title="Download sketch"
            onClick={onDownloadSketch}
            className="shrink-0 cursor-pointer rounded-full p-2.5 text-[#1a2744] hover:bg-[#1a2744]/10"
          >
            <Download className="h-5 w-5" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={onPrimary}
            disabled={primaryDisabled}
            className="ml-1 flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-[#c4a35a] bg-[#c4a35a] px-4 py-2 text-sm font-semibold text-[#1a2744] shadow-sm transition hover:bg-[#b69647] disabled:opacity-40"
          >
            <span>{primaryLabel}</span>
            <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2} />
          </button>
        </>
      )}

      {(variant === 'styleNav' || variant === 'modelNav') && (
        <>
          <button
            type="button"
            onClick={onBack}
            disabled={backDisabled}
            className="flex cursor-pointer items-center gap-1 rounded-full border border-[#1a2744]/25 bg-white px-4 py-2 text-sm font-medium text-[#1a2744] hover:bg-[#f4efe6] disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            type="button"
            onClick={onPrimary}
            disabled={primaryDisabled}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-[#c4a35a] bg-[#c4a35a] px-4 py-2 text-sm font-semibold text-[#1a2744] hover:bg-[#b69647] disabled:opacity-40"
          >
            <span>{primaryLabel}</span>
            <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2} />
          </button>
        </>
      )}

      {variant === 'result' && (
        <>
          <button
            type="button"
            onClick={onBack}
            className="flex cursor-pointer items-center gap-1 rounded-full border border-[#1a2744]/25 bg-white px-4 py-2 text-sm font-medium text-[#1a2744] hover:bg-[#f4efe6]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            type="button"
            title="Download map"
            disabled={mapDownloadDisabled}
            onClick={onDownloadMap}
            className="cursor-pointer rounded-full border border-[#1a2744]/20 bg-white p-2.5 text-[#1a2744] hover:bg-[#f4efe6] disabled:opacity-40"
          >
            <Download className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onTryAgain}
            disabled={tryAgainDisabled}
            className="flex cursor-pointer items-center gap-2 rounded-full border border-[#2d4a3e]/40 bg-[#eef5f0] px-4 py-2 text-sm font-medium text-[#2d4a3e] hover:bg-[#e2ebe5] disabled:pointer-events-none disabled:opacity-40"
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </button>
          <button
            type="button"
            onClick={onAddGallery}
            disabled={addGalleryDisabled}
            className="flex cursor-pointer items-center gap-2 rounded-full border border-[#1a2744]/30 bg-[#1a2744] px-4 py-2 text-sm font-medium text-[#f4efe6] hover:bg-[#243554] disabled:pointer-events-none disabled:opacity-40"
          >
            <Images className="h-4 w-4" />
            Add to gallery
          </button>
        </>
      )}
      </div>
    </div>
  )
}
