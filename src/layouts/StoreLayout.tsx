import { Suspense, useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { useTenant } from '@/features/tenant/TenantContext'
import { useEffectiveShopConfig } from '@/features/store-builder/useEffectiveShopConfig'
import { CORE_SECTION_REGISTRY } from '@/features/store-builder/sectionRegistry'
import { PREVIEW_NAV, PREVIEW_SELECT } from '@/features/store-builder/previewBridge'
import { useInlineEdit } from '@/features/store-builder/inline/useInlineEdit'
import { InlineText } from '@/features/store-builder/inline/InlineText'
import { InlineLinkPopover } from '@/features/store-builder/inline/InlineLinkPopover'
import { InlineStyleToolbar } from '@/features/store-builder/inline/InlineStyleToolbar'
import { HeaderRenderer } from '@/features/store-builder/sections/HeaderSection'
import { FooterRenderer } from '@/features/store-builder/sections/FooterSection'
import { useShopPlan } from '@/features/billing/useShopPlan'
import { themeConfigToCssVars } from '@/config/themeTokens'
import { resolveTextStyle } from '@/config/textStyle'
import { useShopFavicon } from '@/hooks/usePageSeo'
import { PageLoader } from '@/components/ui/PageLoader'
import type { AnnouncementBarSectionConfig, FooterSectionConfig, HeaderSectionConfig } from '@/types/builder'

const DEFAULT_ANNOUNCEMENT: AnnouncementBarSectionConfig = { message: '', linkLabel: '', linkUrl: '', dismissible: true }
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

const ANNOUNCEMENT_DISMISS_KEY_PREFIX = 'bitiko:announcement-dismissed'

/** Persists the dismissed message per shop in localStorage — a per-visitor
 *  preference, not shop data — so changing the message brings the bar back
 *  even for someone who dismissed a previous one on this device. */
function useAnnouncementDismissed(shopId: string | undefined, message: string) {
  const storageKey = shopId ? `${ANNOUNCEMENT_DISMISS_KEY_PREFIX}:${shopId}` : null
  const [dismissedMessage, setDismissedMessage] = useState<string | null>(() => {
    if (!storageKey || typeof window === 'undefined') return null
    try {
      return window.localStorage.getItem(storageKey)
    } catch {
      return null
    }
  })
  const dismiss = () => {
    if (!storageKey) return
    setDismissedMessage(message)
    try {
      window.localStorage.setItem(storageKey, message)
    } catch {
      // Private browsing / full quota — dismissal just won't survive a reload.
    }
  }
  return { isDismissed: dismissedMessage === message, dismiss }
}

function isExternalUrl(url: string) {
  return /^https?:\/\//i.test(url)
}

function AnnouncementBar({
  shopId,
  sectionId,
  config,
  editable,
}: {
  shopId: string | undefined
  sectionId: string | undefined
  config: AnnouncementBarSectionConfig
  editable: boolean
}) {
  const { isDismissed, dismiss } = useAnnouncementDismissed(shopId, config.message)
  const patch = useInlineEdit(sectionId)
  // In the builder, an empty bar still needs to render so there's something
  // to click into and type a first message — customers never see this case
  // since editable is false on the real storefront.
  if ((!config.message.trim() || isDismissed) && !editable) return null

  const pill = config.layout === 'pill'
  const hasLink = editable ? config.linkLabel.trim() || config.linkUrl.trim() : config.linkLabel.trim() && config.linkUrl.trim()
  const linkStyle = resolveTextStyle(config.linkLabelStyle)

  const content = (
    <>
      <InlineStyleToolbar editable={editable} display="inline" style={config.messageStyle} onCommit={(messageStyle) => patch({ messageStyle })} label="Style du message">
        <InlineText
          editable={editable}
          value={config.message}
          onCommit={(message) => patch({ message })}
          placeholder="Écrivez votre annonce…"
          style={resolveTextStyle(config.messageStyle)}
          label="Message de l'annonce"
        />
      </InlineStyleToolbar>
      {hasLink &&
        (editable ? (
          <InlineLinkPopover url={config.linkUrl} onCommit={(linkUrl) => patch({ linkUrl })} editable fieldLabel="Lien de l'annonce">
            <InlineStyleToolbar editable display="inline" corner="bottom-right" style={config.linkLabelStyle} onCommit={(linkLabelStyle) => patch({ linkLabelStyle })} label="Style du lien">
              <InlineText
                as="span"
                editable
                value={config.linkLabel}
                onCommit={(linkLabel) => patch({ linkLabel })}
                placeholder="En savoir plus"
                className="shrink-0 underline underline-offset-2"
                style={linkStyle}
                label="Texte du lien"
              />
            </InlineStyleToolbar>
          </InlineLinkPopover>
        ) : isExternalUrl(config.linkUrl) ? (
          <a href={config.linkUrl} target="_blank" rel="noreferrer" style={linkStyle} className="shrink-0 underline underline-offset-2 hover:opacity-80">
            {config.linkLabel}
          </a>
        ) : (
          <Link to={config.linkUrl} style={linkStyle} className="shrink-0 underline underline-offset-2 hover:opacity-80">
            {config.linkLabel}
          </Link>
        ))}
      {config.dismissible && (
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fermer"
          className={`absolute top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 ${pill ? 'right-3' : 'right-3'}`}
        >
          <X size={14} />
        </button>
      )}
    </>
  )

  const colors = { backgroundColor: config.backgroundColor || 'var(--shop-accent)', color: config.textColor || '#ffffff' }

  if (pill) {
    return (
      <div className="px-4 pt-3">
        <div
          style={colors}
          className="relative mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full px-10 py-1.5 text-center text-xs font-medium sm:text-sm"
        >
          {content}
        </div>
      </div>
    )
  }

  return (
    <div
      style={colors}
      className="relative flex items-center justify-center gap-x-3 gap-y-1 px-10 py-2 text-center text-xs font-medium sm:text-sm"
    >
      {content}
    </div>
  )
}

export function StoreLayout() {
  const { shop } = useTenant()
  const { themeColor, themeConfig, announcementSection, headerSection, footerSection, isDraftPreview, inlineEditable } = useEffectiveShopConfig(shop)
  const { planKey } = useShopPlan(shop?.id)
  const announcement = (announcementSection?.config as AnnouncementBarSectionConfig | undefined) ?? DEFAULT_ANNOUNCEMENT
  const header = (headerSection?.config as HeaderSectionConfig | undefined) ?? DEFAULT_HEADER
  const footer = (footerSection?.config as FooterSectionConfig | undefined) ?? DEFAULT_FOOTER
  const showBitikoBranding = !(planKey === 'pro' && footer.hideBitikoBranding)
  const isEmbeddedPreview = isDraftPreview && typeof window !== 'undefined' && window.parent !== window

  useShopFavicon(shop?.logo_url)

  return (
    <div
      className="flex min-h-screen flex-col bg-[var(--shop-bg)] text-[var(--shop-text)]"
      style={{ ...themeConfigToCssVars(themeColor, themeConfig), fontFamily: 'var(--shop-font-body)' } as React.CSSProperties}
    >
      <PreviewNavPing enabled={isEmbeddedPreview} />
      <PreviewClickTarget enabled={isEmbeddedPreview} sectionId={announcementSection?.id} label={CORE_SECTION_REGISTRY.announcement.label}>
        <AnnouncementBar shopId={shop?.id} sectionId={announcementSection?.id} config={announcement} editable={inlineEditable} />
      </PreviewClickTarget>
      <PreviewClickTarget enabled={isEmbeddedPreview} sectionId={headerSection?.id} label={CORE_SECTION_REGISTRY.header.label}>
        <HeaderRenderer shop={shop} header={header} sectionId={headerSection?.id} editable={inlineEditable} />
      </PreviewClickTarget>

      <main className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>

      <PreviewClickTarget enabled={isEmbeddedPreview} sectionId={footerSection?.id} label={CORE_SECTION_REGISTRY.footer.label}>
        <FooterRenderer
          shop={shop}
          footer={footer}
          themeColor={themeColor}
          showBitikoBranding={showBitikoBranding}
          sectionId={footerSection?.id}
          editable={inlineEditable}
        />
      </PreviewClickTarget>
    </div>
  )
}
