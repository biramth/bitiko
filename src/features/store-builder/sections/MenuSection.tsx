import { UtensilsCrossed } from 'lucide-react'
import { useActiveProducts } from '@/features/products/useProducts'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Shop } from '@/types'
import type { MenuSectionConfig, ThemeConfig } from '@/types/builder'
import { SECTION_HEADING_SCALE } from '@/config/themeTokens'
import { editorHelpClass, editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'
import { resolveTextStyle } from '@/config/textStyle'
import { useInlineEdit } from '../inline/useInlineEdit'
import { InlineText } from '../inline/InlineText'
import { InlineStyleToolbar } from '../inline/InlineStyleToolbar'
import { TextStyleField } from '../components/TextStyleControls'
import { VisualPicker } from '../components/VisualPicker'
import { SwatchBlock, SwatchFrame } from '../components/LayoutSwatch'

const GRID_LAYOUTS = [
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
] as const

export function MenuRenderer({
  shop,
  config,
  themeConfig,
  sectionId,
  editable = false,
}: { shop: Shop; config: MenuSectionConfig; themeConfig: ThemeConfig; sectionId?: string; editable?: boolean }) {
  const patch = useInlineEdit(sectionId)

  // In reality, this would use a dedicated menu service
  // For now, we reuse the products service
  const { data: result, isLoading, isError } = useActiveProducts({
    shopId: shop.id,
    sort: 'manual',
    page: 1,
    limit: config.limit ?? 12,
  })
  const items = result?.products ?? []

  if (isLoading) return <Spinner />
  if (isError) return <div className="text-center py-8 text-red-600">Erreur de chargement du menu</div>
  if (items.length === 0) {
    return (
      <EmptyState
        icon={UtensilsCrossed}
        title="Aucun élément au menu"
        description="Ajoutez des produits ou services dans le catalogue pour les afficher ici."
      />
    )
  }

  return (
    <section className="mx-auto max-w-[var(--shop-content-width)] px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 flex items-end justify-between border-b border-ink-900/10 pb-4">
        <h2 className={`font-heading font-bold text-[var(--shop-text)] ${SECTION_HEADING_SCALE[themeConfig.textScale]}`}>
          {config.heading || 'Notre carte'}
        </h2>
      </div>

      {(config.layout ?? 'grid') === 'carousel' ? (
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:thin]">
          {items.map((item) => (
            <div key={item.id} className="w-[70%] shrink-0 snap-start sm:w-[40%] lg:w-[24%]">
              <MenuItemCard item={item} currency={shop.currency} showPrices={config.showPrices} showAllergens={config.showAllergens} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-4 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <MenuItemCard key={item.id} item={item} currency={shop.currency} showPrices={config.showPrices} showAllergens={config.showAllergens} />
          ))}
        </div>
      )}
    </section>
  )
}

function MenuItemCard({ item, currency, showPrices, showAllergens }: { item: any; currency: string; showPrices: boolean; showAllergens: boolean }) {
  return (
    <article className="group bg-[var(--shop-surface)] rounded-2xl border border-[var(--shop-border)] overflow-hidden transition-shadow hover:shadow-xl">
      {item.images?.[0] && (
        <div className="aspect-square relative overflow-hidden">
          <img
            src={item.images[0]}
            alt={item.name}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        </div>
      )}
      <div className="p-4">
        <h3 className="font-semibold text-[var(--shop-text)]">{item.name}</h3>
        {item.description && <p className="mt-1 text-sm text-[var(--shop-text)]/60 line-clamp-2">{item.description}</p>}
        {showPrices && item.price && (
          <p className="mt-2 font-bold text-brand-600">{formatPrice(item.price, currency)}</p>
        )}
        {showAllergens && item.allergens && item.allergens.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.allergens.map((a: string) => (
              <span key={a} className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-100 text-amber-800">
                {a}
              </span>
            ))}
          </div>
        )}
        {item.preparationTime && (
          <div className="mt-2 flex items-center gap-1 text-xs text-[var(--shop-text)]/60">
            <Clock size={12} />
            <span>{item.preparationTime} min</span>
          </div>
        )}
      </div>
    </article>
  )
}

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, minimumFractionDigits: 0 }).format(price / 100)
}

export function MenuEditor({ config, onChange }: SectionEditorProps<MenuSectionConfig>) {
  return (
    <div className="space-y-4">
      <div>
        <label className={editorLabelClass}>Titre</label>
        <input value={config.heading} onChange={(e) => onChange({ ...config, heading: e.target.value })} className={editorInputClass} />
        <p className={`mt-1 ${editorHelpClass}`}>Vide = « Notre carte ».</p>
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
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={config.showPrices}
            onChange={(e) => onChange({ ...config, showPrices: e.target.checked })}
            className="accent-brand-600"
          />
          Afficher les prix
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={config.showAllergens}
            onChange={(e) => onChange({ ...config, showAllergens: e.target.checked })}
            className="accent-brand-600"
          />
          Afficher les allergènes
        </label>
      </div>
      <div>
        <label className={editorLabelClass}>Nombre d'éléments affichés</label>
        <input
          type="number"
          min={1}
          max={48}
          value={config.limit ?? 12}
          onChange={(e) => onChange({ ...config, limit: Math.max(1, Math.min(48, Number(e.target.value) || 12)) })}
          className={editorInputClass}
        />
      </div>
    </div>
  )
}