import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowUpRight, CheckCircle2, ChevronDown, Copy, HelpCircle, Mail, MessageCircle, Search, Sparkles, X } from 'lucide-react'
import { SUPPORT_EMAIL } from '@/config/contact'
import { useGuidedTour } from './useGuidedTour'
import { GUIDED_TOURS } from './tours'
import { markTourSeen, tourStatus } from './storage'
import { answersForHelp, supportLink, toursForHelp, visibleShortcuts, type HelpAnswer } from './help'
import type { GuidedTour } from './types'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { useShopRole } from '@/features/shop-settings/useShopRole'
import { useWorkspaceModules } from '@/features/workspace/useWorkspaceModules'
import { useToast } from '@/components/ui/Toast'
import { shopUrl } from '@/lib/tenant'

const SECTION = 'px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400'
const NUDGE_DELAY_MS = 1500

/** Bouton d'aide en bas à droite : recherche, aide de la page courante (visite + questions fréquentes),
 *  autres visites avec leur avancement, raccourcis et contact de l'équipe. À la première venue sur une
 *  page qui a une visite, une petite bulle la propose une fois. Masqué pendant une visite. */
export function GuidedTourButton() {
  const { startGuidedTour, activeTourId } = useGuidedTour()
  const { pathname } = useLocation()
  const { data: shop } = useMyShop()
  const { role } = useShopRole()
  const { capabilities } = useWorkspaceModules()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [nudgeReady, setNudgeReady] = useState<string | null>(null)
  const [, setStatusVersion] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    searchRef.current?.focus()
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

  const allTours = toursForHelp(GUIDED_TOURS, capabilities, pathname, role)
  const tourHere = allTours.find((entry) => entry.onPage)?.tour ?? null
  const nudgeTour = tourHere && tourStatus(tourHere.id) === 'new' ? tourHere : null

  // La bulle n'apparaît qu'après un court délai sur la page, pour ne pas surgir pendant le chargement.
  useEffect(() => {
    if (!nudgeTour) return
    const timer = window.setTimeout(() => setNudgeReady(nudgeTour.id), NUDGE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [nudgeTour])

  if (activeTourId) return null

  const searching = query.trim().length > 0
  const tours = toursForHelp(GUIDED_TOURS, capabilities, pathname, role, query)
  const answers = answersForHelp(capabilities, pathname, role, query)
  const shortcuts = visibleShortcuts(capabilities, role, query)
  const support = supportLink(import.meta.env.VITE_SUPPORT_WHATSAPP, shop?.name)
  const showNudge = !open && !!nudgeTour && nudgeReady === nudgeTour.id
  const nothingFound = searching && tours.length === 0 && answers.length === 0 && shortcuts.length === 0

  const launch = (tour: GuidedTour) => {
    setOpen(false)
    setQuery('')
    startGuidedTour(tour.id)
  }

  const dismissNudge = () => {
    if (!nudgeTour) return
    markTourSeen(nudgeTour.id)
    setStatusVersion((v) => v + 1)
  }

  const copyLink = async () => {
    if (!shop) return
    try {
      await navigator.clipboard.writeText(shopUrl(shop.slug))
      toast.success('Lien de votre site copié.')
    } catch {
      toast.error('Copie impossible : ouvrez votre site et copiez l’adresse depuis le navigateur.')
    }
    setOpen(false)
  }

  const shortcutClass =
    'flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50'

  const tourRow = (tour: GuidedTour, onPage: boolean) => {
    const status = tourStatus(tour.id)
    return (
      <li key={tour.id}>
        <button
          type="button"
          onClick={() => launch(tour)}
          className="group flex min-h-11 w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-gray-50 sm:py-2.5"
        >
          <span
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
              status === 'done' ? 'bg-emerald-50 text-emerald-600' : 'bg-brand-50 text-brand-700 group-hover:bg-brand-600 group-hover:text-white'
            }`}
          >
            {status === 'done' ? <CheckCircle2 size={15} aria-hidden /> : <Sparkles size={15} aria-hidden />}
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-semibold text-gray-900">
              {tour.title}
              {onPage && !searching && status !== 'done' && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Sur cette page</span>
              )}
              {status === 'done' && <span className="text-[11px] font-medium text-emerald-700">Terminée · revoir</span>}
            </span>
            <span className="mt-0.5 block text-xs leading-snug text-gray-500">{tour.description}</span>
          </span>
        </button>
      </li>
    )
  }

  const answerRow = (answer: HelpAnswer) => (
    <li key={answer.key}>
      <details className="group rounded-xl px-3 open:bg-gray-50">
        <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 py-2 text-sm font-medium text-gray-800 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 flex-1">{answer.question}</span>
          <ChevronDown size={15} className="shrink-0 text-gray-400 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <p className="pb-2 text-sm leading-relaxed text-gray-600">{answer.answer}</p>
        {answer.link && (
          <Link
            to={answer.link.to}
            onClick={() => setOpen(false)}
            className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"
          >
            {answer.link.label} <ArrowUpRight size={14} aria-hidden />
          </Link>
        )}
      </details>
    </li>
  )

  const hereTours = searching ? [] : tours.filter((e) => e.onPage)
  const otherTours = searching ? tours : tours.filter((e) => !e.onPage)

  return (
    <div className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1.25rem,env(safe-area-inset-right))] z-40" ref={ref}>
      {open && (
        <div
          role="dialog"
          aria-label="Aide"
          className="absolute bottom-16 right-0 flex max-h-[min(38rem,calc(100dvh-7rem))] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-2xl shadow-ink-900/20"
        >
          <div className="shrink-0 bg-ink-900 px-4 pb-3 pt-3">
            <p className="text-sm font-semibold text-white">Besoin d’un coup de main ?</p>
            <label className="relative mt-2.5 block">
              <span className="sr-only">Rechercher dans l’aide</span>
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/50" aria-hidden />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ex. livraison, bilan, tontine…"
                className="w-full rounded-lg border-0 bg-white/10 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/50 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pb-2" aria-live="polite">
            {nothingFound ? (
              <p className="px-4 py-6 text-center text-sm text-gray-500">
                Rien trouvé pour « {query.trim()} ». Écrivez-nous : l’équipe répond vite.
              </p>
            ) : (
              <>
                {hereTours.length > 0 && (
                  <>
                    <p className={SECTION}>Sur cette page</p>
                    <ul className="px-1.5">{hereTours.map(({ tour }) => tourRow(tour, true))}</ul>
                  </>
                )}

                {answers.length > 0 && (
                  <>
                    <p className={SECTION}>{searching ? 'Réponses' : 'Questions fréquentes'}</p>
                    <ul className="space-y-0.5 px-1.5">{answers.map(({ answer }) => answerRow(answer))}</ul>
                  </>
                )}

                {otherTours.length > 0 && (
                  <>
                    <p className={SECTION}>{searching ? 'Visites guidées' : hereTours.length > 0 ? 'Autres visites' : 'Visites guidées'}</p>
                    <ul className="px-1.5">{otherTours.map(({ tour, onPage }) => tourRow(tour, onPage))}</ul>
                  </>
                )}

                {shortcuts.length > 0 && (
                  <>
                    <p className={SECTION}>Que voulez-vous faire ?</p>
                    <ul className="px-1.5">
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
              </>
            )}
          </div>

          <div className="shrink-0 space-y-1 border-t border-gray-100 p-2">
            {support && (
              <a
                href={support}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-11 items-center gap-2.5 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-100"
              >
                <MessageCircle size={16} aria-hidden />
                Écrire à l’équipe Bitiko sur WhatsApp
              </a>
            )}
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Aide${shop?.name ? ` — ${shop.name}` : ''}`)}`}
              className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Mail size={16} aria-hidden />
              <span className="min-w-0">
                Écrire au support
                <span className="block truncate text-xs font-normal text-gray-500">{SUPPORT_EMAIL}</span>
              </span>
            </a>
          </div>
        </div>
      )}

      {showNudge && nudgeTour && (
        <div
          role="status"
          className="absolute bottom-16 right-0 w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-sand-200 bg-white p-3.5 shadow-xl shadow-ink-900/15"
        >
          <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <Sparkles size={15} className="text-brand-600" aria-hidden /> Première fois ici ?
          </p>
          <p className="mt-1 text-xs leading-snug text-gray-600">« {nudgeTour.title} » : une visite rapide de cette page.</p>
          <div className="mt-2.5 flex justify-end gap-1.5">
            <button type="button" onClick={dismissNudge} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800">
              Plus tard
            </button>
            <button
              type="button"
              onClick={() => launch(nudgeTour)}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
            >
              Lancer la visite
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-expanded={open}
        aria-label={open ? 'Fermer l’aide' : nudgeTour ? 'Ouvrir l’aide (une visite guidée est disponible sur cette page)' : 'Ouvrir l’aide'}
        className={`relative flex h-12 w-12 items-center justify-center rounded-full shadow-lg shadow-ink-900/25 transition-all hover:scale-105 ${
          open ? 'bg-gray-700 text-white' : 'bg-brand-600 text-white hover:bg-brand-700'
        }`}
      >
        {open ? <X size={20} aria-hidden /> : <HelpCircle size={21} aria-hidden />}
        {!open && nudgeTour && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-400 opacity-75 motion-reduce:animate-none" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white bg-gold-400" />
          </span>
        )}
      </button>
    </div>
  )
}
