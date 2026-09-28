import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { Shop } from '@/types'
import type { PromoLayout, PromoSectionConfig, ThemeConfig } from '@/types/builder'
import { sectionHeadingClass } from '@/config/themeTokens'
import { editorHelpClass, editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'
import { useInlineEdit } from '../inline/useInlineEdit'
import { InlineText } from '../inline/InlineText'
import { InlineLinkPopover } from '../inline/InlineLinkPopover'
import { InlineStyleToolbar } from '../inline/InlineStyleToolbar'
import { TextStyleField } from '../components/TextStyleControls'
import { ColorField } from '../components/ColorField'
import { VisualPicker } from '../components/VisualPicker'
import { SwatchBlock, SwatchFrame } from '../components/LayoutSwatch'
import { resolveTextStyle } from '@/config/textStyle'
import { useShopPromos } from '@/features/cms/useCmsContent'
import { isPromoLive } from '@/features/promos/promoTargeting'
import { useActiveShopPromos } from '@/features/cms/useCmsContent'
import { promoById, sitePromos } from '@/features/promos/promoTargeting'
import type { ShopPromo } from '@/types/cms'

function isExternal(url: string) {
  return /^https?:\/\//i.test(url)
}

function formatEndDate(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

export function PromoRenderer({
  shop,
  config,
  themeConfig,
  sectionId,
  editable = false,
}: {
  shop?: Shop | null
  config: PromoSectionConfig
  themeConfig: ThemeConfig
  sectionId?: string
  editable?: boolean
}) {
  const patch = useInlineEdit(sectionId)
  const cmsMode = config.source === 'cms'
  const { data: promos, isLoading: promosLoading } = useActiveShopPromos(cmsMode ? shop?.id : undefined)
  if (cmsMode && promosLoading) return null
  const promo: ShopPromo | null = cmsMode
    ? (promoById(promos ?? [], config.promoId) ?? sitePromos(promos ?? [])[0] ?? null)
    : null
  if (cmsMode && !promo && !editable) return null
  if (!cmsMode && !editable && !config.heading.trim()) return null

  const heading = cmsMode ? (promo?.title ?? '') : config.heading
  const body = cmsMode ? (promo?.body ?? '') : config.body
  const buttonLabelText = cmsMode ? (promo?.button_label ?? '') : config.buttonLabel
  const buttonLink = cmsMode ? (promo?.button_link || '/catalogue') : config.buttonLink
  const imageUrl = cmsMode ? promo?.image_url : null
  const endDate = cmsMode ? formatEndDate(promo?.ends_at ?? null) : null
  // En mode CMS le texte vient de la page Contenu : aperçu seul, pas d'édition inline.
  const ro = cmsMode || !editable

  const buttonLabel = (
    <InlineStyleToolbar editable={!ro} display="inline" style={config.buttonLabelStyle} onCommit={(buttonLabelStyle) => patch({ buttonLabelStyle })} label="Style du bouton">
      <InlineText
        editable={!ro}
        value={buttonLabelText}
        onCommit={(value) => patch({ buttonLabel: value })}
        placeholder="Voir l'offre"
        style={resolveTextStyle(config.buttonLabelStyle)}
        label="Texte du bouton"
      />
    </InlineStyleToolbar>
  )
  const button = (buttonLabelText.trim() || editable) && (
    <span
      className="mt-5 inline-flex items-center gap-2 bg-[var(--shop-button)] px-5 py-2.5 text-sm font-semibold uppercase tracking-widest text-[var(--shop-button-text)] shadow-sm"
      style={{ borderRadius: 'var(--shop-radius)' }}
    >
      {buttonLabel}
      <ArrowRight size={15} aria-hidden />
    </span>
  )

  const card = (config.layout ?? 'banner') === 'card'

  return (
    <section className={`mx-auto px-4 py-6 sm:px-6 ${card ? 'max-w-3xl' : 'max-w-[var(--shop-content-width)]'}`}>
      {cmsMode && editable && (
        <p className="mx-auto mb-3 max-w-3xl rounded-lg bg-[var(--shop-surface)] px-3 py-2 text-center text-xs text-[var(--shop-text)]/60">
          {promo ? `Promo « ${promo.title} » — gérée dans Contenu → Promos.` : 'Aucune promo en cours : crée-la dans Contenu → Promos.'}
        </p>
      )}
      <div
        className={
          card
            ? 'flex flex-col items-center px-6 py-12 text-center text-[var(--shop-tertiary-button-text)] sm:px-14 sm:py-16'
            : 'flex flex-col items-start px-6 py-10 text-[var(--shop-tertiary-button-text)] sm:px-10'
        }
        style={{ backgroundColor: config.backgroundColor || 'var(--shop-tertiary-button)', borderRadius: 'var(--shop-radius)' }}
      >
        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className={`mb-5 max-h-56 w-full object-cover ${card ? 'max-w-md' : 'max-w-lg'}`}
            style={{ borderRadius: 'var(--shop-radius)' }}
          />
        )}
        <InlineStyleToolbar editable={!ro} style={config.headingStyle} onCommit={(headingStyle) => patch({ headingStyle })} label="Style du titre">
          <InlineText
            as="h2"
            editable={!ro}
            value={heading}
            onCommit={(value) => patch({ heading: value })}
            placeholder="Titre de la promotion"
            className={`max-w-lg font-bold ${sectionHeadingClass(themeConfig)}`}
            style={{ fontFamily: 'var(--shop-font-heading)', ...resolveTextStyle(config.headingStyle) }}
            label="Titre"
          />
        </InlineStyleToolbar>
        {(body.trim() || editable) && (
          <InlineStyleToolbar editable={!ro} style={config.bodyStyle} onCommit={(bodyStyle) => patch({ bodyStyle })} label="Style du texte">
            <InlineText
              as="p"
              editable={!ro}
              value={body}
              onCommit={(value) => patch({ body: value })}
              placeholder="Texte"
              className="mt-2 max-w-md text-[var(--shop-tertiary-button-text)]/80"
              style={resolveTextStyle(config.bodyStyle)}
              multiline
              label="Texte"
            />
          </InlineStyleToolbar>
        )}
        {endDate && (
          <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-[var(--shop-tertiary-button-text)]/70">
            Jusqu’au {endDate}
          </p>
        )}
        {button &&
          (editable && !cmsMode ? (
            <InlineLinkPopover url={config.buttonLink} onCommit={(buttonLink) => patch({ buttonLink })} editable>
              {button}
            </InlineLinkPopover>
          ) : buttonLink && isExternal(buttonLink) ? (
            <a href={buttonLink} target="_blank" rel="noreferrer">
              {button}
            </a>
          ) : (
            <Link to={buttonLink || '/catalogue'}>{button}</Link>
          ))}
      </div>
    </section>
  )
}

