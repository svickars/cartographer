import type { GenerativeControls } from '../types/generativeControls'

export function imaginationLabel(n: number): string {
  if (n <= 30) return 'Conservative'
  if (n <= 69) return 'Balanced'
  return 'Expansive'
}

export function richnessLabel(r: number): string {
  if (r <= 33) return 'Sparse'
  if (r <= 66) return 'Moderate'
  return 'Dense'
}

export function reliefLabel(relief: number): string {
  if (relief <= 20) return 'Flat'
  if (relief <= 50) return 'Gentle'
  if (relief <= 75) return 'Dramatic'
  return 'Max drama'
}

export function formalityLabel(formality: number): string {
  if (formality <= 20) return 'Illustrative'
  if (formality <= 40) return 'Loose map'
  if (formality <= 60) return 'Balanced'
  if (formality <= 80) return 'Formal'
  return 'Technical'
}

export function namingIntensityLabel(intensity: number): string {
  if (intensity === 0) return 'Sketch only'
  if (intensity <= 40) return 'Fill gaps'
  if (intensity <= 70) return 'Most features'
  return 'Everything invented'
}

export function sliderReadout(
  value: number,
  kind: keyof Pick<
    GenerativeControls,
    'imagination' | 'richness' | 'relief' | 'formality'
  >,
): string {
  const label =
    kind === 'imagination'
      ? imaginationLabel(value)
      : kind === 'richness'
        ? richnessLabel(value)
        : kind === 'relief'
          ? reliefLabel(value)
          : formalityLabel(value)
  return `${label} (${value})`
}

export function namingIntensityReadout(intensity: number): string {
  return `${namingIntensityLabel(intensity)} (${intensity})`
}
