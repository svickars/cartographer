import { useCallback, useEffect, useRef, useState } from 'react'

import { Canvas, type CanvasHandle, type CanvasTool } from './components/Canvas'
import { FloatingCanvasBar } from './components/FloatingCanvasBar'
import { GalleryDialog } from './components/GalleryDialog'
import { GalleryStrip } from './components/GalleryStrip'
import { GenerativeControls } from './components/GenerativeControls'
import { MapOutput } from './components/MapOutput'
import type { ApiFlags } from './components/ModelCards'
import { PageFooter } from './components/PageFooter'
import { StyleCards } from './components/StyleCards'
import { WorkingLoader } from './components/WorkingLoader'
import { buildGptImageEditPrompt } from './lib/buildMapPrompt'
import { generateMap } from './lib/generateMap'
import {
  createGalleryEntry,
  fetchGalleryEntries,
} from './lib/galleryClient'
import { loadGalleryLastName, saveGalleryLastName } from './lib/galleryPrefs'
import type { GalleryEntry } from './types/gallery'
import { interpretSketch } from './lib/interpretSketch'
import type { GenerationModelId } from './lib/modelConfig'
import type { MapStyleId } from './lib/mapStyles'
import { padSketchPngToSquare1024 } from './lib/padSketchToSquare'
import { renderInterpretationSchematic } from './lib/renderInterpretationSchematic'
import {
  DEFAULT_CONTROLS,
  normalizeControls,
  type GenerativeControls as GenControls,
} from './types/generativeControls'
import type { SketchInterpretation } from './types/interpretation'

/** Step 3 always uses GPT Image (sketch edit); model picker is hidden in the UI. */
const MAP_MODEL = 'gpt-image-edit' as const satisfies GenerationModelId

function pipelineAllowedForGptImage(api: ApiFlags): boolean {
  return api.anthropicConfigured && api.openaiConfigured
}

async function downloadDataUrl(url: string, filename: string) {
  if (url.startsWith('data:')) {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    return
  }
  const res = await fetch(url)
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  a.click()
  URL.revokeObjectURL(objectUrl)
}

