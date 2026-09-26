import { describe, expect, it } from 'vitest'
import { THUMB_MAX_DIM, thumbSrcSet } from './image'

describe('thumbSrcSet', () => {
  it('propose la vignette et le fichier complet avec leurs largeurs', () => {
    expect(thumbSrcSet('https://cdn/x-thumb.webp', 'https://cdn/x.webp')).toBe('https://cdn/x-thumb.webp 400w, https://cdn/x.webp 1600w')
  })

  it('reste sur le fichier complet pour les anciennes images sans vignette', () => {
    expect(thumbSrcSet(null, 'https://cdn/x.webp')).toBeUndefined()
    expect(thumbSrcSet(undefined, 'https://cdn/x.webp')).toBeUndefined()
  })

  it('ignore une vignette identique au fichier complet (un seul candidat inutile)', () => {
    expect(thumbSrcSet('https://cdn/x.webp', 'https://cdn/x.webp')).toBeUndefined()
  })

  it('annonce la même largeur que celle générée à l’upload', () => {
    expect(THUMB_MAX_DIM).toBe(400)
  })
})
