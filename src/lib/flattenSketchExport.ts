import type { CanvasAnnotation, TextStyleId } from '../types/canvasAnnotations'
import { TEXT_STYLE_DEFAULTS } from '../types/canvasAnnotations'

const PLAYFAIR_STACK = '"Playfair Display", ui-serif, Georgia, serif'

function stripDataUrlPrefix(dataUrl: string): string {
  const i = dataUrl.indexOf(',')
  return i >= 0 ? dataUrl.slice(i + 1) : dataUrl
}

function bitmapScale(sketchCanvas: HTMLCanvasElement): number {
  const rw = sketchCanvas.getBoundingClientRect().width
  if (rw > 0.5) return sketchCanvas.width / rw
  return 1
}

function drawEmojiOnContext(
  ctx: CanvasRenderingContext2D,
  emoji: string,
  cx: number,
  cy: number,
  sizeBitmapPx: number,
): void {
  const pad = Math.max(8, Math.ceil(sizeBitmapPx * 0.15))
  const tile = Math.ceil(sizeBitmapPx + pad * 2)
  const oc = document.createElement('canvas')
  oc.width = tile
  oc.height = tile
  const ox = oc.getContext('2d')
  if (!ox) return
  ox.textAlign = 'center'
  ox.textBaseline = 'middle'
  ox.font = `${Math.max(10, sizeBitmapPx * 0.92)}px sans-serif`
  ox.fillText(emoji, tile / 2, tile / 2)
  ctx.drawImage(oc, cx - tile / 2, cy - tile / 2, tile, tile)
}

function drawTextOnContext(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  fontSizeBitmapPx: number,
  style: TextStyleId,
): void {
  const def = TEXT_STYLE_DEFAULTS[style]
  const weight = def.bold ? '700' : '400'
  const slant = def.italic ? 'italic ' : ''
  ctx.font = `${slant}${weight} ${fontSizeBitmapPx}px ${PLAYFAIR_STACK}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#1a2744'
  const letterSpacing = fontSizeBitmapPx * def.letterSpacingEm
  if (letterSpacing > 0) {
    ctx.letterSpacing = `${letterSpacing}px`
    ctx.fillText(text, cx, cy)
    ctx.letterSpacing = '0px'
  } else {
    ctx.fillText(text, cx, cy)
  }
}

/**
 * Merge sketch bitmap with annotation list into a single PNG (same pixel size as sketch canvas).
 */
export async function mergeSketchAndAnnotationsToPng(
  sketchCanvas: HTMLCanvasElement,
  annotations: CanvasAnnotation[],
): Promise<string> {
  const w = sketchCanvas.width
  const h = sketchCanvas.height
  if (w < 1 || h < 1) return ''

  await document.fonts.ready.catch(() => undefined)

  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  const ctx = out.getContext('2d')
  if (!ctx) return ''

  ctx.drawImage(sketchCanvas, 0, 0)

  const s = bitmapScale(sketchCanvas)

  for (const ann of annotations) {
    const cx = ann.x * w
    const cy = ann.y * h
    if (ann.type === 'emoji') {
      const sizeBitmap = Math.max(12, 32 * ann.scale * s)
      drawEmojiOnContext(ctx, ann.content, cx, cy, sizeBitmap)
    } else {
      const fontBitmap = Math.max(8, ann.fontSizePx * s)
      drawTextOnContext(ctx, ann.content, cx, cy, fontBitmap, ann.style)
    }
  }

  return stripDataUrlPrefix(out.toDataURL('image/png'))
}
