import { useState } from 'react'
import { Eye, EyeOff, GripVertical, Palette, Plus, Sparkles, Trash2 } from 'lucide-react'
import { ADDABLE_SECTION_TYPES, SECTION_REGISTRY } from './sectionRegistry'
import type { BuilderTab } from './useBuilderState'
import type { LayoutSection, SectionType } from '@/types/builder'

const TABS: { key: BuilderTab; label: string; icon: typeof Palette }[] = [
  { key: 'blocks', label: 'Blocs', icon: GripVertical },
  { key: 'theme', label: 'Thème', icon: Palette },
  { key: 'templates', label: 'Templates', icon: Sparkles },
]

export function BuilderSidebar({
  sections,
  selectedSectionId,
  activeTab,
  onTabChange,
  onSelect,
  onToggleVisible,
  onRemove,
  onReorder,
  onAdd,
}: {
  sections: LayoutSection[]
  selectedSectionId: string | null
  activeTab: BuilderTab
  onTabChange: (tab: BuilderTab) => void
  onSelect: (id: string) => void
  onToggleVisible: (id: string) => void
  onRemove: (id: string) => void
  onReorder: (draggedId: string, targetId: string) => void
  onAdd: (type: SectionType) => void
}) {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [addMenuOpen, setAddMenuOpen] = useState(false)

  return (
    <div className="flex h-full flex-col border-r border-gray-200 bg-white">
      <div className="flex border-b border-gray-200">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => onTabChange(key)}
            className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium ${
              activeTab === key ? 'border-b-2 border-brand-600 text-brand-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={16} aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'blocks' && (
        <div className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-1">
            {sections.map((section) => {
              const def = SECTION_REGISTRY[section.type]
              const Icon = def.icon
              const isDraggable = !def.pinned
              return (
                <li
                  key={section.id}
                  draggable={isDraggable}
                  onDragStart={() => setDraggedId(section.id)}
                  onDragOver={(e) => {
                    if (isDraggable) e.preventDefault()
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (draggedId && draggedId !== section.id) onReorder(draggedId, section.id)
                    setDraggedId(null)
                  }}
                  onDragEnd={() => setDraggedId(null)}
                  className={`group flex items-center gap-1.5 rounded-lg px-2 py-2 ${
                    selectedSectionId === section.id ? 'bg-brand-50' : 'hover:bg-gray-50'
                  } ${draggedId === section.id ? 'opacity-40' : ''}`}
                >
                  {isDraggable ? (
                    <GripVertical size={14} className="shrink-0 cursor-grab text-gray-300" aria-hidden />
                  ) : (
                    <span className="w-3.5 shrink-0" />
                  )}
                  <button
                    type="button"
                    onClick={() => onSelect(section.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <Icon size={15} className="shrink-0 text-gray-500" aria-hidden />
                    <span className={`truncate text-sm ${selectedSectionId === section.id ? 'font-medium text-brand-700' : 'text-gray-700'}`}>
                      {def.label}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleVisible(section.id)}
                    aria-label={section.visible ? 'Masquer' : 'Afficher'}
                    className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                  >
                    {section.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  {!def.pinned && (
                    <button
                      type="button"
                      onClick={() => onRemove(section.id)}
                      aria-label="Supprimer"
                      className="shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>

          <div className="relative mt-2">
            <button
              type="button"
              onClick={() => setAddMenuOpen((open) => !open)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-600 hover:border-brand-300 hover:text-brand-700"
            >
              <Plus size={15} aria-hidden /> Ajouter un bloc
            </button>
            {addMenuOpen && (
              <div className="absolute left-0 right-0 z-10 mt-1 rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
                {ADDABLE_SECTION_TYPES.map((type) => {
                  const def = SECTION_REGISTRY[type]
                  const Icon = def.icon
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        onAdd(type)
                        setAddMenuOpen(false)
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Icon size={15} className="text-gray-500" aria-hidden />
                      {def.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab !== 'blocks' && (
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-gray-400">
          Les réglages s'affichent dans le panneau de droite →
        </div>
      )}
    </div>
  )
}
