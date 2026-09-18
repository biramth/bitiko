import { useState } from 'react'
import { ChevronDown, GripVertical, Plus, Trash2 } from 'lucide-react'
import type { Shop } from '@/types'
import type { FlexibleBlock, FlexibleSectionConfig } from '@/types/builder'
import { BLOCK_REGISTRY } from '../blockRegistry'
import { useInlineEdit } from '../inline/useInlineEdit'
import { editorHelpClass, type SectionEditorProps } from './shared'

export function FlexibleRenderer({
  config,
  shop,
  sectionId,
  editable = false,
}: {
  config: FlexibleSectionConfig
  shop?: Shop
  sectionId?: string
  editable?: boolean
}) {
  const patch = useInlineEdit(sectionId)
  const blocks = config.blocks ?? []
  const addBlock = (type: keyof typeof BLOCK_REGISTRY) => patch({ blocks: [...blocks, BLOCK_REGISTRY[type].createDefault()] })
  if (blocks.length === 0 && !editable) return null
  return (
    <section className="mx-auto max-w-[var(--shop-content-width)] space-y-6 px-4 py-6 sm:px-6">
      {blocks.map((block) => {
        const def = BLOCK_REGISTRY[block.type]
        if (!def) return null
        const Renderer = def.Renderer
        const content = (
          <Renderer
            block={block}
            editable={editable}
            shopId={shop?.id}
            sectionId={sectionId}
            onChange={(next: FlexibleBlock) => patch({ blocks: blocks.map((b) => (b.id === block.id ? next : b)) })}
          />
        )
        if (!editable) return <div key={block.id}>{content}</div>
        return (
          <div key={block.id} className="group/block relative rounded-lg outline-1 -outline-offset-1 outline-transparent hover:outline-dashed hover:outline-[var(--shop-accent)]/40">
            {content}
            <button
              type="button"
              onClick={() => patch({ blocks: blocks.filter((b) => b.id !== block.id) })}
              aria-label="Supprimer ce bloc"
              className="absolute -right-2 -top-2 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-white bg-red-600 text-white opacity-0 shadow transition-opacity group-hover/block:opacity-100 hover:bg-red-700"
            >
              <Trash2 size={12} aria-hidden />
            </button>
          </div>
        )
      })}
      {editable && blocks.length === 0 && (
        <p className="rounded-lg border border-dashed border-[var(--shop-text)]/15 py-8 text-center text-sm text-[var(--shop-text)]/40">
          Section vide — ajoutez un bloc ci-dessous.
        </p>
      )}
      {editable && (
        <div className="flex flex-wrap gap-2">
          {(Object.keys(BLOCK_REGISTRY) as (keyof typeof BLOCK_REGISTRY)[]).map((type) => {
            const Icon = BLOCK_REGISTRY[type].icon
            return (
              <button
                key={type}
                type="button"
                onClick={() => addBlock(type)}
                className="flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--shop-text)]/20 px-3 py-1.5 text-xs font-medium text-[var(--shop-text)]/60 hover:border-[var(--shop-accent)] hover:text-[var(--shop-accent)]"
              >
                <Icon size={13} aria-hidden /> {BLOCK_REGISTRY[type].label}
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}

export function FlexibleEditor({ config, onChange, shopId, sectionId }: SectionEditorProps<FlexibleSectionConfig>) {
  const blocks = config.blocks ?? []
  const [expandedId, setExpandedId] = useState<string | null>(blocks[0]?.id ?? null)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const updateBlock = (id: string, next: FlexibleBlock) => {
    onChange({ ...config, blocks: blocks.map((b) => (b.id === id ? next : b)) })
  }

  const removeBlock = (id: string) => {
    onChange({ ...config, blocks: blocks.filter((b) => b.id !== id) })
    if (expandedId === id) setExpandedId(null)
  }

  const addBlock = (type: keyof typeof BLOCK_REGISTRY) => {
    const block = BLOCK_REGISTRY[type].createDefault()
    onChange({ ...config, blocks: [...blocks, block] })
    setExpandedId(block.id)
    setAddMenuOpen(false)
  }

  const reorder = (draggedBlockId: string, targetBlockId: string) => {
    const draggedIndex = blocks.findIndex((b) => b.id === draggedBlockId)
    const targetIndex = blocks.findIndex((b) => b.id === targetBlockId)
    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return
    const next = [...blocks]
    const [dragged] = next.splice(draggedIndex, 1)
    next.splice(targetIndex, 0, dragged)
    onChange({ ...config, blocks: next })
  }

  return (
    <div className="space-y-3">
      {blocks.length === 0 && (
        <p className={editorHelpClass}>
          Une section vide — ajoutez un bloc texte, image, bouton ou espacement pour composer votre mise en page.
        </p>
      )}
      <ul className="space-y-2">
        {blocks.map((block) => {
          const def = BLOCK_REGISTRY[block.type]
          const Icon = def?.icon
          const Editor = def?.Editor
          const isExpanded = expandedId === block.id
          return (
            <li
              key={block.id}
              draggable
              onDragStart={() => setDraggedId(block.id)}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOverId(block.id)
              }}
              onDragLeave={() => setDragOverId((id) => (id === block.id ? null : id))}
              onDrop={(e) => {
                e.preventDefault()
                if (draggedId && draggedId !== block.id) reorder(draggedId, block.id)
                setDraggedId(null)
                setDragOverId(null)
              }}
              onDragEnd={() => {
                setDraggedId(null)
                setDragOverId(null)
              }}
              className={`rounded-lg border ${
                dragOverId === block.id && draggedId !== block.id ? 'border-dashed border-brand-400' : 'border-gray-200'
              } ${draggedId === block.id ? 'opacity-40' : ''}`}
            >
              <div className="flex items-center gap-2 p-2">
                <GripVertical size={14} className="shrink-0 cursor-grab text-gray-300" aria-hidden />
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : block.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  {Icon && <Icon size={14} className="shrink-0 text-gray-400" aria-hidden />}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-700">{def?.label ?? 'Bloc'}</span>
                  <ChevronDown size={14} className={`shrink-0 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => removeBlock(block.id)}
                  aria-label="Supprimer ce bloc"
                  className="shrink-0 rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              {isExpanded && Editor && (
                <div className="border-t border-gray-100 p-3">
                  <Editor block={block} onChange={(next: FlexibleBlock) => updateBlock(block.id, next)} shopId={shopId} sectionId={sectionId} />
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <div className="relative">
        <button
          type="button"
          onClick={() => setAddMenuOpen((open) => !open)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:border-brand-300 hover:bg-brand-50/40 hover:text-brand-700"
        >
          <Plus size={14} aria-hidden /> Ajouter un bloc
        </button>
        {addMenuOpen && (
          <div className="absolute left-0 right-0 z-10 mt-1.5 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl">
            {(Object.keys(BLOCK_REGISTRY) as (keyof typeof BLOCK_REGISTRY)[]).map((type) => {
              const def = BLOCK_REGISTRY[type]
              const Icon = def.icon
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => addBlock(type)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Icon size={15} className="text-gray-400" aria-hidden />
                  {def.label}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
