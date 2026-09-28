import { Plus, Quote, Star, Trash2 } from 'lucide-react'
import type { Shop } from '@/types'
import type { TestimonialsSectionConfig, ThemeConfig } from '@/types/builder'
import { sectionHeadingClass } from '@/config/themeTokens'
import { editorHelpClass, editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'
import { useInlineEdit } from '../inline/useInlineEdit'
import { InlineText } from '../inline/InlineText'
import { InlineStyleToolbar } from '../inline/InlineStyleToolbar'
import { TextStyleField } from '../components/TextStyleControls'
import { resolveTextStyle } from '@/config/textStyle'
import { useActiveShopTestimonials } from '@/features/cms/useCmsContent'

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`Note : ${rating} sur 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={13}
          aria-hidden
          className={i < rating ? 'fill-gold-400 text-gold-400' : 'text-[var(--shop-text)]/20'}
        />
      ))}
    </span>
  )
}

export function TestimonialsRenderer({
  shop,
  config,
  themeConfig,
  sectionId,
  editable = false,
}: {
  shop?: Shop | null
  config: TestimonialsSectionConfig
  themeConfig: ThemeConfig
  sectionId?: string
  editable?: boolean
}) {
  const patch = useInlineEdit(sectionId)
  const cmsMode = config.source === 'cms'
  const { data: cmsItems, isLoading: cmsLoading } = useActiveShopTestimonials(cmsMode ? shop?.id : undefined)
  if (cmsMode && cmsLoading) return null
  const items: { name: string; text: string; rating?: number | null; photoUrl?: string | null }[] = cmsMode
    ? (cmsItems ?? []).map((t) => ({ name: t.name, text: t.text, rating: t.rating, photoUrl: t.photo_url }))
    : editable
      ? config.items
      : config.items.filter((item) => item.text.trim())
  if (items.length === 0 && !editable) return null
  // En mode CMS le contenu vient de la page Contenu : aperçu seul.
  const ro = cmsMode || !editable

  const updateItem = (index: number, field: 'name' | 'text', value: string) => {
    patch({ items: config.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)) })
  }

  return (
    <section className="mx-auto max-w-[var(--shop-content-width)] px-4 py-10 sm:px-6 sm:py-14">
      {(config.heading.trim() || editable) && (
        <InlineStyleToolbar editable={editable} style={config.headingStyle} onCommit={(headingStyle) => patch({ headingStyle })} label="Style du titre">
          <InlineText
            as="h2"
            editable={editable}
            value={config.heading}
            onCommit={(heading) => patch({ heading })}
            placeholder="Elles parlent de nous"
            className={`text-center font-heading font-bold text-[var(--shop-text)] ${sectionHeadingClass(themeConfig)}`}
            style={resolveTextStyle(config.headingStyle)}
            label="Titre"
          />
        </InlineStyleToolbar>
      )}
      {cmsMode && editable && (
        <p className="mx-auto mt-6 max-w-3xl rounded-lg bg-[var(--shop-surface)] px-3 py-2 text-center text-xs text-[var(--shop-text)]/60">
          {(cmsItems?.length ?? 0) > 0 ? 'Avis gérés dans Contenu → Avis.' : 'Aucun avis : ajoute-les dans Contenu → Avis.'}
        </p>
      )}
      <div className="-mx-4 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:thin] sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0">
        {items.map((item, index) => (
          <figure
            key={index}
            className="flex w-[82%] shrink-0 snap-start flex-col rounded-2xl border border-[var(--shop-text)]/10 bg-[var(--shop-bg)] p-5 shadow-sm sm:w-auto"
          >
            <Quote size={20} aria-hidden className="text-[var(--shop-accent)]" />
            {item.rating ? (
              <div className="mt-3">
                <Stars rating={item.rating} />
              </div>
            ) : null}
            <InlineText
              as="p"
              editable={!ro}
              value={item.text}
              onCommit={(value) => updateItem(index, 'text', value)}
              placeholder="Écrivez le témoignage…"
              multiline
              className="mt-3 flex-1 text-sm leading-relaxed text-[var(--shop-text)]/80"
              label="Témoignage"
            />
            <figcaption className="mt-4 flex items-center gap-2.5">
              {item.photoUrl ? (
                <img src={item.photoUrl} alt="" loading="lazy" decoding="async" className="h-8 w-8 shrink-0 rounded-full object-cover" />
              ) : null}
              <InlineText
                editable={!ro}
                value={item.name}
                onCommit={(value) => updateItem(index, 'name', value)}
                placeholder="Nom de la cliente"
                className="text-sm font-semibold text-[var(--shop-text)]"
                label="Nom"
              />
            </figcaption>
            {!cmsMode && editable && config.items.length > 1 && (
              <button
                type="button"
                onClick={() => patch({ items: config.items.filter((_, i) => i !== index) })}
                aria-label={`Supprimer le témoignage ${index + 1}`}
                className="mt-2 self-start rounded p-1 text-[var(--shop-text)]/30 hover:text-red-600"
              >
                <Trash2 size={14} aria-hidden />
              </button>
            )}
          </figure>
        ))}
      </div>
      {editable && !cmsMode && (
        <button
          type="button"
          onClick={() => patch({ items: [...config.items, { name: '', text: '' }] })}
          className="mt-4 flex items-center gap-1.5 text-sm font-medium text-[var(--shop-accent)] hover:opacity-80"
        >
          <Plus size={15} aria-hidden /> Ajouter un témoignage
        </button>
      )}
    </section>
  )
}

export function TestimonialsEditor({ config, onChange }: SectionEditorProps<TestimonialsSectionConfig>) {
  const updateItem = (index: number, key: 'name' | 'text', value: string) => {
    const items = config.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item))
    onChange({ ...config, items })
  }

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
        <p className={`mt-1 ${editorHelpClass}`}>Le CMS ajoute notes en étoiles et photos — gérés dans Contenu → Avis.</p>
      </div>
      {config.source === 'cms' ? (
        <p className={editorHelpClass}>Ce bloc affiche tes avis actifs, dans ton ordre. Ajoute-les dans Contenu → Avis.</p>
      ) : (
      <>
      <div>
        <label className={editorLabelClass}>Titre</label>
        <input value={config.heading} onChange={(e) => onChange({ ...config, heading: e.target.value })} placeholder="Elles parlent de nous" className={editorInputClass} />
        <p className={`mt-1 ${editorHelpClass}`}>Vide = pas de titre au-dessus des avis.</p>
        <TextStyleField value={config.headingStyle} onChange={(headingStyle) => onChange({ ...config, headingStyle })} />
      </div>
      {config.items.map((item, index) => (
        <div key={index} className="space-y-2 rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Avis {index + 1}</span>
            {config.items.length > 1 && <button type="button" onClick={() => onChange({ ...config, items: config.items.filter((_, itemIndex) => itemIndex !== index) })} aria-label={`Supprimer l'avis ${index + 1}`} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>}
          </div>
          <textarea rows={3} value={item.text} onChange={(e) => updateItem(index, 'text', e.target.value)} placeholder="« Livraison rapide, qualité au top… »" className={editorInputClass} />
          <input value={item.name} onChange={(e) => updateItem(index, 'name', e.target.value)} placeholder="Nom de la cliente" className={editorInputClass} />
        </div>
      ))}
      {config.items.length < 8 && <button type="button" onClick={() => onChange({ ...config, items: [...config.items, { name: '', text: '' }] })} className="flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800"><Plus size={15} /> Ajouter un témoignage</button>}
      <p className={editorHelpClass}>Un avis sans texte n'est pas affiché sur la boutique.</p>
      </>
      )}
    </div>
  )
}
