import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { PromoLayout, PromoSectionConfig, ThemeConfig } from '@/types/builder'
import { SECTION_HEADING_SCALE } from '@/config/themeTokens'
import { editorHelpClass, editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'
import { useInlineEdit } from '../inline/useInlineEdit'
import { InlineText } from '../inline/InlineText'
import { InlineLinkPopover } from '../inline/InlineLinkPopover'
import { InlineStyleToolbar } from '../inline/InlineStyleToolbar'
import { TextStyleField } from '../components/TextStyleControls'
import { VisualPicker } from '../components/VisualPicker'
import { SwatchBlock, SwatchFrame } from '../components/LayoutSwatch'
import { resolveTextStyle } from '@/config/textStyle'

function isExternal(url: string) {
  return /^https?:\/\//i.test(url)
}

export function PromoRenderer({
  config,
  themeConfig,
  sectionId,
  editable = false,
}: {
  config: PromoSectionConfig
  themeConfig: ThemeConfig
  sectionId?: string
  editable?: boolean
}) {
  const patch = useInlineEdit(sectionId)
  if (!editable && !config.heading.trim()) return null

  const buttonLabel = (
    <InlineStyleToolbar editable={editable} display="inline" style={config.buttonLabelStyle} onCommit={(buttonLabelStyle) => patch({ buttonLabelStyle })} label="Style du bouton">
      <InlineText
        editable={editable}
        value={config.buttonLabel}
        onCommit={(buttonLabel) => patch({ buttonLabel })}
        placeholder="Voir l'offre"
        style={resolveTextStyle(config.buttonLabelStyle)}
        label="Texte du bouton"
      />
    </InlineStyleToolbar>
  )
  const button = (config.buttonLabel.trim() || editable) && (
    <span
      className="mt-5 inline-flex items-center gap-2 bg-white px-5 py-2.5 text-sm font-semibold uppercase tracking-widest text-[var(--shop-accent)]"
      style={{ borderRadius: 'var(--shop-radius)' }}
    >
      {buttonLabel}
      <ArrowRight size={15} aria-hidden />
    </span>
  )

  const card = (config.layout ?? 'banner') === 'card'

  return (
    <section className={`mx-auto px-4 py-6 sm:px-6 ${card ? 'max-w-3xl' : 'max-w-[var(--shop-content-width)]'}`}>
      <div
        className={
          card
            ? 'flex flex-col items-center px-6 py-12 text-center text-[var(--shop-tertiary-button-text)] sm:px-14 sm:py-16'
            : 'flex flex-col items-start px-6 py-10 text-[var(--shop-tertiary-button-text)] sm:px-10'
        }
        style={{ backgroundColor: config.backgroundColor || 'var(--shop-tertiary-button)', borderRadius: 'var(--shop-radius)' }}
      >
        <InlineStyleToolbar editable={editable} style={config.headingStyle} onCommit={(headingStyle) => patch({ headingStyle })} label="Style du titre">
          <InlineText
            as="h2"
            editable={editable}
            value={config.heading}
            onCommit={(heading) => patch({ heading })}
            placeholder="Titre de la promotion"
            className={`max-w-lg font-bold ${SECTION_HEADING_SCALE[themeConfig.textScale]}`}
            style={{ fontFamily: 'var(--shop-font-heading)', ...resolveTextStyle(config.headingStyle) }}
            label="Titre"
          />
        </InlineStyleToolbar>
        {(config.body.trim() || editable) && (
          <InlineStyleToolbar editable={editable} style={config.bodyStyle} onCommit={(bodyStyle) => patch({ bodyStyle })} label="Style du texte">
            <InlineText
              as="p"
              editable={editable}
              value={config.body}
              onCommit={(body) => patch({ body })}
              placeholder="Texte"
              className="mt-2 max-w-md text-[var(--shop-tertiary-button-text)]/80"
              style={resolveTextStyle(config.bodyStyle)}
              multiline
              label="Texte"
            />
          </InlineStyleToolbar>
        )}
        {button &&
          (editable ? (
            <InlineLinkPopover url={config.buttonLink} onCommit={(buttonLink) => patch({ buttonLink })} editable>
              {button}
            </InlineLinkPopover>
          ) : config.buttonLink && isExternal(config.buttonLink) ? (
            <a href={config.buttonLink} target="_blank" rel="noreferrer">
              {button}
            </a>
          ) : (
            <Link to={config.buttonLink || '/catalogue'}>{button}</Link>
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

export function PromoEditor({ config, onChange }: SectionEditorProps<PromoSectionConfig>) {
  return (
    <div className="space-y-4">
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
        <label className={editorLabelClass}>Couleur de fond</label>
        <div className="mt-1 flex items-center gap-3">
          <input
            type="color"
            value={config.backgroundColor || '#d9612e'}
            onChange={(e) => onChange({ ...config, backgroundColor: e.target.value })}
            className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-gray-200 p-1"
          />
          <input
            value={config.backgroundColor}
            onChange={(e) => onChange({ ...config, backgroundColor: e.target.value })}
            placeholder="Laisser vide = couleur principale"
            className={`${editorInputClass} mt-0 max-w-[12rem] font-mono`}
          />
        </div>
      </div>
    </div>
  )
}
