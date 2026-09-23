import { Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  ExternalLink,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Phone,
  Settings,
  ShoppingBag,
  Store,
  Truck,
  User,
  Wand2,
  X,
} from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { DISPLAY_ROOT_DOMAIN, shopUrl } from '@/lib/tenant'
import { endImpersonation, getImpersonation } from '@/lib/supportSession'
import { PageLoader } from '@/components/ui/PageLoader'
import { GuidedTourProvider } from '@/features/guided-tour/GuidedTourProvider'
import { GuidedTourButton } from '@/features/guided-tour/GuidedTourButton'
import { TOUR_PREPARE_EVENT } from '@/features/guided-tour/types'
import { AmbianceMigrationDialog } from '@/features/shop-settings/AmbianceMigrationDialog'

// Flat list, not grouped — Catégories now lives as a tab of Produits and
// Facturation moved under Paramètres (see settingsSections below), so there
// are too few top-level items left to justify collapsible groups.
const visibleNavItems = [
  { to: '/admin', label: 'Tableau de bord', icon: LayoutDashboard, end: true, guide: 'guide-nav-dashboard' },
  { to: '/admin/commandes', label: 'Commandes', icon: ShoppingBag, guide: 'guide-nav-commandes' },
  { to: '/admin/produits', label: 'Produits', icon: Package, guide: 'guide-nav-produits' },
  { to: '/admin/personnaliser', label: 'Personnaliser', icon: Wand2, guide: 'guide-nav-personnaliser' },
]

const settingsSections = [
  { to: '/admin/parametres/general', label: 'Général', icon: Store },
  { to: '/admin/parametres/appearance', label: 'Apparence', icon: ImagePlus },
  { to: '/admin/parametres/contact', label: 'Contact & devise', icon: Phone },
  { to: '/admin/parametres/shipping', label: 'Livraison & stock', icon: Truck },
  { to: '/admin/parametres/facturation', label: 'Facturation', icon: CreditCard },
  { to: '/admin/parametres/compte', label: 'Mon compte', icon: User },
]

const SIDEBAR_COLLAPSED_KEY = 'bitiko-admin-sidebar-collapsed'

