import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createSectionId } from '@/config/defaultLayout'
import { getEffectiveRegistry } from './effectiveRegistry'
import type { LayoutSection, SectionType, StoreTemplate, ThemeConfig } from '@/types/builder'

export type BuilderTab = 'blocks' | 'theme' | 'templates'

/** An immutable snapshot of everything the builder can edit. Every mutation
 * commits a new snapshot, which is what makes undo/redo trivial. */
export interface BuilderSnapshot {
  sections: LayoutSection[]
  themeColor: string
  themeConfig: ThemeConfig
}

/** Decouples the builder from the entity it's editing (the whole store or a
 *  custom page). The parent constructs one of these and the hook never knows
 *  whether it's persisting to `shops` or `pages`. */
export interface BuilderTarget {
  /** The shop's current template — resolves which section types (core plus
   *  whatever that template contributes) this builder instance knows about.
   *  Absent/null resolves to the core registry only. */
  templateId?: string | null
  initialSections: LayoutSection[]
  initialThemeColor: string
  initialThemeConfig: ThemeConfig
  /** What's currently live for this context — lets "Annuler les
   *  modifications" throw away the draft and go back to it in one action. */
  publishedSnapshot: BuilderSnapshot
  /** Section type that must stay present in this context (e.g. the 'cart'
   *  section on the cart page) — removing it would leave the page unable to
   *  do its job. Undefined for contexts with no single required type (home,
   *  custom pages). */
  protectedType?: SectionType
  /** Persist draft state (called on "Enregistrer"). */
  saveDraft: (snapshot: BuilderSnapshot) => Promise<unknown>
  /** Persist published state (called on "Publier"). */
  publish: (snapshot: BuilderSnapshot) => Promise<unknown>
  /** Sections the active context should show when a store-wide template is
   *  applied (home → home layout, a system template → its own layout, a custom
   *  page → its current content, untouched by templates). */
  templateSections?: (template: StoreTemplate, current: LayoutSection[]) => LayoutSection[]
  /** Persist an applied store-wide template as the shop's draft, so the whole
   *  store previews the new design before anything is published. */
  storeApplyDraft?: (template: StoreTemplate) => Promise<unknown>
  /** Query keys to invalidate after a successful save. */
  invalidateKeys?: { queryKey: string[] }[]
}

const HISTORY_LIMIT = 50

export function useBuilderState(target: BuilderTarget) {
  const queryClient = useQueryClient()
  const registry = getEffectiveRegistry(target.templateId)

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
    const def = registry[type]
    if (!def) return
    const section = def.createDefault()
    const footerIndex = sections.findIndex((s) => s.type === 'footer')
    const beforeFooter = footerIndex === -1 ? sections.length : footerIndex
    // Land the new block right after whatever the merchant is currently
    // looking at, instead of always at the very bottom of the page — they'd
    // otherwise have to drag it all the way up from behind every other block.
    const selectedIndex = selectedSectionId ? sections.findIndex((s) => s.id === selectedSectionId) : -1
    const insertAt = selectedIndex === -1 ? beforeFooter : Math.min(selectedIndex + 1, beforeFooter)
    commit({
      ...snapshot,
      sections: [...sections.slice(0, insertAt), section, ...sections.slice(insertAt)],
    })
    setSelectedSectionId(section.id)
  }

  const removeSection = (id: string) => {
    const found = sections.find((s) => s.id === id)
    if (!found || registry[found.type]?.pinned || found.type === target.protectedType) return
    const index = sections.indexOf(found)
    const next = sections.filter((s) => s.id !== id)
    commit({ ...snapshot, sections: next })
    if (selectedSectionId === id) {
      // Keep editing something rather than dropping back to the empty state —
      // whatever slid into the deleted block's slot, or the one before it.
      const fallback = next[index] ?? next[index - 1]
      setSelectedSectionId(fallback?.id ?? null)
    }
  }

  const duplicateSection = (id: string) => {
    const original = sections.find((s) => s.id === id)
    // A singleton section (product/cart/checkout…) only ever makes sense
    // once per page — duplicating it would render the same dynamic block
    // twice, not add variety.
    if (!original || registry[original.type]?.pinned || registry[original.type]?.singleton) return
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
    if (registry[sections[draggedIndex].type]?.pinned) return
    if (registry[sections[targetIndex].type]?.pinned) return
    const next = [...sections]
    const [dragged] = next.splice(draggedIndex, 1)
    next.splice(targetIndex, 0, dragged)
    commit({ ...snapshot, sections: next })
  }

  /** Apply a store-wide template: keep the visible buffer's history, persist the
   *  whole-store draft, and make the current context show the template's layout
   *  for it. */
  const applyTemplate = (template: StoreTemplate) => {
    const sections = target.templateSections ? target.templateSections(template, snapshot.sections) : template.layout.home
    commit({ sections, themeColor: template.themeColor, themeConfig: template.themeConfig })
    setSelectedSectionId(null)
    if (target.storeApplyDraft) {
      void target
        .storeApplyDraft(template)
        .then(() => {
          setDirty(false)
          invalidate()
        })
        .catch(() => setDirty(true))
    }
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

  // Persists target.publishedSnapshot directly rather than routing through
  // saveDraftMutation, which closes over the *current* sections/themeColor/
  // themeConfig — calling it right after resetting the snapshot would still
  // save the stale pre-reset values (React state updates aren't synchronous).
  const discardMutation = useMutation({
    mutationFn: () => target.saveDraft(target.publishedSnapshot),
    onSuccess: () => {
      setSnapshot(target.publishedSnapshot)
      setPast([])
      setFuture([])
      setDirty(false)
      setSelectedSectionId(null)
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
    discardMutation,
  }
}