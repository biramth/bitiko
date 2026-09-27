import { CalendarClock, MousePointerClick } from 'lucide-react'
import { getEffectiveRegistry } from './effectiveRegistry'
import { isSectionScheduledVisible, type LayoutSection } from '@/types/builder'
import type { Shop } from '@/types'

/** `datetime-local` ⟷ ISO : le stockage reste en ISO (fuseau du client à la
 *  saisie, comme le reste du produit), l'input affiche l'heure locale. */
function toLocalInput(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromLocalInput(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.toISOString() : null
}

export function SectionEditorPanel({
  section,
  shop,
  shopId,
  templateId,
  removableBranding,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange,
  onMetaChange,
}: {
  section: LayoutSection | null
  shop: Shop
  shopId: string
  /** The shop's current template — resolves which section types (core plus
   *  whatever that template contributes) this panel knows how to edit. */
  templateId?: string | null
  removableBranding: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (config: any) => void
  onMetaChange?: (patch: { visibleFrom?: string | null; visibleTo?: string | null }) => void
}) {
  if (!section) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-400">
          <MousePointerClick size={24} aria-hidden />
        </span>
        <div>
          <p className="text-sm font-medium text-gray-700">Aucun bloc sélectionné</p>
          <p className="mt-1 max-w-[16rem] text-xs leading-relaxed text-gray-400">
            Cliquez sur un bloc dans la liste des blocs, ou directement dans l'aperçu, pour le personnaliser.
          </p>
        </div>
      </div>
    )
  }

  const def = getEffectiveRegistry(templateId)[section.type]

  if (!def) {
    // A section type the shop's current template no longer offers (e.g. it
    // was added under a different template that has since been switched
    // away from). Nothing to edit — the merchant can only remove it, from
    // the sidebar's own controls.
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-500">
          <MousePointerClick size={24} aria-hidden />
        </span>
        <div>
          <p className="text-sm font-medium text-gray-700">Ce bloc n'est plus disponible</p>
          <p className="mt-1 max-w-[16rem] text-xs leading-relaxed text-gray-400">
            Il appartient à un autre style. Vous pouvez le supprimer depuis la liste des blocs.
          </p>
        </div>
      </div>
    )
  }

  const Editor = def.Editor
  const Icon = def.icon

  const scheduled = section.visibleFrom != null || section.visibleTo != null
  const currentlyVisible = isSectionScheduledVisible(section)

  return (
    <div>
      <div className="mb-4 flex items-center gap-2.5">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm ${def.color}`}>
          <Icon size={16} aria-hidden />
        </span>
        <h3 className="font-heading text-base font-semibold text-gray-900">{def.label}</h3>
      </div>
      <Editor config={section.config} onChange={onChange} shop={shop} shopId={shopId} sectionId={section.id} removableBranding={removableBranding} />
      {onMetaChange && (
        <div className="mt-6 border-t border-gray-200 pt-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
            <CalendarClock size={13} aria-hidden /> Affichage planifié
          </p>
          {scheduled && (
            <p className={`mb-2 text-xs ${currentlyVisible ? 'text-emerald-600' : 'text-amber-600'}`}>
              {currentlyVisible ? 'Visible actuellement pour vos clients.' : 'Masqué actuellement pour vos clients.'}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600">Début</label>
              <input
                type="datetime-local"
                value={toLocalInput(section.visibleFrom)}
                onChange={(e) => onMetaChange({ visibleFrom: fromLocalInput(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 focus:border-brand-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Fin</label>
              <input
                type="datetime-local"
                value={toLocalInput(section.visibleTo)}
                onChange={(e) => onMetaChange({ visibleTo: fromLocalInput(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 focus:border-brand-400 focus:outline-none"
              />
            </div>
          </div>
          {scheduled && (
            <button
              type="button"
              onClick={() => onMetaChange({ visibleFrom: null, visibleTo: null })}
              className="mt-2 text-xs font-medium text-gray-500 hover:text-red-600"
            >
              Retirer la planification
            </button>
          )}
          <p className="mt-1 text-[11px] leading-snug text-gray-400">Vide = toujours affiché. Idéal pour une promo datée (Ramadan, fêtes…).</p>
        </div>
      )}
    </div>
  )
}
