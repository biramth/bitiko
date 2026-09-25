import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Eye, EyeOff, GripVertical, HelpCircle, Lock, Plus, Trash2 } from 'lucide-react'
import { getAddableSectionTypes, type SectionRegistry } from './sectionRegistry'
import { getEffectiveRegistry } from './effectiveRegistry'
import type { LayoutSection, SectionType } from '@/types/builder'

/** Small colored square with the section's icon — gives every block type a
 *  distinct, recognizable identity instead of one flat gray icon for all. */
function SectionIcon({ type, registry, size = 'sm' }: { type: SectionType; registry: SectionRegistry; size?: 'sm' | 'md' }) {
  const def = registry[type]
  const Icon = def?.icon ?? HelpCircle
  const dims = size === 'md' ? 'h-9 w-9 rounded-lg' : 'h-7 w-7 rounded-md'
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center bg-gradient-to-br text-white shadow-sm ${dims} ${def?.color ?? 'from-gray-400 to-gray-500'}`}
    >
      <Icon size={size === 'md' ? 17 : 14} aria-hidden />
    </span>
  )
}

const CATEGORY_LABELS = { content: 'Contenu', commerce: 'Commerce', services: 'Services' } as const

export function BuilderSidebar({
  sections,
  selectedSectionId,
  onSelect,
  onToggleVisible,
  onRemove,
  onDuplicate,
  onReorder,
  onAdd,
  availableTypes,
  templateId,
  maxCustomSections,
  protectedType,
}: {
  sections: LayoutSection[]
  selectedSectionId: string | null
  onSelect: (id: string) => void
  onToggleVisible: (id: string) => void
  onRemove: (id: string) => void
  onDuplicate: (id: string) => void
  onReorder: (draggedId: string, targetId: string) => void
  onAdd: (type: SectionType) => void
  /** Restricts the "+ Ajouter un bloc" menu to a subset of section types.
   *  Defaults to all addable types (used for the home page). */
  availableTypes?: SectionType[]
  /** The shop's current template — resolves which section types (core plus
   *  whatever that template contributes) show up here. */
  templateId?: string | null
  /** Plan cap on freely-addable content blocks on this page (see
   *  `Plan.maxCustomSections`) — catalog-display and commerce blocks are
   *  never limited. `null`/absent = unlimited. */
  maxCustomSections?: number | null
  /** The one section type this page can't do without (e.g. 'cart' on the cart
   *  page) — hides its delete button rather than letting the merchant click
   *  something that silently no-ops. */
  protectedType?: SectionType
}) {
  const registry = getEffectiveRegistry(templateId)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const listRef = useRef<HTMLUListElement>(null)
  const addMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!selectedSectionId || !listRef.current) return
    const el = listRef.current.querySelector<HTMLElement>(`[data-section-id="${selectedSectionId}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedSectionId])

  useEffect(() => {
    if (!addMenuOpen) return
    const onClickOutside = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) setAddMenuOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [addMenuOpen])

  const presentTypes = new Set(sections.map((s) => s.type))
  const addableTypes = (availableTypes ?? getAddableSectionTypes(registry)).filter((type) => {
    const def = registry[type]
    return !!def && !(def.singleton && presentTypes.has(type))
  })
  const groupedAddable: Record<'content' | 'commerce' | 'services', SectionType[]> = { content: [], commerce: [], services: [] }
  for (const type of addableTypes) groupedAddable[registry[type]?.category ?? 'content'].push(type)

  // Content blocks (Bannière, Texte, Image, Promotion, FAQ…) are the
  // "profondeur de personnalisation" the plan gates — catalog-display and
  // commerce blocks (Catégories, Produits, Panier…) are never limited.
  const customSectionCount = sections.filter((s) => {
    const def = registry[s.type]
    return !!def && def.category === 'content' && !def.pinned
  }).length
  const contentLimitReached = maxCustomSections != null && customSectionCount >= maxCustomSections

  return (
    <div className="flex h-full flex-col border-r border-gray-200 bg-white" data-guide="guide-builder-sidebar">
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <ul ref={listRef} className="space-y-1">
            {sections.map((section) => {
              const def = registry[section.type]
              const isDraggable = !def?.pinned
              const isSelected = selectedSectionId === section.id
              return (
                <li
                  key={section.id}
                  data-section-id={section.id}
                  draggable={isDraggable}
                  onDragStart={() => setDraggedId(section.id)}
                  onDragOver={(e) => {
                    if (isDraggable) {
                      e.preventDefault()
                      setDragOverId(section.id)
                    }
                  }}
                  onDragLeave={() => setDragOverId((id) => (id === section.id ? null : id))}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (draggedId && draggedId !== section.id) onReorder(draggedId, section.id)
                    setDraggedId(null)
                    setDragOverId(null)
                  }}
                  onDragEnd={() => {
                    setDraggedId(null)
                    setDragOverId(null)
                  }}
                  className={`group flex items-center gap-2 rounded-lg border py-1.5 pl-1.5 pr-1 transition-colors ${
                    isSelected
                      ? 'border-brand-200 bg-brand-50/70'
                      : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
                  } ${draggedId === section.id ? 'opacity-40' : ''} ${
                    dragOverId === section.id && draggedId !== section.id ? 'border-dashed border-brand-400' : ''
                  } ${!section.visible ? 'opacity-60' : ''}`}
                >
                  {isDraggable ? (
                    <GripVertical size={14} className="shrink-0 cursor-grab text-gray-300" aria-hidden />
                  ) : (
                    <span className="w-3.5 shrink-0" />
                  )}
                  <button
                    type="button"
                    onClick={() => onSelect(section.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 py-0.5 text-left"
                  >
                    <SectionIcon type={section.type} registry={registry} />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm ${isSelected ? 'font-semibold text-brand-700' : 'font-medium text-gray-700'}`}>
                        {def?.label ?? 'Bloc inconnu'}
                      </span>
                      {def?.pinned && <span className="block text-[10px] uppercase tracking-wide text-gray-400">Global</span>}
                      {!def?.pinned && section.type === protectedType && (
                        <span className="block text-[10px] uppercase tracking-wide text-gray-400">Indispensable</span>
                      )}
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={() => onToggleVisible(section.id)}
                      aria-label={section.visible ? 'Masquer' : 'Afficher'}
                      title={section.visible ? 'Masquer' : 'Afficher'}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                    >
                      {section.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    {!def?.pinned && !def?.singleton && (
                      <button
                        type="button"
                        onClick={() => onDuplicate(section.id)}
                        aria-label="Dupliquer"
                        title="Dupliquer ce bloc"
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                      >
                        <Copy size={14} />
                      </button>
                    )}
                    {!def?.pinned && section.type !== protectedType && (
                      <button
                        type="button"
                        onClick={() => onRemove(section.id)}
                        aria-label="Supprimer"
                        title="Supprimer ce bloc (Suppr)"
                        className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>

          {maxCustomSections != null && (
            <p className="mt-3 text-center text-[11px] text-gray-400">
              {customSectionCount}/{maxCustomSections} blocs de contenu utilisés sur cette page
            </p>
          )}

          <div className="relative mt-3" ref={addMenuRef}>
            <button
              type="button"
              onClick={() => setAddMenuOpen((open) => !open)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:border-brand-300 hover:bg-brand-50/40 hover:text-brand-700"
            >
              <Plus size={15} aria-hidden /> Ajouter un bloc
            </button>
            {addMenuOpen && (
              <div className="absolute left-0 right-0 z-20 mt-1.5 max-h-[22rem] overflow-y-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl">
                {(['commerce', 'content', 'services'] as const).map((cat) =>
                  groupedAddable[cat].length === 0 ? null : (
                    <div key={cat} className="mb-1 last:mb-0">
                      <div className="flex items-center justify-between gap-2 px-2 pb-1 pt-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                          {CATEGORY_LABELS[cat]}
                        </p>
                        {cat === 'content' && contentLimitReached && (
                          <Link
                            to="/admin/parametres/facturation"
                            onClick={() => setAddMenuOpen(false)}
                            className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 hover:text-amber-700"
                          >
                            <Lock size={10} aria-hidden /> Changer de plan
                          </Link>
                        )}
                      </div>
                      {groupedAddable[cat].map((type) => {
                        const def = registry[type]
                        if (!def) return null
                        const locked = cat === 'content' && contentLimitReached
                        return (
                          <button
                            key={type}
                            type="button"
                            disabled={locked}
                            title={locked ? `Limite de blocs de contenu atteinte (${maxCustomSections}) — changez de plan pour plus.` : undefined}
                            onClick={() => {
                              onAdd(type)
                              setAddMenuOpen(false)
                            }}
                            className={`flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left ${
                              locked ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-50'
                            }`}
                          >
                            <SectionIcon type={type} registry={registry} size="md" />
                            <span className="min-w-0 flex-1 pt-0.5">
                              <span className="block text-sm font-medium text-gray-900">{def.label}</span>
                              <span className="block text-xs leading-snug text-gray-500">{def.description}</span>
                            </span>
                            {locked && <Lock size={13} className="mt-0.5 shrink-0 text-amber-500" aria-hidden />}
                          </button>
                        )
                      })}
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </div>
    </div>
  )
}
