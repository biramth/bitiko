import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearDraft, loadDraft, saveDraft } from './draft'
import { UserFacingError, describeOnboardingError } from './errors'

function stubStorage() {
  const store = new Map<string, string>()
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
  })
}

describe('brouillon d’onboarding', () => {
  beforeEach(stubStorage)

  it('restitue ce qui a été saisi pour le même compte', () => {
    saveDraft('u1', { name: 'Chez Awa', businessType: 'mode', whatsappNumber: '77 123 45 67', countryCode: 'SN' })
    expect(loadDraft('u1')).toEqual({ name: 'Chez Awa', businessType: 'mode', whatsappNumber: '77 123 45 67', countryCode: 'SN' })
  })

  it('ignore le brouillon d’un autre compte', () => {
    saveDraft('u1', { name: 'Chez Awa', businessType: '', whatsappNumber: '', countryCode: null })
    expect(loadDraft('u2')).toBeNull()
    expect(loadDraft(undefined)).toBeNull()
  })

  it('supprime le brouillon quand tout est vide ou après création', () => {
    saveDraft('u1', { name: 'Chez Awa', businessType: '', whatsappNumber: '', countryCode: null })
    saveDraft('u1', { name: ' ', businessType: '', whatsappNumber: '', countryCode: null })
    expect(loadDraft('u1')).toBeNull()
    saveDraft('u1', { name: 'X', businessType: '', whatsappNumber: '', countryCode: null })
    clearDraft()
    expect(loadDraft('u1')).toBeNull()
  })

  it('tolère un contenu corrompu', () => {
    window.localStorage.setItem('bitiko-onboarding-draft', '{pas du json')
    expect(loadDraft('u1')).toBeNull()
    window.localStorage.setItem('bitiko-onboarding-draft', JSON.stringify({ userId: 'u1', name: 42, businessType: null }))
    expect(loadDraft('u1')).toEqual({ name: '', businessType: '', whatsappNumber: '', countryCode: null })
  })
})

describe('describeOnboardingError', () => {
  it('reconnaît une adresse prise entre-temps', () => {
    expect(describeOnboardingError({ code: '23505', message: 'duplicate key value violates unique constraint "shops_slug_key"' }).slugTaken).toBe(true)
  })

  it('explique une coupure réseau', () => {
    const info = describeOnboardingError(new TypeError('Failed to fetch'))
    expect(info.slugTaken).toBe(false)
    expect(info.message).toMatch(/Connexion perdue/)
  })

  it('traduit un refus de droits sans afficher le texte technique', () => {
    const info = describeOnboardingError({ code: '42501', message: 'permission denied for function normalize_phone' })
    expect(info.message).not.toMatch(/normalize_phone/)
    expect(info.message).toMatch(/reconnecte-toi/)
  })

  it('garde les messages déjà rédigés pour le marchand', () => {
    expect(describeOnboardingError(new UserFacingError('Ta session a expiré.')).message).toBe('Ta session a expiré.')
  })

  it('reste lisible pour une erreur inconnue', () => {
    expect(describeOnboardingError(new Error('boom')).message).toMatch(/Réessayer/)
    expect(describeOnboardingError(null).message).toMatch(/Réessayer/)
  })
})
