import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'

const PARCHMENT = '#f4efe6'
const INK = '#1a2744'

export type CanvasTool = 'pen' | 'eraser'

export type CanvasHandle = {
  exportPngBase64: () => string
  clear: () => void
  /** True when the canvas has no meaningful ink (only parchment). */
  isBlank: () => boolean
}

const PLACEHOLDER_HINTS = [
  'an island or coastline',
  'mountains and valleys',
  'a neighbourhood you remember',
  'roads and a river',
  'a harbour or pier',
  'a forest path',
  'your hometown — rough boxes are fine',
  'labels help — spell place names as you like',
]

type CanvasProps = {
  className?: string
  defaultBrushSize?: number
  /** Controlled tool (optional — otherwise internal state). */
  tool?: CanvasTool
  onToolChange?: (t: CanvasTool) => void
  brushSize?: number
  onBrushSizeChange?: (n: number) => void
  /** Cycling placeholder in centre when true */
  showPlaceholder?: boolean
  onInkChange?: (hasInk: boolean) => void
}

function rgbDistanceFromParchment(r: number, g: number, b: number): number {
  const pr = 244
  const pg = 239
  const pb = 230
  return Math.abs(r - pr) + Math.abs(g - pg) + Math.abs(b - pb)
}

/** Sample canvas pixels — returns true if anything noticeably darker / not parchment. */
function canvasHasInk(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d')
  if (!ctx) return false
  const w = canvas.width
  const h = canvas.height
  if (w < 2 || h < 2) return false
  const stride = Math.max(
    2,
    Math.round(Math.sqrt((w * h) / 6000)),
  )
  const { data } = ctx.getImageData(0, 0, w, h)
  for (let y = 0; y < h; y += stride) {
    for (let x = 0; x < w; x += stride) {
      const i = (Math.floor(y) * w + Math.floor(x)) * 4
      const a = data[i + 3] ?? 255
      if (a < 24) continue
      const r = data[i] ?? 244
      const g = data[i + 1] ?? 239
      const b = data[i + 2] ?? 230
      if (rgbDistanceFromParchment(r, g, b) > 28) return true
    }
  }
  return false
}

function widthFromVelocity(speedPxPerMs: number, baseSize: number): number {
  const ref = 1.2
  const t = Math.min(speedPxPerMs / ref, 1)
  const minM = 0.38
  const maxM = 1.22
  const mult = maxM - t * (maxM - minM)
  return Math.max(0.5, baseSize * mult)
}

