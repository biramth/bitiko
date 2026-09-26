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
  children,
}: {
  title: string
  icon: LucideIcon
  to?: string
  linkLabel?: string
  storageKey: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(storageKey) !== '0'
    } catch {
      return true
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
    <section className="mt-8">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="flex min-w-0 items-center gap-2 text-left"
        >
          <Icon size={18} aria-hidden className="shrink-0 text-gray-400" />
          <h2 className="truncate text-lg font-semibold text-gray-900">{title}</h2>
          <ChevronDown
            size={16}
            aria-hidden
            className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
        {to && (
          <Link to={to} className="shrink-0 text-sm font-medium text-brand-700">
            {linkLabel}
          </Link>
        )}
      </div>
      {open && children}
    </section>
  )
}
