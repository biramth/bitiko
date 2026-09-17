import { Suspense, useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { MapPin, Menu, MessageCircle, ShoppingCart, Store, X } from 'lucide-react'
import { useCart } from '@/features/cart/CartContext'
import { useTenant } from '@/features/tenant/TenantContext'
import { useEffectiveShopConfig } from '@/features/store-builder/useEffectiveShopConfig'
import { CORE_SECTION_REGISTRY } from '@/features/store-builder/sectionRegistry'
import { PREVIEW_NAV, PREVIEW_SELECT } from '@/features/store-builder/previewBridge'
import { useShopPlan } from '@/features/billing/useShopPlan'
import { themeConfigToCssVars } from '@/config/themeTokens'
import { useShopFavicon } from '@/hooks/usePageSeo'
import { Logo } from '@/components/ui/Logo'
import { PageLoader } from '@/components/ui/PageLoader'
import { SocialIcon, socialLabel } from '@/components/ui/SocialIcon'
import { platformUrl } from '@/lib/tenant'
import { whatsappHref } from '@/utils/format'
import type { FooterSectionConfig, HeaderSectionConfig } from '@/types/builder'

const DEFAULT_HEADER: HeaderSectionConfig = { showLogo: true, showCatalogLink: true, showContactLink: false, sticky: true, menu: [] }
const DEFAULT_FOOTER: FooterSectionConfig = {
  showContact: true,
  showAddress: true,
  showWhatsapp: true,
  showSocialLinks: true,
  copyrightText: '',
  hideBitikoBranding: false,
}

/** While embedded in the builder, tells the parent which page the preview has
 *  just navigated to, so the editor can switch to the matching template
 *  ("suivre la page" behavior). */
function PreviewNavPing({ enabled }: { enabled: boolean }) {
  const location = useLocation()
  useEffect(() => {
    if (!enabled) return
    window.parent?.postMessage({ type: PREVIEW_NAV, path: location.pathname }, '*')
  }, [location.pathname, enabled])
  return null
}

/** In builder preview mode, wraps header/footer with a click-to-select handler
 * so the merchant can target them from the live preview, like body sections. */
function PreviewClickTarget({
  enabled,
  sectionId,
  label,
  children,
}: {
  enabled: boolean
  sectionId: string | undefined
  label: string
  children: React.ReactNode
}) {
  if (!enabled) return <>{children}</>
  return (
    <div
      data-preview-section
      onClick={(e) => {
        e.stopPropagation()
        if (sectionId) window.parent?.postMessage({ type: PREVIEW_SELECT, sectionId }, '*')
      }}
      className="preview-section group relative cursor-pointer"
    >
      {children}
      <span className="pointer-events-none absolute left-2 top-2 z-20 rounded-md bg-brand-600/90 px-1.5 py-0.5 text-[10px] font-semibold text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
        {label}
      </span>
    </div>
  )
}

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

export function StoreLayout() {
  const { itemCount } = useCart()
  const { shop } = useTenant()
  const { themeColor, themeConfig, headerSection, footerSection, isDraftPreview } = useEffectiveShopConfig(shop)
  const { planKey } = useShopPlan(shop?.id)
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  // Close the mobile menu on navigation — adjusted during render (React's
  // documented pattern for resetting state when a prop/value changes)
  // rather than in an effect, so it takes effect before the new page paints.
  const [lastPathname, setLastPathname] = useState(location.pathname)
  if (location.pathname !== lastPathname) {
    setLastPathname(location.pathname)
    setMobileMenuOpen(false)
  }
  const shopName = shop?.name ?? 'Boutique'
  const header = (headerSection?.config as HeaderSectionConfig | undefined) ?? DEFAULT_HEADER
  const footer = (footerSection?.config as FooterSectionConfig | undefined) ?? DEFAULT_FOOTER
  const socialLinks = Object.entries(shop?.social_links ?? {}).filter(([, url]) => !!url)
  const showBitikoBranding = !(planKey === 'pro' && footer.hideBitikoBranding)
  const isEmbeddedPreview = isDraftPreview && typeof window !== 'undefined' && window.parent !== window
  const navLinks = resolveHeaderNavLinks(header, shop)
  // With the stock header (logo + Catalogue), nav links render as prominent
  // CTA buttons so shopping is the obvious next step; with a custom menu the
  // merchant's own list keeps the classic link style.
  const usesCustomMenu = (header.menu?.length ?? 0) > 0
  const nativeLinkClass = 'text-xs font-semibold uppercase tracking-widest text-[var(--shop-text)] transition-opacity hover:opacity-60'
  const ctaLinkClass = 'inline-flex items-center rounded-lg bg-[var(--shop-button)] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90'
  const ghostLinkClass = 'inline-flex items-center rounded-lg border border-ink-900/15 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[var(--shop-text)] transition-colors hover:border-ink-900/40'

  useShopFavicon(shop?.logo_url)

  return (
    <div
      className="flex min-h-screen flex-col bg-[var(--shop-bg)] text-[var(--shop-text)]"
      style={{ ...themeConfigToCssVars(themeColor, themeConfig), fontFamily: 'var(--shop-font-body)' } as React.CSSProperties}
    >
      <PreviewNavPing enabled={isEmbeddedPreview} />
      <PreviewClickTarget enabled={isEmbeddedPreview} sectionId={headerSection?.id} label={CORE_SECTION_REGISTRY.header.label}>
        <header className={`${header.sticky ? 'sticky top-0' : ''} z-20 border-b border-ink-900/10 bg-[var(--shop-bg)]/95 backdrop-blur`}>
        <div className="mx-auto flex max-w-[var(--shop-content-width)] items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2.5 font-bold tracking-tight text-[var(--shop-text)]" style={{ fontFamily: 'var(--shop-font-heading)' }}>
            {header.showLogo && shop?.logo_url ? (
              <img src={shop.logo_url} alt={shopName} className="h-8 w-8 shrink-0 object-cover" style={{ borderRadius: 'var(--shop-radius)' }} />
            ) : header.showLogo ? (
              <Store size={20} className="shrink-0" aria-hidden />
            ) : null}
            <span className="truncate text-base sm:text-lg">{shopName}</span>
          </Link>
          <div className="flex shrink-0 items-center gap-4 sm:gap-7">
            {navLinks.length > 0 && (
              <nav className="hidden items-center gap-5 sm:flex sm:gap-7">
                {navLinks.map((link) =>
                  link.external ? (
                    <a
                      key={link.key}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className={usesCustomMenu ? nativeLinkClass : ghostLinkClass}
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      key={link.key}
                      to={link.href}
                      className={usesCustomMenu ? nativeLinkClass : ctaLinkClass}
                    >
                      {link.label}
                    </Link>
                  ),
                )}
              </nav>
            )}
            {navLinks.length > 0 && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen((open) => !open)}
                aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
                aria-expanded={mobileMenuOpen}
                className="flex items-center text-[var(--shop-text)] sm:hidden"
              >
                {mobileMenuOpen ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
              </button>
            )}
            <Link
              to="/panier"
              className="relative flex items-center text-[var(--shop-text)] transition-opacity hover:opacity-60"
              aria-label={`Panier, ${itemCount} article${itemCount > 1 ? 's' : ''}`}
            >
              <ShoppingCart size={22} aria-hidden strokeWidth={1.5} />
              {itemCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--shop-accent)] px-1 text-[10px] font-bold text-white">
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
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
                  className={usesCustomMenu ? "block px-1 py-2.5 text-sm font-semibold uppercase tracking-widest text-[var(--shop-text)] hover:opacity-60" : "mt-2 block rounded-lg border border-ink-900/15 px-4 py-2.5 text-center text-sm font-semibold uppercase tracking-widest text-[var(--shop-text)] hover:border-ink-900/40"}
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.key}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={usesCustomMenu ? "block px-1 py-2.5 text-sm font-semibold uppercase tracking-widest text-[var(--shop-text)] hover:opacity-60" : "mt-2 block rounded-lg bg-[var(--shop-button)] px-4 py-2.5 text-center text-sm font-semibold uppercase tracking-widest text-white"}
                >
                  {link.label}
                </Link>
              ),
            )}
          </nav>
        )}
      </header>
      </PreviewClickTarget>

      <main className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>

      <PreviewClickTarget enabled={isEmbeddedPreview} sectionId={footerSection?.id} label={CORE_SECTION_REGISTRY.footer.label}>
        <footer className="bg-ink-900 text-sand-50">
        <div className="mx-auto grid max-w-[var(--shop-content-width)] gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2.5 text-lg font-bold text-white" style={{ fontFamily: 'var(--shop-font-heading)' }}>
              {shop?.logo_url ? (
                <img src={shop.logo_url} alt={shopName} className="h-8 w-8 object-cover" style={{ borderRadius: 'var(--shop-radius)' }} />
              ) : (
                <Store size={20} aria-hidden />
              )}
              {shopName}
            </div>
            {shop?.description && (
              <p className="mt-3 max-w-xs text-sm text-sand-50/50">{shop.description}</p>
            )}
            {footer.showSocialLinks && socialLinks.length > 0 && (
              <div className="mt-4 flex gap-3">
                {socialLinks.map(([platform, url]) => (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={socialLabel(platform)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sand-50/70 hover:bg-white/20 hover:text-white"
                  >
                    <SocialIcon platform={platform} size={15} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {((footer.showAddress && shop?.address) || (footer.showWhatsapp && shop?.whatsapp_number)) && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-sand-50/50">Nous contacter</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-sand-50/80">
                {footer.showAddress && shop?.address && (
                  <li className="flex items-start gap-2">
                    <MapPin size={15} className="mt-0.5 shrink-0 text-sand-50/40" aria-hidden />
                    {shop.address}
                  </li>
                )}
                {footer.showWhatsapp && shop?.whatsapp_number && (
                  <li>
                    <a
                      href={whatsappHref(shop.whatsapp_number)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 hover:text-white"
                    >
                      <MessageCircle size={15} className="shrink-0 text-sand-50/40" aria-hidden />
                      Écrire sur WhatsApp
                    </a>
                  </li>
                )}
              </ul>
            </div>
          )}

          <div className="flex flex-col justify-between gap-6 md:items-end">
            <Link to="/catalogue" className="text-sm font-medium text-sand-50/80 hover:text-white md:self-end">
              Voir tout le catalogue →
            </Link>
            {showBitikoBranding && (
              <a href={platformUrl()} className="inline-flex items-center gap-1.5 text-xs text-sand-50/40 hover:text-sand-50/70">
                Propulsé par <Logo size={14} withWordmark={false} /> <span className="font-semibold">Bitiko</span>
              </a>
            )}
          </div>
        </div>
        <div className="flex flex-col items-center gap-2 border-t border-white/10 py-4 text-center text-xs text-sand-50/40 sm:flex-row sm:justify-between sm:px-4">
          <p>{footer.copyrightText.trim() || `© ${new Date().getFullYear()} ${shopName}. Tous droits réservés.`}</p>
          <p className="flex items-center gap-3">
            <a href={`${platformUrl()}/legal/cgu`} className="hover:text-sand-50/70">CGU</a>
            <a href={`${platformUrl()}/legal/confidentialite`} className="hover:text-sand-50/70">Confidentialité</a>
          </p>
        </div>
      </footer>
      </PreviewClickTarget>
    </div>
  )
}
