/** Add new providers here; ModelPicker reads this list — no component changes needed. */
export type GenerationModelId =
  | 'gpt-image-edit'
  | 'dalle3'
  | 'dalle2-edit'
  | 'flux-control'

export interface GenerationModelOption {
  id: GenerationModelId
  label: string
  /** Short hint shown in the picker */
  description: string
}

export const GENERATION_MODELS: readonly GenerationModelOption[] = [
  {
    id: 'gpt-image-edit',
    label: 'GPT Image — sketch edit (recommended)',
    description:
      'High input fidelity + your sketch (and a schematic guide). Best bet for layout vs style.',
  },
  {
    id: 'dalle3',
    label: 'DALL·E 3',
    description:
      'Text-only from interpretation — strong style; shape may drift from the drawing.',
  },
  {
    id: 'dalle2-edit',
    label: 'DALL·E 2 — sketch edit (legacy)',
    description:
      'Often preserves the sketch too closely or changes little — kept for comparison.',
  },
  {
    id: 'flux-control',
    label: 'Flux ControlNet (experimental)',
    description:
      'Placeholder: requires REPLICATE_API_TOKEN; pipeline not wired yet (returns 501).',
  },
]
