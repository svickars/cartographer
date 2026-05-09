/** Payload sent to `/api/interpret` — fractional positions 0–1 relative to sketch dimensions. */
export type InterpretEmojiAnnotation = {
  type: 'emoji'
  content: string
  x: number
  y: number
  scale: number
}

export type InterpretTextAnnotation = {
  type: 'text'
  content: string
  x: number
  y: number
  style: TextStyleId
}

export type InterpretAnnotation =
  | InterpretEmojiAnnotation
  | InterpretTextAnnotation

export type TextStyleId =
  | 'header'
  | 'subheader'
  | 'label'
  | 'small'
  | 'decorative'

export const TEXT_STYLE_DEFAULTS: Record<
  TextStyleId,
  {
    label: string
    placeholder: string
    fontSizePx: number
    bold: boolean
    italic: boolean
    letterSpacingEm: number
  }
> = {
  header: {
    label: 'Header',
    placeholder: 'Region Name',
    fontSizePx: 28,
    bold: true,
    italic: false,
    letterSpacingEm: 0,
  },
  subheader: {
    label: 'Subheader',
    placeholder: 'District Name',
    fontSizePx: 20,
    bold: true,
    italic: false,
    letterSpacingEm: 0,
  },
  label: {
    label: 'Label',
    placeholder: 'Landmark',
    fontSizePx: 15,
    bold: false,
    italic: false,
    letterSpacingEm: 0,
  },
  small: {
    label: 'Small label',
    placeholder: 'street name',
    fontSizePx: 11,
    bold: false,
    italic: false,
    letterSpacingEm: 0,
  },
  decorative: {
    label: 'Decorative',
    placeholder: 'Here be dragons',
    fontSizePx: 15,
    bold: false,
    italic: true,
    letterSpacingEm: 0.06,
  },
}

export type CanvasMode =
  | { type: 'draw' }
  | { type: 'erase' }
  | { type: 'emoji-active'; emoji: string }
  | { type: 'text-active'; style: TextStyleId }
  | { type: 'selected'; annotationId: string }

export type EmojiAnnotation = {
  id: string
  type: 'emoji'
  content: string
  /** 0–1 relative to canvas logical width */
  x: number
  y: number
  scale: number
}

export type TextAnnotation = {
  id: string
  type: 'text'
  content: string
  x: number
  y: number
  style: TextStyleId
  /** Current font size in CSS pixels (scales with resize handles) */
  fontSizePx: number
}

export type CanvasAnnotation = EmojiAnnotation | TextAnnotation

export const DEFAULT_EMOJI_BASE_PX = 32
