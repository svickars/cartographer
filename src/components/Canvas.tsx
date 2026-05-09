import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { Plus, Trash2, X } from 'lucide-react'

import { toInterpretAnnotations } from '../lib/annotationExport'
import { EMOJI_GROUPS } from '../lib/canvasEmojiCatalog'
import { mergeSketchAndAnnotationsToPng } from '../lib/flattenSketchExport'
import type { InterpretAnnotation } from '../types/canvasAnnotations'
import {
  DEFAULT_EMOJI_BASE_PX,
  TEXT_STYLE_DEFAULTS,
  type CanvasAnnotation,
  type CanvasMode,
  type EmojiAnnotation,
  type TextAnnotation,
  type TextStyleId,
} from '../types/canvasAnnotations'

const PARCHMENT = '#f4efe6'
const INK = '#1a2744'
const PLAYFAIR = '"Playfair Display", ui-serif, Georgia, serif'

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

export type CanvasTool = 'pen' | 'eraser'

export type CanvasHandle = {
  exportPngBase64: () => Promise<string>
  getInterpretAnnotations: () => InterpretAnnotation[]
  clear: () => void
  isBlank: () => boolean
}

type CanvasProps = {
  className?: string
  defaultBrushSize?: number
  tool?: CanvasTool
  onToolChange?: (t: CanvasTool) => void
  brushSize?: number
  onBrushSizeChange?: (n: number) => void
  showPlaceholder?: boolean
  onInkChange?: (hasInk: boolean) => void
}

function rgbDistanceFromParchment(r: number, g: number, b: number): number {
  const pr = 244
  const pg = 239
  const pb = 230
  return Math.abs(r - pr) + Math.abs(g - pg) + Math.abs(b - pb)
}

