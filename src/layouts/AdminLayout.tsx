import { Suspense, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShoppingBag,
  Store,
  Tags,
  Wand2,
} from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { DISPLAY_ROOT_DOMAIN, shopUrl } from '@/lib/tenant'
import { Spinner } from '@/components/ui/Spinner'

const navItems = [
  { to: '/admin', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/admin/produits', label: 'Produits', icon: Package },
  { to: '/admin/categories', label: 'Catégories', icon: Tags },
  { to: '/admin/commandes', label: 'Commandes', icon: ShoppingBag },
  { to: '/admin/personnaliser', label: 'Personnaliser', icon: Wand2 },
  { to: '/admin/facturation', label: 'Facturation', icon: CreditCard },
]

const settingsSections = [
  { to: '/admin/parametres/general', label: 'Général' },
  { to: '/admin/parametres/appearance', label: 'Apparence' },
  { to: '/admin/parametres/contact', label: 'Contact & devise' },
  { to: '/admin/parametres/shipping', label: 'Livraison & stock' },
  { to: '/admin/parametres/compte', label: 'Mon compte' },
]

const SIDEBAR_COLLAPSED_KEY = 'bitiko-admin-sidebar-collapsed'

export function AdminLayout() {
  const { signOut } = useAuth()
  const { data: shop } = useMyShop()
  const location = useLocation()
  const onSettings = location.pathname.startsWith('/admin/parametres')
  const [settingsOpen, setSettingsOpen] = useState(onSettings)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
    } catch {
      return false
    }
  })

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
      } catch {
        // localStorage unavailable (private browsing) — the toggle still works for this session.
      }
      if (next) setSettingsOpen(false)
      return next
    })
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      collapsed ? 'justify-center' : ''
    } ${isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`

  const settingsSubLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
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

  const signOutButton = (
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
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass} title={collapsed ? label : undefined}>
              <Icon size={18} aria-hidden />
              {!collapsed && label}
            </NavLink>
          ))}

          <button
            type="button"
            onClick={() => (collapsed ? undefined : setSettingsOpen((open) => !open))}
            aria-expanded={settingsOpen}
            title={collapsed ? 'Paramètres' : undefined}
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
                  className={`transition-transform ${settingsOpen ? 'rotate-180' : ''}`}
                />
              </>
            )}
          </button>
          {!collapsed && settingsOpen && (
            <div className="ml-4 flex flex-col gap-0.5 border-l border-white/10 pl-3">
              {settingsSections.map(({ to, label }) => (
                <NavLink key={to} to={to} className={settingsSubLinkClass}>
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
          <div className="flex items-center gap-2">
            <LogoMark size={22} />
            <span className="font-heading font-bold text-ink-900">
              {shop?.name ?? 'Bitiko'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {shop && (
              <Link to={shopUrl(shop.slug)} target="_blank" rel="noreferrer" aria-label="Voir la boutique">
                <ExternalLink size={18} className="text-gray-500" />
              </Link>
            )}
            <button onClick={() => signOut()} aria-label="Déconnexion">
              <LogOut size={18} className="text-gray-500" />
            </button>
          </div>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 bg-white px-2 py-2 md:hidden">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <Icon size={15} aria-hidden /> {label}
            </NavLink>
          ))}
          <NavLink
            to="/admin/parametres"
            className={() =>
              `flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
                onSettings ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50'
              }`
            }
          >
            <Settings size={15} aria-hidden /> Paramètres
          </NavLink>
        </nav>
        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Suspense fallback={<Spinner />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
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
