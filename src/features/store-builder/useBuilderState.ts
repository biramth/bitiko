import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createSectionId } from '@/config/defaultLayout'
import { SECTION_REGISTRY } from './sectionRegistry'
import type { LayoutSection, SectionType, StoreTemplate, ThemeConfig } from '@/types/builder'

export type BuilderTab = 'blocks' | 'theme' | 'templates'

/** An immutable snapshot of everything the builder can edit. Every mutation
 * commits a new snapshot, which is what makes undo/redo trivial. */
export interface BuilderSnapshot {
  sections: LayoutSection[]
  themeColor: string
  themeConfig: ThemeConfig
}

/** Decouples the builder from the entity it's editing (home page or a custom
 * page). The parent constructs one of these and the hook never knows whether
 * it's persisting to `shops` or `pages`. */
export interface BuilderTarget {
  initialSections: LayoutSection[]
  initialThemeColor: string
  initialThemeConfig: ThemeConfig
  /** Persist draft state (called on "Enregistrer"). */
  saveDraft: (snapshot: BuilderSnapshot) => Promise<unknown>
  /** Persist published state (called on "Publier"). */
  publish: (snapshot: BuilderSnapshot) => Promise<unknown>
  /** Query keys to invalidate after a successful save. */
  invalidateKeys?: { queryKey: string[] }[]
}

const HISTORY_LIMIT = 50

export function useBuilderState(target: BuilderTarget) {
  const queryClient = useQueryClient()

  const [snapshot, setSnapshot] = useState<BuilderSnapshot>(() => ({
    sections: target.initialSections,
    themeColor: target.initialThemeColor,
    themeConfig: target.initialThemeConfig,
  }))
  const [past, setPast] = useState<BuilderSnapshot[]>([])
  const [future, setFuture] = useState<BuilderSnapshot[]>([])
  const [dirty, setDirty] = useState(false)
  const [activeTab, setActiveTab] = useState<BuilderTab>('blocks')
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)

  const { sections, themeColor, themeConfig } = snapshot

  const selectedSection = sections.find((s) => s.id === selectedSectionId) ?? null

  /** Push a new snapshot onto the history stack (and clear the redo trail). */
  const commit = (next: BuilderSnapshot) => {
    setPast((prev) => [...prev.slice(-(HISTORY_LIMIT - 1)), snapshot])
    setFuture([])
    setSnapshot(next)
    setDirty(true)
  }

  const selectSection = (id: string) => {
    setSelectedSectionId(id)
    setActiveTab('blocks')
  }

  const addSection = (type: SectionType) => {
    const section = SECTION_REGISTRY[type].createDefault()
    const footerIndex = sections.findIndex((s) => s.type === 'footer')
    const insertAt = footerIndex === -1 ? sections.length : footerIndex
    commit({
      ...snapshot,
      sections: [...sections.slice(0, insertAt), section, ...sections.slice(insertAt)],
    })
    setSelectedSectionId(section.id)
  }

  const removeSection = (id: string) => {
    const t = sections.find((s) => s.id === id)
    if (!t || SECTION_REGISTRY[t.type].pinned) return
    commit({ ...snapshot, sections: sections.filter((s) => s.id !== id) })
    if (selectedSectionId === id) setSelectedSectionId(null)
  }

  const duplicateSection = (id: string) => {
    const original = sections.find((s) => s.id === id)
    if (!original || SECTION_REGISTRY[original.type].pinned) return
    const copy: LayoutSection = { ...original, id: createSectionId(original.type) }
    const index = sections.indexOf(original)
    commit({
      ...snapshot,
      sections: [...sections.slice(0, index + 1), copy, ...sections.slice(index + 1)],
    })
    setSelectedSectionId(copy.id)
  }

  const toggleVisible = (id: string) => {
    commit({
      ...snapshot,
      sections: sections.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s)),
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateSectionConfig = (id: string, config: any) => {
    commit({
      ...snapshot,
      sections: sections.map((s) => (s.id === id ? { ...s, config } : s)),
    })
  }

  const reorderSection = (draggedId: string, targetId: string) => {
    const draggedIndex = sections.findIndex((s) => s.id === draggedId)
    const targetIndex = sections.findIndex((s) => s.id === targetId)
    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return
    if (sections[draggedIndex].type === 'header' || sections[draggedIndex].type === 'footer') return
    if (sections[targetIndex].type === 'header' || sections[targetIndex].type === 'footer') return
    const next = [...sections]
    const [dragged] = next.splice(draggedIndex, 1)
    next.splice(targetIndex, 0, dragged)
    commit({ ...snapshot, sections: next })
  }

  const applyTemplate = (template: StoreTemplate) => {
    commit({ sections: template.sections, themeColor: template.themeColor, themeConfig: template.themeConfig })
    setSelectedSectionId(null)
  }

  const setThemeColor = (color: string) => commit({ ...snapshot, themeColor: color })

  const setThemeConfig = (config: ThemeConfig) => commit({ ...snapshot, themeConfig: config })

  const undo = () => {
    if (past.length === 0) return
    const previous = past[past.length - 1]
    setPast((prev) => prev.slice(0, -1))
    setFuture((prev) => [...prev, snapshot])
    setSnapshot(previous)
    setDirty(true)
  }

  const redo = () => {
    if (future.length === 0) return
    const next = future[future.length - 1]
    setFuture((prev) => prev.slice(0, -1))
    setPast((prev) => [...prev, snapshot])
    setSnapshot(next)
    setDirty(true)
  }

  const invalidate = () => {
    if (target.invalidateKeys) {
      target.invalidateKeys.forEach(({ queryKey }) => queryClient.invalidateQueries({ queryKey }))
    }
  }

  const saveDraftMutation = useMutation({
    mutationFn: () => target.saveDraft({ sections, themeColor, themeConfig }),
    onSuccess: () => {
      setDirty(false)
      invalidate()
    },
  })

  const publishMutation = useMutation({
    mutationFn: () => target.publish({ sections, themeColor, themeConfig }),
    onSuccess: () => {
      setDirty(false)
      invalidate()
    },
  })

  return {
    sections,
    themeColor,
    themeConfig,
    dirty,
    activeTab,
    setActiveTab,
    selectedSection,
    selectedSectionId,
    selectSection,
    addSection,
    removeSection,
    duplicateSection,
    toggleVisible,
    updateSectionConfig,
    reorderSection,
    applyTemplate,
    setThemeColor,
    setThemeConfig,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    saveDraftMutation,
    publishMutation,
  }
}