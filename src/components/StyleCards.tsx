import { MAP_STYLES, type MapStyleId } from '../lib/mapStyles'

type Props = {
  value: MapStyleId
  onChange: (id: MapStyleId) => void
  disabled?: boolean
}

export function StyleCards({ value, onChange, disabled }: Props) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {MAP_STYLES.map((s) => (
        <button
          key={s.id}
          type="button"
          disabled={disabled}
          onClick={() => onChange(s.id)}
          className={`flex min-w-0 flex-col rounded-lg border p-4 text-left shadow-sm transition-shadow hover:shadow-md disabled:opacity-50 ${
            value === s.id
              ? 'border-[#2d4a3e] bg-[#eef5f0] ring-2 ring-[#2d4a3e]/40'
              : 'border-[#1a2744]/15 bg-[#faf7f0] hover:border-[#1a2744]/35'
          }`}
        >
          <span className="font-serif text-lg text-[#1a2744]">{s.label}</span>
          <span className="mt-1.5 break-words font-sans text-xs leading-snug text-[#1a2744]/70">
            {s.cardBlurb}
          </span>
        </button>
      ))}
    </div>
  )
}
