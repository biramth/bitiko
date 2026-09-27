import { describe, expect, it } from 'vitest'
import { THEME_PALETTES, applyPalette } from './themePalettes'
import { DEFAULT_THEME_CONFIG, headingScaleOf, sectionHeadingClass, themeConfigToCssVars } from './themeTokens'
import { isSectionScheduledVisible } from '@/types/builder'
import { contrastWithWhite } from '@/utils/format'

describe('THEME_PALETTES', () => {
  it('expose au moins 6 palettes avec des accents lisibles en blanc', () => {
    expect(THEME_PALETTES.length).toBeGreaterThanOrEqual(6)
    for (const palette of THEME_PALETTES) {
      expect(contrastWithWhite(palette.themeColor)).toBeGreaterThanOrEqual(3)
    }
  })

  it("applique une palette en conservant police, arrondis et largeur", () => {
    const base = { ...DEFAULT_THEME_CONFIG, font: 'serif' as const, radius: 'full' as const }
    const next = applyPalette(base, THEME_PALETTES[0])
    expect(next.themeColor).toBe(THEME_PALETTES[0].themeColor)
    expect(next.themeConfig.font).toBe('serif')
    expect(next.themeConfig.radius).toBe('full')
  })
})

describe('headingScaleOf', () => {
  it("suit textScale quand headingScale n'est pas réglé (compat historique)", () => {
    expect(headingScaleOf({ ...DEFAULT_THEME_CONFIG, textScale: 'lg', headingScale: undefined })).toBe('lg')
    expect(headingScaleOf({ ...DEFAULT_THEME_CONFIG, textScale: 'sm', headingScale: 'lg' })).toBe('lg')
  })

  it('produit des classes de titres distinctes par échelle', () => {
    const sm = sectionHeadingClass({ ...DEFAULT_THEME_CONFIG, headingScale: 'sm' })
    const lg = sectionHeadingClass({ ...DEFAULT_THEME_CONFIG, headingScale: 'lg' })
    expect(sm).not.toBe(lg)
  })
})

describe('themeConfigToCssVars', () => {
  it("expose les variables d'en-tête, d'annonce et d'espacement", () => {
    const vars = themeConfigToCssVars('#c2481c', DEFAULT_THEME_CONFIG)
    expect(vars['--shop-header-bg']).toBe('#ffffff')
    expect(vars['--shop-header-text']).toBe('#17152e')
    expect(vars['--shop-announcement-bg']).toBeTruthy()
    expect(vars['--shop-section-gap']).toBe('2.5rem')
  })

  it('honore les couleurs globales quand elles sont réglées', () => {
    const vars = themeConfigToCssVars('#c2481c', {
      ...DEFAULT_THEME_CONFIG,
      headerBackgroundColor: '#111111',
      announcementTextColor: '#222222',
      sectionSpacing: 'spacious',
    })
    expect(vars['--shop-header-bg']).toBe('#111111')
    expect(vars['--shop-announcement-text']).toBe('#222222')
    expect(vars['--shop-section-gap']).toBe('4rem')
  })
})

describe('isSectionScheduledVisible', () => {
  const now = new Date('2026-06-15T12:00:00Z')

  it('affiche tout sans planification (fail-open)', () => {
    expect(isSectionScheduledVisible({}, now)).toBe(true)
    expect(isSectionScheduledVisible({ visibleFrom: null, visibleTo: null }, now)).toBe(true)
  })

  it('masque avant le début et après la fin', () => {
    expect(isSectionScheduledVisible({ visibleFrom: '2026-07-01T00:00:00Z' }, now)).toBe(false)
    expect(isSectionScheduledVisible({ visibleTo: '2026-06-01T00:00:00Z' }, now)).toBe(false)
    expect(
      isSectionScheduledVisible({ visibleFrom: '2026-06-01T00:00:00Z', visibleTo: '2026-07-01T00:00:00Z' }, now),
    ).toBe(true)
  })

  it('ignore les dates invalides', () => {
    expect(isSectionScheduledVisible({ visibleFrom: 'pas-une-date' }, now)).toBe(true)
  })
})