export function AdminLayout() {
  const { signOut } = useAuth()
  const { data: shop } = useMyShop()
  const location = useLocation()
  const [impersonation] = useState(() => getImpersonation())
  const [quitting, setQuitting] = useState(false)
  const onSettings = location.pathname.startsWith('/admin/parametres')
  const [settingsOpen, setSettingsOpen] = useState(onSettings)
  // Navigate into/out of Paramètres → follow it (adjust during render rather
  // than in an effect, so a manual collapse isn't re-opened by an unrelated
  // re-render, but the link itself always reflects where you actually are).
  const [prevOnSettings, setPrevOnSettings] = useState(onSettings)
  if (onSettings !== prevOnSettings) {
    setPrevOnSettings(onSettings)
    if (onSettings) setSettingsOpen(true)
  }
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
    } catch {
      return false
    }
  })

  const settingsExpanded = settingsOpen

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])
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

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      collapsed ? 'justify-center' : ''
    } ${isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`

  const settingsSubLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'
    }`

  const shopIdentity = shop && (
    <div className={`mb-2 rounded-xl bg-white/5 ${collapsed ? 'p-2' : 'p-3'}`}>
      <div className={`flex items-center gap-2.5 ${collapsed ? 'justify-center' : ''}`}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/10">
          {shop.logo_url ? (
            <img src={shop.logo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <Store size={16} className="text-gold-400" aria-hidden />
          )}
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{shop.name}</p>
            <p className="truncate text-xs text-white/50">{shop.slug}.{DISPLAY_ROOT_DOMAIN}</p>
          </div>
        )}
      </div>
      {!collapsed && (
        <Link
          to={shopUrl(shop.slug)}
          target="_blank"
          rel="noreferrer"
          className="mt-2.5 flex items-center justify-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20"
        >
          <ExternalLink size={13} aria-hidden /> Voir la boutique
        </Link>
      )}
    </div>
  )

  const signOutButton = impersonation ? (
    <button
      type="button"
      onClick={() => {
        setQuitting(true)
        void endImpersonation()
      }}
      disabled={quitting}
      title="Quitter le mode support et revenir à la plateforme"
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gold-400 transition-colors hover:bg-white/5 hover:text-gold-300 disabled:opacity-60 ${
        collapsed ? 'justify-center' : ''
      }`}
    >
      <LogOut size={18} aria-hidden />
      {!collapsed && (quitting ? 'Retour…' : 'Quitter le mode support')}
    </button>
  ) : (
    <button
      onClick={() => signOut()}
      title="Déconnexion"
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white ${
        collapsed ? 'justify-center' : ''
      }`}
    >
      <LogOut size={18} aria-hidden />
      {!collapsed && 'Déconnexion'}
    </button>
  )

  return (
    <GuidedTourProvider>
      <div className="flex h-screen bg-gray-50">
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col overflow-y-auto overflow-x-hidden bg-ink-900 transition-[width] duration-150 md:flex ${
          collapsed ? 'w-[4.5rem]' : 'w-64'
        }`}
      >
        <div className={`flex items-center gap-2 px-5 py-5 text-white ${collapsed ? 'justify-center px-0' : ''}`}>
          <LogoMark />
          {!collapsed && <span className="font-heading text-lg font-bold tracking-tight text-white">Bitiko</span>}
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {visibleNavItems.map(({ to, label, icon: Icon, end, guide }) => (
            <NavLink key={to} to={to} end={end} className={linkClass} title={collapsed ? label : undefined} data-guide={guide}>
              <Icon size={18} aria-hidden />
              {!collapsed && label}
            </NavLink>
          ))}

          <button
            type="button"
            onClick={() => (collapsed ? undefined : setSettingsOpen((open) => !open))}
            aria-expanded={settingsExpanded}
            title={collapsed ? 'Paramètres' : undefined}
            data-guide="guide-nav-parametres"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              collapsed ? 'justify-center' : ''
            } ${onSettings ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
          >
            {collapsed ? (
              <Link to="/admin/parametres" aria-label="Paramètres" className="flex items-center justify-center">
                <Settings size={18} aria-hidden />
              </Link>
            ) : (
              <>
                <Settings size={18} aria-hidden />
                <span className="flex-1 text-left">Paramètres</span>
                <ChevronDown
                  size={15}
                  aria-hidden
                  className={`transition-transform ${settingsExpanded ? 'rotate-180' : ''}`}
                />
              </>
            )}
          </button>
          {!collapsed && settingsExpanded && (
            <div className="ml-4 flex flex-col gap-0.5 border-l border-white/10 pl-3">
              {settingsSections.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} className={settingsSubLinkClass}>
                  <Icon size={15} aria-hidden />
                  {label}
                </NavLink>
              ))}
            </div>
          )}
        </nav>

        <div className={collapsed ? 'px-3 pb-2' : 'px-3 pb-4'}>
          {shopIdentity}
          {signOutButton}
        </div>

        <button
          type="button"
          onClick={toggleCollapsed}
          title={collapsed ? 'Déplier le menu' : 'Réduire le menu'}
          className="flex items-center justify-center gap-2 border-t border-white/10 py-3 text-xs font-medium text-white/50 hover:bg-white/5 hover:text-white"
        >
          {collapsed ? <ChevronsRight size={16} aria-hidden /> : <ChevronsLeft size={16} aria-hidden />}
          {!collapsed && 'Réduire'}
        </button>
      </aside>

      <div className="flex h-screen flex-1 flex-col overflow-hidden">
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

              <nav className="flex flex-1 flex-col gap-1 px-3">
                {visibleNavItems.map(({ to, label, icon: Icon, end, guide }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
                      }`
                    }
                    data-guide={guide}
                  >
                    <Icon size={18} aria-hidden />
                    {label}
                  </NavLink>
                ))}

                <button
                  type="button"
                  onClick={() => setSettingsOpen((open) => !open)}
                  aria-expanded={settingsExpanded}
                  data-guide="guide-nav-parametres"
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    onSettings ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Settings size={18} aria-hidden />
                  <span className="flex-1 text-left">Paramètres</span>
                  <ChevronDown
                    size={15}
                    aria-hidden
                    className={`transition-transform ${settingsExpanded ? 'rotate-180' : ''}`}
                  />
                </button>
                {settingsExpanded && (
                  <div className="ml-4 flex flex-col gap-0.5 border-l border-white/10 pl-3">
                    {settingsSections.map(({ to, label, icon: Icon }) => (
                      <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            isActive ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'
                          }`
                        }
                      >
                        <Icon size={15} aria-hidden />
                        {label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </nav>

              <div className="px-3 pb-4">
                {shop && (
                  <div className="mb-2 rounded-xl bg-white/5 p-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/10">
                        {shop.logo_url ? (
                          <img src={shop.logo_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Store size={16} className="text-gold-400" aria-hidden />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{shop.name}</p>
                        <p className="truncate text-xs text-white/50">{shop.slug}.{DISPLAY_ROOT_DOMAIN}</p>
                      </div>
                    </div>
                    <Link
                      to={shopUrl(shop.slug)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2.5 flex items-center justify-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20"
                    >
                      <ExternalLink size={13} aria-hidden /> Voir la boutique
                    </Link>
                  </div>
                )}
                {impersonation ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuitting(true)
                      void endImpersonation()
                    }}
                    disabled={quitting}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gold-400 transition-colors hover:bg-white/5 hover:text-gold-300 disabled:opacity-60"
                  >
                    <LogOut size={18} aria-hidden />
                    {quitting ? 'Retour…' : 'Quitter le mode support'}
                  </button>
                ) : (
                  <button
                    onClick={() => signOut()}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <LogOut size={18} aria-hidden />
                    Déconnexion
                  </button>
                )}
              </div>
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
      {shop && <AmbianceMigrationDialog shop={shop} />}
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
