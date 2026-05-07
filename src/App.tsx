import { useCallback, useRef, useState } from 'react'

import { Canvas, type CanvasHandle } from './components/Canvas'
import { MapOutput } from './components/MapOutput'
import { ModelPicker } from './components/ModelPicker'
import { StylePicker } from './components/StylePicker'
import { buildMapPrompt } from './lib/buildMapPrompt'
import { generateMap } from './lib/generateMap'
import { interpretSketch } from './lib/interpretSketch'
import type { GenerationModelId } from './lib/modelConfig'
import type { MapStyleId } from './lib/mapStyles'
import type { SketchInterpretation } from './types/interpretation'

type FlowStep = 'idle' | 'interpreting' | 'generating'

export default function App() {
  const canvasRef = useRef<CanvasHandle>(null)

  const [styleId, setStyleId] = useState<MapStyleId>('illustrated')
  const [modelId, setModelId] = useState<GenerationModelId>('dalle3')

  const [interpretation, setInterpretation] =
    useState<SketchInterpretation | null>(null)
  const [interpretOpen, setInterpretOpen] = useState(false)

  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [flowError, setFlowError] = useState<string | null>(null)
  const [step, setStep] = useState<FlowStep>('idle')

  const busy = step !== 'idle'

  const runInterpret = useCallback(async () => {
    const png = canvasRef.current?.exportPngBase64()
    if (!png) {
      setFlowError('Canvas is not ready.')
      return
    }

    setFlowError(null)
    setInterpretation(null)
    setImageUrl(null)
    setStep('interpreting')

    try {
      const json = await interpretSketch(png)
      setInterpretation(json)
      setInterpretOpen(true)
    } catch (e) {
      setFlowError(e instanceof Error ? e.message : 'Interpret failed.')
    } finally {
      setStep('idle')
    }
  }, [])

  const runGenerate = useCallback(async () => {
    if (!interpretation) {
      setFlowError('Interpret the sketch first.')
      return
    }

    setFlowError(null)
    setImageUrl(null)
    setStep('generating')

    try {
      const prompt = buildMapPrompt(interpretation, styleId)
      const { imageUrl: url } = await generateMap(prompt, modelId)
      setImageUrl(url)
    } catch (e) {
      setFlowError(e instanceof Error ? e.message : 'Generation failed.')
    } finally {
      setStep('idle')
    }
  }, [interpretation, modelId, styleId])

  return (
    <div className="min-h-screen bg-[#ebe4d6] bg-[radial-gradient(ellipse_at_top,_#f7f2ea_0%,_#e8dfd0_55%,_#dcd2c2_100%)] text-[#1a2744]">
      <header className="border-b border-[#1a2744]/15 bg-[#f9f6ef]/90 px-8 py-6 backdrop-blur-sm">
        <h1 className="font-serif text-4xl tracking-tight text-[#1a2744]">
          Cartographer
        </h1>
        <p className="mt-2 max-w-2xl font-sans text-base leading-relaxed text-[#1a2744]/80">
          Sketch a place from memory or imagination — we read the lines like a
          cartographer and spin up a finished illustrated map.
        </p>
      </header>

      <main className="mx-auto grid max-w-[1600px] gap-8 px-6 py-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)] lg:items-start">
        <section className="min-h-[520px] rounded-sm border border-[#1a2744]/12 bg-[#faf7f0]/70 p-4 shadow-[0_12px_40px_rgba(26,39,68,0.08)]">
          <Canvas ref={canvasRef} className="h-full" />
        </section>

        <aside className="flex flex-col gap-4">
          <StylePicker
            value={styleId}
            onChange={setStyleId}
            disabled={busy}
          />
          <ModelPicker
            value={modelId}
            onChange={setModelId}
            disabled={busy}
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={runInterpret}
              className="rounded border border-[#2d4a3e] bg-[#2d4a3e] px-4 py-2 font-sans text-sm font-medium text-[#f4efe6] shadow-sm transition hover:bg-[#244038] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {step === 'interpreting' ? 'Reading sketch…' : 'Interpret sketch'}
            </button>
            <button
              type="button"
              disabled={busy || !interpretation}
              onClick={runGenerate}
              className="rounded border border-[#c4a35a] bg-[#c4a35a] px-4 py-2 font-sans text-sm font-semibold text-[#1a2744] shadow-sm transition hover:bg-[#b69647] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {step === 'generating' ? 'Generating map…' : 'Generate map'}
            </button>
          </div>

          {interpretation && (
            <details
              open={interpretOpen}
              onToggle={(e) =>
                setInterpretOpen((e.target as HTMLDetailsElement).open)
              }
              className="border border-[#1a2744]/15 bg-[#f4efe6]/80 p-3 font-mono text-xs text-[#1a2744]"
            >
              <summary className="cursor-pointer font-sans text-sm font-medium text-[#2d4a3e]">
                Claude interpretation (debug)
              </summary>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed">
                {JSON.stringify(interpretation, null, 2)}
              </pre>
            </details>
          )}

          <div>
            <h2 className="mb-2 font-serif text-xl text-[#1a2744]">Output</h2>
            <MapOutput
              imageUrl={imageUrl}
              loading={step === 'generating'}
              error={flowError}
            />
          </div>
        </aside>
      </main>
    </div>
  )
}
