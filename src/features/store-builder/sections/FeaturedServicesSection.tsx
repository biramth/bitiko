import { Check, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useActiveServices } from '@/features/services/useServices'
import { ServiceCard } from '@/features/services/ServiceCard'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import type { Shop } from '@/types'
import type { GridLayout, FeaturedServicesSectionConfig, ThemeConfig } from '@/types/builder'
import { SECTION_HEADING_SCALE } from '@/config/themeTokens'
import { editorHelpClass, editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'
import { resolveTextStyle } from '@/config/textStyle'
import { useInlineEdit } from '../inline/useInlineEdit'
import { InlineText } from '../inline/InlineText'
import { InlineStyleToolbar } from '../inline/InlineStyleToolbar'
import { TextStyleField } from '../components/TextStyleControls'
import { VisualPicker } from '../components/VisualPicker'
import { SwatchBlock, SwatchFrame } from '../components/LayoutSwatch'

const FALLBACK_COUNT = 4

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

export function FeaturedServicesRenderer({
  shop,
  config,
  themeConfig,
  sectionId,
  editable = false,
}: { shop: Shop; config: FeaturedServicesSectionConfig; themeConfig: ThemeConfig; sectionId?: string; editable?: boolean }) {
  const patch = useInlineEdit(sectionId)

  // Sans choix du commerçant : les premières prestations, pas une section vide.
  const chosen = config.serviceIds.length > 0
  const { data: result, isLoading, isError } = useActiveServices({
    shopId: shop.id,
    ids: chosen ? config.serviceIds : undefined,
    limit: FALLBACK_COUNT,
  })
  const services = result?.services ?? []

  // Rien à mettre en avant : le visiteur ne voit pas de section vide, le commerçant si.
  if (!isLoading && !isError && services.length === 0 && !editable) return null

  return (
    <section className="mx-auto max-w-[var(--shop-content-width)] px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 flex items-end justify-between border-b border-ink-900/10 pb-4">
        <InlineStyleToolbar editable={editable} style={config.headingStyle} onCommit={(headingStyle) => patch({ headingStyle })} label="Style du titre">
          <InlineText
            as="h2"
            editable={editable}
            value={config.heading || 'Nos coups de cœur'}
            onCommit={(heading) => patch({ heading })}
            placeholder="Titre"
            className={`font-heading font-bold text-[var(--shop-text)] ${SECTION_HEADING_SCALE[themeConfig.textScale]}`}
            style={resolveTextStyle(config.headingStyle)}
            label="Titre"
          />
        </InlineStyleToolbar>
        {services.length > 0 && (
          <Link to="/prestations" className="text-xs font-semibold uppercase tracking-widest text-[var(--shop-text)] hover:opacity-60">
            Tout voir
          </Link>
        )}
      </div>

      {isLoading && <Spinner />}
      {isError && <ErrorMessage />}
      {!isLoading && services.length === 0 && (
        <EmptyState
          icon={Star}
          title="Aucune prestation à afficher"
          description="Ajoutez des prestations pour les mettre en avant ici."
        />
      )}
      {!isLoading && services.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} currency={shop.currency} />
          ))}
        </div>
      )}
    </section>
  )
}

export function FeaturedServicesEditor({ config, onChange, shopId }: SectionEditorProps<FeaturedServicesSectionConfig>) {
  const { data: result, isLoading } = useActiveServices({ shopId, limit: 100, pageSize: 100 })
  const services = result?.services ?? []
  const toggle = (id: string) =>
    onChange({
      ...config,
      serviceIds: config.serviceIds.includes(id) ? config.serviceIds.filter((s) => s !== id) : [...config.serviceIds, id],
    })

  return (
    <div className="space-y-4">
      <div>
        <label className={editorLabelClass}>Titre</label>
        <input value={config.heading} onChange={(e) => onChange({ ...config, heading: e.target.value })} className={editorInputClass} />
        <p className={`mt-1 ${editorHelpClass}`}>Vide = « Nos coups de cœur ».</p>
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
        <span className={editorLabelClass}>Prestations à mettre en avant ({config.serviceIds.length})</span>
        <p className={`mt-1 ${editorHelpClass}`}>Aucune prestation cochée = les {FALLBACK_COUNT} premières.</p>
        <div className="mt-2 max-h-72 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-1.5">
          {isLoading && <p className="px-2 py-3 text-sm text-gray-500">Chargement…</p>}
          {!isLoading && services.length === 0 && <p className="px-2 py-3 text-sm text-gray-500">Aucune prestation pour le moment.</p>}
          {services.map((service) => {
            const selected = config.serviceIds.includes(service.id)
            return (
              <button
                key={service.id}
                type="button"
                onClick={() => toggle(service.id)}
                aria-pressed={selected}
                className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm ${selected ? 'bg-brand-50' : 'hover:bg-gray-50'}`}
              >
                <span className="min-w-0 flex-1 truncate text-gray-900">{service.name}</span>
                {selected && <Check size={15} className="shrink-0 text-brand-600" aria-hidden />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}