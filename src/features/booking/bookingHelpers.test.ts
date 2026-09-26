import { describe, expect, it } from 'vitest'
import { addDays, countByStatus, formatLongDate, groupByLocalDay, phoneDigits, relativeDayLabel, startOfWeek, telUrl, whatsappUrl } from './bookingHelpers'

describe('addDays', () => {
  it('passe les fins de mois et d’année', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
    expect(addDays('2026-09-26', 0)).toBe('2026-09-26')
  })
})

describe('formatLongDate', () => {
  it('écrit le jour en toutes lettres, l’année seulement si elle diffère', () => {
    const now = new Date(2026, 8, 26)
    expect(formatLongDate('2026-09-28', now)).toBe('lundi 28 septembre')
    expect(formatLongDate('2027-01-04', now)).toContain('2027')
  })
})

describe('relativeDayLabel', () => {
  it('nomme hier, aujourd’hui et demain', () => {
    expect(relativeDayLabel('2026-09-26', '2026-09-26')).toBe('Aujourd’hui')
    expect(relativeDayLabel('2026-09-27', '2026-09-26')).toBe('Demain')
    expect(relativeDayLabel('2026-09-25', '2026-09-26')).toBe('Hier')
    expect(relativeDayLabel('2026-10-05', '2026-09-26')).toBeNull()
  })
})

describe('liens de contact', () => {
  it('nettoie les numéros et encode le message WhatsApp', () => {
    expect(phoneDigits('+221 77 123 45 67')).toBe('221771234567')
    expect(telUrl('+221771234567')).toBe('tel:+221771234567')
    expect(whatsappUrl('+221771234567', 'Bonjour & merci')).toBe('https://wa.me/221771234567?text=Bonjour%20%26%20merci')
  })
})

describe('countByStatus', () => {
  it('compte par statut et au total', () => {
    expect(countByStatus([{ status: 'pending' }, { status: 'pending' }, { status: 'done' }])).toEqual({ all: 3, pending: 2, done: 1 })
    expect(countByStatus([])).toEqual({ all: 0 })
  })
})

describe('startOfWeek', () => {
  it('renvoie le lundi de la semaine', () => {
    expect(startOfWeek('2026-09-26')).toBe('2026-09-21') // samedi
    expect(startOfWeek('2026-09-21')).toBe('2026-09-21') // lundi
    expect(startOfWeek('2026-09-27')).toBe('2026-09-21') // dimanche
    expect(startOfWeek('2026-10-01')).toBe('2026-09-28')
  })
})

describe('groupByLocalDay', () => {
  it('compte par jour, sans les annulés, avec les demandes à confirmer', () => {
    const counts = groupByLocalDay([
      { start_at: new Date(2026, 8, 26, 10).toISOString(), status: 'pending' },
      { start_at: new Date(2026, 8, 26, 14).toISOString(), status: 'confirmed' },
      { start_at: new Date(2026, 8, 26, 16).toISOString(), status: 'cancelled' },
      { start_at: new Date(2026, 8, 27, 9).toISOString(), status: 'done' },
    ])
    expect(counts['2026-09-26']).toEqual({ total: 2, pending: 1 })
    expect(counts['2026-09-27']).toEqual({ total: 1, pending: 0 })
  })
})
