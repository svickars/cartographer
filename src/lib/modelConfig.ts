/** Add new providers here; ModelPicker reads this list — no component changes needed. */
export type GenerationModelId = 'dalle3'

export interface GenerationModelOption {
  id: GenerationModelId
  label: string
  /** Short hint shown in the picker */
  description: string
}

export const GENERATION_MODELS: readonly GenerationModelOption[] = [
  {
    id: 'dalle3',
    label: 'DALL·E 3',
    description: 'OpenAI — detailed illustrated scenes',
  },
]
