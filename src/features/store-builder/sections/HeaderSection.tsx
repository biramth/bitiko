import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, Plus, ShoppingCart, Store, Trash2, X } from 'lucide-react'
import type { Shop } from '@/types'
import type { HeaderSectionConfig, NavigationLink } from '@/types/builder'
import { useCart } from '@/features/cart/CartContext'
import { whatsappHref } from '@/utils/format'
import { useInlineEdit } from '../inline/useInlineEdit'
import { InlineText } from '../inline/InlineText'
import { InlineLinkPopover } from '../inline/InlineLinkPopover'

/** Resolves the header's nav links once so the desktop bar and the mobile
 *  menu panel render from the exact same source instead of duplicating the
 *  custom-menu-vs-catalogue/contact logic. */
function resolveHeaderNavLinks(
  header: HeaderSectionConfig,
  shop: { whatsapp_number: string | null } | null | undefined,
): { key: string; label: string; href: string; external: boolean }[] {
  if ((header.menu?.length ?? 0) > 0) {
    return header.menu!.map((link) => ({
      key: link.href + link.label,
      label: link.label,
      href: link.href,
      external: /^https?:\/\//.test(link.href),
    }))
  }
  const links: { key: string; label: string; href: string; external: boolean }[] = []
  if (header.showCatalogLink) links.push({ key: 'catalogue', label: 'Catalogue', href: '/catalogue', external: false })
  if (header.showContactLink && shop?.whatsapp_number) {
    links.push({ key: 'contact', label: 'Contact', href: whatsappHref(shop.whatsapp_number), external: true })
  }
  return links
}

const nativeLinkClass = 'text-xs font-semibold uppercase tracking-widest text-[var(--shop-text)] transition-opacity hover:opacity-60'
const ctaLinkClass = 'inline-flex items-center rounded-lg bg-[var(--shop-button)] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[var(--shop-button-text)] transition-opacity hover:opacity-90'
const ghostLinkClass = 'inline-flex items-center rounded-lg border border-[var(--shop-secondary-button-text)]/20 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[var(--shop-secondary-button-text)] transition-colors hover:border-[var(--shop-secondary-button-text)]/50'

/** The storefront header. Layout presets: `left-logo` (original: logo left,
 *  links + cart right), `centered-logo` (logo centered, links in a row below)
 *  and `split` (links left, logo centered, cart right). */
