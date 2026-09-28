import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PackageSearch } from 'lucide-react'
import { useActiveServices } from '@/features/services/useServices'
import { useActiveShopPromos } from '@/features/cms/useCmsContent'
import { badgeForService } from '@/features/promos/promoTargeting'
import { CatalogPagination, CatalogToolbar } from '../components/CatalogToolbar'
import { useCategories } from '@/features/categories/useCategories'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { ServiceCard } from '@/features/services/ServiceCard'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { EmptyState } from '@/components/ui/EmptyState'
import { ContactShopLink } from '../components/ContactShopLink'
import { SERVICES_PAGE_SIZE } from '@/config/constants'
import type { ServiceFilters } from '@/services/service.service'
import type { Shop } from '@/types'
import type { GridLayout, ServicesSectionConfig, ThemeConfig } from '@/types/builder'
import { sectionHeadingClass } from '@/config/themeTokens'
import { editorHelpClass, editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'
import { resolveTextStyle } from '@/config/textStyle'
import { useInlineEdit } from '../inline/useInlineEdit'
import { InlineText } from '../inline/InlineText'
import { InlineStyleToolbar } from '../inline/InlineStyleToolbar'
import { TextStyleField } from '../components/TextStyleControls'
import { VisualPicker } from '../components/VisualPicker'
import { SwatchBlock, SwatchFrame } from '../components/LayoutSwatch'

export function ServicesRenderer({
  shop,
  config,
  themeConfig,
  sectionId,
  editable = false,
}: { shop: Shop; config: ServicesSectionConfig; themeConfig: ThemeConfig; sectionId?: string; editable?: boolean }) {
  const patch = useInlineEdit(sectionId)
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchInput, setSearchInput] = useState(() => searchParams.get('q') ?? '')
  const search = useDebouncedValue(searchInput, 300)
  const { data: categories } = useCategories(shop.id, 'service')

  const fullToolbox = config.enableFilters === true
  const categorySlug = fullToolbox ? (searchParams.get('categorie') ?? '') : ''
  const categoryId = fullToolbox ? categories?.find((c) => c.slug === categorySlug)?.id : undefined
  const sort = (fullToolbox ? (searchParams.get('tri') as ServiceFilters['sort']) : config.sort) ?? config.sort
  const page = fullToolbox ? Math.max(1, Number(searchParams.get('page')) || 1) : 1

  const { data: result, isLoading, isError } = useActiveServices({
    shopId: shop.id,
    sort,
    page,
    search: fullToolbox ? (search || undefined) : undefined,
    categoryId: fullToolbox ? categoryId : undefined,
  })
  const services = fullToolbox ? (result?.services ?? []) : (result?.services ?? []).slice(0, config.limit)
  const total = result?.total ?? services.length
  const totalPages = fullToolbox ? Math.max(1, Math.ceil(total / SERVICES_PAGE_SIZE)) : 1
  const { data: promos } = useActiveShopPromos(shop.id)

  useEffect(() => {
    if (!fullToolbox) return
    const urlSearch = searchParams.get('q') ?? ''
    if (urlSearch === search) return
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (search) next.set('q', search)
        else next.delete('q')
        next.delete('page')
        return next
      },
      { replace: true },
    )
  }, [fullToolbox, search, searchParams, setSearchParams])

  const setParam = (key: string, value: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        next.delete('page')
        return next
      },
      { replace: true },
    )
  }

  // Une section d'accueil vide n'apporte rien au visiteur : on la masque
  // (le commerçant, lui, la voit dans l'éditeur pour la remplir).
  if (!fullToolbox && !editable && !isLoading && !isError && services.length === 0) return null

  return (
    <section className="mx-auto max-w-[var(--shop-content-width)] px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 flex items-end justify-between gap-3 border-b border-ink-900/10 pb-4">
        <InlineStyleToolbar editable={editable} style={config.headingStyle} onCommit={(headingStyle) => patch({ headingStyle })} label="Style du titre">
          <InlineText
            as="h2"
            editable={editable}
            value={config.heading || 'Nos prestations'}
            onCommit={(heading) => patch({ heading })}
            placeholder="Titre"
            className={`min-w-0 font-heading font-bold text-[var(--shop-text)] ${sectionHeadingClass(themeConfig)}`}
            style={resolveTextStyle(config.headingStyle)}
            label="Titre"
          />
        </InlineStyleToolbar>
        {!fullToolbox && services.length > 0 && (
          <Link to="/prestations" className="shrink-0 text-xs font-semibold uppercase tracking-widest text-[var(--shop-text)] hover:opacity-60">
            Tout voir
          </Link>
        )}
      </div>

      {fullToolbox && (
        <CatalogToolbar
          searchInput={searchInput}
          onSearchInput={setSearchInput}
          searchPlaceholder="Rechercher une prestation…"
          searchLabel="Rechercher une prestation"
          categories={categories}
          categorySlug={categorySlug}
          allCategoriesLabel="Tout"
          categoryLabel="Filtrer par catégorie"
          onSelectCategory={(slug) => {
            setSearchInput('')
            setSearchParams(
              (prev) => {
                const next = new URLSearchParams(prev)
                next.delete('q')
                if (slug) next.set('categorie', slug)
                else next.delete('categorie')
                next.delete('page')
                return next
              },
              { replace: true },
            )
          }}
          sort={sort}
          sortOptions={[
            { value: 'manual', label: 'Notre sélection' },
            { value: 'price_asc', label: 'Prix croissant' },
            { value: 'price_desc', label: 'Prix décroissant' },
            { value: 'duration_asc', label: 'Durée croissante' },
            { value: 'duration_desc', label: 'Durée décroissante' },
          ]}
          onSortChange={(value) => setParam('tri', value)}
          sortLabel="Trier les prestations"
        />
      )}

      {!isLoading && !isError && fullToolbox && total > 0 && (
        <p className="mb-4 text-sm text-[var(--shop-text)]/60">
          {total} prestation{total > 1 ? 's' : ''}
          {search ? ` pour « ${search} »` : ''}
        </p>
      )}

      {isLoading && <Spinner />}
      {isError && <ErrorMessage />}
      {!isLoading && !isError && services.length === 0 && (
        <EmptyState
          icon={PackageSearch}
          title={search ? 'Aucune prestation trouvée' : 'Aucune prestation pour le moment'}
          description={search ? `Aucun résultat pour « ${search} ».` : 'Nos prestations arrivent — écrivez-nous, on vous conseille avec plaisir.'}
          action={search ? undefined : <ContactShopLink shop={shop} />}
        />
      )}
      {!isLoading && services.length > 0 && (
        <>
          {(config.layout ?? 'grid') === 'carousel' ? (
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:thin]">
              {services.map((service) => (
                <div key={service.id} className="w-[70%] shrink-0 snap-start sm:w-[40%] lg:w-[24%]">
                  <ServiceCard service={service} currency={shop.currency} promoBadge={badgeForService(promos ?? [], service)} />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8">
              {services.map((service) => (
                <ServiceCard key={service.id} service={service} currency={shop.currency} promoBadge={badgeForService(promos ?? [], service)} />
              ))}
            </div>
          )}

          {fullToolbox && (
            <CatalogPagination
              page={page}
              totalPages={totalPages}
              onPage={(p) =>
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev)
                  next.set('page', String(p))
                  return next
                }, { replace: true })
              }
            />
          )}
        </>
      )}
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

