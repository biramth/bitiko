import { describe, expect, it } from 'vitest'
import { STORE_TEMPLATES } from '@/config/storeTemplates'
import { resolvePickerTemplates } from './template.service'

describe('resolvePickerTemplates', () => {
  it('uses DB compatibility when it yields templates', () => {
    const out = resolvePickerTemplates(['mode', 'epicerie'], 'tech')
    expect(out.map((t) => t.key).sort()).toEqual(['epicerie', 'mode'])
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
