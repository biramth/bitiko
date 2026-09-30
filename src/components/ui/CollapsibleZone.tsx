import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, type LucideIcon } from 'lucide-react'

/** Zone repliable du tableau de bord (même langage que l'accordéon de la
 *  navigation) : une boutique mixte replie la zone qu'elle consulte le moins.
 *  L'état persiste en local — ouvert par défaut, jamais de contenu perdu. */
export function CollapsibleZone({
  title,
  icon: Icon,
  to,
  linkLabel = 'Voir tout',
  storageKey,
  defaultOpen = true,
  children,
}: {
  title: string
  icon: LucideIcon
  to?: string
  linkLabel?: string
  storageKey: string
  /** Ouverte tant que l'utilisateur n'a pas choisi (une zone encore vide peut démarrer repliée). */
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      return stored === null ? defaultOpen : stored !== '0'
    } catch {
      return defaultOpen
    }
  })

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev
      try {
        localStorage.setItem(storageKey, next ? '1' : '0')
      } catch {
        // Navigation privée : le repli ne vit que pour la session.
      }
      return next
    })
  }

  return (
    <section className="mt-5 sm:mt-6">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200/80 bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:px-4">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1 py-1 text-left transition-colors hover:bg-gray-50"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-900/[0.06] text-ink-800">
            <Icon size={16} aria-hidden />
          </span>
          <h2 className="min-w-0 flex-1 truncate font-heading text-[16px] font-semibold text-gray-900">{title}</h2>
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}>
            <ChevronDown size={15} aria-hidden />
          </span>
        </button>
        {to && (
          <Link to={to} className="shrink-0 rounded-lg px-2 py-1.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50">
            {linkLabel}
          </Link>
        )}
      </div>
      {open && <div className="animate-fade-up">{children}</div>}
    </section>
  )
}
