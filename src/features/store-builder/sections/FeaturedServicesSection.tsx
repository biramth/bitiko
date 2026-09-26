import { Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useActiveServices } from '@/features/services/useServices'
import { ServiceCard } from '@/features/services/ServiceCard'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
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

  const { data: result, isLoading, isError } = useActiveServices({
    shopId: shop.id,
    ids: config.serviceIds,
  })
  const services = result?.services ?? []

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
      {isError && <div className="text-center py-8 text-red-600">Erreur de chargement</div>}
      {!isLoading && services.length === 0 && (
        <EmptyState
          icon={Star}
          title="Aucune prestation sélectionnée"
          description="Ajoutez des IDs de prestations dans l'éditeur pour les afficher ici."
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

export function FeaturedServicesEditor({ config, onChange }: SectionEditorProps<FeaturedServicesSectionConfig>) {
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
        <label className={editorLabelClass}>IDs des prestations (séparés par des virgules)</label>
        <textarea
          value={config.serviceIds.join(', ')}
          onChange={(e) => onChange({ ...config, serviceIds: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
          className={editorInputClass}
          rows={3}
          placeholder="svc_abc123, svc_def456, svc_ghi789"
        />
        <p className={`mt-1 ${editorHelpClass}`}>Récupérez les IDs dans l'URL d'édition de chaque prestation.</p>
      </div>
    </div>
  )
}