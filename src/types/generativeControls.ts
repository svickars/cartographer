export type EraStop = 'ancient' | 'medieval' | '1800s' | 'modern' | 'future'

export const ERA_STOPS: readonly { id: EraStop; label: string }[] = [
  { id: 'ancient', label: 'Ancient' },
  { id: 'medieval', label: 'Medieval' },
  { id: '1800s', label: '1800s' },
  { id: 'modern', label: 'Modern' },
  { id: 'future', label: 'Future' },
]

const ERA_IDS = new Set<EraStop>(ERA_STOPS.map((e) => e.id))

export type NamingLanguage =
  | 'English'
  | 'Latin'
  | 'French'
  | 'German'
  | 'Japanese'
  | 'Mandarin'
  | 'Arabic'
  | 'Welsh'
  | 'Spanish'
  | 'Invented'

export const NAMING_LANGUAGES: readonly {
  id: NamingLanguage
  label: string
}[] = [
  { id: 'English', label: 'English' },
  { id: 'Latin', label: 'Latin' },
  { id: 'French', label: 'French' },
  { id: 'German', label: 'German' },
  { id: 'Japanese', label: 'Japanese' },
  { id: 'Mandarin', label: 'Mandarin' },
  { id: 'Arabic', label: 'Arabic' },
  { id: 'Welsh', label: 'Welsh' },
  { id: 'Spanish', label: 'Spanish' },
  { id: 'Invented', label: 'Invented' },
]

const NAMING_LANGUAGE_IDS = new Set<NamingLanguage>(
  NAMING_LANGUAGES.map((x) => x.id),
)

export type NamingTheme =
  | 'Realistic'
  | 'American'
  | 'British'
  | 'Fantasy'
  | 'Ancient'
  | 'Nautical'
  | 'Sci-Fi'
  | 'Folklore'

export const NAMING_THEMES: readonly { id: NamingTheme; label: string }[] = [
  { id: 'Realistic', label: 'Realistic' },
  { id: 'American', label: 'American' },
  { id: 'British', label: 'British' },
  { id: 'Fantasy', label: 'Fantasy' },
  { id: 'Ancient', label: 'Ancient' },
  { id: 'Nautical', label: 'Nautical' },
  { id: 'Sci-Fi', label: 'Sci-Fi' },
  { id: 'Folklore', label: 'Folklore' },
]

const NAMING_THEME_IDS = new Set<NamingTheme>(NAMING_THEMES.map((x) => x.id))

export type NamingControls = {
  /** 0–100 */
  intensity: number
  language: NamingLanguage
  theme: NamingTheme
}

export type GenerativeControls = {
  /** 0–100 */
  imagination: number
  /** 0–100 */
  richness: number
  era: EraStop
  naming: NamingControls
  /** 0–100 */
  relief: number
  /** 0–100 */
  formality: number
}

export const DEFAULT_NAMING: NamingControls = {
  intensity: 0,
  language: 'English',
  theme: 'Realistic',
}

export const DEFAULT_CONTROLS: GenerativeControls = {
  imagination: 40,
  richness: 50,
  era: 'modern',
  naming: { ...DEFAULT_NAMING },
  relief: 30,
  formality: 40,
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function normalizeEra(v: unknown): EraStop {
  if (typeof v === 'string' && ERA_IDS.has(v as EraStop)) return v as EraStop
  return DEFAULT_CONTROLS.era
}

function normalizeNaming(
  partial: Partial<NamingControls> | undefined,
): NamingControls {
  const base = DEFAULT_CONTROLS.naming
  const intensity = clamp(
    Math.round(partial?.intensity ?? base.intensity),
    0,
    100,
  )
  const lang = partial?.language
  const language =
    typeof lang === 'string' && NAMING_LANGUAGE_IDS.has(lang as NamingLanguage)
      ? (lang as NamingLanguage)
      : base.language
  const th = partial?.theme
  const theme =
    typeof th === 'string' && NAMING_THEME_IDS.has(th as NamingTheme)
      ? (th as NamingTheme)
      : base.theme
  return { intensity, language, theme }
}

export function normalizeControls(
  c: Partial<GenerativeControls> | undefined,
): GenerativeControls {
  if (!c) return { ...DEFAULT_CONTROLS, naming: { ...DEFAULT_CONTROLS.naming } }
  return {
    imagination: clamp(
      Math.round(c.imagination ?? DEFAULT_CONTROLS.imagination),
      0,
      100,
    ),
    richness: clamp(
      Math.round(c.richness ?? DEFAULT_CONTROLS.richness),
      0,
      100,
    ),
    era: normalizeEra(c.era),
    naming: normalizeNaming(c.naming),
    relief: clamp(
      Math.round(c.relief ?? DEFAULT_CONTROLS.relief),
      0,
      100,
    ),
    formality: clamp(
      Math.round(c.formality ?? DEFAULT_CONTROLS.formality),
      0,
      100,
    ),
  }
}
