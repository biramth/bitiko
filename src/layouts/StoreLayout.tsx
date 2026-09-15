import { Suspense, useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Globe, MapPin, MessageCircle, ShoppingCart, Store } from 'lucide-react'
import { useCart } from '@/features/cart/CartContext'
import { useTenant } from '@/features/tenant/TenantContext'
import { useEffectiveShopConfig } from '@/features/store-builder/useEffectiveShopConfig'
import { SECTION_REGISTRY } from '@/features/store-builder/sectionRegistry'
import { PREVIEW_NAV, PREVIEW_SELECT } from '@/features/store-builder/previewBridge'
import { useShopPlan } from '@/features/billing/useShopPlan'
import { themeConfigToCssVars } from '@/config/themeTokens'
import { Logo } from '@/components/ui/Logo'
import { Spinner } from '@/components/ui/Spinner'
import { platformUrl } from '@/lib/tenant'
import { whatsappHref } from '@/utils/format'
import type { FooterSectionConfig, HeaderSectionConfig } from '@/types/builder'

const DEFAULT_HEADER: HeaderSectionConfig = { showLogo: true, showCatalogLink: true, showContactLink: true, sticky: true, menu: [] }
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

export function StoreLayout() {
  const { itemCount } = useCart()
  const { shop } = useTenant()
  const { themeColor, themeConfig, headerSection, footerSection, isDraftPreview } = useEffectiveShopConfig(shop)
  const { planKey } = useShopPlan(shop?.id)
  const shopName = shop?.name ?? 'Boutique'
  const header = (headerSection?.config as HeaderSectionConfig | undefined) ?? DEFAULT_HEADER
  const footer = (footerSection?.config as FooterSectionConfig | undefined) ?? DEFAULT_FOOTER
  const socialLinks = Object.entries(shop?.social_links ?? {}).filter(([, url]) => !!url)
  const showBitikoBranding = !(planKey === 'pro' && footer.hideBitikoBranding)
  const isEmbeddedPreview = isDraftPreview && typeof window !== 'undefined' && window.parent !== window

  return (
    <div
      className="flex min-h-screen flex-col bg-[var(--shop-bg)] text-[var(--shop-text)]"
      style={{ ...themeConfigToCssVars(themeColor, themeConfig), fontFamily: 'var(--shop-font-body)' } as React.CSSProperties}
    >
      <PreviewNavPing enabled={isEmbeddedPreview} />
      <PreviewClickTarget enabled={isEmbeddedPreview} sectionId={headerSection?.id} label={SECTION_REGISTRY.header.label}>
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
          <nav className="flex shrink-0 items-center gap-5 sm:gap-7">
            {(header.menu?.length ?? 0) > 0
              ? header.menu!.map((link) => {
                  const isExternal = /^https?:\/\//.test(link.href)
                  const className = 'hidden text-xs font-semibold uppercase tracking-widest text-[var(--shop-text)] transition-opacity hover:opacity-60 sm:block'
                  if (isExternal) {
                    return (
                      <a key={link.href + link.label} href={link.href} target="_blank" rel="noreferrer" className={className}>
                        {link.label}
                      </a>
                    )
                  }
                  return (
                    <Link key={link.href + link.label} to={link.href} className={className}>
                      {link.label}
                    </Link>
                  )
                })
              : <>
                {header.showCatalogLink && (
                  <Link to="/catalogue" className="hidden text-xs font-semibold uppercase tracking-widest text-[var(--shop-text)] transition-opacity hover:opacity-60 sm:block">
                    Catalogue
                  </Link>
                )}
                {header.showContactLink && shop?.whatsapp_number && (
                  <a href={whatsappHref(shop.whatsapp_number)} target="_blank" rel="noreferrer" className="hidden items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--shop-text)] transition-opacity hover:opacity-60 md:flex">
                    Contact
                  </a>
                )}
              </>
            }
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
          </nav>
        </div>
      </header>
      </PreviewClickTarget>

      <main className="flex-1">
        <Suspense fallback={<Spinner />}>
          <Outlet />
        </Suspense>
      </main>

      <PreviewClickTarget enabled={isEmbeddedPreview} sectionId={footerSection?.id} label={SECTION_REGISTRY.footer.label}>
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
                    aria-label={platform}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sand-50/70 hover:bg-white/20 hover:text-white"
                  >
                    <Globe size={15} aria-hidden />
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
        <p className="border-t border-white/10 py-4 text-center text-xs text-sand-50/40">
          {footer.copyrightText.trim() || `© ${new Date().getFullYear()} ${shopName}. Tous droits réservés.`}
        </p>
      </footer>
      </PreviewClickTarget>
    </div>
  )
}
