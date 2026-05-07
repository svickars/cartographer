import { MAP_STYLES, type MapStyleId } from '../lib/mapStyles'

type Props = {
  value: MapStyleId
  onChange: (id: MapStyleId) => void
  disabled?: boolean
}

/** Map visual style before generation. TODO: richer previews / keyboard selection. */
export function StylePicker({ value, onChange, disabled }: Props) {
  return (
    <fieldset
      disabled={disabled}
      className="space-y-2 border border-[#1a2744]/15 bg-[#faf7f0] p-3"
    >
      <legend className="font-serif text-lg text-[#1a2744]">Map style</legend>
      <div className="flex flex-col gap-2">
        {MAP_STYLES.map((s) => (
          <label
            key={s.id}
            className={`flex cursor-pointer gap-2 rounded border px-2 py-2 text-sm ${
              value === s.id
                ? 'border-[#2d4a3e] bg-[#eef5f0]'
                : 'border-transparent hover:border-[#1a2744]/20'
            }`}
          >
            <input
              type="radio"
              name="map-style"
              value={s.id}
              checked={value === s.id}
              onChange={() => onChange(s.id)}
              className="mt-1 accent-[#2d4a3e]"
            />
            <span>
              <span className="font-medium text-[#1a2744]">{s.label}</span>
              <span className="mt-0.5 block font-sans text-[13px] leading-snug text-[#1a2744]/75">
                {s.summary}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
