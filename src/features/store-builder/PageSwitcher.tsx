import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ChevronDown, CreditCard, FileText, Home, Package, Plus, Receipt, ShoppingCart, Trash2 } from 'lucide-react'
import type { StorePage } from '@/types'
import type { SystemTemplateKey } from '@/types/builder'
import type { ActiveKey } from '@/pages/admin/StoreBuilderPage'

const SYSTEM_PAGES: { key: 'home' | SystemTemplateKey; label: string; icon: typeof Home; color: string }[] = [
  { key: 'home', label: 'Accueil', icon: Home, color: 'from-brand-500 to-brand-700' },
  { key: 'catalogue', label: 'Catalogue', icon: Package, color: 'from-teal-500 to-teal-700' },
  { key: 'product', label: 'Fiche produit', icon: Receipt, color: 'from-indigo-500 to-indigo-700' },
  { key: 'cart', label: 'Panier', icon: ShoppingCart, color: 'from-emerald-500 to-emerald-700' },
  { key: 'checkout', label: 'Commande', icon: CreditCard, color: 'from-cyan-500 to-cyan-700' },
  { key: 'not_found', label: 'Page 404', icon: AlertTriangle, color: 'from-rose-500 to-rose-700' },
]

function IconBadge({ icon: Icon, color }: { icon: typeof Home; color: string }) {
  return (
    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br text-white shadow-sm ${color}`}>
      <Icon size={14} aria-hidden />
    </span>
  )
}

/** Single control for "what am I editing right now": the site's fixed pages
 *  (home + the four system templates), the merchant's custom pages, and
 *  creating/deleting a custom page — previously spread across a native
 *  <select> plus two separate icon buttons bolted onto its side. Grouping
 *  everything here (and reusing the same icon-badge language as the block
 *  picker) is what makes "which page" and "add a block" feel like the same
 *  tool instead of two different ones bolted together. */
export function PageSwitcher({
  activeKey,
  pages,
  onSelect,
  onCreatePage,
  onDeletePage,
}: {
  activeKey: ActiveKey
  pages: StorePage[]
  onSelect: (key: ActiveKey) => void
  onCreatePage: () => void
  onDeletePage: (page: StorePage) => void
}) {
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

  const activePage = activeKey.startsWith('page:') ? pages.find((p) => p.id === activeKey.slice(5)) : undefined
  const activeSystem = SYSTEM_PAGES.find((p) => p.key === activeKey)
  const current = activeSystem ?? { label: activePage?.title ?? 'Accueil', icon: FileText, color: 'from-slate-400 to-slate-600' }

  return (
    <div className="relative" ref={ref} data-guide="guide-page-switcher">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white py-1.5 pl-2 pr-2.5 text-sm font-medium text-gray-900 hover:bg-gray-50"
      >
        <IconBadge icon={current.icon} color={current.color} />
        {current.label}
        <ChevronDown size={14} className="text-gray-400" aria-hidden />
      </button>

      {open && (
        <div className="absolute left-0 z-20 mt-1.5 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl">
          <p className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Pages du site</p>
          {SYSTEM_PAGES.map(({ key, label, icon, color }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                onSelect(key)
                setOpen(false)
              }}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm ${
                activeKey === key ? 'bg-brand-50/70 font-semibold text-brand-700' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <IconBadge icon={icon} color={color} />
              {label}
            </button>
          ))}

          <p className="mt-1.5 border-t border-gray-100 px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Mes pages
          </p>
          {pages.length === 0 && <p className="px-2 pb-1.5 text-xs text-gray-400">Aucune page personnalisée pour l'instant.</p>}
          {pages.map((page) => {
            const key: ActiveKey = `page:${page.id}`
            const isActive = activeKey === key
            return (
              <div
                key={page.id}
                className={`group flex items-center gap-1 rounded-lg pr-1 ${isActive ? 'bg-brand-50/70' : 'hover:bg-gray-50'}`}
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelect(key)
                    setOpen(false)
                  }}
                  className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm ${
                    isActive ? 'font-semibold text-brand-700' : 'text-gray-700'
                  }`}
                >
                  <IconBadge icon={FileText} color="from-slate-400 to-slate-600" />
                  <span className="min-w-0 flex-1 truncate">{page.title}</span>
                  {!page.is_published && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                      Brouillon
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeletePage(page)
                    setOpen(false)
                  }}
                  aria-label={`Supprimer « ${page.title} »`}
                  title="Supprimer cette page"
                  className="shrink-0 rounded p-1.5 text-gray-300 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                >
                  <Trash2 size={13} aria-hidden />
                </button>
              </div>
            )
          })}
          <button
            type="button"
            onClick={() => {
              onCreatePage()
              setOpen(false)
            }}
            className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:border-brand-300 hover:bg-brand-50/40 hover:text-brand-700"
          >
            <Plus size={14} aria-hidden /> Nouvelle page
          </button>
        </div>
      )}
    </div>
  )
}
