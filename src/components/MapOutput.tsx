type Props = {
  imageUrl: string | null
  loading: boolean
  error: string | null
}

/** Final map preview. TODO: lightbox, download button, retry affordance. */
export function MapOutput({ imageUrl, loading, error }: Props) {
  if (loading) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 border border-dashed border-[#1a2744]/25 bg-[#faf7f0] p-6 text-center">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-[#c4a35a] border-t-transparent"
          aria-hidden
        />
        <p className="font-serif text-[#1a2744]">Charting your map…</p>
        <p className="font-sans text-sm text-[#1a2744]/65">
          This may take a little while.
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div
        role="alert"
        className="border border-[#8b2942]/40 bg-[#fff5f7] p-4 font-sans text-sm text-[#6b1f33]"
      >
        {error}
      </div>
    )
  }

  if (!imageUrl) {
    return (
      <div className="flex min-h-[180px] items-center justify-center border border-dashed border-[#1a2744]/20 bg-[#f4efe6]/60 p-6 text-center font-sans text-sm text-[#1a2744]/55">
        Generated map will appear here.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded border border-[#1a2744]/20 bg-[#1a2744]/5 p-2 shadow-inner">
      <img
        src={imageUrl}
        alt="Generated map"
        className="mx-auto max-h-[min(70vh,720px)] w-full object-contain"
      />
    </div>
  )
}
