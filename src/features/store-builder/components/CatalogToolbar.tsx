import { ArrowDownWideNarrow, Search } from 'lucide-react'

export interface CatalogSortOption {
  value: string
  label: string
}

export interface CatalogCategory {
  slug: string
  name: string
}

/** Barre d'outils catalogue partagée (produits + prestations) : recherche
 *  arrondie, chips de catégories défilantes et tri compact — le même langage
 *  que les boutiques, plus le soulignement « back-office » d'avant. */
export function CatalogToolbar({
  searchInput,
  onSearchInput,
  searchPlaceholder,
  searchLabel,
  categories,
  categorySlug,
  allCategoriesLabel,
  categoryLabel,
  onSelectCategory,
  sort,
  sortOptions,
  onSortChange,
  sortLabel,
}: {
  searchInput: string
  onSearchInput: (value: string) => void
  searchPlaceholder: string
  searchLabel: string
  categories: CatalogCategory[] | undefined
  categorySlug: string
  allCategoriesLabel: string
  categoryLabel: string
  onSelectCategory: (slug: string) => void
  sort: string
  sortOptions: CatalogSortOption[]
  onSortChange: (value: string) => void
  sortLabel: string
}) {
  return (
    <div className="mb-6 space-y-3">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--shop-text)]/40" aria-hidden />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => onSearchInput(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchLabel}
            className="w-full rounded-full border border-[var(--shop-text)]/15 bg-[var(--shop-surface)] py-2.5 pl-10 pr-4 text-sm text-[var(--shop-text)] placeholder:text-[var(--shop-text)]/40 focus:border-[var(--shop-accent)] focus:outline-none"
          />
        </div>
        <div className="relative shrink-0">
          <ArrowDownWideNarrow size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--shop-text)]/40" aria-hidden />
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            aria-label={sortLabel}
            className="max-w-[9.5rem] appearance-none truncate rounded-full border border-[var(--shop-text)]/15 bg-transparent py-2.5 pl-9 pr-3 text-sm text-[var(--shop-text)] focus:border-[var(--shop-accent)] focus:outline-none"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {(categories?.length ?? 0) > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label={categoryLabel}>
          <button
            type="button"
            onClick={() => onSelectCategory('')}
            aria-pressed={categorySlug === ''}
            className={`shrink-0 snap-start whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              categorySlug === ''
                ? 'bg-[var(--shop-button)] text-[var(--shop-button-text)]'
                : 'border border-[var(--shop-text)]/15 text-[var(--shop-text)]/70 hover:border-[var(--shop-text)]/40'
            }`}
          >
            {allCategoriesLabel}
          </button>
          {categories!.map((category) => (
            <button
              key={category.slug}
              type="button"
              onClick={() => onSelectCategory(category.slug)}
              aria-pressed={categorySlug === category.slug}
              className={`shrink-0 snap-start whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                categorySlug === category.slug
                  ? 'bg-[var(--shop-button)] text-[var(--shop-button-text)]'
                  : 'border border-[var(--shop-text)]/15 text-[var(--shop-text)]/70 hover:border-[var(--shop-text)]/40'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Pagination pouce-friendly : Préc./Suiv. autour des numéros. */
export function CatalogPagination({
  page,
  totalPages,
  onPage,
}: {
  page: number
  totalPages: number
  onPage: (page: number) => void
}) {
  if (totalPages <= 1) return null
  const arrowClass =
    'flex h-9 shrink-0 items-center px-3 text-sm font-semibold text-[var(--shop-text)]/70 transition-colors hover:bg-[var(--shop-text)]/10 disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent'
  return (
    <div className="mt-12 flex max-w-full items-center justify-center gap-1 overflow-x-auto pb-1">
      <button
        type="button"
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        aria-label="Page précédente"
        style={{ borderRadius: 'var(--shop-radius)' }}
        className={arrowClass}
      >
        ← Préc.
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPage(p)}
          aria-label={`Page ${p}`}
          aria-current={p === page ? 'page' : undefined}
          style={{ borderRadius: 'var(--shop-radius)' }}
          className={`h-9 w-9 shrink-0 text-sm font-medium transition-colors ${p === page ? 'bg-[var(--shop-button)] text-[var(--shop-button-text)]' : 'text-[var(--shop-text)]/70 hover:bg-[var(--shop-text)]/10'}`}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
        aria-label="Page suivante"
        style={{ borderRadius: 'var(--shop-radius)' }}
        className={arrowClass}
      >
        Suiv. →
      </button>
    </div>
  )
}
