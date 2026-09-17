import { describe, expect, it } from 'vitest'
import { contrastWithWhite } from './format'
import { ensureReadableAccent, mixHex, softTint } from './color'

describe('mixHex', () => {
  it('blends two hex colors linearly', () => {
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080')
    expect(mixHex('#ff0000', '#ffffff', 1)).toBe('#ffffff')
    expect(mixHex('#ff0000', '#ffffff', 0)).toBe('#ff0000')
  })
})

describe('ensureReadableAccent', () => {
  it('leaves already-dark accents untouched', () => {
    const accent = ensureReadableAccent('#7f1d1d')
    expect(accent).toBe('#7f1d1d')
    expect(contrastWithWhite(accent)).toBeGreaterThanOrEqual(4.5)
  })

  it('darkens a light logo color until white text clears WCAG AA', () => {
    const accent = ensureReadableAccent('#fde047') // pale yellow
    expect(contrastWithWhite(accent)).toBeGreaterThanOrEqual(4.5)
    // Hue family preserved: still a warm/yellow-ish color, not gray.
    const a = parseInt(accent.slice(1, 3), 16)
    const g = parseInt(accent.slice(3, 5), 16)
    const b = parseInt(accent.slice(5, 7), 16)
    expect(a).toBeGreaterThan(b)
    expect(g).toBeGreaterThan(b)
  })

  it('honors a custom target ratio', () => {
    const accent = ensureReadableAccent('#fde047', 3)
    expect(contrastWithWhite(accent)).toBeGreaterThanOrEqual(3)
  })

  it('returns invalid input unchanged', () => {
    expect(ensureReadableAccent('not-a-color')).toBe('not-a-color')
  })
})

describe('softTint', () => {
  it('lightens a saturated logo color into a pastel background tint', () => {
    const tint = softTint('#be185d')
    expect(contrastWithWhite(tint)).toBeLessThan(1.3)
    // The white-contrast of a pastel is low; dark text on it stays readable.
    const channels = tint.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
    expect(channels).not.toBeNull()
    const r = parseInt(channels![1], 16)
    expect(r).toBeGreaterThan(200) // mostly white
  })
})