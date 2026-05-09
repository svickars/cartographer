import { Loader2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'

type Props = {
  open: boolean
  /** Prefills the name field (e.g. last saved credit line). */
  initialName?: string
  onClose: () => void
  onSubmit: (displayName: string) => Promise<boolean>
  /** Shown after a failed save (e.g. storage quota). */
  saveError?: string | null
}

export function GalleryDialog({
  open,
  initialName = '',
  onClose,
  onSubmit,
  saveError,
}: Props) {
  const [name, setName] = useState(initialName)
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || saving) return
    setSaving(true)
    try {
      const ok = await onSubmit(trimmed)
      if (ok) onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4">
      <div
        role="dialog"
        aria-modal
        className="w-full max-w-md rounded-lg border border-[#1a2744]/15 bg-[#faf7f0] p-6 shadow-2xl"
      >
        <h3 className="font-serif text-2xl text-[#1a2744]">Add to gallery</h3>
        <p className="mt-2 font-sans text-sm text-[#1a2744]/75">
          How should we credit you?
        </p>
        <form
          aria-busy={saving}
          onSubmit={(e) => void handleSubmit(e)}
          className="mt-6 space-y-4"
        >
          <div>
            <label
              className="font-sans text-sm font-medium text-[#1a2744]"
              htmlFor="gallery-name"
            >
              Name
            </label>
            <input
              id="gallery-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
              className="mt-1 w-full rounded border border-[#1a2744]/25 bg-white px-3 py-2 font-sans text-[#1a2744] disabled:opacity-60"
              autoComplete="name"
              placeholder="Sam V."
            />
          </div>
          {saveError && (
            <p className="font-sans text-sm text-[#8b2942]" role="alert">
              {saveError}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="cursor-pointer rounded border border-[#1a2744]/25 bg-white px-4 py-2 text-sm text-[#1a2744] transition hover:border-[#1a2744]/40 hover:bg-[#f4efe6] disabled:pointer-events-none disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded border border-[#1a2744] bg-[#1a2744] px-4 py-2 text-sm font-medium text-[#f4efe6] transition hover:border-[#243554] hover:bg-[#243554] disabled:cursor-wait disabled:opacity-90"
            >
              {saving ? (
                <>
                  <Loader2
                    className="h-4 w-4 shrink-0 animate-spin"
                    aria-hidden
                  />
                  Saving…
                </>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
