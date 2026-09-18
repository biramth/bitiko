import { useRef } from 'react'

/** Click-to-set focal point on an image preview — the part of the photo that
 *  stays visible however the container crops it (mobile vs. desktop, a
 *  different aspect ratio…), without needing a full crop tool. */
export function FocalPointPicker({
  imageUrl,
  focalX,
  focalY,
  onChange,
  aspectClassName = 'aspect-[21/9]',
}: {
  imageUrl: string
  focalX: number
  focalY: number
  onChange: (focalX: number, focalY: number) => void
  aspectClassName?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  const setFromPointer = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0 || rect.height === 0) return
    const x = Math.round(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)))
    const y = Math.round(Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100)))
    onChange(x, y)
  }

  return (
    <div>
      <div
        ref={containerRef}
        onClick={(e) => setFromPointer(e.clientX, e.clientY)}
        role="button"
        tabIndex={0}
        aria-label="Choisir le point focal de l'image"
        onKeyDown={(e) => {
          const step = e.shiftKey ? 10 : 2
          if (e.key === 'ArrowLeft') onChange(Math.max(0, focalX - step), focalY)
          if (e.key === 'ArrowRight') onChange(Math.min(100, focalX + step), focalY)
          if (e.key === 'ArrowUp') onChange(focalX, Math.max(0, focalY - step))
          if (e.key === 'ArrowDown') onChange(focalX, Math.min(100, focalY + step))
        }}
        className={`relative w-full cursor-crosshair overflow-hidden rounded-xl border border-gray-200 bg-sand-50 ${aspectClassName}`}
      >
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover"
          style={{ objectPosition: `${focalX}% ${focalY}%` }}
        />
        <span
          className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand-600 shadow-md"
          style={{ left: `${focalX}%`, top: `${focalY}%` }}
          aria-hidden
        />
      </div>
      <p className="mt-1.5 text-xs text-gray-400">
        Cliquez sur l'image pour choisir la partie qui reste toujours visible, quelle que soit la taille de l'écran.
      </p>
    </div>
  )
}
