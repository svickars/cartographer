import { useId, type ReactNode } from 'react'

import {
  namingIntensityReadout,
  sliderReadout,
} from '../lib/controlSliderLabels'
import type { EraStop, NamingLanguage, NamingTheme } from '../types/generativeControls'
import {
  ERA_STOPS,
  NAMING_LANGUAGES,
  NAMING_THEMES,
} from '../types/generativeControls'
import type { GenerativeControls } from '../types/generativeControls'
import { styleSuppressesEra, type MapStyleId } from '../lib/mapStyles'

type Props = {
  value: GenerativeControls
  onChange: (next: GenerativeControls) => void
  disabled?: boolean
  /** When Sketch, Era is shown but muted — it is not applied to the image prompt. */
  mapStyleId?: MapStyleId
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 pb-1">
      <span className="whitespace-nowrap font-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1a2744]/45">
        {title}
      </span>
      <div className="h-px min-w-[1rem] flex-1 bg-[#1a2744]/12" />
    </div>
  )
}

function ControlCard({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`min-w-0 rounded-lg border border-[#1a2744]/10 bg-[#faf7f0]/95 p-4 shadow-sm ${className}`}
    >
      {children}
    </div>
  )
}

export function GenerativeControls({
  value,
  onChange,
  disabled,
  mapStyleId,
}: Props) {
  const uid = useId()
  const eraMutedBySketch =
    mapStyleId !== undefined && styleSuppressesEra(mapStyleId)
  const grid =
    `grid min-w-0 grid-cols-1 gap-4 md:grid-cols-3 ${
      disabled ? 'pointer-events-none opacity-50' : ''
    }`

  const setImagination = (imagination: number) =>
    onChange({ ...value, imagination })
  const setRichness = (richness: number) => onChange({ ...value, richness })
  const setEra = (era: EraStop) => onChange({ ...value, era })
  const setRelief = (relief: number) => onChange({ ...value, relief })
  const setFormality = (formality: number) => onChange({ ...value, formality })
  const setNaming = (patch: Partial<GenerativeControls['naming']>) =>
    onChange({ ...value, naming: { ...value.naming, ...patch } })

  const namingOpen = value.naming.intensity > 0

  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-8 border-0 p-0">
      <legend className="sr-only">Generative controls</legend>

      <div>
        <SectionHeader title="Interpretation" />
        <p className="mb-4 font-sans text-xs text-[#1a2744]/55">
          These affect what the model infers from your sketch.
        </p>
        <div className={grid}>
          <ControlCard>
            <div className="flex items-baseline justify-between gap-2">
              <label
                className="font-sans text-sm font-medium text-[#1a2744]"
                htmlFor={`${uid}-imagination`}
              >
                Imagination
              </label>
              <span className="text-right font-sans text-sm text-[#1a2744]/70">
                {sliderReadout(value.imagination, 'imagination')}
              </span>
            </div>
            <p className="mt-1 font-sans text-xs leading-snug text-[#1a2744]/60">
              How much the map fills in beyond your lines.
            </p>
            <input
              id={`${uid}-imagination`}
              type="range"
              min={0}
              max={100}
              value={value.imagination}
              onChange={(e) => setImagination(Number(e.target.value))}
              className="mt-3 w-full accent-[#2d4a3e]"
            />
          </ControlCard>

          <ControlCard>
            <div className="flex items-baseline justify-between gap-2">
              <label
                className="font-sans text-sm font-medium text-[#1a2744]"
                htmlFor={`${uid}-relief`}
              >
                Relief
              </label>
              <span className="text-right font-sans text-sm text-[#1a2744]/70">
                {sliderReadout(value.relief, 'relief')}
              </span>
            </div>
            <p className="mt-1 font-sans text-xs leading-snug text-[#1a2744]/60">
              How dramatically terrain is interpreted and exaggerated. High
              values invent mountains, valleys, and coastlines even from a flat
              sketch.
            </p>
            <input
              id={`${uid}-relief`}
              type="range"
              min={0}
              max={100}
              value={value.relief}
              onChange={(e) => setRelief(Number(e.target.value))}
              className="mt-3 w-full accent-[#4a6b8c]"
            />
          </ControlCard>
        </div>
      </div>

      <div>
        <SectionHeader title="Style" />
        <p className="mb-4 font-sans text-xs text-[#1a2744]/55">
          These affect how the map looks and is labelled.
        </p>
        <div className={grid}>
          <ControlCard>
            <div className="flex items-baseline justify-between gap-2">
              <label
                className="font-sans text-sm font-medium text-[#1a2744]"
                htmlFor={`${uid}-richness`}
              >
                Richness
              </label>
              <span className="text-right font-sans text-sm text-[#1a2744]/70">
                {sliderReadout(value.richness, 'richness')}
              </span>
            </div>
            <p className="mt-1 font-sans text-xs leading-snug text-[#1a2744]/60">
              Density of streets, buildings, and detail.
            </p>
            <input
              id={`${uid}-richness`}
              type="range"
              min={0}
              max={100}
              value={value.richness}
              onChange={(e) => setRichness(Number(e.target.value))}
              className="mt-3 w-full accent-[#c4a35a]"
            />
          </ControlCard>

          <ControlCard
            className={
              eraMutedBySketch
                ? 'pointer-events-none opacity-50'
                : ''
            }
          >
            <p className="font-sans text-sm font-medium text-[#1a2744]">Era</p>
            <p className="mt-1 font-sans text-xs leading-snug text-[#1a2744]/60">
              When the place exists.
            </p>
            {eraMutedBySketch && (
              <p className="mt-2 font-sans text-xs leading-snug text-[#1a2744]/50">
                Era is not applied in Sketch mode — the sketch style overrides
                period styling.
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {ERA_STOPS.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  disabled={disabled || eraMutedBySketch}
                  onClick={() => setEra(e.id)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-sans transition ${
                    value.era === e.id
                      ? 'border-[#1a2744] bg-[#1a2744] text-[#f4efe6]'
                      : 'border-[#1a2744]/25 bg-white text-[#1a2744] hover:border-[#1a2744]/50'
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </ControlCard>

          <ControlCard>
            <div className="flex items-baseline justify-between gap-2">
              <label
                className="font-sans text-sm font-medium text-[#1a2744]"
                htmlFor={`${uid}-formality`}
              >
                Formality
              </label>
              <span className="text-right font-sans text-sm text-[#1a2744]/70">
                {sliderReadout(value.formality, 'formality')}
              </span>
            </div>
            <p className="mt-1 font-sans text-xs leading-snug text-[#1a2744]/60">
              How much this looks like a proper map versus a loose illustration.
              High values add grids, legends, scale bars, and cartographic
              conventions.
            </p>
            <input
              id={`${uid}-formality`}
              type="range"
              min={0}
              max={100}
              value={value.formality}
              onChange={(e) => setFormality(Number(e.target.value))}
              className="mt-3 w-full accent-[#6b4a6b]"
            />
          </ControlCard>

          <ControlCard className="md:col-span-3">
            <div className="flex items-baseline justify-between gap-2">
              <label
                className="font-sans text-sm font-medium text-[#1a2744]"
                htmlFor={`${uid}-naming-intensity`}
              >
                Toponymy
              </label>
              <span className="text-right font-sans text-sm text-[#1a2744]/70">
                {namingIntensityReadout(value.naming.intensity)}
              </span>
            </div>
            <p className="mt-1 font-sans text-xs leading-snug text-[#1a2744]/60">
              How much the AI invents place names, street names, and labels.
            </p>
            <input
              id={`${uid}-naming-intensity`}
              type="range"
              min={0}
              max={100}
              value={value.naming.intensity}
              onChange={(e) =>
                setNaming({ intensity: Number(e.target.value) })
              }
              className="mt-3 w-full accent-[#3d5a4a]"
            />

            <div
              className={`grid min-h-0 transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
                namingOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
            >
              <div className="min-h-0 overflow-hidden">
                <div
                  className={`space-y-3 pt-3 transition duration-300 ease-out motion-reduce:transition-none ${
                    namingOpen
                      ? 'translate-y-0 opacity-100'
                      : 'pointer-events-none -translate-y-1 opacity-0'
                  }`}
                  aria-hidden={!namingOpen}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label
                        className="block font-sans text-xs font-medium text-[#1a2744]/80"
                        htmlFor={`${uid}-naming-language`}
                      >
                        Language
                      </label>
                      <select
                        id={`${uid}-naming-language`}
                        value={value.naming.language}
                        tabIndex={namingOpen ? 0 : -1}
                        onChange={(e) =>
                          setNaming({
                            language: e.target.value as NamingLanguage,
                          })
                        }
                        disabled={disabled || !namingOpen}
                        className="mt-1.5 w-full rounded-md border border-[#1a2744]/20 bg-white px-2 py-2 font-sans text-sm text-[#1a2744] outline-none focus-visible:ring-2 focus-visible:ring-[#1a2744]/25"
                      >
                        {NAMING_LANGUAGES.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        className="block font-sans text-xs font-medium text-[#1a2744]/80"
                        htmlFor={`${uid}-naming-theme`}
                      >
                        Theme
                      </label>
                      <select
                        id={`${uid}-naming-theme`}
                        value={value.naming.theme}
                        tabIndex={namingOpen ? 0 : -1}
                        onChange={(e) =>
                          setNaming({ theme: e.target.value as NamingTheme })
                        }
                        disabled={disabled || !namingOpen}
                        className="mt-1.5 w-full rounded-md border border-[#1a2744]/20 bg-white px-2 py-2 font-sans text-sm text-[#1a2744] outline-none focus-visible:ring-2 focus-visible:ring-[#1a2744]/25"
                      >
                        {NAMING_THEMES.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ControlCard>
        </div>
      </div>
    </fieldset>
  )
}
