import type { Shop } from '@/types'
import { Link } from 'react-router-dom'
import { ArrowRight, MessageCircle } from 'lucide-react'
import type { HeroSectionConfig } from '@/types/builder'
import { HEADING_SCALE } from '@/config/themeTokens'
import type { ThemeConfig } from '@/types/builder'
import { uploadShopSectionVideo } from '@/services/shop.service'
import { editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'
import { FocalPointPicker } from './FocalPointPicker'
import { VideoUploadField } from './VideoUploadField'

export function HeroRenderer({
  shop,
  config,
  themeConfig,
}: {
  shop: Shop
  config: HeroSectionConfig
  themeConfig: ThemeConfig
}) {
  const heading = config.heading.trim() || shop.name
  const subheading = config.subheading.trim() || shop.description || ''
  const showBanner = config.showBanner && !!shop.banner_url

  return (
    <div>
      {showBanner && (
        <div className="aspect-[3/1] w-full overflow-hidden sm:aspect-[16/5]">
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
              className="h-full w-full object-cover"
              style={{ objectPosition: `${config.bannerFocalX ?? 50}% ${config.bannerFocalY ?? 50}%` }}
            />
          )}
        </div>
      )}
      <section className={`mx-auto max-w-[var(--shop-content-width)] px-4 pb-6 sm:px-6 ${showBanner ? 'pt-6 sm:pt-8' : 'pt-8 sm:pt-12'}`}>
        {config.eyebrow.trim() && (
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--shop-accent)]">{config.eyebrow}</p>
        )}
        <h1
          className={`mt-2 max-w-2xl font-bold tracking-tight text-[var(--shop-text)] ${HEADING_SCALE[themeConfig.textScale]}`}
          style={{ fontFamily: 'var(--shop-font-heading)' }}
        >
          {heading}
        </h1>
        {subheading && (
          <p className="mt-3 max-w-lg text-base leading-relaxed text-[var(--shop-text)]/60">{subheading}</p>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            to="/catalogue"
            style={{ borderRadius: 'var(--shop-radius)' }}
            className="inline-flex items-center gap-2 bg-[var(--shop-button)] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Découvrir la boutique
            <ArrowRight size={16} aria-hidden />
          </Link>
          {shop.whatsapp_number && (
            <a
              href={`https://wa.me/${shop.whatsapp_number.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              style={{ borderRadius: 'var(--shop-radius)' }}
              className="inline-flex items-center gap-2 border border-[var(--shop-text)]/20 px-5 py-3 text-sm font-semibold text-[var(--shop-text)] transition-colors hover:border-[var(--shop-text)]/50"
            >
              <MessageCircle size={16} aria-hidden /> Nous contacter
            </a>
          )}
        </div>
      </section>
    </div>
  )
}

export function HeroEditor({ config, onChange, shop, shopId, sectionId }: SectionEditorProps<HeroSectionConfig>) {
  return (
    <div className="space-y-4">
      <div>
        <label className={editorLabelClass}>Texte d'accroche (eyebrow)</label>
        <input
          value={config.eyebrow}
          onChange={(e) => onChange({ ...config, eyebrow: e.target.value })}
          placeholder="Boutique en ligne"
          className={editorInputClass}
        />
      </div>
      <div>
        <label className={editorLabelClass}>Titre</label>
        <input
          value={config.heading}
          onChange={(e) => onChange({ ...config, heading: e.target.value })}
          placeholder="Laisser vide = nom de la boutique"
          className={editorInputClass}
        />
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
