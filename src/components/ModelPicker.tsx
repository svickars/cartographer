import { GENERATION_MODELS, type GenerationModelId } from '../lib/modelConfig'

type Props = {
  value: GenerationModelId
  onChange: (id: GenerationModelId) => void
  disabled?: boolean
}

/** Model choice — add entries in `GENERATION_MODELS` only. TODO: badge for beta models. */
export function ModelPicker({ value, onChange, disabled }: Props) {
  return (
    <div className="border border-[#1a2744]/15 bg-[#faf7f0] p-3">
      <label
        htmlFor="model-select"
        className="block font-serif text-lg text-[#1a2744]"
      >
        Generation model
      </label>
      <select
        id="model-select"
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value as GenerationModelId)}
        className="mt-2 w-full border border-[#1a2744]/25 bg-white px-2 py-2 font-sans text-sm text-[#1a2744] focus:border-[#2d4a3e] focus:outline-none"
      >
        {GENERATION_MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label} — {m.description}
          </option>
        ))}
      </select>
    </div>
  )
}
