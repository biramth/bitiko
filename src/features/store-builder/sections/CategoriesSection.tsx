import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { useCategories } from '@/features/categories/useCategories'
import { readableTextColor } from '@/features/categories/categoryTile'
import type { Shop } from '@/types'
import type { CategoriesSectionConfig, GridLayout, ThemeConfig } from '@/types/builder'
import { SECTION_HEADING_SCALE } from '@/config/themeTokens'
import { editorHelpClass, editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'
import { resolveTextStyle } from '@/config/textStyle'
import { useInlineEdit } from '../inline/useInlineEdit'
import { InlineText } from '../inline/InlineText'
import { InlineStyleToolbar } from '../inline/InlineStyleToolbar'
import { TextStyleField } from '../components/TextStyleControls'
import { VisualPicker } from '../components/VisualPicker'
import { SwatchBlock, SwatchFrame } from '../components/LayoutSwatch'

const TILE_THEMES = [
  'bg-[var(--shop-text)] text-white',
  'bg-[var(--shop-accent)] text-white',
  'bg-[var(--shop-secondary)] text-ink-900',
  'bg-[var(--shop-button)] text-white',
]

export function CategoriesRenderer({ shop, config, themeConfig, sectionId, editable = false }: { shop: Shop; config: CategoriesSectionConfig; themeConfig: ThemeConfig; sectionId?: string; editable?: boolean }) {
  const patch = useInlineEdit(sectionId)
  const { data: categories } = useCategories(shop.id)
  if (!categories || categories.length === 0) return null
  const carousel = (config.layout ?? 'grid') === 'carousel'

  return (
    <section className="mx-auto max-w-[var(--shop-content-width)] px-4 py-6 sm:px-6">
      {(config.heading.trim() || editable) && (
        <InlineStyleToolbar editable={editable} style={config.headingStyle} onCommit={(headingStyle) => patch({ headingStyle })} label="Style du titre">
          <InlineText
            as="h2"
            editable={editable}
            value={config.heading}
            onCommit={(heading) => patch({ heading })}
            placeholder="Titre"
            className={`mb-4 font-heading font-bold text-[var(--shop-text)] ${SECTION_HEADING_SCALE[themeConfig.textScale]}`}
            style={resolveTextStyle(config.headingStyle)}
            label="Titre"
          />
        </InlineStyleToolbar>
      )}
      <div className={carousel ? 'flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:thin]' : 'grid grid-cols-2 gap-3 sm:grid-cols-4'}>
        {categories.map((category, i) => {
          const customTheme = category.image_url || category.color
          const textClass = !customTheme
            ? ''
            : category.image_url
              ? 'text-white'
              : readableTextColor(category.color ?? '#000000') === '#1C1917'
                ? 'text-ink-900'
                : 'text-white'
          return (
            <Link
              key={category.id}
              to={`/catalogue?categorie=${category.slug}`}
              className={`group relative flex aspect-[4/3] flex-col justify-end overflow-hidden p-4 transition-opacity hover:opacity-90 ${carousel ? 'w-[70%] shrink-0 snap-start sm:w-[40%] lg:w-[24%] ' : ''}${textClass} ${
                customTheme ? '' : TILE_THEMES[i % TILE_THEMES.length]
              }`}
              style={{
                borderRadius: 'var(--shop-radius)',
                backgroundColor: category.color ?? undefined,
              }}
            >
              {category.image_url && (
                <img
                  src={category.image_url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              {category.image_url && (
                <span
                  className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/20"
                  aria-hidden
                />
              )}
              <span className="relative z-10 block">
                {category.emoji && <span className="mb-2 block text-2xl">{category.emoji}</span>}
                <span className="block text-sm font-semibold">{category.name}</span>
                {category.description && (
                  <span className="mt-0.5 line-clamp-2 block text-xs opacity-70">{category.description}</span>
                )}
              </span>
              <ArrowUpRight
                size={16}
                className="absolute right-4 top-4 z-10 opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden
              />
            </Link>
          )
        })}
      </div>
    </section>
  )
}

const GRID_LAYOUTS: { value: GridLayout; label: string; preview: React.ReactNode }[] = [
  {
    value: 'grid',
    label: 'Grille',
    preview: (
      <SwatchFrame className="flex-wrap content-between gap-1">
        {Array.from({ length: 6 }, (_, i) => <SwatchBlock key={i} className="h-[45%] w-[30%]" />)}
      </SwatchFrame>
    ),
  },
  {
    value: 'carousel',
    label: 'Carrousel',
    preview: (
      <SwatchFrame className="items-center gap-1">
        <SwatchBlock className="h-3/4 w-1/3" />
        <SwatchBlock className="h-3/4 w-1/3" />
        <SwatchBlock className="h-3/4 w-1/3 opacity-50" />
      </SwatchFrame>
    ),
  },
]

export function CategoriesEditor({ config, onChange }: SectionEditorProps<CategoriesSectionConfig>) {
  return (
    <div className="space-y-4">
      <div>
        <label className={editorLabelClass}>Titre (optionnel)</label>
        <input
          value={config.heading}
          onChange={(e) => onChange({ ...config, heading: e.target.value })}
          placeholder="Catégories"
          className={editorInputClass}
        />
        <p className={`mt-1 ${editorHelpClass}`}>Vide = aucun titre affiché.</p>
        <TextStyleField value={config.headingStyle} onChange={(headingStyle) => onChange({ ...config, headingStyle })} />
      </div>
      <div>
        <label className={editorLabelClass}>Disposition</label>
        <div className="mt-1">
          <VisualPicker
            columns={2}
            value={config.layout ?? 'grid'}
            onChange={(layout) => onChange({ ...config, layout })}
            options={GRID_LAYOUTS}
          />
        </div>
        <p className={`mt-1.5 ${editorHelpClass}`}>« Carrousel » affiche une seule rangée défilante horizontalement.</p>
      </div>
      <p className={editorHelpClass}>
        Les catégories affichées viennent de votre catalogue (Produits → Catégories).
      </p>
    </div>
  )
}
