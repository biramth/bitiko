import { describe, expect, it } from 'vitest'
import { STORE_TEMPLATES } from '@/config/storeTemplates'
import {
  mergeDbTemplates,
  resolvePickerTemplates,
  validateTemplateContent,
  type DbTemplateRow,
} from './template.service'

describe('resolvePickerTemplates', () => {
  it('uses DB compatibility when it yields templates', () => {
    const out = resolvePickerTemplates(['mode', 'minimal'], 'mode')
    expect(out.map((t) => t.key)).toEqual(['mode', 'minimal'])
  })

  it('offers the exact template first, then compatible neighbours', () => {
    const out = resolvePickerTemplates(['epicerie', 'restauration', 'bistrot'], 'restauration')
    expect(out.map((t) => t.key)).toEqual(['restauration', 'bistrot', 'epicerie'])
  })

  it('falls back to the legacy vertical list on null/empty/unknown', () => {
    const legacyTech = resolvePickerTemplates(null, 'tech')
    expect(legacyTech.length).toBeGreaterThan(0)
    expect(resolvePickerTemplates([], 'tech')).toEqual(legacyTech)
    expect(resolvePickerTemplates(['nope'], 'tech')).toEqual(legacyTech)
  })

  it('never returns an empty picker when code templates exist', () => {
    expect(STORE_TEMPLATES.length).toBeGreaterThan(0)
    expect(resolvePickerTemplates(null, null).length).toBeGreaterThan(0)
  })
})

const VALID_CONTENT = {
  themeColor: '#111111',
  themeConfig: {
    secondaryColor: '#f5f5f5',
    textColor: '#111111',
    backgroundColor: '#ffffff',
    buttonColor: '#111111',
    font: 'inter',
    textScale: 'base',
    radius: 'none',
    contentWidth: 'narrow',
  },
  layout: {
    home: [{ id: 'hero-1', type: 'hero', visible: true, config: {} }],
    catalogue: [],
    product: [],
    cart: [],
    checkout: [],
  },
}

describe('validateTemplateContent', () => {
  it('accepts a valid content', () => {
    expect(validateTemplateContent(VALID_CONTENT)).toEqual([])
    expect(validateTemplateContent({ ...VALID_CONTENT, variants: [{ key: 'nuit', themeColor: '#000000' }] })).toEqual([])
  })

  it('rejects non-objects and unknown section types', () => {
    expect(validateTemplateContent(null).length).toBeGreaterThan(0)
    expect(validateTemplateContent('nope').length).toBeGreaterThan(0)
    expect(
      validateTemplateContent({ layout: { home: [{ id: 'a', type: 'nope', config: {} }], catalogue: [], product: [], cart: [], checkout: [] } }),
    ).toContain('layout.home[0] : type inconnu « nope ».')
  })

  it('rejects bad theme values', () => {
    expect(validateTemplateContent({ themeConfig: { ...VALID_CONTENT.themeConfig, font: 'comic' } })).toContain(
      'themeConfig.font doit valoir sora-inter, inter ou sora.',
    )
  })
})

describe('mergeDbTemplates', () => {
  const row = (slug: string, content: unknown): DbTemplateRow => ({
    slug,
    name: slug,
    description: null,
    status: 'active',
    content: content as DbTemplateRow['content'],
  })

  it('overrides matching slugs and keeps code on invalid content', () => {
    const merged = mergeDbTemplates(STORE_TEMPLATES, [
      row('mode', { ...VALID_CONTENT }),
      row('tech', { layout: 'nope' }),
    ])
    expect(merged.find((t) => t.key === 'mode')?.themeColor).toBe('#111111')
    expect(merged.find((t) => t.key === 'tech')?.themeColor).toBe(
      STORE_TEMPLATES.find((t) => t.key === 'tech')?.themeColor,
    )
  })

  it('appends DB-only templates with a vertical, skips the rest', () => {
    const merged = mergeDbTemplates(STORE_TEMPLATES, [
      row('custom', { ...VALID_CONTENT, vertical: 'mode' }),
      row('incomplete', { themeColor: '#000000' }),
    ])
    expect(merged.find((t) => t.key === 'custom')?.vertical).toBe('mode')
    expect(merged.find((t) => t.key === 'incomplete')).toBeUndefined()
    expect(merged.length).toBe(STORE_TEMPLATES.length + 1)
  })
})
