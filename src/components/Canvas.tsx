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
  /** PNG base64 without the data URL prefix */
  exportPngBase64: () => string
  clear: () => void
}

type CanvasProps = {
  className?: string
  /** Base brush size in CSS pixels (velocity modulates around this). */
  defaultBrushSize?: number
}

/** Maps pointer speed to stroke width — slower strokes read heavier / wider. */
function widthFromVelocity(
  speedPxPerMs: number,
  baseSize: number,
): number {
  const ref = 1.2
  const t = Math.min(speedPxPerMs / ref, 1)
  const minM = 0.38
  const maxM = 1.22
  const mult = maxM - t * (maxM - minM)
  return Math.max(0.5, baseSize * mult)
}

export const Canvas = forwardRef<CanvasHandle, CanvasProps>(function Canvas(
  { className = '', defaultBrushSize = 6 },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const [tool, setTool] = useState<CanvasTool>('pen')
  const [brushSize, setBrushSize] = useState(defaultBrushSize)

  const drawingRef = useRef(false)
  const lastRef = useRef<{ x: number; y: number; t: number } | null>(null)

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    const rect = wrap.getBoundingClientRect()
    const w = Math.max(1, Math.floor(rect.width))
    const h = Math.max(1, Math.floor(rect.height))
    const dpr = Math.min(window.devicePixelRatio ?? 1, 2)

    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = PARCHMENT
    ctx.fillRect(0, 0, w, h)
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

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (e.button !== 0) return
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
    },
    [brushSize, getPos, tool],
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
  }, [])

  const clear = useCallback(() => {
    resizeCanvas()
  }, [resizeCanvas])

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
    }),
    [clear],
  )

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-2 border border-[#c4a35a]/40 bg-[#faf7f0] px-3 py-2 font-sans text-sm text-[#1a2744]">
        <span className="font-medium text-[#2d4a3e]">Tools</span>
        <button
          type="button"
          onClick={() => setTool('pen')}
          className={`rounded border px-2 py-1 transition ${
            tool === 'pen'
              ? 'border-[#1a2744] bg-[#1a2744] text-[#f4efe6]'
              : 'border-[#1a2744]/30 bg-white hover:border-[#1a2744]/60'
          }`}
        >
          Pen
        </button>
        <button
          type="button"
          onClick={() => setTool('eraser')}
          className={`rounded border px-2 py-1 transition ${
            tool === 'eraser'
              ? 'border-[#1a2744] bg-[#1a2744] text-[#f4efe6]'
              : 'border-[#1a2744]/30 bg-white hover:border-[#1a2744]/60'
          }`}
        >
          Eraser
        </button>
        <label className="ml-2 flex items-center gap-2">
          <span className="text-[#1a2744]/80">Stroke</span>
          <input
            type="range"
            min={2}
            max={48}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-32 accent-[#2d4a3e]"
          />
          <span className="tabular-nums text-[#1a2744]/70">{brushSize}px</span>
        </label>
        <button
          type="button"
          onClick={clear}
          className="ml-auto rounded border border-[#8b2942]/50 bg-[#faf7f0] px-2 py-1 text-[#6b1f33] hover:bg-[#fceff2]"
        >
          Clear
        </button>
      </div>

      <div
        ref={wrapRef}
        className="relative min-h-[420px] flex-1 overflow-hidden rounded border-2 border-[#1a2744]/25 shadow-[inset_0_0_80px_rgba(26,39,68,0.06)]"
      >
        <canvas
          ref={canvasRef}
          className="touch-none block h-full w-full cursor-crosshair bg-[#f4efe6]"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
        />
      </div>
      <p className="font-sans text-xs text-[#1a2744]/55">
        Pointer drawing with velocity-based stroke width (Pointer Events).{' '}
        {/* TODO: optional stylus pressure when `pointerType === "pen"` reports hardware pressure */}
      </p>
    </div>
  )
})
