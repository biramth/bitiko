import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { useCategories } from '@/features/categories/useCategories'
import type { Shop } from '@/types'
import type { CategoriesSectionConfig } from '@/types/builder'
import { editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'

const TILE_THEMES = [
  'bg-ink-900 text-white',
  'bg-[var(--shop-accent)] text-white',
  'bg-[var(--shop-secondary)] text-ink-900',
  'bg-ink-800 text-white',
]

export function CategoriesRenderer({ shop, config }: { shop: Shop; config: CategoriesSectionConfig }) {
  const { data: categories } = useCategories(shop.id)
  if (!categories || categories.length === 0) return null

  return (
    <section className="mx-auto max-w-[var(--shop-content-width)] px-4 py-6 sm:px-6">
      {config.heading.trim() && (
        <h2 className="mb-4 font-heading text-lg font-bold text-[var(--shop-text)]">{config.heading}</h2>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {categories.map((category, i) => (
          <Link
            key={category.id}
            to={`/catalogue?categorie=${category.slug}`}
            className={`group relative flex aspect-[4/3] flex-col justify-end overflow-hidden p-4 transition-opacity hover:opacity-90 ${TILE_THEMES[i % TILE_THEMES.length]}`}
            style={{ borderRadius: 'var(--shop-radius)' }}
          >
            <span className="text-sm font-semibold">{category.name}</span>
            <ArrowUpRight
              size={16}
              className="absolute right-4 top-4 opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              aria-hidden
            />
          </Link>
        ))}
      </div>
    </section>
  )
}

export function CategoriesEditor({ config, onChange }: SectionEditorProps<CategoriesSectionConfig>) {
  return (
    <div>
      <label className={editorLabelClass}>Titre (optionnel)</label>
      <input
        value={config.heading}
        onChange={(e) => onChange({ ...config, heading: e.target.value })}
        placeholder="Catégories"
        className={editorInputClass}
      />
      <p className="mt-2 text-xs text-gray-500">
        Les catégories affichées viennent de votre catalogue (Produits → Catégories).
      </p>
    </div>
  )
}