export const Canvas = forwardRef<CanvasHandle, CanvasProps>(function Canvas(
  {
    className = '',
    defaultBrushSize = 6,
    tool: toolProp,
    brushSize: brushProp,
    showPlaceholder = true,
    onInkChange,
  },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const lastInkNotifiedRef = useRef(false)

  const tool = toolProp ?? 'pen'
  const brushSize = brushProp ?? defaultBrushSize

  const [hintIndex, setHintIndex] = useState(0)
  const [hintHidden, setHintHidden] = useState(false)

  useEffect(() => {
    if (!showPlaceholder) return
    const t = window.setInterval(() => {
      setHintIndex((i) => (i + 1) % PLACEHOLDER_HINTS.length)
    }, 3200)
    return () => window.clearInterval(t)
  }, [showPlaceholder])

  const drawingRef = useRef(false)
  const lastRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const lastPixelSizeRef = useRef({ w: 0, h: 0 })

  const resizeCanvas = useCallback((forceRedraw?: boolean) => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    const rect = wrap.getBoundingClientRect()
    const w = Math.max(1, Math.floor(rect.width))
    const h = Math.max(1, Math.floor(rect.height))

    if (
      !forceRedraw &&
      lastPixelSizeRef.current.w === w &&
      lastPixelSizeRef.current.h === h
    ) {
      return
    }

    const dpr = Math.min(window.devicePixelRatio ?? 1, 2)

    const oldW = canvas.width
    const oldH = canvas.height

    let snapshot: HTMLCanvasElement | null = null
    if (!forceRedraw && oldW > 1 && oldH > 1 && canvasHasInk(canvas)) {
      snapshot = document.createElement('canvas')
      snapshot.width = oldW
      snapshot.height = oldH
      const sctx = snapshot.getContext('2d')
      if (sctx) {
        sctx.drawImage(canvas, 0, 0)
      }
    }

    lastPixelSizeRef.current = { w, h }

    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = PARCHMENT
    ctx.fillRect(0, 0, w, h)

    if (snapshot && !forceRedraw) {
      ctx.drawImage(snapshot, 0, 0, w, h)
    }
  }, [])

  useEffect(() => {
    resizeCanvas()
    const ro = new ResizeObserver(() => resizeCanvas())
    if (wrapRef.current) ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [resizeCanvas])

  const getPos = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }, [])

  const drawSegment = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      x0: number,
      y0: number,
      x1: number,
      y1: number,
      width: number,
    ) => {
      ctx.save()
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.lineWidth = width
      if (tool === 'eraser') {
        ctx.strokeStyle = PARCHMENT
        ctx.globalCompositeOperation = 'source-over'
        ctx.lineWidth = brushSize * 2.2
      } else {
        ctx.strokeStyle = INK
        ctx.globalCompositeOperation = 'source-over'
        ctx.lineWidth = width
      }
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.lineTo(x1, y1)
      ctx.stroke()
      ctx.restore()
    },
    [brushSize, tool],
  )

  const flushInkNotification = useCallback(() => {
    requestAnimationFrame(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const has = canvasHasInk(canvas)
      if (lastInkNotifiedRef.current === has) return
      lastInkNotifiedRef.current = has
      onInkChange?.(has)
    })
  }, [onInkChange])

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (e.button !== 0) return
      setHintHidden(true)
      e.currentTarget.setPointerCapture(e.pointerId)
      drawingRef.current = true
      const { x, y } = getPos(e)
      const t = performance.now()
      lastRef.current = { x, y, t }

      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!ctx || tool === 'eraser') return

      ctx.save()
      ctx.fillStyle = INK
      ctx.beginPath()
      ctx.arc(x, y, brushSize * 0.45, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      flushInkNotification()
    },
    [brushSize, flushInkNotification, getPos, tool],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!ctx) return

      const { x, y } = getPos(e)
      const t = performance.now()
      const last = lastRef.current
      if (!last) {
        lastRef.current = { x, y, t }
        return
      }

      const dx = x - last.x
      const dy = y - last.y
      const dist = Math.hypot(dx, dy)
      const dt = Math.max(t - last.t, 0.001)
      const speed = dist / dt

      const w =
        tool === 'eraser'
          ? brushSize * 2.2
          : widthFromVelocity(speed, brushSize)

      if (dist > 0.2) {
        drawSegment(ctx, last.x, last.y, x, y, w)
      }

      lastRef.current = { x, y, t }
    },
    [brushSize, drawSegment, getPos, tool],
  )

  const endStroke = useCallback(() => {
    drawingRef.current = false
    lastRef.current = null
    flushInkNotification()
  }, [flushInkNotification])

  const clear = useCallback(() => {
    resizeCanvas(true)
    lastInkNotifiedRef.current = false
    onInkChange?.(false)
  }, [resizeCanvas, onInkChange])

  useImperativeHandle(
    ref,
    () => ({
      exportPngBase64: () => {
        const canvas = canvasRef.current
        if (!canvas) return ''
        const dataUrl = canvas.toDataURL('image/png')
        const parts = dataUrl.split(',')
        return parts[1] ?? ''
      },
      clear,
      isBlank: () => {
        const canvas = canvasRef.current
        return !canvas || !canvasHasInk(canvas)
      },
    }),
    [clear],
  )

  const hint = PLACEHOLDER_HINTS[hintIndex] ?? PLACEHOLDER_HINTS[0]

  return (
    <div className={`relative min-h-0 ${className}`}>
      <div
        ref={wrapRef}
        className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-lg bg-[#f4efe6] shadow-[0_12px_40px_rgba(26,39,68,0.14)]"
      >
        <canvas
          ref={canvasRef}
          className="touch-none absolute inset-0 block h-full w-full cursor-crosshair bg-[#f4efe6]"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
        />
        {showPlaceholder && !hintHidden && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center p-8"
          >
            <p
              key={hintIndex}
              className="max-w-md text-center font-serif text-lg leading-relaxed text-[#1a2744]/50 transition-opacity duration-500"
            >
              Try drawing{' '}
              <span className="italic text-[#1a2744]/60">{hint}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
})
