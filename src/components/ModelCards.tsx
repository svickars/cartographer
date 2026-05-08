import type { GenerationModelId } from '../lib/modelConfig'
import { GENERATION_MODELS } from '../lib/modelConfig'

export type ApiFlags = {
  openaiConfigured: boolean
  anthropicConfigured: boolean
  replicateConfigured: boolean
}

type Props = {
  value: GenerationModelId
  onChange: (id: GenerationModelId) => void
  api: ApiFlags | null
  disabled?: boolean
}

function modelDisabled(id: GenerationModelId, api: ApiFlags | null): boolean {
  if (!api) return false
  if (id === 'flux-control') return !api.replicateConfigured
  if (id === 'gpt-image-edit' || id === 'dalle3' || id === 'dalle2-edit') {
    return !api.openaiConfigured
  }
  return false
}

export function ModelCards({
  value,
  onChange,
  api,
  disabled,
}: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {GENERATION_MODELS.map((m) => {
        const dim = modelDisabled(m.id, api)
        const inactive = disabled || dim
        return (
          <button
            key={m.id}
            type="button"
            disabled={inactive}
            title={
              dim
                ? 'Configure the required API key on the server'
                : undefined
            }
            onClick={() => onChange(m.id)}
            className={`flex flex-col rounded-lg border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-45 ${
              value === m.id && !inactive
                ? 'border-[#c4a35a] bg-[#fdf8ee] ring-2 ring-[#c4a35a]/50'
                : 'border-[#1a2744]/15 bg-[#faf7f0] hover:border-[#1a2744]/35'
            }`}
          >
            <span className="font-serif text-lg text-[#1a2744]">{m.label}</span>
            <span className="mt-2 font-sans text-sm leading-relaxed text-[#1a2744]/75">
              {m.description}
            </span>
            {dim && (
              <span className="mt-2 font-sans text-xs text-[#8b2942]">
                Not configured
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