const PROMO_LAYOUTS: { value: PromoLayout; label: string; preview: React.ReactNode }[] = [
  {
    value: 'banner',
    label: 'Bannière',
    preview: (
      <SwatchFrame className="flex-col justify-center gap-1">
        <SwatchBlock className="h-full w-full" />
      </SwatchFrame>
    ),
  },
  {
    value: 'card',
    label: 'Carte',
    preview: (
      <SwatchFrame className="items-center justify-center">
        <SwatchBlock className="h-3/4 w-2/3" />
      </SwatchFrame>
    ),
  },
]

export function PromoEditor({ config, onChange, shop }: SectionEditorProps<PromoSectionConfig>) {
  const { data: promos } = useShopPromos(config.source === 'cms' ? shop.id : undefined)
  const sitePromos = (promos ?? []).filter((p) => p.scope === 'site')
  return (
    <div className="space-y-4">
      <div>
        <label className={editorLabelClass}>Contenu</label>
        <select
          value={config.source ?? 'manual'}
          onChange={(e) => onChange({ ...config, source: e.target.value as 'manual' | 'cms' })}
          className={editorInputClass}
        >
          <option value="manual">Écrit ici (manuel)</option>
          <option value="cms">Depuis la page Contenu (CMS)</option>
        </select>
        <p className={`mt-1 ${editorHelpClass}`}>Le CMS centralise tes promos (portée, dates, pastilles) — le bloc ne fait que les afficher.</p>
      </div>
      {config.source === 'cms' ? (
        <div>
          <label className={editorLabelClass}>Promo à afficher</label>
          <select
            value={config.promoId ?? ''}
            onChange={(e) => onChange({ ...config, promoId: e.target.value || null })}
            className={editorInputClass}
          >
            <option value="">Auto : dernière promo « tout le site » en cours</option>
            {sitePromos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} {isPromoLive(p) ? '' : '(hors dates / masquée)'}
              </option>
            ))}
          </select>
          <p className={`mt-1 ${editorHelpClass}`}>Seules les promos « tout le site » s’affichent ici ; les promos produit / catégorie / prestation pastillent leurs cartes automatiquement.</p>
        </div>
      ) : (
      <>
      <div>
        <label className={editorLabelClass}>Disposition</label>
        <div className="mt-1">
          <VisualPicker
            columns={2}
            value={config.layout ?? 'banner'}
            onChange={(layout) => onChange({ ...config, layout })}
            options={PROMO_LAYOUTS}
          />
        </div>
        <p className={`mt-1.5 ${editorHelpClass}`}>
          « Carte » centre la promotion dans un encadré plus étroit, au lieu de la pleine largeur.
        </p>
      </div>
      <div>
        <label className={editorLabelClass}>Titre</label>
        <input
          value={config.heading}
          onChange={(e) => onChange({ ...config, heading: e.target.value })}
          placeholder="Soldes de fin d'année"
          className={editorInputClass}
        />
        <p className={`mt-1 ${editorHelpClass}`}>Vide = la promotion n'est pas affichée.</p>
        <TextStyleField value={config.headingStyle} onChange={(headingStyle) => onChange({ ...config, headingStyle })} />
      </div>
      <div>
        <label className={editorLabelClass}>Texte</label>
        <textarea
          rows={2}
          value={config.body}
          onChange={(e) => onChange({ ...config, body: e.target.value })}
          className={editorInputClass}
        />
        <TextStyleField value={config.bodyStyle} onChange={(bodyStyle) => onChange({ ...config, bodyStyle })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={editorLabelClass}>Texte du bouton</label>
          <input
            value={config.buttonLabel}
            onChange={(e) => onChange({ ...config, buttonLabel: e.target.value })}
            placeholder="Voir l'offre"
            className={editorInputClass}
          />
          <TextStyleField label="Style" value={config.buttonLabelStyle} onChange={(buttonLabelStyle) => onChange({ ...config, buttonLabelStyle })} />
        </div>
        <div>
          <label className={editorLabelClass}>Lien du bouton</label>
          <input
            value={config.buttonLink}
            onChange={(e) => onChange({ ...config, buttonLink: e.target.value })}
            placeholder="/catalogue"
            className={editorInputClass}
          />
          <p className={`mt-1 ${editorHelpClass}`}>Vide = page catalogue.</p>
        </div>
      </div>
      <div>
        <ColorField
          label="Couleur de fond"
          value={config.backgroundColor ?? ''}
          placeholder="Laisser vide = couleur principale"
          onChange={(backgroundColor) => onChange({ ...config, backgroundColor })}
        />
      </div>
      </>
      )}
    </div>
  )
}
