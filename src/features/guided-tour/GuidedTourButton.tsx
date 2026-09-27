import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowUpRight, Copy, HelpCircle, MessageCircle, Sparkles, X } from 'lucide-react'
import { useGuidedTour } from './useGuidedTour'
import { GUIDED_TOURS } from './tours'
import { isTourSeen } from './storage'
import { supportLink, toursForHelp, visibleShortcuts } from './help'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { useShopRole } from '@/features/shop-settings/useShopRole'
import { useWorkspaceModules } from '@/features/workspace/useWorkspaceModules'
import { useToast } from '@/components/ui/Toast'
import { shopUrl } from '@/lib/tenant'

/** Bouton d'aide en bas à droite : visites guidées adaptées au métier (celle de la
 *  page courante en premier), accès rapides aux réglages les plus cherchés, et
 *  contact de l'équipe. Masqué pendant une visite (la carte de la visite prend le focus). */
export function GuidedTourButton() {
  const { startGuidedTour, activeTourId } = useGuidedTour()
  const { pathname } = useLocation()
  const { data: shop } = useMyShop()
  const { role } = useShopRole()
  const { capabilities } = useWorkspaceModules()
  const toast = useToast()
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

  const tours = toursForHelp(GUIDED_TOURS, capabilities, pathname, role)
  const shortcuts = visibleShortcuts(capabilities, role)
  const support = supportLink(import.meta.env.VITE_SUPPORT_WHATSAPP, shop?.name)
  // Point d'attention : une visite existe pour cette page et n'a jamais été lancée.
  const hasUnseenTourHere = tours.some((entry) => entry.onPage && !isTourSeen(entry.tour.id))

  const copyLink = async () => {
    if (!shop) return
    try {
      await navigator.clipboard.writeText(shopUrl(shop.slug))
      toast.success('Lien de la boutique copié.')
    } catch {
      toast.error('Copie impossible : ouvre ta boutique et copie l’adresse depuis le navigateur.')
    }
    setOpen(false)
  }

  const shortcutClass =
    'flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50'

  return (
    <div className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1.25rem,env(safe-area-inset-right))] z-40" ref={ref}>
      {open && (
        <div className="absolute bottom-16 right-0 flex max-h-[min(34rem,calc(100dvh-7rem))] w-80 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-2xl shadow-ink-900/20">
          <div className="shrink-0 bg-ink-900 px-4 py-3">
            <p className="text-sm font-semibold text-white">Besoin d’un coup de main ?</p>
            <p className="mt-0.5 text-xs text-white/60">Visites guidées, raccourcis et contact de l’équipe.</p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Visites guidées</p>
            <ul className="px-1.5 pb-1">
              {tours.map(({ tour, onPage }) => (
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
                      <span className="flex flex-wrap items-center gap-x-2 text-sm font-semibold text-gray-900">
                        {tour.title}
                        {onPage && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Sur cette page</span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-xs leading-snug text-gray-500">{tour.description}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {shortcuts.length > 0 && (
              <>
                <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Que veux-tu faire ?</p>
                <ul className="px-1.5 pb-2">
                  {shortcuts.map((shortcut) => (
                    <li key={shortcut.key}>
                      {shortcut.to ? (
                        <Link to={shortcut.to} onClick={() => setOpen(false)} className={shortcutClass}>
                          <span className="min-w-0 flex-1">{shortcut.label}</span>
                          <ArrowUpRight size={14} className="shrink-0 text-gray-400" aria-hidden />
                        </Link>
                      ) : (
                        <button type="button" onClick={copyLink} className={shortcutClass}>
                          <span className="min-w-0 flex-1">{shortcut.label}</span>
                          <Copy size={14} className="shrink-0 text-gray-400" aria-hidden />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="shrink-0 border-t border-gray-100 p-2">
            {support ? (
              <a
                href={support}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-11 items-center gap-2.5 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-100"
              >
                <MessageCircle size={16} aria-hidden />
                Écrire à l’équipe Bitiko sur WhatsApp
              </a>
            ) : (
              <p className="hidden px-2 py-1 text-[11px] leading-snug text-gray-400 sm:block">
                Astuce : « ← » et « → » naviguent dans une visite, « Échap » la quitte.
              </p>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-expanded={open}
        aria-label={open ? 'Fermer l’aide' : hasUnseenTourHere ? 'Ouvrir l’aide (une visite guidée est disponible sur cette page)' : 'Ouvrir l’aide'}
        className={`relative flex h-12 w-12 items-center justify-center rounded-full shadow-lg shadow-ink-900/25 transition-all hover:scale-105 ${
          open ? 'bg-gray-700 text-white' : 'bg-brand-600 text-white hover:bg-brand-700'
        }`}
      >
        {open ? <X size={20} aria-hidden /> : <HelpCircle size={21} aria-hidden />}
        {!open && hasUnseenTourHere && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-400 opacity-75 motion-reduce:animate-none" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white bg-gold-400" />
          </span>
        )}
      </button>
    </div>
  )
}
