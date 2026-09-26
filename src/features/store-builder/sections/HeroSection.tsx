import type { Shop } from '@/types'
import { Link } from 'react-router-dom'
import { ArrowRight, MessageCircle } from 'lucide-react'
import type { HeroLayout, HeroSectionConfig } from '@/types/builder'
import { HEADING_SCALE } from '@/config/themeTokens'
import type { ThemeConfig } from '@/types/builder'
import { uploadShopSectionVideo } from '@/services/shop.service'
import { editorHelpClass, editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'
import { FocalPointPicker } from './FocalPointPicker'
import { VideoUploadField } from './VideoUploadField'
import { useInlineEdit } from '../inline/useInlineEdit'
import { InlineText } from '../inline/InlineText'
import { InlineStyleToolbar } from '../inline/InlineStyleToolbar'
import { TextStyleField } from '../components/TextStyleControls'
import { VisualPicker } from '../components/VisualPicker'
import { SwatchBar, SwatchBlock, SwatchFrame } from '../components/LayoutSwatch'
import { resolveTextStyle } from '@/config/textStyle'
import { getStorefrontVocabulary } from '@/config/storefrontVocabulary'
import { useStorefrontCapabilities } from '../useStorefrontCapabilities'

export function HeroRenderer({
  shop,
  config,
  themeConfig,
  sectionId,
  editable = false,
}: {
  shop: Shop
  config: HeroSectionConfig
  themeConfig: ThemeConfig
  sectionId?: string
  editable?: boolean
}) {
  const patch = useInlineEdit(sectionId)
  // Always the *effective* text (falling back to the shop's own name/
  // description/default copy) — including while editing. A field left empty
  // isn't "missing content" here, it's the shop's real data standing in for
  // it, so it should look and edit like normal filled-in text, not like a
  // blank field waiting to be typed into (that read as "the template didn't
  // actually fill anything in").
  const heading = config.heading.trim() || shop.name
  const subheading = config.subheading.trim() || shop.description || ''
  const layout = config.layout ?? 'image-full'
  const showBanner = config.showBanner && !!shop.banner_url && layout !== 'text-only'
  const side = showBanner && layout === 'image-side'
  const centered = layout === 'text-only'
  // Le bouton principal suit le métier : « Prendre rendez-vous » / « Réserver une
  // table » quand le libellé n'a pas été personnalisé (un libellé choisi par le
  // commerçant garde sa cible historique, le catalogue).
  const vocab = getStorefrontVocabulary(useStorefrontCapabilities(shop))
  const customPrimaryLabel = config.primaryButtonLabel?.trim()
  const bookingPrimary = !customPrimaryLabel && vocab.booking ? vocab.booking : null
  const primaryLabel = customPrimaryLabel || bookingPrimary?.label || 'Découvrir la boutique'
  const whatsappLabel = config.whatsappButtonLabel?.trim() || 'Nous contacter'

  // The banner image itself is a shop-level asset (Réglages → Apparence), not
  // part of this section's config, so it isn't upload-on-hover like the other
  // images here — only its crop (focal point, in the sidebar) and video
  // overlay are section config.
  const banner = showBanner && (
    <div
      className={`group/banner relative w-full overflow-hidden ${
        side ? 'aspect-[4/3] md:aspect-auto md:h-full md:min-h-[18rem]' : 'aspect-[3/1] sm:aspect-[16/5]'
      }`}
      style={side ? { borderRadius: 'var(--shop-radius)' } : undefined}
    >
      {config.bannerVideoUrl ? (
        <video
          src={config.bannerVideoUrl}
          poster={shop.banner_url!}
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover"
        />
      ) : (
        <img
          src={shop.banner_url!}
          alt=""
          fetchPriority="high"
          className="h-full w-full object-cover"
          style={{ objectPosition: `${config.bannerFocalX ?? 50}% ${config.bannerFocalY ?? 50}%` }}
        />
      )}
      {editable && (
        <span className="pointer-events-none absolute bottom-2 right-2 z-10 rounded-md bg-black/60 px-2 py-1 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover/banner:opacity-100">
          Image modifiable dans Réglages → Apparence
        </span>
      )}
    </div>
  )

  const textBlock = (
    <>
      {(config.eyebrow.trim() || editable) && (
        <InlineStyleToolbar editable={editable} style={config.eyebrowStyle} onCommit={(eyebrowStyle) => patch({ eyebrowStyle })} label="Style de l'accroche">
          <InlineText
            as="p"
            editable={editable}
            value={config.eyebrow}
            onCommit={(eyebrow) => patch({ eyebrow })}
            placeholder="Texte d'accroche"
            className="text-xs font-semibold uppercase tracking-widest text-[var(--shop-accent)]"
            style={resolveTextStyle(config.eyebrowStyle)}
            label="Texte d'accroche"
          />
        </InlineStyleToolbar>
      )}
      <InlineStyleToolbar editable={editable} style={config.headingStyle} onCommit={(headingStyle) => patch({ headingStyle })} label="Style du titre">
        <InlineText
          as="h1"
          editable={editable}
          value={heading}
          onCommit={(value) => patch({ heading: value })}
          placeholder={shop.name}
          className={`mt-2 max-w-2xl font-bold tracking-tight text-[var(--shop-text)] ${centered ? 'mx-auto' : ''} ${HEADING_SCALE[themeConfig.textScale]}`}
          style={{ fontFamily: 'var(--shop-font-heading)', ...resolveTextStyle(config.headingStyle) }}
          label="Titre"
        />
      </InlineStyleToolbar>
      {(subheading || editable) && (
        <InlineStyleToolbar editable={editable} style={config.subheadingStyle} onCommit={(subheadingStyle) => patch({ subheadingStyle })} label="Style du sous-titre">
          <InlineText
            as="p"
            editable={editable}
            value={subheading}
            onCommit={(value) => patch({ subheading: value })}
            placeholder={shop.description || 'Sous-titre'}
            className={`mt-3 max-w-lg text-base leading-relaxed text-[var(--shop-text)]/60 ${centered ? 'mx-auto' : ''}`}
            style={resolveTextStyle(config.subheadingStyle)}
            multiline
            label="Sous-titre"
          />
        </InlineStyleToolbar>
      )}
      <div className={`mt-6 flex flex-wrap items-center gap-3 ${centered ? 'justify-center' : ''}`}>
        <Link
          to={bookingPrimary?.href ?? vocab.catalogHref}
          style={{ borderRadius: 'var(--shop-radius)' }}
          className="inline-flex w-full items-center justify-center gap-2 bg-[var(--shop-button)] px-5 py-3 text-sm font-semibold text-[var(--shop-button-text)] transition-opacity hover:opacity-90 sm:w-auto"
        >
          <InlineStyleToolbar editable={editable} display="inline" style={config.primaryButtonLabelStyle} onCommit={(primaryButtonLabelStyle) => patch({ primaryButtonLabelStyle })} label="Style du bouton principal">
            <InlineText
              editable={editable}
              value={primaryLabel}
              onCommit={(value) => patch({ primaryButtonLabel: value })}
              placeholder="Découvrir la boutique"
              style={resolveTextStyle(config.primaryButtonLabelStyle)}
              label="Texte du bouton principal"
            />
          </InlineStyleToolbar>
          <ArrowRight size={16} aria-hidden />
        </Link>
        {(shop.whatsapp_number || editable) && (
          <a
            href={shop.whatsapp_number ? `https://wa.me/${shop.whatsapp_number.replace(/\D/g, '')}` : undefined}
            target="_blank"
            rel="noreferrer"
            style={{ borderRadius: 'var(--shop-radius)' }}
            className="inline-flex w-full items-center justify-center gap-2 border border-[var(--shop-secondary-button-text)]/20 px-5 py-3 text-sm font-semibold text-[var(--shop-secondary-button-text)] transition-colors hover:border-[var(--shop-secondary-button-text)]/50 sm:w-auto"
          >
            <MessageCircle size={16} aria-hidden />
            <InlineStyleToolbar editable={editable} display="inline" style={config.whatsappButtonLabelStyle} onCommit={(whatsappButtonLabelStyle) => patch({ whatsappButtonLabelStyle })} label="Style du bouton WhatsApp">
              <InlineText
                editable={editable}
                value={whatsappLabel}
                onCommit={(value) => patch({ whatsappButtonLabel: value })}
                placeholder="Nous contacter"
                style={resolveTextStyle(config.whatsappButtonLabelStyle)}
                label="Texte du bouton WhatsApp"
              />
            </InlineStyleToolbar>
          </a>
        )}
      </div>
    </>
  )

  if (side) {
    return (
      <section className="mx-auto max-w-[var(--shop-content-width)] px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div>{textBlock}</div>
          {banner}
        </div>
      </section>
    )
  }

  return (
    <div>
      {banner}
      <section
        className={`mx-auto max-w-[var(--shop-content-width)] px-4 pb-6 sm:px-6 ${showBanner ? 'pt-6 sm:pt-8' : 'pt-8 sm:pt-12'} ${centered ? 'text-center' : ''}`}
      >
        {textBlock}
      </section>
    </div>
  )
}

const HERO_LAYOUTS: { value: HeroLayout; label: string; preview: React.ReactNode }[] = [
  {
    value: 'image-full',
    label: 'Bannière',
    preview: (
      <SwatchFrame className="flex-col gap-1">
        <SwatchBlock className="h-3 w-full" />
        <SwatchBar w="w-2/3" />
        <SwatchBar w="w-1/3" />
      </SwatchFrame>
    ),
  },
  {
    value: 'image-side',
    label: 'Image à côté',
    preview: (
      <SwatchFrame className="items-center gap-1">
        <span className="flex w-1/2 flex-col gap-1">
          <SwatchBar />
          <SwatchBar w="w-2/3" />
        </span>
        <SwatchBlock className="h-full w-1/2" />
      </SwatchFrame>
    ),
  },
  {
    value: 'text-only',
    label: 'Texte seul',
    preview: (
      <SwatchFrame className="flex-col items-center justify-center gap-1">
        <SwatchBar w="w-2/3" />
        <SwatchBar w="w-1/2" />
      </SwatchFrame>
    ),
  },
]

export function HeroEditor({ config, onChange, shop, shopId, sectionId }: SectionEditorProps<HeroSectionConfig>) {
  return (
    <div className="space-y-4">
      <div>
        <label className={editorLabelClass}>Disposition</label>
        <div className="mt-1">
          <VisualPicker
            columns={3}
            value={config.layout ?? 'image-full'}
            onChange={(layout) => onChange({ ...config, layout })}
            options={HERO_LAYOUTS}
          />
        </div>
        <p className={`mt-1.5 ${editorHelpClass}`}>
          « Image à côté » place la bannière de la boutique à droite du texte ; « Texte seul » masque la bannière.
        </p>
      </div>
      <div>
        <label className={editorLabelClass}>Texte d'accroche (eyebrow)</label>
        <input
          value={config.eyebrow}
          onChange={(e) => onChange({ ...config, eyebrow: e.target.value })}
          placeholder="Boutique en ligne"
          className={editorInputClass}
        />
        <p className={`mt-1 ${editorHelpClass}`}>Petite ligne au-dessus du titre. Vide = elle n'est pas affichée.</p>
        <TextStyleField value={config.eyebrowStyle} onChange={(eyebrowStyle) => onChange({ ...config, eyebrowStyle })} />
      </div>
      <div>
        <label className={editorLabelClass}>Titre</label>
        <input
          value={config.heading}
          onChange={(e) => onChange({ ...config, heading: e.target.value })}
          placeholder="Laisser vide = nom de la boutique"
          className={editorInputClass}
        />
        <TextStyleField value={config.headingStyle} onChange={(headingStyle) => onChange({ ...config, headingStyle })} />
      </div>
      <div>
        <label className={editorLabelClass}>Sous-titre</label>
        <textarea
          rows={2}
          value={config.subheading}
          onChange={(e) => onChange({ ...config, subheading: e.target.value })}
          placeholder="Laisser vide = description de la boutique"
          className={editorInputClass}
        />
        <TextStyleField value={config.subheadingStyle} onChange={(subheadingStyle) => onChange({ ...config, subheadingStyle })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={editorLabelClass}>Texte du bouton principal</label>
          <input
            value={config.primaryButtonLabel ?? ''}
            onChange={(e) => onChange({ ...config, primaryButtonLabel: e.target.value })}
            placeholder="Découvrir la boutique"
            className={editorInputClass}
          />
          <TextStyleField label="Style" value={config.primaryButtonLabelStyle} onChange={(primaryButtonLabelStyle) => onChange({ ...config, primaryButtonLabelStyle })} />
        </div>
        <div>
          <label className={editorLabelClass}>Texte du bouton WhatsApp</label>
          <input
            value={config.whatsappButtonLabel ?? ''}
            onChange={(e) => onChange({ ...config, whatsappButtonLabel: e.target.value })}
            placeholder="Nous contacter"
            className={editorInputClass}
          />
          <TextStyleField label="Style" value={config.whatsappButtonLabelStyle} onChange={(whatsappButtonLabelStyle) => onChange({ ...config, whatsappButtonLabelStyle })} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={config.showBanner}
          onChange={(e) => onChange({ ...config, showBanner: e.target.checked })}
        />
        Afficher la bannière de la boutique
      </label>
      {config.showBanner && shop.banner_url && (
        <div className="space-y-4 border-t border-gray-200 pt-4">
          <div>
            <label className={editorLabelClass}>Point focal de la bannière</label>
            <div className="mt-1.5">
              <FocalPointPicker
                imageUrl={shop.banner_url}
                focalX={config.bannerFocalX ?? 50}
                focalY={config.bannerFocalY ?? 50}
                aspectClassName="aspect-[3/1]"
                onChange={(bannerFocalX, bannerFocalY) => onChange({ ...config, bannerFocalX, bannerFocalY })}
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">
              La bannière elle-même se change dans Réglages → Apparence.
            </p>
          </div>
          <VideoUploadField
            videoUrl={config.bannerVideoUrl}
            onUpload={async (file) => {
              const url = await uploadShopSectionVideo(shopId, sectionId, file)
              onChange({ ...config, bannerVideoUrl: url })
            }}
            onRemove={() => onChange({ ...config, bannerVideoUrl: undefined })}
            helpText="Remplace la bannière ci-dessus, qui reste utilisée en attendant que la vidéo charge."
          />
        </div>
      )}
    </div>
  )
}
