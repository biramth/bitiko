import { Link } from 'react-router-dom'
import { MapPin, MessageCircle, Store } from 'lucide-react'
import type { Shop } from '@/types'
import type { FooterSectionConfig } from '@/types/builder'
import { Logo } from '@/components/ui/Logo'
import { SocialIcon, socialLabel } from '@/components/ui/SocialIcon'
import { resolveTextStyle } from '@/config/textStyle'
import { platformUrl } from '@/lib/tenant'
import { whatsappHref } from '@/utils/format'
import { ensureReadableAccent } from '@/utils/color'
import { useInlineEdit } from '../inline/useInlineEdit'
import { InlineText } from '../inline/InlineText'
import { InlineStyleToolbar } from '../inline/InlineStyleToolbar'

/** The storefront footer. Lives here (not inline in StoreLayout) so it has the
 *  same Renderer/Editor split as every other section, and can switch between
 *  layout presets: `columns` (the original 3-column grid), `centered` (one
 *  centered column) and `minimal` (a single compact row). */
export function FooterRenderer({
  shop,
  footer,
  themeColor,
  showBitikoBranding,
  sectionId,
  editable,
}: {
  shop: Shop | null | undefined
  footer: FooterSectionConfig
  themeColor: string
  showBitikoBranding: boolean
  sectionId: string | undefined
  editable: boolean
}) {
  const patch = useInlineEdit(sectionId)
  const layout = footer.layout ?? 'columns'
  const shopName = shop?.name ?? 'Boutique'
  // Unset, the footer's background derives from the shop's own primary color
  // (itself suggested from the merchant's logo — see the onboarding/settings
  // palette extraction) darkened just enough for white text to stay legible,
  // rather than a fixed navy that has nothing to do with the shop's brand.
  const footerBackground = footer.backgroundColor || ensureReadableAccent(themeColor || '#d9612e', 4.5)
  const defaultCopyright = `© ${new Date().getFullYear()} ${shopName}. Tous droits réservés.`
  const socialLinks = Object.entries(shop?.social_links ?? {}).filter(([, url]) => !!url)
  const showAddress = footer.showAddress && !!shop?.address
  const showWhatsapp = footer.showWhatsapp && !!shop?.whatsapp_number

  const brandMark = (
    <div className="flex items-center gap-2.5 text-lg font-bold" style={{ fontFamily: 'var(--shop-font-heading)' }}>
      {shop?.logo_url ? (
        <img src={shop.logo_url} alt={shopName} className="h-8 w-8 object-cover" style={{ borderRadius: 'var(--shop-radius)' }} />
      ) : (
        <Store size={20} aria-hidden />
      )}
      {shopName}
    </div>
  )

  const socials =
    footer.showSocialLinks && socialLinks.length > 0 ? (
      <div className={`flex gap-3 ${layout === 'centered' ? 'justify-center' : 'mt-4'}`}>
        {socialLinks.map(([platform, url]) => (
          <a
            key={platform}
            href={url}
            target="_blank"
            rel="noreferrer"
            aria-label={socialLabel(platform)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--footer-text)]/10 text-[var(--footer-text)]/70 hover:bg-[var(--footer-text)]/20 hover:text-[var(--footer-text)]"
          >
            <SocialIcon platform={platform} size={15} />
          </a>
        ))}
      </div>
    ) : null

  const contactItems = (
    <>
      {showAddress && (
        <li className="flex items-start gap-2">
          <MapPin size={15} className="mt-0.5 shrink-0 text-[var(--footer-text)]/40" aria-hidden />
          {shop!.address}
        </li>
      )}
      {showWhatsapp && (
        <li>
          <a
            href={whatsappHref(shop!.whatsapp_number!)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 hover:text-[var(--footer-text)]"
          >
            <MessageCircle size={15} className="shrink-0 text-[var(--footer-text)]/40" aria-hidden />
            Écrire sur WhatsApp
          </a>
        </li>
      )}
    </>
  )

  const catalogueCta = (
    <Link
      to="/catalogue"
      style={{ borderRadius: 'var(--shop-radius)' }}
      className="inline-flex items-center gap-1.5 bg-[var(--footer-button)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
    >
      Voir tout le catalogue →
    </Link>
  )

  const branding = showBitikoBranding ? (
    <a href={platformUrl()} className="inline-flex items-center gap-1.5 text-xs text-[var(--footer-text)]/40 hover:text-[var(--footer-text)]/70">
      Propulsé par <Logo size={14} withWordmark={false} /> <span className="font-semibold">Bitiko</span>
    </a>
  ) : null

  const copyright = (
    <InlineStyleToolbar
      editable={editable}
      style={footer.copyrightTextStyle}
      onCommit={(copyrightTextStyle) => patch({ copyrightTextStyle })}
      label="Style du copyright"
    >
      <InlineText
        as="p"
        editable={editable}
        value={footer.copyrightText.trim() || defaultCopyright}
        onCommit={(copyrightText) => patch({ copyrightText })}
        placeholder={defaultCopyright}
        style={resolveTextStyle(footer.copyrightTextStyle)}
        label="Texte de copyright"
      />
    </InlineStyleToolbar>
  )

  const legalLinks = (
    <p className="flex items-center gap-3">
      <a href={`${platformUrl()}/legal/cgu`} className="hover:text-[var(--footer-text)]/70">CGU</a>
      <a href={`${platformUrl()}/legal/confidentialite`} className="hover:text-[var(--footer-text)]/70">Confidentialité</a>
    </p>
  )

  let body: React.ReactNode
  if (layout === 'centered') {
    body = (
      <>
        <div className="mx-auto flex max-w-[var(--shop-content-width)] flex-col items-center gap-6 px-4 py-12 text-center sm:px-6">
          {brandMark}
          {shop?.description && <p className="max-w-md text-sm text-[var(--footer-text)]/50">{shop.description}</p>}
          {socials}
          {(showAddress || showWhatsapp) && (
            <ul className="space-y-2.5 text-sm text-[var(--footer-text)]/80 [&>li]:justify-center">{contactItems}</ul>
          )}
          {catalogueCta}
          {branding}
        </div>
        <div className="flex flex-col items-center gap-2 border-t border-[var(--footer-text)]/10 px-4 py-4 text-center text-xs text-[var(--footer-text)]/40">
          {copyright}
          {legalLinks}
        </div>
      </>
    )
  } else if (layout === 'minimal') {
    body = (
      <div className="mx-auto flex max-w-[var(--shop-content-width)] flex-col gap-4 px-4 py-6 text-xs text-[var(--footer-text)]/40 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="text-[var(--footer-text)]">{brandMark}</div>
          {copyright}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {catalogueCta}
          {branding}
          {legalLinks}
        </div>
      </div>
    )
  } else {
    body = (
      <>
        <div className="mx-auto grid max-w-[var(--shop-content-width)] gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
          <div>
            {brandMark}
            {shop?.description && <p className="mt-3 max-w-xs text-sm text-[var(--footer-text)]/50">{shop.description}</p>}
            {socials}
          </div>

          {(showAddress || showWhatsapp) && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--footer-text)]/50">Nous contacter</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-[var(--footer-text)]/80">{contactItems}</ul>
            </div>
          )}

          <div className="flex flex-col justify-between gap-6 md:items-end">
            <div className="md:self-end">{catalogueCta}</div>
            {branding}
          </div>
        </div>
        <div className="flex flex-col items-center gap-2 border-t border-[var(--footer-text)]/10 py-4 text-center text-xs text-[var(--footer-text)]/40 sm:flex-row sm:justify-between sm:px-4">
          {copyright}
          {legalLinks}
        </div>
      </>
    )
  }

  return (
    <footer
      className="text-[var(--footer-text)]"
      style={{
        backgroundColor: footerBackground,
        '--footer-text': footer.textColor || '#fffbf5',
        '--footer-button': footer.buttonColor || 'var(--shop-button)',
      } as React.CSSProperties}
    >
      {body}
    </footer>
  )
}