function canvasHasInk(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d')
  if (!ctx) return false
  const w = canvas.width
  const h = canvas.height
  if (w < 2 || h < 2) return false
  const stride = Math.max(2, Math.round(Math.sqrt((w * h) / 6000)))
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

function newId(): string {
  return crypto.randomUUID()
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

const TEXT_STYLES: TextStyleId[] = [
  'header',
  'subheader',
  'label',
  'small',
  'decorative',
]

type DragState =
  | {
      kind: 'move'
      id: string
      startFx: number
      startFy: number
      origX: number
      origY: number
      altClone: boolean
    }
  | {
      kind: 'resize-emoji'
      id: string
      startScale: number
      startDist: number
      cx: number
      cy: number
    }
  | {
      kind: 'resize-text'
      id: string
      startSize: number
      startDist: number
      cx: number
      cy: number
    }

export const Canvas = forwardRef<CanvasHandle, CanvasProps>(function Canvas(
  {
    className = '',
    defaultBrushSize = 6,
    tool: toolProp,
    brushSize: brushProp,
    showPlaceholder = true,
    onInkChange,
    onToolChange,
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

  const [annotations, setAnnotations] = useState<CanvasAnnotation[]>([])
  const [mode, setMode] = useState<CanvasMode>({ type: 'draw' })
  const [panelOpen, setPanelOpen] = useState(false)
  type InsertPanelTabId = 'emoji' | 'text' | 'sketch' | 'textures'
  const [insertPanelTab, setInsertPanelTab] =
    useState<InsertPanelTabId>('emoji')
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [cursorPreview, setCursorPreview] = useState<{
    x: number
    y: number
  } | null>(null)

  const dragRef = useRef<DragState | null>(null)
  const prevToolRef = useRef(tool)

  useEffect(() => {
    if (!showPlaceholder) return
    const t = window.setInterval(() => {
      setHintIndex((i) => (i + 1) % PLACEHOLDER_HINTS.length)
    }, 3200)
    return () => window.clearInterval(t)
  }, [showPlaceholder])

  useEffect(() => {
    if (tool === 'eraser') {
      setMode({ type: 'erase' })
      setPanelOpen(false)
      setEditingTextId(null)
    } else if (prevToolRef.current === 'eraser' && tool === 'pen') {
      setMode({ type: 'draw' })
    }
    prevToolRef.current = tool
  }, [tool])

  const notifyInk = useCallback(() => {
    requestAnimationFrame(() => {
      const canvas = canvasRef.current
      const sketchInk = canvas ? canvasHasInk(canvas) : false
      const has = sketchInk || annotations.length > 0
      if (lastInkNotifiedRef.current === has) return
      lastInkNotifiedRef.current = has
      onInkChange?.(has)
    })
  }, [annotations.length, onInkChange])

  useEffect(() => {
    notifyInk()
  }, [annotations, notifyInk])

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

  const fracFromClient = useCallback((clientX: number, clientY: number) => {
    const wrap = wrapRef.current
    if (!wrap) return { fx: 0, fy: 0 }
    const r = wrap.getBoundingClientRect()
    return {
      fx: clamp01((clientX - r.left) / Math.max(1, r.width)),
      fy: clamp01((clientY - r.top) / Math.max(1, r.height)),
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
    notifyInk()
  }, [notifyInk])

  const sketchInteractive = mode.type === 'draw' || mode.type === 'erase'

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!sketchInteractive) return
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
    [brushSize, flushInkNotification, getPos, sketchInteractive, tool],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!sketchInteractive) return
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
    [brushSize, drawSegment, getPos, sketchInteractive, tool],
  )

  const endStroke = useCallback(() => {
    drawingRef.current = false
    lastRef.current = null
    flushInkNotification()
  }, [flushInkNotification])

  const clear = useCallback(() => {
    resizeCanvas(true)
    lastInkNotifiedRef.current = false
    setAnnotations([])
    setMode({ type: 'draw' })
    setPanelOpen(false)
    setEditingTextId(null)
    onInkChange?.(false)
  }, [resizeCanvas, onInkChange])

  const selectedId = mode.type === 'selected' ? mode.annotationId : null

  const deleteById = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id))
    setMode({ type: 'draw' })
    setEditingTextId(null)
    setPanelOpen(false)
  }, [])

  const cancelPlacement = useCallback(() => {
    setMode({ type: 'draw' })
    setPanelOpen(false)
    setCursorPreview(null)
    onToolChange?.('pen')
  }, [onToolChange])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (panelOpen) {
          setPanelOpen(false)
          return
        }
        if (mode.type === 'emoji-active' || mode.type === 'text-active') {
          cancelPlacement()
          return
        }
        if (mode.type === 'selected') {
          setMode({ type: 'draw' })
          setEditingTextId(null)
        }
      }
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        mode.type === 'selected' &&
        !editingTextId
      ) {
        e.preventDefault()
        deleteById(mode.annotationId)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cancelPlacement, deleteById, editingTextId, mode, panelOpen])

  const onOverlayPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (mode.type === 'emoji-active') {
        const { fx, fy } = fracFromClient(e.clientX, e.clientY)
        setCursorPreview({ x: fx, y: fy })
      }
      const d = dragRef.current
      if (!d) return
      const { fx, fy } = fracFromClient(e.clientX, e.clientY)

      if (d.kind === 'move') {
        const dx = fx - d.startFx
        const dy = fy - d.startFy
        setAnnotations((prev) =>
          prev.map((a) => {
            if (a.id !== d.id) return a
            return {
              ...a,
              x: clamp01(d.origX + dx),
              y: clamp01(d.origY + dy),
            }
          }),
        )
      } else if (d.kind === 'resize-emoji') {
        const dist = Math.hypot(e.clientX - d.cx, e.clientY - d.cy)
        const ratio = dist / Math.max(4, d.startDist)
        const nextScale = Math.min(4, Math.max(0.25, d.startScale * ratio))
        setAnnotations((prev) =>
          prev.map((a) => {
            if (a.id !== d.id || a.type !== 'emoji') return a
            return { ...a, scale: nextScale }
          }),
        )
      } else if (d.kind === 'resize-text') {
        const dist = Math.hypot(e.clientX - d.cx, e.clientY - d.cy)
        const ratio = dist / Math.max(8, d.startDist)
        const next = Math.round(
          Math.min(72, Math.max(8, d.startSize * ratio)),
        )
        setAnnotations((prev) =>
          prev.map((a) => {
            if (a.id !== d.id || a.type !== 'text') return a
            return { ...a, fontSizePx: next }
          }),
        )
      }
    },
    [fracFromClient, mode.type],
  )

  const endDrag = useCallback(
    (e: React.PointerEvent | PointerEvent) => {
      const d = dragRef.current
      if (d?.kind === 'move') {
        const { fx, fy } = fracFromClient(e.clientX, e.clientY)
        const moved = Math.hypot(fx - d.startFx, fy - d.startFy) > 0.01
        if (d.altClone && moved) {
          const ann = annotations.find((x) => x.id === d.id)
          if (ann) {
            const ox = ann.x
            const oy = ann.y
            const nid = newId()
            if (ann.type === 'emoji') {
              const copy: EmojiAnnotation = {
                ...ann,
                id: nid,
                x: clamp01(ox + 0.02),
                y: clamp01(oy + 0.02),
              }
              setAnnotations((p) => [...p, copy])
              setMode({ type: 'selected', annotationId: nid })
            } else {
              const t = ann as TextAnnotation
              const copy: TextAnnotation = {
                ...t,
                id: nid,
                x: clamp01(t.x + 0.02),
                y: clamp01(t.y + 0.02),
              }
              setAnnotations((p) => [...p, copy])
              setMode({ type: 'selected', annotationId: nid })
            }
          }
        }
      }
      dragRef.current = null
    },
    [annotations, fracFromClient],
  )

  const onOverlayPointerUp = useCallback(
    (e: React.PointerEvent) => {
      endDrag(e)
    },
    [endDrag],
  )

  const placeEmoji = useCallback((emoji: string, fx: number, fy: number) => {
    const id = newId()
    const ann: EmojiAnnotation = {
      id,
      type: 'emoji',
      content: emoji,
      x: fx,
      y: fy,
      scale: 1,
    }
    setAnnotations((p) => [...p, ann])
    setMode({ type: 'emoji-active', emoji })
    setPanelOpen(false)
    setCursorPreview(null)
  }, [])

  const placeText = useCallback((style: TextStyleId, fx: number, fy: number) => {
    const id = newId()
    const def = TEXT_STYLE_DEFAULTS[style]
    const ann: TextAnnotation = {
      id,
      type: 'text',
      content: def.placeholder,
      x: fx,
      y: fy,
      style,
      fontSizePx: def.fontSizePx,
    }
    setAnnotations((p) => [...p, ann])
    setMode({ type: 'selected', annotationId: id })
    setEditingTextId(id)
    setPanelOpen(false)
  }, [])

  const commitText = useCallback((id: string, text: string) => {
    const trimmed = text.trim() || ' '
    setAnnotations((prev) =>
      prev.map((a) =>
        a.id === id && a.type === 'text' ? { ...a, content: trimmed } : a,
      ),
    )
    setEditingTextId(null)
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      exportPngBase64: async () => {
        const canvas = canvasRef.current
        if (!canvas) return ''
        return mergeSketchAndAnnotationsToPng(canvas, annotations)
      },
      getInterpretAnnotations: () => toInterpretAnnotations(annotations),
      clear,
      isBlank: () => {
        const canvas = canvasRef.current
        const sketchInk = canvas ? canvasHasInk(canvas) : false
        return !sketchInk && annotations.length === 0
      },
    }),
    [annotations, clear],
  )

  const plusGlyph =
    mode.type === 'selected'
      ? 'trash'
      : mode.type === 'emoji-active' || mode.type === 'text-active'
        ? 'close'
        : 'plus'

  const onPlusClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (plusGlyph === 'trash' && mode.type === 'selected') {
      deleteById(mode.annotationId)
      return
    }
    if (plusGlyph === 'close') {
      cancelPlacement()
      return
    }
    setPanelOpen((o) => !o)
  }

  const hint = PLACEHOLDER_HINTS[hintIndex] ?? PLACEHOLDER_HINTS[0]

  return (
    <div className={`relative min-h-0 ${className}`}>
      <div
        ref={wrapRef}
        className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-lg bg-[#f4efe6] shadow-[0_12px_40px_rgba(26,39,68,0.14)]"
      >
        <canvas
          ref={canvasRef}
          className={`touch-none absolute inset-0 z-0 block h-full w-full bg-[#f4efe6] ${
            sketchInteractive ? 'cursor-crosshair' : 'cursor-default'
          }`}
          style={{ pointerEvents: sketchInteractive ? 'auto' : 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
        />

        <div className="pointer-events-none absolute inset-0 z-10">
          {mode.type === 'selected' && (
            <div
              className="pointer-events-auto absolute inset-0 z-[7]"
              onPointerDown={(e) => {
                if (e.button !== 0) return
                if (e.target === e.currentTarget) {
                  setMode({ type: 'draw' })
                  setEditingTextId(null)
                }
              }}
            />
          )}

          <div className="pointer-events-none absolute inset-0 z-[9]">
            {annotations.map((a) => {
              const sel = a.id === selectedId
              const common =
                'pointer-events-auto absolute select-none -translate-x-1/2 -translate-y-1/2 transform'
              if (a.type === 'emoji') {
                const px = DEFAULT_EMOJI_BASE_PX * a.scale
                return (
                  <div
                    key={a.id}
                    className={`${common} touch-none`}
                    style={{
                      left: `${a.x * 100}%`,
                      top: `${a.y * 100}%`,
                      fontSize: px,
                      lineHeight: 1,
                      cursor: sel ? 'move' : 'pointer',
                      outline: sel ? '2px solid rgba(45,74,62,0.45)' : undefined,
                      outlineOffset: 4,
                      borderRadius: 4,
                    }}
                    onPointerDown={(e) => {
                      if (e.button !== 0) return
                      e.stopPropagation()
                      setMode({ type: 'selected', annotationId: a.id })
                      const { fx, fy } = fracFromClient(e.clientX, e.clientY)
                      dragRef.current = {
                        kind: 'move',
                        id: a.id,
                        startFx: fx,
                        startFy: fy,
                        origX: a.x,
                        origY: a.y,
                        altClone: e.altKey,
                      }
                      ;(e.currentTarget as HTMLElement).setPointerCapture(
                        e.pointerId,
                      )
                    }}
                    onPointerMove={(e) => {
                      if (
                        dragRef.current?.kind !== 'move' ||
                        dragRef.current.id !== a.id
                      )
                        return
                      onOverlayPointerMove(e)
                    }}
                    onPointerUp={(e) => {
                      if (
                        dragRef.current?.kind === 'move' &&
                        dragRef.current.id === a.id
                      ) {
                        endDrag(e)
                      }
                      try {
                        ;(e.currentTarget as HTMLElement).releasePointerCapture(
                          e.pointerId,
                        )
                      } catch {
                        /* noop */
                      }
                    }}
                  >
                    <span className="block">{a.content}</span>
                    {sel && (
                      <>
                        {(['nw', 'se'] as const).map((corner) => (
                          <span
                            key={corner}
                            className="absolute z-20 h-2.5 w-2.5 rounded-full border border-[#1a2744]/40 bg-white shadow"
                            style={{
                              ...(corner === 'nw'
                                ? { top: -6, left: -6 }
                                : { bottom: -6, right: -6 }),
                              cursor: 'nwse-resize',
                            }}
                            onPointerDown={(e) => {
                              e.stopPropagation()
                              const r = wrapRef.current?.getBoundingClientRect()
                              const cx = r ? r.left + a.x * r.width : 0
                              const cy = r ? r.top + a.y * r.height : 0
                              const dist = Math.hypot(
                                e.clientX - cx,
                                e.clientY - cy,
                              )
                              dragRef.current = {
                                kind: 'resize-emoji',
                                id: a.id,
                                startScale: a.scale,
                                startDist: Math.max(8, dist),
                                cx,
                                cy,
                              }
                              ;(e.target as HTMLElement).setPointerCapture(
                                e.pointerId,
                              )
                            }}
                            onPointerMove={(e) => {
                              if (
                                dragRef.current?.kind === 'resize-emoji' &&
                                dragRef.current.id === a.id
                              ) {
                                onOverlayPointerMove(e)
                              }
                            }}
                            onPointerUp={() => {
                              dragRef.current = null
                            }}
                          />
                        ))}
                      </>
                    )}
                  </div>
                )
              }
              const def = TEXT_STYLE_DEFAULTS[a.style]
              const editing = editingTextId === a.id
              return (
                <div
                  key={a.id}
                  className={`${common} max-w-[85%]`}
                  style={{
                    left: `${a.x * 100}%`,
                    top: `${a.y * 100}%`,
                    cursor: sel && !editing ? 'move' : 'text',
                    outline:
                      sel && !editing
                        ? '1px solid rgba(26,39,68,0.35)'
                        : undefined,
                    outlineOffset: 6,
                  }}
                  onPointerDown={(e) => {
                    if (editing) return
                    if (e.button !== 0) return
                    e.stopPropagation()
                    setMode({ type: 'selected', annotationId: a.id })
                    const { fx, fy } = fracFromClient(e.clientX, e.clientY)
                    dragRef.current = {
                      kind: 'move',
                      id: a.id,
                      startFx: fx,
                      startFy: fy,
                      origX: a.x,
                      origY: a.y,
                      altClone: e.altKey,
                    }
                    ;(e.currentTarget as HTMLElement).setPointerCapture(
                      e.pointerId,
                    )
                  }}
                  onPointerMove={(e) => {
                    if (
                      dragRef.current?.kind === 'move' &&
                      dragRef.current.id === a.id
                    ) {
                      onOverlayPointerMove(e)
                    }
                  }}
                  onPointerUp={(e) => {
                    if (
                      dragRef.current?.kind === 'move' &&
                      dragRef.current.id === a.id
                    ) {
                      endDrag(e)
                    }
                    try {
                      ;(e.currentTarget as HTMLElement).releasePointerCapture(
                        e.pointerId,
                      )
                    } catch {
                      /* noop */
                    }
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    setEditingTextId(a.id)
                  }}
                >
                  {editing ? (
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      role="textbox"
                      aria-label="Edit map label"
                      className="min-w-[4rem] rounded-sm bg-white/90 px-1 py-0.5 text-center text-[#1a2744] outline-none ring-2 ring-[#2d4a3e]/30"
                      style={{
                        fontFamily: PLAYFAIR,
                        fontSize: a.fontSizePx,
                        fontWeight: def.bold ? 700 : 400,
                        fontStyle: def.italic ? 'italic' : 'normal',
                        letterSpacing: `${def.letterSpacingEm}em`,
                      }}
                      ref={(el) => {
                        if (el && editing) {
                          requestAnimationFrame(() => {
                            el.focus()
                            const range = document.createRange()
                            range.selectNodeContents(el)
                            const sel = window.getSelection()
                            sel?.removeAllRanges()
                            sel?.addRange(range)
                          })
                        }
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onBlur={(ev) => {
                        commitText(a.id, ev.currentTarget.textContent ?? '')
                      }}
                      onKeyDown={(ev) => {
                        if (ev.key === 'Enter') {
                          ev.preventDefault()
                          commitText(a.id, ev.currentTarget.textContent ?? '')
                        }
                      }}
                    >
                      {a.content}
                    </div>
                  ) : (
                    <span
                      className="inline-block text-center text-[#1a2744]"
                      style={{
                        fontFamily: PLAYFAIR,
                        fontSize: a.fontSizePx,
                        fontWeight: def.bold ? 700 : 400,
                        fontStyle: def.italic ? 'italic' : 'normal',
                        letterSpacing: `${def.letterSpacingEm}em`,
                      }}
                    >
                      {a.content}
                    </span>
                  )}
                  {sel && !editing && (
                    <>
                      {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
                        <span
                          key={corner}
                          className="absolute z-20 h-2 w-2 rounded-full border border-[#1a2744]/35 bg-white"
                          style={{
                            cursor: 'nwse-resize',
                            ...(corner === 'nw'
                              ? { top: -4, left: -4 }
                              : corner === 'ne'
                                ? { top: -4, right: -4 }
                                : corner === 'sw'
                                  ? { bottom: -4, left: -4 }
                                  : { bottom: -4, right: -4 }),
                          }}
                          onPointerDown={(e) => {
                            e.stopPropagation()
                            const r = wrapRef.current?.getBoundingClientRect()
                            if (!r) return
                            const cx = r.left + a.x * r.width
                            const cy = r.top + a.y * r.height
                            const dist = Math.hypot(
                              e.clientX - cx,
                              e.clientY - cy,
                            )
                            dragRef.current = {
                              kind: 'resize-text',
                              id: a.id,
                              startSize: a.fontSizePx,
                              startDist: Math.max(12, dist),
                              cx,
                              cy,
                            }
                            ;(e.target as HTMLElement).setPointerCapture(
                              e.pointerId,
                            )
                          }}
                          onPointerMove={(e) => {
                            if (
                              dragRef.current?.kind === 'resize-text' &&
                              dragRef.current.id === a.id
                            ) {
                              onOverlayPointerMove(e)
                            }
                          }}
                          onPointerUp={() => {
                            dragRef.current = null
                          }}
                        />
                      ))}
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {(mode.type === 'emoji-active' || mode.type === 'text-active') && (
            <div
              className="pointer-events-auto absolute inset-0 z-[11] cursor-crosshair"
              onPointerMove={onOverlayPointerMove}
              onPointerUp={onOverlayPointerUp}
              onPointerLeave={() => {
                if (mode.type === 'emoji-active') setCursorPreview(null)
              }}
              onPointerDown={(e) => {
                if (e.button !== 0) return
                if (mode.type === 'emoji-active') {
                  const { fx, fy } = fracFromClient(e.clientX, e.clientY)
                  placeEmoji(mode.emoji, fx, fy)
                  e.stopPropagation()
                  return
                }
                if (mode.type === 'text-active') {
                  const { fx, fy } = fracFromClient(e.clientX, e.clientY)
                  placeText(mode.style, fx, fy)
                  e.stopPropagation()
                }
              }}
            >
              {mode.type === 'emoji-active' && cursorPreview && (
                <div
                  className="pointer-events-none absolute text-3xl opacity-70"
                  style={{
                    left: `${cursorPreview.x * 100}%`,
                    top: `${cursorPreview.y * 100}%`,
                    transform: 'translate(-50%,-50%)',
                  }}
                >
                  {mode.emoji}
                </div>
              )}
            </div>
          )}
        </div>

        {showPlaceholder && !hintHidden && sketchInteractive && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center p-8"
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

        <div
          className="pointer-events-none absolute right-2 top-2 z-30 flex flex-col items-end gap-2"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            aria-label={
              plusGlyph === 'trash'
                ? 'Delete annotation'
                : plusGlyph === 'close'
                  ? 'Cancel annotation tool'
                  : panelOpen
                    ? 'Close tools'
                    : 'Add annotations'
            }
            onClick={onPlusClick}
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-[#1a2744]/20 bg-[#faf7f0]/95 text-[#1a2744] shadow-md transition hover:bg-[#f4efe6]"
          >
            {plusGlyph === 'trash' ? (
              <Trash2 className="h-5 w-5" strokeWidth={1.75} />
            ) : plusGlyph === 'close' ? (
              <X className="h-5 w-5" strokeWidth={1.75} />
            ) : (
              <Plus className="h-5 w-5" strokeWidth={1.75} />
            )}
          </button>

          {panelOpen && plusGlyph === 'plus' && (
            <div
              className="pointer-events-auto max-h-[min(70vh,440px)] w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-[#1a2744]/15 bg-[#faf7f0]/98 text-left shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 border-b border-[#1a2744]/12 p-1">
                {(
                  [
                    { id: 'emoji' as const, label: 'Emoji', muted: false },
                    { id: 'text' as const, label: 'Text', muted: false },
                    { id: 'sketch' as const, label: 'Sketch', muted: true },
                    { id: 'textures' as const, label: 'Textures', muted: true },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setInsertPanelTab(tab.id)}
                    className={`min-w-0 flex-1 rounded-md px-1.5 py-1.5 font-sans text-[11px] font-medium transition ${
                      insertPanelTab === tab.id
                        ? tab.muted
                          ? 'bg-[#ebe4d6] text-[#1a2744]/65 shadow-inner'
                          : 'bg-white text-[#1a2744] shadow-sm'
                        : tab.muted
                          ? 'text-[#1a2744]/38 hover:bg-[#1a2744]/5 hover:text-[#1a2744]/50'
                          : 'text-[#1a2744]/55 hover:bg-[#1a2744]/5 hover:text-[#1a2744]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="max-h-[min(60vh,380px)] overflow-y-auto p-3">
                {insertPanelTab === 'emoji' && (
                  <div className="space-y-2">
                    {EMOJI_GROUPS.map((group, gi) => (
                      <div key={gi}>
                        {gi > 0 && <div className="mb-2 h-px bg-[#1a2744]/10" />}
                        <div className="flex flex-wrap gap-1">
                          {group.map((em) => (
                            <button
                              key={em}
                              type="button"
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-lg hover:bg-[#1a2744]/10"
                              onClick={() => {
                                setInsertPanelTab('emoji')
                                setMode({ type: 'emoji-active', emoji: em })
                                setPanelOpen(false)
                              }}
                            >
                              {em}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {insertPanelTab === 'text' && (
                  <div className="grid gap-2">
                    {TEXT_STYLES.map((sid) => {
                      const s = TEXT_STYLE_DEFAULTS[sid]
                      return (
                        <button
                          key={sid}
                          type="button"
                          className="w-full rounded-md border border-[#1a2744]/12 bg-white px-3 py-2 text-left transition hover:border-[#1a2744]/35"
                          onClick={() => {
                            setInsertPanelTab('text')
                            setMode({ type: 'text-active', style: sid })
                            setPanelOpen(false)
                          }}
                        >
                          <span
                            className="block text-[#1a2744]"
                            style={{
                              fontFamily: PLAYFAIR,
                              fontSize: Math.min(s.fontSizePx, 22),
                              fontWeight: s.bold ? 700 : 400,
                              fontStyle: s.italic ? 'italic' : 'normal',
                              letterSpacing: `${s.letterSpacingEm}em`,
                            }}
                          >
                            {s.placeholder}
                          </span>
                          <span className="mt-0.5 block font-sans text-[10px] uppercase tracking-wide text-[#1a2744]/45">
                            {s.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {insertPanelTab === 'sketch' && (
                  <p className="font-sans text-sm text-[#1a2744]/55">
                    Upload a sketch — coming soon.
                  </p>
                )}

                {insertPanelTab === 'textures' && (
                  <p className="font-sans text-sm text-[#1a2744]/55">
                    Textures — coming soon.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