export function ServicesEditor({ config, onChange }: SectionEditorProps<ServicesSectionConfig>) {
  return (
    <div className="space-y-4">
      <div>
        <label className={editorLabelClass}>Titre</label>
        <input value={config.heading} onChange={(e) => onChange({ ...config, heading: e.target.value })} className={editorInputClass} />
        <p className={`mt-1 ${editorHelpClass}`}>Vide = « Nos prestations ».</p>
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
      <div>
        <label className={editorLabelClass}>Tri</label>
        <select value={config.sort} onChange={(e) => onChange({ ...config, sort: e.target.value as ServicesSectionConfig['sort'] })} className={editorInputClass}>
          <option value="manual">Ordre manuel</option>
          <option value="price_asc">Prix croissant</option>
          <option value="price_desc">Prix décroissant</option>
          <option value="duration_asc">Durée croissante</option>
          <option value="duration_desc">Durée décroissante</option>
        </select>
      </div>
      <div>
        <label className={editorLabelClass}>Nombre de prestations affichées</label>
        <input
          type="number"
          min={1}
          max={48}
          value={config.limit}
          disabled={config.enableFilters === true}
          onChange={(e) => onChange({ ...config, limit: Math.max(1, Number(e.target.value) || 1) })}
          className={`${editorInputClass} disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400`}
        />
        {config.enableFilters === true && (
          <p className={`mt-1 ${editorHelpClass}`}>Ignoré quand les outils de catalogue sont activés (pagination à la place).</p>
        )}
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={config.enableFilters === true}
          onChange={(e) => onChange({ ...config, enableFilters: e.target.checked })}
          className="accent-brand-600"
        />
        Outils de catalogue (recherche, catégories, tri, pagination)
      </label>
    </div>
  )
}