export default function App() {
  const canvasRef = useRef<CanvasHandle>(null)
  const pipelineLock = useRef(false)

  const [wizardStep, setWizardStep] = useState(1)
  const [canvasExpanded, setCanvasExpanded] = useState(false)

  const [tool, setTool] = useState<CanvasTool>('pen')
  const [brushSize, setBrushSize] = useState(6)

  const [styleId, setStyleId] = useState<MapStyleId>('illustrated')
  const [controls, setControls] = useState<GenControls>(DEFAULT_CONTROLS)

  const [interpretation, setInterpretation] =
    useState<SketchInterpretation | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [flowError, setFlowError] = useState<string | null>(null)
  const [resultPhase, setResultPhase] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle')

  const [apiConfig, setApiConfig] = useState<ApiFlags | null>(null)
  const [galleryEntries, setGalleryEntries] = useState<GalleryEntry[]>([])
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [galleryMountKey, setGalleryMountKey] = useState(0)
  const [gallerySaveError, setGallerySaveError] = useState<string | null>(null)
  const [hasCanvasInk, setHasCanvasInk] = useState(false)
  const [homeScrollY, setHomeScrollY] = useState(0)

  const scrollLocked = wizardStep > 1 || canvasExpanded

  useEffect(() => {
    if (wizardStep !== 1 || canvasExpanded) return
    const onScroll = () => {
      const y =
        window.scrollY ||
        window.pageYOffset ||
        document.documentElement.scrollTop
      setHomeScrollY(y)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [wizardStep, canvasExpanded])

  useEffect(() => {
    if (!scrollLocked) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [scrollLocked])

  useEffect(() => {
    fetchGalleryEntries()
      .then(setGalleryEntries)
      .catch(() => setGalleryEntries([]))
  }, [])

  useEffect(() => {
    fetch('/api/config', { credentials: 'include' })
      .then((r) => r.json())
      .then((j: ApiFlags) => setApiConfig(j))
      .catch(() => setApiConfig(null))
  }, [])

  useEffect(() => {
    if (!canvasExpanded) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCanvasExpanded(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canvasExpanded])

  useEffect(() => {
    if (wizardStep !== 1) return
    requestAnimationFrame(() => {
      const blank = canvasRef.current?.isBlank() ?? true
      setHasCanvasInk(!blank)
    })
  }, [wizardStep])

  const mapItDisabled =
    apiConfig !== null && !pipelineAllowedForGptImage(apiConfig)

  const runPipeline = useCallback(async () => {
    if (pipelineLock.current) return
    pipelineLock.current = true

    const rawPng = canvasRef.current?.exportPngBase64()
    if (!rawPng) {
      setFlowError('Draw something on the canvas first.')
      pipelineLock.current = false
      return
    }

    const ctrls = normalizeControls(controls)

    if (apiConfig && !pipelineAllowedForGptImage(apiConfig)) {
      setFlowError(
        'Configure Anthropic and OpenAI API keys on the server to run interpretation and GPT Image.',
      )
      pipelineLock.current = false
      return
    }

    setWizardStep(4)
    setResultPhase('loading')
    setFlowError(null)
    setInterpretation(null)
    setImageUrl(null)

    const t0 = Date.now()

    try {
      const interp = await interpretSketch(rawPng, ctrls)
      setInterpretation(interp)

      const prompt = buildGptImageEditPrompt(interp, styleId, ctrls, {
        useDualReference: true,
      })
      const referenceImageBase64 = await padSketchPngToSquare1024(rawPng)
      const schematicImageBase64 = await renderInterpretationSchematic(interp)

      const { imageUrl: url } = await generateMap({
        prompt,
        model: MAP_MODEL,
        referenceImageBase64,
        schematicImageBase64,
        controls: ctrls,
      })
      setImageUrl(url)

      const elapsed = Date.now() - t0
      await new Promise((r) => setTimeout(r, Math.max(0, 2000 - elapsed)))
      setResultPhase('success')
    } catch (e) {
      setFlowError(e instanceof Error ? e.message : 'Something went wrong.')
      setResultPhase('error')
    } finally {
      pipelineLock.current = false
    }
  }, [apiConfig, controls, styleId])

  const downloadSketch = useCallback(() => {
    const b64 = canvasRef.current?.exportPngBase64()
    if (!b64) return
    const a = document.createElement('a')
    a.href = `data:image/png;base64,${b64}`
    a.download = 'cartographer-sketch.png'
    a.click()
  }, [])

  const downloadMap = useCallback(() => {
    if (!imageUrl) return
    void downloadDataUrl(imageUrl, 'cartographer-map.png')
  }, [imageUrl])

  const openGallery = useCallback(() => {
    setGallerySaveError(null)
    setGalleryMountKey((k) => k + 1)
    setGalleryOpen(true)
  }, [])

  const handleGallerySubmit = useCallback(
    async (displayName: string): Promise<boolean> => {
      const sketch = canvasRef.current?.exportPngBase64()
      if (!sketch || !imageUrl) return false
      const sketchDataUrl = `data:image/png;base64,${sketch}`
      const result = await createGalleryEntry({
        displayName,
        sketchDataUrl,
        mapDataUrl: imageUrl,
      })
      if (!result.ok) {
        setGallerySaveError(result.error)
        return false
      }
      saveGalleryLastName(displayName)
      setGalleryEntries(result.entries)
      return true
    },
    [imageUrl],
  )

  const goStep = (step: number) => {
    setWizardStep(step)
    if (step !== 4) setResultPhase('idle')
  }

  const advanceFromSketch = useCallback(() => {
    if (canvasRef.current?.isBlank() ?? true) return
    goStep(2)
  }, [])

  const goHome = useCallback(() => {
    setWizardStep(1)
    setCanvasExpanded(false)
    setGalleryOpen(false)
  }, [])

  const barClassWhenExpanded = canvasExpanded && wizardStep === 1 ? 'z-[75]' : ''

  const step1DrawBarProps = {
    variant: 'draw' as const,
    tool,
    onToolChange: setTool,
    brushSize,
    onBrushSizeChange: setBrushSize,
    onClearSketch: () => canvasRef.current?.clear(),
    onDownloadSketch: downloadSketch,
    canvasExpanded,
    onToggleCanvasExpand: () => setCanvasExpanded((v) => !v),
    onPrimary: advanceFromSketch,
    primaryLabel: 'Go',
    primaryDisabled: !hasCanvasInk,
  }

  const fixedWizardBar =
    wizardStep === 2 ? (
      <FloatingCanvasBar
        variant="styleNav"
        onBack={() => goStep(1)}
        onPrimary={() => goStep(3)}
        primaryLabel="Go"
      />
    ) : wizardStep === 3 ? (
      <FloatingCanvasBar
        variant="modelNav"
        onBack={() => goStep(2)}
        onPrimary={() => void runPipeline()}
        primaryLabel="Map it"
        primaryDisabled={mapItDisabled}
      />
    ) : wizardStep === 4 ? (
      <FloatingCanvasBar
        variant="result"
        onBack={() => goStep(3)}
        onDownloadMap={downloadMap}
        mapDownloadDisabled={!imageUrl}
        onTryAgain={() => void runPipeline()}
        onAddGallery={openGallery}
        tryAgainDisabled={resultPhase === 'loading'}
        addGalleryDisabled={!imageUrl || resultPhase === 'loading'}
      />
    ) : null

  const pageBg =
    'bg-[#ebe4d6] bg-[radial-gradient(ellipse_at_top,_#f7f2ea_0%,_#e8dfd0_55%,_#dcd2c2_100%)]'

  return (
    <div
      className={`flex max-w-[100vw] flex-col overflow-x-hidden text-[#1a2744] ${pageBg} ${
        scrollLocked ? 'h-[100dvh] min-h-0 overflow-hidden' : 'min-h-screen'
      }`}
    >
      {wizardStep === 1 ? (
        <header className="shrink-0 px-6 py-8 text-center md:px-10">
          <h1 className="font-serif text-4xl tracking-tight text-[#1a2744]">
            Cartographer
          </h1>
          <p className="mx-auto mt-3 max-w-2xl font-sans text-base leading-relaxed text-[#1a2744]/80">
            Sketch a place. Make a map.
          </p>
        </header>
      ) : (
        <header className="shrink-0 w-full border-b border-[#1a2744]/12 bg-[#ebe4d6]/95 px-4 py-3 backdrop-blur-sm md:px-8">
          <h1 className="text-left font-serif text-lg tracking-tight md:text-xl">
            <button
              type="button"
              onClick={goHome}
              className="text-[#1a2744] underline-offset-4 transition hover:text-[#1a2744]/85 hover:underline"
            >
              Cartographer
            </button>
          </h1>
        </header>
      )}

      <div
        className={`relative flex min-w-0 flex-col ${scrollLocked ? 'min-h-0 flex-1 overflow-x-hidden overflow-y-hidden' : 'flex-1 overflow-x-hidden'}`}
      >
        <div className="relative min-h-0 w-full min-w-0 flex-1 overflow-x-hidden">
        <div
          className="flex min-h-0 w-[400%] flex-1 transition-transform duration-200 ease-out"
          style={{ transform: `translateX(-${(wizardStep - 1) * 25}%)` }}
        >
          {/* Step 1 */}
          <section className="flex w-1/4 min-w-0 shrink-0 flex-col px-6 pb-12 pt-2 md:px-10">
            <div className="mx-auto w-full max-w-[960px]">
              <div
                className={
                  canvasExpanded
                    ? 'fixed inset-0 z-[70] flex items-center justify-center bg-black/50'
                    : 'relative w-full'
                }
                onClick={
                  canvasExpanded ? () => setCanvasExpanded(false) : undefined
                }
              >
                <div
                  className={
                    canvasExpanded
                      ? 'box-border h-full max-h-[100dvh] w-full max-w-[min(100vw,1400px)] px-4 py-6 sm:px-8'
                      : 'relative w-full'
                  }
                  onClick={
                    canvasExpanded ? (e) => e.stopPropagation() : undefined
                  }
                >
                  <Canvas
                    ref={canvasRef}
                    tool={tool}
                    onToolChange={setTool}
                    brushSize={brushSize}
                    onBrushSizeChange={setBrushSize}
                    onInkChange={setHasCanvasInk}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Step 2 */}
          <section className="flex w-1/4 min-w-0 min-h-0 shrink-0 flex-col overflow-hidden px-6 py-6 md:px-10">
            <div className="mx-auto flex min-h-0 w-full max-w-[1100px] flex-1 flex-col">
              <p className="font-serif text-xl text-[#1a2744] md:text-2xl">
                Choose a style
              </p>
              <p className="mt-2 max-w-xl font-sans text-sm text-[#1a2744]/75">
                Pick the look of the finished map.
              </p>
              <div className="mt-6 min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1 py-3 pb-24">
                <StyleCards
                  value={styleId}
                  onChange={setStyleId}
                  disabled={false}
                />
              </div>
            </div>
          </section>

          {/* Step 3 */}
          <section className="flex w-1/4 min-w-0 min-h-0 shrink-0 flex-col overflow-hidden px-6 py-6 md:px-10">
            <div className="mx-auto flex min-h-0 w-full max-w-[1100px] flex-1 flex-col">
              <p className="font-serif text-xl text-[#1a2744] md:text-2xl">
                Input your settings
              </p>
              <p className="mt-2 max-w-xl font-sans text-sm text-[#1a2744]/75">
                Tune imagination, richness, and era. We use GPT Image with your
                sketch.
              </p>
              <div className="mt-8 min-h-0 flex-1 overflow-y-auto pb-28">
                <GenerativeControls
                  variant="row"
                  value={controls}
                  onChange={setControls}
                />
              </div>
              {apiConfig && !apiConfig.anthropicConfigured && (
                <p className="mt-4 font-sans text-sm text-[#8b2942]">
                  Anthropic is not configured — interpretation will fail until
                  ANTHROPIC_API_KEY is set.
                </p>
              )}
              {apiConfig && !apiConfig.openaiConfigured && (
                <p className="mt-2 font-sans text-sm text-[#8b2942]">
                  OpenAI is not configured — GPT Image will fail until OpenAI
                  credentials are set on the server.
                </p>
              )}
            </div>
          </section>

          {/* Step 4 */}
          <section className="flex w-1/4 min-w-0 min-h-0 shrink-0 flex-col overflow-hidden px-6 py-6 md:px-10">
            <div className="mx-auto min-h-0 w-full max-w-[1100px] flex-1 overflow-y-auto pb-28">
              {resultPhase === 'loading' && <WorkingLoader active />}

              {(resultPhase === 'success' || resultPhase === 'error') && (
                <div className="space-y-8">
                  <MapOutput
                    imageUrl={imageUrl}
                    loading={false}
                    error={resultPhase === 'error' ? flowError : null}
                  />

                  {resultPhase === 'success' && interpretation && (
                    <details className="border border-[#1a2744]/15 bg-[#f4efe6]/90 shadow-inner">
                      <summary className="cursor-pointer list-none p-4 font-serif text-lg text-[#1a2744] marker:content-none [&::-webkit-details-marker]:hidden">
                        <span className="underline-offset-2 hover:underline">
                          Interpretation (raw JSON)
                        </span>
                        <span className="ml-2 font-sans text-xs font-normal text-[#1a2744]/55">
                          — expand to view
                        </span>
                      </summary>
                      <pre className="max-h-96 overflow-auto border-t border-[#1a2744]/10 px-4 pb-4 pt-3 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-[#1a2744]/90">
                        {JSON.stringify(interpretation, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
        </div>
      </div>

      {wizardStep === 1 && (
        <FloatingCanvasBar
          {...step1DrawBarProps}
          dock="fixed"
          viewportScrollY={canvasExpanded ? 0 : homeScrollY}
          className={barClassWhenExpanded}
        />
      )}
      {wizardStep >= 2 && fixedWizardBar}

      <GalleryDialog
        key={galleryMountKey}
        open={galleryOpen}
        initialName={loadGalleryLastName()}
        onClose={() => setGalleryOpen(false)}
        onSubmit={handleGallerySubmit}
        saveError={gallerySaveError}
      />

      {wizardStep === 1 && !canvasExpanded && (
        <>
          <GalleryStrip entries={galleryEntries} />
          <PageFooter />
        </>
      )}
    </div>
  )
}
