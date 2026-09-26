import { describe, expect, it } from 'vitest'
import { canAccess } from './permissions'

describe('canAccess', () => {
  it('le propriétaire accède à tout', () => {
    for (const area of ['finance', 'customize', 'settings', 'billing', 'team_settings', 'notifications', 'catalog_write'] as const) {
      expect(canAccess('owner', area)).toBe(true)
    }
  })

  it('le manager gère l’activité mais pas la facturation, l’équipe ni les automatisations', () => {
    expect(canAccess('manager', 'finance')).toBe(true)
    expect(canAccess('manager', 'catalog_write')).toBe(true)
    expect(canAccess('manager', 'billing')).toBe(false)
    expect(canAccess('manager', 'team_settings')).toBe(false)
    expect(canAccess('manager', 'notifications')).toBe(false)
  })

  it('le vendeur ne voit ni les finances, ni la vitrine, ni les réglages, et n’écrit pas dans le catalogue', () => {
    for (const area of ['finance', 'customize', 'settings', 'catalog_write'] as const) {
      expect(canAccess('vendeur', area)).toBe(false)
    }
  })

  it('rôle inconnu = autorisé (chargement)', () => {
    expect(canAccess(null, 'finance')).toBe(true)
    expect(canAccess(undefined, 'settings')).toBe(true)
  })
})
