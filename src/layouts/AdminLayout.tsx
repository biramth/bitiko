import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  Tags,
  ShoppingBag,
  Settings,
  LogOut,
  Store,
} from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'

const navItems = [
  { to: '/admin', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/admin/produits', label: 'Produits', icon: Package },
  { to: '/admin/categories', label: 'Catégories', icon: Tags },
  { to: '/admin/commandes', label: 'Commandes', icon: ShoppingBag },
  { to: '/admin/parametres', label: 'Paramètres', icon: Settings },
]

export function AdminLayout() {
  const { signOut } = useAuth()

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
    }`

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white p-4 md:flex md:flex-col">
        <div className="mb-6 flex items-center gap-2 px-2 font-semibold text-gray-900">
          <Store size={20} className="text-brand-600" aria-hidden />
          <span>Espace boutique</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass}>
              <Icon size={18} aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        >
          <LogOut size={18} aria-hidden />
          Déconnexion
        </button>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:hidden">
          <span className="font-semibold text-gray-900">Espace boutique</span>
          <button onClick={() => signOut()} aria-label="Déconnexion">
            <LogOut size={20} className="text-gray-600" />
          </button>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 bg-white px-2 py-2 md:hidden">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass}>
              <Icon size={16} aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