export function HeaderRenderer({
  shop,
  header,
  sectionId,
  editable,
}: {
  shop: Shop | null | undefined
  header: HeaderSectionConfig
  sectionId: string | undefined
  editable: boolean
}) {
  const { itemCount } = useCart()
  const location = useLocation()
  const patch = useInlineEdit(sectionId)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  // Close the mobile menu on navigation — adjusted during render (React's
  // documented pattern for resetting state when a value changes) rather than
  // in an effect, so it takes effect before the new page paints.
  const [lastPathname, setLastPathname] = useState(location.pathname)
  if (location.pathname !== lastPathname) {
    setLastPathname(location.pathname)
    setMobileMenuOpen(false)
  }

  const layout = header.layout ?? 'left-logo'
  const shopName = shop?.name ?? 'Boutique'
  const navLinks = resolveHeaderNavLinks(header, shop)
  // With the stock header (logo + Catalogue), nav links render as prominent
  // CTA buttons so shopping is the obvious next step; with a custom menu the
  // merchant's own list keeps the classic link style.
  const usesCustomMenu = (header.menu?.length ?? 0) > 0
  const setMenu = (menu: NavigationLink[]) => patch({ menu })
  const hasNav = navLinks.length > 0 || (editable && usesCustomMenu)

  const logo = (
    <Link to="/" className="flex min-w-0 items-center gap-2.5 font-bold tracking-tight text-[var(--shop-text)]" style={{ fontFamily: 'var(--shop-font-heading)' }}>
      {header.showLogo && shop?.logo_url ? (
        <img src={shop.logo_url} alt={shopName} className="h-8 w-8 shrink-0 object-cover" style={{ borderRadius: 'var(--shop-radius)' }} />
      ) : header.showLogo ? (
        <Store size={20} className="shrink-0" aria-hidden />
      ) : null}
      <span className="truncate text-base sm:text-lg">{shopName}</span>
    </Link>
  )

  const navItems = editable && usesCustomMenu
    ? header.menu!.map((link, index) => (
        <div key={index} className="group/navlink relative flex items-center gap-1">
          <InlineLinkPopover
            url={link.href}
            onCommit={(href) => setMenu(header.menu!.map((l, i) => (i === index ? { ...l, href } : l)))}
            editable
            fieldLabel="Lien de navigation"
          >
            <InlineText
              editable
              value={link.label}
              onCommit={(label) => setMenu(header.menu!.map((l, i) => (i === index ? { ...l, label } : l)))}
              placeholder="Lien"
              className={nativeLinkClass}
              label="Libellé du lien"
            />
          </InlineLinkPopover>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setMenu(header.menu!.filter((_, i) => i !== index))
            }}
            aria-label="Supprimer ce lien"
            className="shrink-0 text-[var(--shop-text)]/40 opacity-0 transition-opacity group-hover/navlink:opacity-100 hover:text-red-600"
          >
            <Trash2 size={12} aria-hidden />
          </button>
        </div>
      ))
    : navLinks.map((link) =>
        link.external ? (
          <a key={link.key} href={link.href} target="_blank" rel="noreferrer" className={usesCustomMenu ? nativeLinkClass : ghostLinkClass}>
            {link.label}
          </a>
        ) : (
          <Link key={link.key} to={link.href} className={usesCustomMenu ? nativeLinkClass : ctaLinkClass}>
            {link.label}
          </Link>
        ),
      )

  const addLinkButton = editable && (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setMenu([...(header.menu ?? []), { label: 'Nouveau lien', href: '/catalogue' }])
      }}
      className="flex shrink-0 items-center gap-1 text-xs font-semibold uppercase tracking-widest text-[var(--shop-text)]/40 transition-opacity hover:text-[var(--shop-text)]"
    >
      <Plus size={13} aria-hidden /> Lien
    </button>
  )

  const desktopNav = hasNav ? (
    <nav className={`hidden items-center gap-5 sm:flex sm:gap-7 ${layout === 'centered-logo' ? 'justify-center' : ''}`}>
      {navItems}
      {addLinkButton}
    </nav>
  ) : null

  const menuButton =
    navLinks.length > 0 ? (
      <button
        type="button"
        onClick={() => setMobileMenuOpen((open) => !open)}
        aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
        aria-expanded={mobileMenuOpen}
        className="flex items-center -m-2 p-2 text-[var(--shop-text)] sm:hidden"
      >
        {mobileMenuOpen ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
      </button>
    ) : null

  const cart = (
    <Link
      to="/panier"
      className="relative -m-2 flex items-center p-2 text-[var(--shop-text)] transition-opacity hover:opacity-60"
      aria-label={`Panier, ${itemCount} article${itemCount > 1 ? 's' : ''}`}
    >
      <ShoppingCart size={22} aria-hidden strokeWidth={1.5} />
      {itemCount > 0 && (
        <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--shop-accent)] px-1 text-[10px] font-bold text-[var(--shop-tertiary-button-text)]">
          {itemCount}
        </span>
      )}
    </Link>
  )

  const rowClass = 'mx-auto max-w-[var(--shop-content-width)] px-4 py-4 sm:px-6'
  let bar: React.ReactNode
  if (layout === 'centered-logo') {
    bar = (
      <div className={rowClass}>
        <div className="relative flex items-center justify-center">
          <div className="absolute left-0 flex items-center">{menuButton}</div>
          {logo}
          <div className="absolute right-0 flex items-center">{cart}</div>
        </div>
        {desktopNav && <div className="mt-3">{desktopNav}</div>}
      </div>
    )
  } else if (layout === 'split') {
    bar = (
      <div className={`${rowClass} grid grid-cols-[1fr_auto_1fr] items-center gap-3`}>
        <div className="flex items-center">
          {menuButton}
          {desktopNav}
        </div>
        {logo}
        <div className="flex items-center justify-end">{cart}</div>
      </div>
    )
  } else {
    bar = (
      <div className={`${rowClass} flex items-center justify-between gap-3`}>
        {logo}
        <div className="flex shrink-0 items-center gap-4 sm:gap-7">
          {desktopNav}
          {menuButton}
          {cart}
        </div>
      </div>
    )
  }

  return (
    <header className={`${header.sticky ? 'sticky top-0' : ''} z-20 border-b border-ink-900/10 bg-[var(--shop-bg)]/95 backdrop-blur`}>
      {bar}
      {mobileMenuOpen && navLinks.length > 0 && (
        <nav className="border-t border-ink-900/10 px-4 py-2 sm:hidden">
          {navLinks.map((link) =>
            link.external ? (
              <a
                key={link.key}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className={usesCustomMenu ? 'block px-1 py-2.5 text-sm font-semibold uppercase tracking-widest text-[var(--shop-text)] hover:opacity-60' : 'mt-2 block rounded-lg border border-ink-900/15 px-4 py-2.5 text-center text-sm font-semibold uppercase tracking-widest text-[var(--shop-text)] hover:border-ink-900/40'}
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.key}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={usesCustomMenu ? 'block px-1 py-2.5 text-sm font-semibold uppercase tracking-widest text-[var(--shop-text)] hover:opacity-60' : 'mt-2 block rounded-lg bg-[var(--shop-button)] px-4 py-2.5 text-center text-sm font-semibold uppercase tracking-widest text-[var(--shop-button-text)]'}
              >
                {link.label}
              </Link>
            ),
          )}
          <Link
            to="/compte"
            onClick={() => setMobileMenuOpen(false)}
            className="mt-2 block rounded-lg border border-ink-900/15 px-4 py-2.5 text-center text-sm font-semibold uppercase tracking-widest text-[var(--shop-text)]/70 hover:border-ink-900/40"
          >
            Mon compte
          </Link>
        </nav>
      )}
    </header>
  )
}
