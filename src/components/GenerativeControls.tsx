import type { EraStop } from '../types/generativeControls'
import { ERA_STOPS } from '../types/generativeControls'
import type { GenerativeControls } from '../types/generativeControls'

type Props = {
  value: GenerativeControls
  onChange: (next: GenerativeControls) => void
  disabled?: boolean
  /** Full-width fieldset (legacy) vs single row of three panels. */
  variant?: 'default' | 'row'
}

export function GenerativeControls({
  value,
  onChange,
  disabled,
  variant = 'default',
}: Props) {
  const setImagination = (imagination: number) =>
    onChange({ ...value, imagination })
  const setRichness = (richness: number) => onChange({ ...value, richness })
  const setEra = (era: EraStop) => onChange({ ...value, era })

  if (variant === 'row') {
    return (
      <div
        className={`grid min-w-0 grid-cols-1 gap-4 md:grid-cols-3 ${
          disabled ? 'pointer-events-none opacity-50' : ''
        }`}
      >
        <div className="min-w-0 rounded-lg border border-[#1a2744]/10 bg-[#faf7f0]/95 p-4 shadow-sm">
          <div className="flex items-baseline justify-between gap-2">
            <label
              className="font-sans text-sm font-medium text-[#1a2744]"
              htmlFor="imagination-row"
            >
              Imagination
            </label>
            <span className="tabular-nums text-sm text-[#1a2744]/70">
              {value.imagination}
            </span>
          </div>
          <p className="mt-1 font-sans text-xs leading-snug text-[#1a2744]/60">
            How much the map fills in beyond your lines.
          </p>
          <input
            id="imagination-row"
            type="range"
            min={0}
            max={100}
            value={value.imagination}
            onChange={(e) => setImagination(Number(e.target.value))}
            className="mt-3 w-full accent-[#2d4a3e]"
            disabled={disabled}
          />
        </div>

        <div className="min-w-0 rounded-lg border border-[#1a2744]/10 bg-[#faf7f0]/95 p-4 shadow-sm">
          <div className="flex items-baseline justify-between gap-2">
            <label
              className="font-sans text-sm font-medium text-[#1a2744]"
              htmlFor="richness-row"
            >
              Richness
            </label>
            <span className="tabular-nums text-sm text-[#1a2744]/70">
              {value.richness}
            </span>
          </div>
          <p className="mt-1 font-sans text-xs leading-snug text-[#1a2744]/60">
            Density of streets, buildings, and detail.
          </p>
          <input
            id="richness-row"
            type="range"
            min={0}
            max={100}
            value={value.richness}
            onChange={(e) => setRichness(Number(e.target.value))}
            className="mt-3 w-full accent-[#c4a35a]"
            disabled={disabled}
          />
        </div>

        <div className="min-w-0 rounded-lg border border-[#1a2744]/10 bg-[#faf7f0]/95 p-4 shadow-sm">
          <p className="font-sans text-sm font-medium text-[#1a2744]">Era</p>
          <p className="mt-1 font-sans text-xs leading-snug text-[#1a2744]/60">
            When the place exists.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {ERA_STOPS.map((e) => (
              <button
                key={e.id}
                type="button"
                disabled={disabled}
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
        </div>
      </div>
    )
  }

  return (
    <fieldset
      disabled={disabled}
      className="space-y-6 border border-[#1a2744]/12 bg-[#faf7f0]/90 p-5"
    >
      <legend className="font-serif text-xl text-[#1a2744]">
        Generative controls
      </legend>

      <div>
        <div className="flex justify-between gap-4">
          <label
            className="font-sans font-medium text-[#1a2744]"
            htmlFor="imagination"
          >
            Imagination
          </label>
          <span className="tabular-nums text-sm text-[#1a2744]/70">
            {value.imagination}
          </span>
        </div>
        <p className="mt-1 font-sans text-sm leading-snug text-[#1a2744]/65">
          How closely the map sticks to what you drew. Turn it up and the AI
          starts filling in the gaps.
        </p>
        <input
          id="imagination"
          type="range"
          min={0}
          max={100}
          value={value.imagination}
          onChange={(e) => setImagination(Number(e.target.value))}
          className="mt-2 w-full accent-[#2d4a3e]"
        />
      </div>

      <div>
        <div className="flex justify-between gap-4">
          <label
            className="font-sans font-medium text-[#1a2744]"
            htmlFor="richness"
          >
            Richness
          </label>
          <span className="tabular-nums text-sm text-[#1a2744]/70">
            {value.richness}
          </span>
        </div>
        <p className="mt-1 font-sans text-sm leading-snug text-[#1a2744]/65">
          How much life the AI adds — streets, buildings, landmarks. Low keeps
          it sparse. High populates the whole place.
        </p>
        <input
          id="richness"
          type="range"
          min={0}
          max={100}
          value={value.richness}
          onChange={(e) => setRichness(Number(e.target.value))}
          className="mt-2 w-full accent-[#c4a35a]"
        />
      </div>

      <div>
        <p className="font-sans font-medium text-[#1a2744]">Era</p>
        <p className="mt-1 font-sans text-sm leading-snug text-[#1a2744]/65">
          When does this place exist?
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {ERA_STOPS.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setEra(e.id)}
              className={`rounded-full border px-3 py-1.5 text-sm font-sans transition ${
                value.era === e.id
                  ? 'border-[#1a2744] bg-[#1a2744] text-[#f4efe6]'
                  : 'border-[#1a2744]/25 bg-white text-[#1a2744] hover:border-[#1a2744]/50'
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>
    </fieldset>
  )
}
