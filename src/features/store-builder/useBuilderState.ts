import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateShop } from '@/services/shop.service'
import { SECTION_REGISTRY } from './sectionRegistry'
import type { Shop } from '@/types'
import type { LayoutSection, SectionType, StoreTemplate, ThemeConfig } from '@/types/builder'

export type BuilderTab = 'blocks' | 'theme' | 'templates'

export function useBuilderState(shop: Shop) {
  const queryClient = useQueryClient()
  const draft = shop.builder_draft

  const [sections, setSections] = useState<LayoutSection[]>(draft?.sections ?? shop.layout_sections)
  const [themeColor, setThemeColor] = useState(draft?.themeColor ?? shop.theme_color)
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(draft?.themeConfig ?? shop.theme_config)
  const [dirty, setDirty] = useState(false)
  const [activeTab, setActiveTab] = useState<BuilderTab>('blocks')
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)

  const selectedSection = useMemo(
    () => sections.find((s) => s.id === selectedSectionId) ?? null,
    [sections, selectedSectionId],
  )

  const markDirty = () => setDirty(true)

  const selectSection = (id: string) => {
    setSelectedSectionId(id)
    setActiveTab('blocks')
  }

  const addSection = (type: SectionType) => {
    const section = SECTION_REGISTRY[type].createDefault()
    setSections((prev) => {
      const footerIndex = prev.findIndex((s) => s.type === 'footer')
      const insertAt = footerIndex === -1 ? prev.length : footerIndex
      return [...prev.slice(0, insertAt), section, ...prev.slice(insertAt)]
    })
    setSelectedSectionId(section.id)
    markDirty()
  }

  const removeSection = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id))
    if (selectedSectionId === id) setSelectedSectionId(null)
    markDirty()
  }

  const toggleVisible = (id: string) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s)))
    markDirty()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateSectionConfig = (id: string, config: any) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, config } : s)))
    markDirty()
  }

  const reorderSection = (draggedId: string, targetId: string) => {
    setSections((prev) => {
      const draggedIndex = prev.findIndex((s) => s.id === draggedId)
      const targetIndex = prev.findIndex((s) => s.id === targetId)
      if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return prev
      // Header/footer stay pinned at their ends — reordering only ever happens between them.
      if (prev[draggedIndex].type === 'header' || prev[draggedIndex].type === 'footer') return prev
      if (prev[targetIndex].type === 'header' || prev[targetIndex].type === 'footer') return prev
      const next = [...prev]
      const [dragged] = next.splice(draggedIndex, 1)
      next.splice(targetIndex, 0, dragged)
      return next
    })
    markDirty()
  }

  const applyTemplate = (template: StoreTemplate) => {
    setSections(template.sections)
    setThemeColor(template.themeColor)
    setThemeConfig(template.themeConfig)
    setSelectedSectionId(null)
    markDirty()
  }

  const setThemeColorAndMark = (color: string) => {
    setThemeColor(color)
    markDirty()
  }

  const setThemeConfigAndMark = (config: ThemeConfig) => {
    setThemeConfig(config)
    markDirty()
  }

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['my-shop'] })
    queryClient.invalidateQueries({ queryKey: ['tenant-shop'] })
  }

  const saveDraftMutation = useMutation({
    mutationFn: () =>
      updateShop(shop.id, {
        builder_draft: { sections, themeColor, themeConfig },
      }),
    onSuccess: () => {
      setDirty(false)
      invalidate()
    },
  })

  const publishMutation = useMutation({
    mutationFn: () =>
      updateShop(shop.id, {
        layout_sections: sections,
        theme_color: themeColor,
        theme_config: themeConfig,
        builder_draft: null,
      }),
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
    toggleVisible,
    updateSectionConfig,
    reorderSection,
    applyTemplate,
    setThemeColor: setThemeColorAndMark,
    setThemeConfig: setThemeConfigAndMark,
    saveDraftMutation,
    publishMutation,
  }
}
