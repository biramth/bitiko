import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, ChevronDown, ExternalLink, Plus, Store } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { DISPLAY_ROOT_DOMAIN, shopUrl } from '@/lib/tenant'
import { selectShop, useMyShop, useMyShops } from './useMyShop'

/** Shop switcher for multi-shop merchants — an expanding identity card, not
 *  an overlay dropdown (no positioning fights inside the scrolling sidebar
 *  or the mobile drawer). Renders nothing for single-shop merchants: their
 *  existing static identity blocks stay exactly as they are. */
export function ShopSwitcher({ onSelect }: { onSelect?: () => void }) {
  const { data: shops } = useMyShops()
  const { data: shop } = useMyShop()
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  if (!shop || !shops || shops.length < 2) return null

  // Mirrors the server-side cap (0097): no dead-end link once full.
  const atCap = shops.length >= 5

  const choose = (id: string) => {
    if (id === shop.id) {
      setOpen(false)
      onSelect?.()
      return
    }
    selectShop(id, queryClient)
    setOpen(false)
    onSelect?.()
    navigate('/admin', { replace: true })
  }

  return (
    <div className="mb-2 rounded-xl bg-white/5 p-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Changer de boutique (actuelle : ${shop.name})`}
        className="flex w-full items-center gap-2.5 text-left"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/10">
          {shop.logo_url ? (
            <img src={shop.logo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <Store size={16} className="text-gold-400" aria-hidden />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-white">{shop.name}</span>
          <span className="block truncate text-xs text-white/50">
            {shop.slug}.{DISPLAY_ROOT_DOMAIN}
          </span>
        </span>
        <ChevronDown
          size={15}
          aria-hidden
          className={`shrink-0 text-white/50 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="mt-2 space-y-0.5 border-t border-white/10 pt-2">
          {shops.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => choose(s.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                s.id === shop.id ? 'text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="min-w-0 flex-1 truncate">{s.name}</span>
              {s.id === shop.id && <Check size={14} aria-hidden className="shrink-0 text-emerald-400" />}
            </button>
          ))}
          {atCap ? (
            <p className="rounded-lg px-2 py-1.5 text-xs text-white/40">
              Maximum de 5 boutiques atteint
            </p>
          ) : (
            <Link
              to="/admin/onboarding?new=1"
              onClick={() => {
                setOpen(false)
                onSelect?.()
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-gold-400 transition-colors hover:bg-white/5 hover:text-gold-300"
            >
              <Plus size={14} aria-hidden /> Nouvelle boutique
            </Link>
          )}
        </div>
      )}
      <Link
        to={shopUrl(shop.slug)}
        target="_blank"
        rel="noreferrer"
        className="mt-2.5 flex items-center justify-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20"
      >
        <ExternalLink size={13} aria-hidden /> Voir la boutique
      </Link>
    </div>
  )
}
