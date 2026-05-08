import type { SketchInterpretation } from '../types/interpretation'
import { keepForPrompt } from './confidence'

const BG = '#f4efe6'
const WATER = 'rgba(80, 140, 200, 0.35)'
const ROAD = '#1a2744'
const LANDMARK = '#8b2942'
const TERRAIN = 'rgba(45, 74, 62, 0.25)'

/**
 * Minimal deterministic diagram from interpreted JSON — not geographic truth,
 * but gives the image model a second “clean” topology hint alongside the sketch.
 */
export function renderInterpretationSchematic(
  data: SketchInterpretation,
): Promise<string> {
  const size = 1024
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas 2D unavailable'))
        return
      }

      ctx.fillStyle = BG
      ctx.fillRect(0, 0, size, size)

      ctx.fillStyle = '#1a2744'
      ctx.font = 'bold 22px "Source Sans 3", system-ui, sans-serif'
      ctx.fillText('Topology guide (symbolic, not to scale)', 24, 44)

      const waterList = data.water.filter((w) => keepForPrompt(w.confidence))
      waterList.forEach((_w, i) => {
        const cx = 180 + (i % 3) * 280
        const cy = 200 + Math.floor(i / 3) * 200
        ctx.beginPath()
        ctx.ellipse(cx, cy, 110, 70, 0.3 * i, 0, Math.PI * 2)
        ctx.fillStyle = WATER
        ctx.fill()
      })

      const terrainList = data.terrain.filter((t) => keepForPrompt(t.confidence))
      terrainList.forEach((t, i) => {
        const x = 700 + (i % 2) * 120
        const y = 480 + Math.floor(i / 2) * 100
        ctx.fillStyle = TERRAIN
        ctx.fillRect(x, y, 140, 90)
        ctx.fillStyle = '#2d4a3e'
        ctx.font = '14px "Source Sans 3", system-ui, sans-serif'
        ctx.fillText(t.description.slice(0, 28), x + 6, y + 48)
      })

      const roads = data.roads.filter((r) => keepForPrompt(r.confidence))
      ctx.strokeStyle = ROAD
      ctx.lineWidth = 5
      ctx.lineCap = 'round'
      for (let i = 0; i < roads.length; i++) {
        const r = roads[i]!
        ctx.beginPath()
        const x0 = 120 + i * 70
        const y0 = 320 + (i % 3) * 40
        const x1 = 420 + i * 50
        const y1 = 620 - (i % 4) * 30
        ctx.moveTo(x0, y0)
        ctx.quadraticCurveTo((x0 + x1) / 2, y0 - 80 - i * 10, x1, y1)
        ctx.stroke()
        if (r.label) {
          ctx.fillStyle = ROAD
          ctx.font = '14px "Source Sans 3", system-ui, sans-serif'
          ctx.fillText(r.label, (x0 + x1) / 2 - 20, (y0 + y1) / 2 - 10)
        }
      }

      const marks = data.landmarks.filter((l) => keepForPrompt(l.confidence))
      marks.forEach((m, i) => {
        const x = 500 + (i % 4) * 110
        const y = 160 + Math.floor(i / 4) * 90
        ctx.fillStyle = LANDMARK
        ctx.beginPath()
        ctx.arc(x, y, 10, 0, Math.PI * 2)
        ctx.fill()
        const label = (m.name ?? m.description).slice(0, 24)
        ctx.fillStyle = '#1a2744'
        ctx.font = '13px "Source Sans 3", system-ui, sans-serif'
        ctx.fillText(label, x + 14, y + 5)
      })

      if (data.labels.length > 0) {
        ctx.fillStyle = '#1a2744'
        ctx.font = '16px "Source Sans 3", system-ui, sans-serif'
        data.labels.slice(0, 8).forEach((lab, i) => {
          ctx.fillText(`“${lab}”`, 24, 920 - i * 22)
        })
      }

      const dataUrl = canvas.toDataURL('image/png')
      resolve(dataUrl.split(',')[1] ?? '')
    } catch (e) {
      reject(e instanceof Error ? e : new Error('Schematic render failed'))
    }
  })
}
