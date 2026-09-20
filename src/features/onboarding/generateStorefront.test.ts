import { describe, expect, it } from 'vitest'
import { STORE_TEMPLATE_BY_KEY } from '@/config/storeTemplates'
import { buildGeneratedTheme, generateHomeLayout, generateStorefront } from './generateStorefront'
import { EMPTY_STORE_PROFILE, type StoreProfileAnswers } from './storeProfile'

const recipeTemplate = STORE_TEMPLATE_BY_KEY['epicerie']

function buildAnswers(overrides: Partial<StoreProfileAnswers> = {}): StoreProfileAnswers {
  return { ...EMPTY_STORE_PROFILE, ...overrides }
}

describe('generateHomeLayout', () => {
  it('personalizes the hero with the merchant description and no canned kicker', () => {
    const answers = buildAnswers({
      description: 'Légumes et fruits frais de nos maraîchers, livrés à Dakar.',
    })
    const sections = generateHomeLayout(recipeTemplate, answers)
    const hero = sections.find((s) => s.type === 'hero')
    expect(hero?.type).toBe('hero')
    if (hero?.type !== 'hero') return
    expect(hero.config.subheading).toContain('Légumes et fruits frais')
    expect(hero.config.eyebrow).toBe('')
    expect(hero.config.heading).toBe('') // falls back to the shop name live
  })

  it('replaces the story text section when the merchant shares one', () => {
    const answers = buildAnswers({ story: 'Vendue depuis 2015 au marché de Sandaga.' })
    const sections = generateHomeLayout(recipeTemplate, answers)
    const text = sections.find((s) => s.type === 'text')
    expect(text?.type).toBe('text')
    if (text?.type !== 'text') return
    expect(text.config.heading).toBe('Notre histoire')
    expect(text.config.body).toContain('Sandaga')
  })

  it('never appends a FAQ section, even when the merchant completes Q/A pairs', () => {
    const withoutFaq = generateHomeLayout(recipeTemplate, buildAnswers())
    expect(withoutFaq.some((s) => s.type === 'faq')).toBe(false)

    // FAQ answers must not add a 4th content block: the generated layout has
    // to fit the free plan's cap (3 content blocks) or the DB trigger
    // `enforce_shop_section_limit` rejects the shop insert during onboarding.
    const answers = buildAnswers({
      faq: [
        { question: 'Livrez-vous partout ?', answer: 'Oui, à Dakar et alentours.' },
        { question: '', answer: '' },
      ],
    })
    const sections = generateHomeLayout(recipeTemplate, answers)
    expect(sections.some((s) => s.type === 'faq')).toBe(false)
  })

  it('keeps the template structure (announcement bar then header first, footer last)', () => {
    const sections = generateHomeLayout(recipeTemplate, buildAnswers())
    expect(sections[0].type).toBe('announcement')
    expect(sections[1].type).toBe('header')
    expect(sections[sections.length - 1].type).toBe('footer')
  })
})

describe('buildGeneratedTheme', () => {
  it('uses the template theme when there is no logo palette', () => {
    const theme = buildGeneratedTheme(recipeTemplate, null)
    expect(theme.themeColor).toBe(recipeTemplate.themeColor)
  })

  it('darkens a light logo accent enough for white text but keeps a soft secondary', () => {
    const theme = buildGeneratedTheme(recipeTemplate, { primary: '#fde047', secondary: '#1d4ed8' })
    expect(theme.themeConfig.secondaryColor).toMatch(/^#[0-9a-f]{6}$/i)
    expect(theme.themeConfig.buttonColor).toBe('')
    // Dark text on the secondary tint stays readable (tint is light).
    const channels = theme.themeConfig.secondaryColor.slice(1)
    const r = parseInt(channels.slice(0, 2), 16)
    expect(r).toBeGreaterThan(200)
  })
})

describe('generateStorefront', () => {
  it('produces everything a new shop needs from the answers', () => {
    const answers = buildAnswers({ description: 'Les meilleurs jus de Dakar.' })
    const generated = generateStorefront({ template: recipeTemplate, answers })
    expect(generated.description).toBe('Les meilleurs jus de Dakar.')
    expect(generated.layoutSections.some((s) => s.type === 'hero')).toBe(true)
    expect(generated.pageTemplates.catalogue?.published).toBeDefined()
    expect(generated.themeColor).toBe(recipeTemplate.themeColor)
    expect(generated.themeConfig.font).toBe(recipeTemplate.themeConfig.font)
  })
})