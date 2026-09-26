import { Fragment, Suspense, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  ExternalLink,
  ImagePlus,
  LogOut,
  Menu,
  Phone,
  Receipt,
  Scissors,
  Settings,
  Store,
  Truck,
  User,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { useMyShop, useMyShops } from '@/features/shop-settings/useMyShop'
import { useShopRole } from '@/features/shop-settings/useShopRole'
import { getOrderStatusCounts } from '@/services/order.service'
import { ShopSwitcher } from '@/features/shop-settings/ShopSwitcher'
import { claimShopInvites } from '@/services/team.service'
import { DISPLAY_ROOT_DOMAIN, shopUrl } from '@/lib/tenant'
import { endImpersonation, getImpersonation } from '@/lib/supportSession'
import { PageLoader } from '@/components/ui/PageLoader'
import { GuidedTourProvider } from '@/features/guided-tour/GuidedTourProvider'
import { GuidedTourButton } from '@/features/guided-tour/GuidedTourButton'
import { useWorkspaceModules } from '@/features/workspace/useWorkspaceModules'
import { TOUR_PREPARE_EVENT } from '@/features/guided-tour/types'

// One "Ventes" group (Commandes + Clients, the daily sales workflow) —
// everything else stays top-level: with this few items, more groups would
// just be chrome. Catégories lives as a tab of Produits and Facturation
// under Paramètres (see settingsSections below).
// Workspace navigation is generated from the module registry
// (src/features/workspace/modules.ts): Business Type → Capabilities → Modules,
// ordered and relabeled for the business profile (useWorkspaceModules).
// Groups render as a single-open accordion (chevron + auto-open on the active
// route); the collapsed rail and the mobile drawer share this component.

const settingsSections = [
  { to: '/admin/parametres/general', key: 'general', label: 'Général', icon: Store },
  { to: '/admin/parametres/appearance', key: 'appearance', label: 'Apparence', icon: ImagePlus },
  { to: '/admin/parametres/contact', key: 'contact', label: 'Contact & devise', icon: Phone },
  { to: '/admin/parametres/shipping', key: 'shipping', label: 'Livraison & stock', icon: Truck },
  { to: '/admin/parametres/facturation', key: 'facturation', label: 'Facturation', icon: CreditCard },
  { to: '/admin/parametres/equipe', key: 'equipe', label: 'Équipe & accès', icon: Users },
  { to: '/admin/parametres/compte', key: 'compte', label: 'Mon compte', icon: User },
]

/** Paramètres regroupés comme le reste du workspace : Boutique (le lieu),
 *  Ventes (livraison & stock), Compte (facturation, accès, profil). */
const SETTINGS_GROUPS: { label: string; keys: string[] }[] = [
  { label: 'Boutique', keys: ['general', 'appearance', 'contact'] },
  { label: 'Ventes', keys: ['shipping'] },
  { label: 'Compte', keys: ['facturation', 'equipe', 'compte'] },
]

const SIDEBAR_COLLAPSED_KEY = 'bitiko-admin-sidebar-collapsed'

/** Icône par groupe de navigation — même poids visuel que les boutons
 *  Tableau de bord / Paramètres (aucun groupe « petit texte »). */
const GROUP_ICONS: Record<string, typeof Store> = {
  Ventes: Receipt,
  Boutique: Store,
  Services: Scissors,
  Équipe: Users,
}

/**
 * The sidebar content itself — shared by the desktop rail and the mobile
 * drawer so the two never drift apart. Slim by design: one compact shop row,
 * grouped links, collapsible settings.
 */
function SidebarNav({ collapsed, onNavigate = () => {} }: { collapsed: boolean; onNavigate?: () => void }) {
  const { signOut } = useAuth()
  const { data: shop } = useMyShop()
  const { data: shops } = useMyShops()
  const { groups, capabilities } = useWorkspaceModules()
  const multiShop = (shops?.length ?? 0) > 1
  // Shared with OrdersPage's own query (same key): the sidebar pill costs
  // no extra fetch once Commandes has been visited, and vice versa.
  const { data: orderCounts } = useQuery({
    queryKey: ['orders-counts', shop?.id],
    queryFn: () => getOrderStatusCounts(shop!.id),
    enabled: !!shop?.id,
  })
  const ordersToTreat = (orderCounts?.counts.pending ?? 0) + (orderCounts?.counts.confirmed ?? 0)
  // Billing + team stay owner-only: hide them from managers/vendeurs (RLS
  // blocks the data anyway; this just avoids dead-end pages). Unknown role
  // (still loading) keeps everything visible to avoid flicker for owners.
  const { role: shopRole } = useShopRole()
  const location = useLocation()
  const onSettings = location.pathname.startsWith('/admin/parametres')
  // Livraison & stock n'a de sens qu'avec livraison ou catalogue : un salon
  // 100 % rendez-vous ne le voit ni ici ni dans la page Paramètres.
  const showShippingSection =
    capabilities === null || capabilities.has('HAS_DELIVERY') || capabilities.has('HAS_PRODUCTS')
  const visibleSettingsSections = (
    shopRole && shopRole !== 'owner'
      ? settingsSections.filter((s) => s.to !== '/admin/parametres/facturation' && s.to !== '/admin/parametres/equipe')
      : settingsSections
  ).filter((s) => s.key !== 'shipping' || showShippingSection)

  // Accordéon unique : un seul groupe ouvert à la fois, suit la navigation.
  // La route active rouvre son groupe ; un clic manuel ne vit que jusqu'à la
  // prochaine navigation (même pattern que le suivi de page existant).
  const matchesRoute = (to: string, end?: boolean) =>
    end ? location.pathname === to : location.pathname === to || location.pathname.startsWith(`${to}/`)
  const activeKey = onSettings
    ? 'Paramètres'
    : (groups.find((g) => g.label && g.items.some((m) => matchesRoute(m.to, m.end)))?.label ?? null)
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [prevNavKey, setPrevNavKey] = useState(
    () => `${location.pathname}|${groups.map((g) => g.label ?? 'main').join(',')}`,
  )
  const navKey = `${location.pathname}|${groups.map((g) => g.label ?? 'main').join(',')}`
  if (navKey !== prevNavKey) {
    setPrevNavKey(navKey)
    setOpenGroup(activeKey)
  }
  // La visite guidée pointe des liens rangés dans des groupes repliés : tant
  // qu'elle est active, tous les groupes sont dépliés (event 'admin-menu-open').
  const [tourExpanded, setTourExpanded] = useState(false)
  useEffect(() => {
    const onPrepare = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail
      if (detail === 'admin-menu-open') setTourExpanded(true)
      else if (detail === 'admin-menu-closed') setTourExpanded(false)
    }
    window.addEventListener(TOUR_PREPARE_EVENT, onPrepare)
    return () => window.removeEventListener(TOUR_PREPARE_EVENT, onPrepare)
  }, [])
  const settingsExpanded = openGroup === 'Paramètres'
  const [impersonation] = useState(() => getImpersonation())
  const [quitting, setQuitting] = useState(false)

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      collapsed ? 'justify-center' : ''
    } ${isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`

  const settingsSubLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
      isActive ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'
    }`

  const shopCard = shop && (
    <div className={`mb-2 flex items-center gap-2 rounded-xl bg-white/5 ${collapsed ? 'justify-center p-2' : 'p-2'}`}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/10">
        {shop.logo_url ? (
          <img src={shop.logo_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <Store size={15} className="text-gold-400" aria-hidden />
        )}
      </span>
      {!collapsed && (
        <>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{shop.name}</p>
            <p className="truncate text-xs text-white/50">{shop.slug}.{DISPLAY_ROOT_DOMAIN}</p>
          </div>
          <Link
            to={shopUrl(shop.slug)}
            target="_blank"
            rel="noreferrer"
            title="Voir la boutique"
            aria-label="Voir la boutique"
            className="shrink-0 rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ExternalLink size={14} aria-hidden />
          </Link>
        </>
      )}
    </div>
  )

  return (
    <>
      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {groups.map((group) =>
          !group.label ? (
            <Fragment key="main">
              {group.items.map(({ to, label, icon: Icon, end, guide, ordersBadge }) => (
                <NavLink key={to} to={to} end={end} className={linkClass} title={collapsed ? label : undefined} data-guide={guide}>
                  <Icon size={17} aria-hidden />
                  {!collapsed && label}
                  {!collapsed && ordersBadge && ordersToTreat > 0 && (
                    <span className="ml-auto rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                      {ordersToTreat}
                    </span>
                  )}
                </NavLink>
              ))}
            </Fragment>
          ) : collapsed ? (
            <Fragment key={group.label}>
              {group.items.map(({ to, label, icon: Icon, end, guide }) => (
                <NavLink key={to} to={to} end={end} className={linkClass} title={label} data-guide={guide}>
                  <Icon size={17} aria-hidden />
                </NavLink>
              ))}
            </Fragment>
          ) : (
            <div key={group.label}>
              <button
                type="button"
                onClick={() => setOpenGroup((open) => (open === group.label ? null : (group.label ?? null)))}
                aria-expanded={openGroup === group.label || tourExpanded}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white"
              >
                {(() => {
                  const GroupIcon = (group.label ? GROUP_ICONS[group.label] : undefined) ?? Store
                  return <GroupIcon size={17} aria-hidden />
                })()}
                <span className="flex-1 text-left">{group.label}</span>
                <ChevronDown
                  size={15}
                  aria-hidden
                  className={`transition-transform ${openGroup === group.label ? 'rotate-180' : ''}`}
                />
              </button>
              {(openGroup === group.label || tourExpanded) && (
                <div className="ml-4 flex flex-col gap-0.5 border-l border-white/10 pl-3">
                  {group.items.map(({ to, label, icon: Icon, end, guide, ordersBadge }) => (
                    <NavLink key={to} to={to} end={end} className={linkClass} data-guide={guide}>
                      <Icon size={17} aria-hidden />
                      {label}
                      {ordersBadge && ordersToTreat > 0 && (
                        <span className="ml-auto rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                          {ordersToTreat}
                        </span>
                      )}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ),
        )}

        {collapsed ? (
          <Link
            to="/admin/parametres"
            aria-label="Paramètres"
            title="Paramètres"
            data-guide="guide-nav-parametres"
            className={`flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              onSettings ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Settings size={17} aria-hidden />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setOpenGroup((open) => (open === 'Paramètres' ? null : 'Paramètres'))}
            aria-expanded={settingsExpanded}
            data-guide="guide-nav-parametres"
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              onSettings ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Settings size={17} aria-hidden />
            <span className="flex-1 text-left">Paramètres</span>
            <ChevronDown
              size={15}
              aria-hidden
              className={`transition-transform ${settingsExpanded ? 'rotate-180' : ''}`}
            />
          </button>
        )}
        {!collapsed && settingsExpanded && (
          <div className="flex flex-col gap-1.5">
            {SETTINGS_GROUPS.map(({ label, keys }) => {
              const items = visibleSettingsSections.filter((s) => keys.includes(s.key))
              if (items.length === 0) return null
              return (
                <div key={label}>
                  <p className="px-3 pb-0.5 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/35">
                    {label}
                  </p>
                  <div className="ml-4 flex flex-col gap-0.5 border-l border-white/10 pl-3">
                    {items.map(({ to, label: itemLabel, icon: Icon }) => (
                      <NavLink key={to} to={to} className={settingsSubLinkClass}>
                        <Icon size={14} aria-hidden />
                        {itemLabel}
                      </NavLink>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </nav>

      <div className={collapsed ? 'px-3 pb-2' : 'px-3 pb-3'}>
        {multiShop && !collapsed ? <ShopSwitcher onSelect={onNavigate} /> : shopCard}
        {impersonation ? (
          <button
            type="button"
            onClick={() => {
              setQuitting(true)
              void endImpersonation()
            }}
            disabled={quitting}
            title="Quitter le mode support et revenir à la plateforme"
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gold-400 transition-colors hover:bg-white/5 hover:text-gold-300 disabled:opacity-60 ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut size={17} aria-hidden />
            {!collapsed && (quitting ? 'Retour…' : 'Quitter le mode support')}
          </button>
        ) : (
          <button
            onClick={() => signOut()}
            title="Déconnexion"
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut size={17} aria-hidden />
            {!collapsed && 'Déconnexion'}
          </button>
        )}
      </div>
    </>
  )
}

export function AdminLayout() {
  const { data: shop } = useMyShop()
  const queryClient = useQueryClient()
  // Claim team invites sent to the signed-in user's email (idempotent) —
  // once per admin session, then refresh the workspace scope.
  useEffect(() => {
    let cancelled = false
    claimShopInvites()
      .then((shopIds) => {
        if (!cancelled && shopIds.length > 0) void queryClient.invalidateQueries({ queryKey: ['my-shop'] })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [queryClient])
  const location = useLocation()
  const [impersonation] = useState(() => getImpersonation())
  const [quitting, setQuitting] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
    } catch {
      return false
    }
  })

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  // The drawer is a mobile overlay: any route change dismisses it. Adjusted
  // during render (React's "adjust state when props change" pattern) rather
  // than in an effect, so no extra render pass is scheduled for the reset.
  const [dismissedFor, setDismissedFor] = useState(location.pathname)
  if (location.pathname !== dismissedFor) {
    setDismissedFor(location.pathname)
    setMobileMenuOpen(false)
  }
  // A guided-tour step can ask for the nav drawer (its links only exist on
  // screen while it is open); desktop keeps the always-visible sidebar.
  useEffect(() => {
    const onPrepare = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail
      if (detail !== 'admin-menu-open' && detail !== 'admin-menu-closed') return
      if (!window.matchMedia('(max-width: 767px)').matches) return
      setMobileMenuOpen(detail === 'admin-menu-open')
    }
    window.addEventListener(TOUR_PREPARE_EVENT, onPrepare)
    return () => window.removeEventListener(TOUR_PREPARE_EVENT, onPrepare)
  }, [])
  useEffect(() => {
    if (!mobileMenuOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [mobileMenuOpen])

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
      } catch {
        // localStorage unavailable (private browsing) — the toggle still works for this session.
      }
      return next
    })
  }

  return (
    <GuidedTourProvider>
      <div className="flex h-screen supports-[height:100dvh]:h-dvh bg-gray-50">
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col overflow-y-auto overflow-x-hidden bg-ink-900 transition-[width] duration-150 md:flex ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        <div className={`flex items-center gap-2 px-5 py-4 text-white ${collapsed ? 'justify-center px-0' : ''}`}>
          <LogoMark />
          {!collapsed && <span className="font-heading text-lg font-bold tracking-tight text-white">Bitiko</span>}
        </div>

        <SidebarNav collapsed={collapsed} />

        <button
          type="button"
          onClick={toggleCollapsed}
          title={collapsed ? 'Déplier le menu' : 'Réduire le menu'}
          className="flex items-center justify-center gap-2 border-t border-white/10 py-2.5 text-xs font-medium text-white/50 hover:bg-white/5 hover:text-white"
        >
          {collapsed ? <ChevronsRight size={16} aria-hidden /> : <ChevronsLeft size={16} aria-hidden />}
          {!collapsed && 'Réduire'}
        </button>
      </aside>

      <div className="flex h-screen supports-[height:100dvh]:h-dvh flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-ink-900/10 bg-white px-4 py-3 md:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Ouvrir le menu"
              aria-expanded={mobileMenuOpen}
              className="-ml-1.5 rounded-lg p-1.5 text-gray-600 hover:bg-gray-100"
            >
              <Menu size={22} aria-hidden />
            </button>
            <LogoMark size={22} />
            <span className="truncate font-heading font-bold text-ink-900">
              {shop?.name ?? 'Bitiko'}
            </span>
          </div>
          {shop && (
            <Link to={shopUrl(shop.slug)} target="_blank" rel="noreferrer" aria-label="Voir la boutique">
              <ExternalLink size={18} className="text-gray-500" />
            </Link>
          )}
        </header>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu de navigation">
            <div
              className="absolute inset-0 bg-ink-900/50"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-ink-900 shadow-xl">
              <div className="flex items-center justify-between px-5 py-5 text-white">
                <div className="flex items-center gap-2">
                  <LogoMark />
                  <span className="font-heading text-lg font-bold tracking-tight text-white">Bitiko</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Fermer le menu"
                  className="rounded-lg p-1.5 text-white/60 hover:bg-white/5 hover:text-white"
                >
                  <X size={20} aria-hidden />
                </button>
              </div>

              <SidebarNav collapsed={false} onNavigate={() => setMobileMenuOpen(false)} />
            </div>
          </div>
        )}

        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {impersonation && (
            <div className="mb-4 flex flex-col gap-2 rounded-xl border border-gold-300 bg-gold-400/15 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-ink-900">Mode support actif</p>
                <p className="text-xs text-ink-900/70">
                  Tu es connecté·e avec le compte du commerçant de « {impersonation.shopName} » ({impersonation.shopSlug}.{DISPLAY_ROOT_DOMAIN}) — les modifications sont réelles sur sa boutique.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setQuitting(true)
                  void endImpersonation()
                }}
                disabled={quitting}
                className="flex items-center gap-1.5 self-start rounded-lg bg-ink-900 px-3 py-2 text-sm font-medium text-white hover:bg-ink-800 disabled:opacity-60 sm:self-center"
              >
                <LogOut size={14} aria-hidden />
                {quitting ? 'Retour en cours…' : 'Quitter le mode support'}
              </button>
            </div>
          )}
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      </div>
      <GuidedTourButton />
    </GuidedTourProvider>
  )
}

function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="10" fill="#fff" fillOpacity="0.12" />
      <circle cx="28.5" cy="10.5" r="3" fill="#f2b705" />
      <path d="M20 9 L31 27 H9 Z" fill="#d9612e" />
      <rect x="13" y="25" width="14" height="5" rx="1.5" fill="#fdf3e7" />
    </svg>
  )
}
