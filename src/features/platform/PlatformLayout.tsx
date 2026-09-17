import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  ShieldCheck,
  Store,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { can, roleLabel, type PlatformCapability } from '@/features/platform/permissions'
import { usePlatformRole } from '@/features/platform/usePlatformRole'

interface Tool {
  to: string
  label: string
  icon: LucideIcon
  capability: PlatformCapability
  end?: boolean
}

/**
 * The platform workspace. Deliberately separate from AdminLayout: a team
 * member (marketing, dev) may not even own a shop, so RequireShop would be
 * wrong here. Each tool is gated by the member's capability and lives on its
 * own route — this is a real back-office, not tabs on a single page.
 */
const TOOLS: Tool[] = [
  { to: '/plateforme', label: "Vue d'ensemble", icon: LayoutDashboard, capability: 'view_analytics', end: true },
  { to: '/plateforme/analytiques', label: 'Analytiques', icon: BarChart3, capability: 'view_analytics' },
  { to: '/plateforme/boutiques', label: 'Boutiques', icon: Store, capability: 'view_shops' },
  { to: '/plateforme/paiements', label: 'Paiements', icon: CreditCard, capability: 'manage_payments' },
  { to: '/plateforme/campagnes', label: 'Campagnes', icon: Mail, capability: 'send_campaigns' },
  { to: '/plateforme/equipe', label: 'Équipe', icon: Users, capability: 'manage_team' },
]

function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="40" height="40" rx="10" fill="#fff" fillOpacity="0.12" />
      <circle cx="28.5" cy="10.5" r="3" fill="#f2b705" />
      <path d="M20 9 L31 27 H9 Z" fill="#d9612e" />
      <rect x="13" y="25" width="14" height="5" rx="1.5" fill="#fdf3e7" />
    </svg>
  )
}

export function PlatformLayout() {
  const { signOut } = useAuth()
  const { data: role } = usePlatformRole()
  const { data: shop } = useMyShop()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close the drawer whenever the route changes — adjusted during render
  // (rather than via an effect) so it doesn't trigger a cascading render.
  const [prevPath, setPrevPath] = useState(location.pathname)
  if (location.pathname !== prevPath) {
    setPrevPath(location.pathname)
    if (mobileOpen) setMobileOpen(false)
  }

  const tools = TOOLS.filter((tool) => can(role, tool.capability))

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
    }`

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 py-5 text-white">
        <LogoMark />
        <div>
          <span className="block font-heading text-lg font-bold leading-tight tracking-tight text-white">Bitiko</span>
          <span className="block text-[11px] font-medium uppercase tracking-wider text-white/40">Espace plateforme</span>
        </div>
      </div>

      <div className="mx-3 mb-2 rounded-xl bg-white/5 p-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
            <ShieldCheck size={16} className="text-gold-400" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{roleLabel(role)}</p>
            <p className="truncate text-xs text-white/50">{shop ? shop.name : 'Équipe Bitiko'}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Outils plateforme">
        {tools.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={navClass}>
            <Icon size={18} aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-1 border-t border-white/10 px-3 py-3">
        {shop && (
          <Link to="/admin" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white">
            <Store size={18} aria-hidden />
            Ma boutique
          </Link>
        )}
        <button
          type="button"
          onClick={() => signOut()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut size={18} aria-hidden />
          Déconnexion
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto bg-ink-900 md:block">{sidebar}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="relative z-50 h-full w-64 overflow-y-auto bg-ink-900">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
            aria-label="Ouvrir le menu"
          >
            <Menu size={20} aria-hidden />
          </button>
          <span className="font-heading font-semibold text-gray-900">Espace plateforme</span>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="ml-auto rounded-lg p-2 text-gray-400"
            aria-hidden
            tabIndex={-1}
          >
            <X size={18} />
          </button>
        </header>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
