import { Link } from 'react-router-dom'
import { UtensilsCrossed } from 'lucide-react'
import { useActiveProducts } from '@/features/products/useProducts'
import { useCategories } from '@/features/categories/useCategories'
import { formatCurrency } from '@/utils/format'
import { priceRange } from '@/utils/productPricing'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Shop, ProductWithRelations } from '@/types'
import type { MenuSectionConfig, ThemeConfig } from '@/types/builder'
import { SECTION_HEADING_SCALE } from '@/config/themeTokens'
import { editorHelpClass, editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'
import { resolveTextStyle } from '@/config/textStyle'
import { useInlineEdit } from '../inline/useInlineEdit'
import { InlineText } from '../inline/InlineText'
import { InlineStyleToolbar } from '../inline/InlineStyleToolbar'
import { TextStyleField } from '../components/TextStyleControls'

const DEFAULT_LIMIT = 48

/** Regroupe les plats par catégorie, dans l'ordre choisi par le commerçant ;
 *  les plats sans catégorie viennent en dernier. */
function groupByCategory(products: ProductWithRelations[], categoryOrder: string[]) {
  const groups = new Map<string, { name: string | null; items: ProductWithRelations[] }>()
  for (const product of products) {
    const key = product.category?.id ?? ''
    if (!groups.has(key)) groups.set(key, { name: product.category?.name ?? null, items: [] })
    groups.get(key)!.items.push(product)
  }
  const rank = (key: string) => {
    if (!key) return Number.MAX_SAFE_INTEGER
    const index = categoryOrder.indexOf(key)
    return index === -1 ? Number.MAX_SAFE_INTEGER - 1 : index
  }
  return [...groups.entries()].sort(([a], [b]) => rank(a) - rank(b)).map(([, group]) => group)
}

export function MenuRenderer({
  shop,
  config,
  themeConfig,
  sectionId,
  editable = false,
}: { shop: Shop; config: MenuSectionConfig; themeConfig: ThemeConfig; sectionId?: string; editable?: boolean }) {
  const patch = useInlineEdit(sectionId)
  const limit = config.limit ?? DEFAULT_LIMIT
  const { data: result, isLoading, isError } = useActiveProducts({
    shopId: shop.id,
    sort: 'recent',
    page: 1,
    pageSize: limit,
  })
  const { data: categories } = useCategories(shop.id)
  const items = result?.products ?? []

  if (isLoading) return <Spinner />
  if (isError) return <ErrorMessage />
  if (items.length === 0) {
    // Le visiteur n'a rien à faire d'une consigne de commerçant : la section s'efface.
    if (!editable) return null
    return (
      <EmptyState
        icon={UtensilsCrossed}
        title="Votre carte est vide"
        description="Ajoutez des produits dans le catalogue : ils apparaîtront ici, classés par catégorie."
      />
    )
  }

  const groups = groupByCategory(items, (categories ?? []).map((c) => c.id))

  return (
    <section className="mx-auto max-w-[var(--shop-content-width)] px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 border-b border-[var(--shop-text)]/10 pb-4">
        <InlineStyleToolbar editable={editable} style={config.headingStyle} onCommit={(headingStyle) => patch({ headingStyle })} label="Style du titre">
          <InlineText
            as="h2"
            editable={editable}
            value={config.heading || 'Notre carte'}
            onCommit={(heading) => patch({ heading })}
            placeholder="Titre"
            className={`font-heading font-bold text-[var(--shop-text)] ${SECTION_HEADING_SCALE[themeConfig.textScale]}`}
            style={resolveTextStyle(config.headingStyle)}
            label="Titre"
          />
        </InlineStyleToolbar>
      </div>

      <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
        {groups.map((group) => (
          <div key={group.name ?? 'autres'}>
            {group.name && (
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--shop-accent)]">{group.name}</h3>
            )}
            <ul className="divide-y divide-[var(--shop-text)]/10">
              {group.items.map((item) => (
                <MenuRow key={item.id} item={item} currency={shop.currency} showPrices={config.showPrices} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

function MenuRow({ item, currency, showPrices }: { item: ProductWithRelations; currency: string; showPrices: boolean }) {
  const cover = item.images[0]?.public_url
  const soldOut = item.stock <= 0
  const { min, hasRange } = priceRange(item)
  return (
    <li>
      <Link to={`/produits/${item.slug}`} className={`group flex items-start gap-3 py-3 ${soldOut ? 'opacity-60' : ''}`}>
        {cover && (
          <img
            src={cover}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-14 w-14 shrink-0 object-cover"
            style={{ borderRadius: 'var(--shop-radius)' }}
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-[var(--shop-text)] group-hover:underline group-hover:underline-offset-2">{item.name}</p>
          {item.description && <p className="mt-0.5 line-clamp-2 text-sm text-[var(--shop-text)]/60">{item.description}</p>}
          {soldOut && <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-[var(--shop-text)]/50">Épuisé</p>}
        </div>
        {showPrices && item.price > 0 && (
          <p className="shrink-0 whitespace-nowrap font-semibold text-[var(--shop-text)]">
            {hasRange && <span className="mr-1 text-xs font-normal opacity-70">dès</span>}
            {formatCurrency(min, currency)}
          </p>
        )}
      </Link>
    </li>
  )
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
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={config.showPrices}
          onChange={(e) => onChange({ ...config, showPrices: e.target.checked })}
          className="accent-brand-600"
        />
        Afficher les prix
      </label>
      <div>
        <label className={editorLabelClass}>Nombre de plats affichés</label>
        <input
          type="number"
          min={1}
          max={100}
          value={config.limit ?? DEFAULT_LIMIT}
          onChange={(e) => onChange({ ...config, limit: Math.max(1, Math.min(100, Number(e.target.value) || DEFAULT_LIMIT)) })}
          className={editorInputClass}
        />
        <p className={`mt-1 ${editorHelpClass}`}>Les plats sont classés par catégorie, dans l&apos;ordre de vos catégories.</p>
      </div>
    </div>
  )
}
