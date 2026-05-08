/** Parchment letterbox colour — matches `Canvas` sketch background. */
const PARCHMENT = '#f4efe6'

const OUTPUT = 1024

/** Letterbox the sketch onto a square PNG for APIs that require square inputs (e.g. DALL·E 2 edit). */
export function padSketchPngToSquare1024(pngBase64: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = OUTPUT
        canvas.height = OUTPUT
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas 2D context unavailable'))
          return
        }
        ctx.fillStyle = PARCHMENT
        ctx.fillRect(0, 0, OUTPUT, OUTPUT)
        const scale = Math.min(OUTPUT / img.width, OUTPUT / img.height)
        const w = img.width * scale
        const h = img.height * scale
        const x = (OUTPUT - w) / 2
        const y = (OUTPUT - h) / 2
        ctx.drawImage(img, x, y, w, h)
        const dataUrl = canvas.toDataURL('image/png')
        const parts = dataUrl.split(',')
        resolve(parts[1] ?? '')
      } catch (e) {
        reject(e instanceof Error ? e : new Error('Failed to pad sketch'))
      }
    }
    img.onerror = () => reject(new Error('Failed to decode sketch PNG'))
    img.src = `data:image/png;base64,${pngBase64}`
  })
}
