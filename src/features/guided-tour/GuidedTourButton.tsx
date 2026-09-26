import { useEffect, useRef, useState } from 'react'
import { HelpCircle, Sparkles, X } from 'lucide-react'
import { useGuidedTour } from './useGuidedTour'
import { GUIDED_TOURS } from './tours'

/** Bottom-right help button opening the list of guided tours. Hidden while a
 *  tour is already running (the overlay's card is the focus then). */
export function GuidedTourButton() {
  const { startGuidedTour, activeTourId } = useGuidedTour()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onEscape)
    }
  }, [open])

  if (activeTourId) return null

  return (
    <div className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1.25rem,env(safe-area-inset-right))] z-40" ref={ref}>
      {open && (
        <div className="absolute bottom-16 right-0 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-2xl shadow-ink-900/20">
          <div className="bg-ink-900 px-4 py-3">
            <p className="text-sm font-semibold text-white">Besoin d’un coup de main ?</p>
            <p className="mt-0.5 text-xs text-white/60">Suivez une visite guidée pour apprendre l’essentiel.</p>
          </div>
          <ul className="max-h-[60vh] overflow-y-auto p-1.5">
            {GUIDED_TOURS.map((tour) => (
              <li key={tour.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    startGuidedTour(tour.id)
                  }}
                  className="group flex min-h-11 w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-gray-50 sm:py-2.5"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                    <Sparkles size={15} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-gray-900">{tour.title}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-gray-500">{tour.description}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="hidden border-t border-gray-100 px-4 py-2 sm:block">
            <p className="text-[11px] leading-snug text-gray-400">
              Astuce : « ← » et « → » naviguent dans une visite, « Échap » la quitte.
            </p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-expanded={open}
        aria-label={open ? 'Fermer l’aide' : 'Ouvrir l’aide'}
        className={`flex h-12 w-12 items-center justify-center rounded-full shadow-lg shadow-ink-900/25 transition-all hover:scale-105 ${
          open ? 'bg-gray-700 text-white' : 'bg-brand-600 text-white hover:bg-brand-700'
        }`}
      >
        {open ? <X size={20} aria-hidden /> : <HelpCircle size={21} aria-hidden />}
      </button>
    </div>
  )
}