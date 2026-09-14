import { Link, Outlet } from 'react-router-dom'
import { ShoppingCart, Store } from 'lucide-react'
import { useCart } from '@/features/cart/CartContext'
import { useTenant } from '@/features/tenant/TenantContext'
import { Logo } from '@/components/ui/Logo'
import { platformUrl } from '@/lib/tenant'

export function StoreLayout() {
  const { itemCount } = useCart()
  const { shop } = useTenant()
  const shopName = shop?.name ?? 'Boutique'

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold text-gray-900">
            {shop?.logo_url ? (
              <img src={shop.logo_url} alt={shopName} className="h-7 w-7 rounded object-cover" />
            ) : (
              <Store size={22} className="text-brand-600" aria-hidden />
            )}
            <span>{shopName}</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              to="/catalogue"
              className="hidden text-sm font-medium text-gray-600 hover:text-gray-900 sm:block"
            >
              Catalogue
            </Link>
            <Link
              to="/panier"
              className="relative flex items-center gap-2 rounded-full border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              aria-label={`Panier, ${itemCount} article${itemCount > 1 ? 's' : ''}`}
            >
              <ShoppingCart size={18} aria-hidden />
              {itemCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-xs font-semibold text-white">
                  {itemCount}
                </span>
              )}
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-gray-200 py-8 text-center text-sm text-gray-500">
        <p>
          © {new Date().getFullYear()} {shopName}. Tous droits réservés.
        </p>
        <a
          href={platformUrl()}
          className="mt-2 inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600"
        >
          Propulsé par <Logo size={14} withWordmark={false} /> <span className="font-semibold">Bitiko</span>
        </a>
      </footer>
    </div>
  )
}
