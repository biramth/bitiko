import type { Shop } from '@/types'
import type { HeroSectionConfig } from '@/types/builder'
import { HEADING_SCALE } from '@/config/themeTokens'
import type { ThemeConfig } from '@/types/builder'
import { editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'

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
  const showBanner = config.showBanner

  return (
    <div>
      {showBanner && (
        <div className="aspect-[3/1] w-full overflow-hidden sm:aspect-[16/5]">
          {shop.banner_url ? (
            <img src={shop.banner_url} alt="" className="h-full w-full object-cover" />
          ) : (
            // No photo uploaded yet: a themed gradient keeps the page looking
            // designed instead of leaving a blank gap above the title.
            <div
              className="h-full w-full"
              style={{ background: 'linear-gradient(135deg, var(--shop-accent), var(--shop-secondary))' }}
            />
          )}
        </div>
      )}
      <section className={`mx-auto max-w-[var(--shop-content-width)] px-4 pb-8 sm:px-6 ${showBanner ? 'pt-6 sm:pt-8' : 'pt-10 sm:pt-16'}`}>
        {config.eyebrow.trim() && (
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--shop-accent)]">{config.eyebrow}</p>
        )}
        <h1
          className={`mt-3 max-w-2xl font-bold tracking-tight text-[var(--shop-text)] ${HEADING_SCALE[themeConfig.textScale]}`}
          style={{ fontFamily: 'var(--shop-font-heading)' }}
        >
          {heading}
        </h1>
        {subheading && (
          <p className="mt-4 max-w-lg text-base text-[var(--shop-text)]/60 sm:text-lg">{subheading}</p>
        )}
      </section>
    </div>
  )
}

export function HeroEditor({ config, onChange }: SectionEditorProps<HeroSectionConfig>) {
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
    </div>
  )
}
