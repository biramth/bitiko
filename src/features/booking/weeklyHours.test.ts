import { describe, expect, it } from 'vitest'
import {
  defaultWeeklyHours,
  isClosedOn,
  legacyColumns,
  summarizeWeek,
  validateDayRanges,
  validateWeek,
  weeklyHoursFromSettings,
} from './weeklyHours'

describe('weeklyHoursFromSettings', () => {
  it('convertit l’ancien format (jours + plage unique)', () => {
    const weekly = weeklyHoursFromSettings({ weekly_hours: null, open_days: [1, 2, 6], open_time: '08:00:00', close_time: '17:30:00' })
    expect(weekly).toEqual({ '1': [['08:00', '17:30']], '2': [['08:00', '17:30']], '6': [['08:00', '17:30']] })
  })

  it('lit weekly_hours et ignore les plages mal formées', () => {
    const weekly = weeklyHoursFromSettings({
      weekly_hours: { '1': [['09:00', '12:00'], ['14:00:00', '18:00:00']], '2': 'nope', '3': [] },
      open_days: [],
      open_time: '09:00',
      close_time: '19:00',
    })
    expect(weekly).toEqual({ '1': [['09:00', '12:00'], ['14:00', '18:00']] })
  })

  it('propose lundi → samedi 9 h – 19 h sans réglage enregistré', () => {
    expect(weeklyHoursFromSettings(null)).toEqual(defaultWeeklyHours())
    expect(Object.keys(defaultWeeklyHours())).toEqual(['1', '2', '3', '4', '5', '6'])
  })
})

describe('isClosedOn', () => {
  const weekly = { '1': [['09:00', '18:00']], '6': [['09:00', '13:00']] } as ReturnType<typeof defaultWeeklyHours>
  it('ferme les jours sans plage et les dates d’exception', () => {
    expect(isClosedOn(weekly, [], '2026-09-27')).toBe(true) // dimanche
    expect(isClosedOn(weekly, [], '2026-09-28')).toBe(false) // lundi
    expect(isClosedOn(weekly, ['2026-09-28'], '2026-09-28')).toBe(true)
  })
})

describe('validation', () => {
  it('détecte plages inversées, chevauchements et semaine vide', () => {
    expect(validateDayRanges([['09:00', '12:00'], ['14:00', '18:00']])).toBeNull()
    expect(validateDayRanges([['12:00', '09:00']])).toMatch(/après le début/)
    expect(validateDayRanges([['09:00', '13:00'], ['12:00', '18:00']])).toMatch(/chevauchent/)
    expect(validateWeek({}).ok).toBe(false)
    expect(validateWeek({ '1': [['09:00', '12:00']] }).ok).toBe(true)
    expect(validateWeek({ '1': [['10:00', '09:00']] }).dayErrors['1']).toBeTruthy()
  })
})

describe('legacyColumns', () => {
  it('dérive jours ouverts, première ouverture et dernière fermeture', () => {
    expect(legacyColumns({ '1': [['09:00', '12:00'], ['14:00', '18:00']], '6': [['08:30', '13:00']] })).toEqual({
      open_days: [1, 6],
      open_time: '08:30',
      close_time: '18:00',
    })
  })
})

describe('summarizeWeek', () => {
  it('regroupe les jours consécutifs identiques et nomme les jours fermés', () => {
    const weekly = {
      '1': [['09:00', '12:30'], ['14:00', '19:00']],
      '2': [['09:00', '12:30'], ['14:00', '19:00']],
      '3': [['09:00', '12:30'], ['14:00', '19:00']],
      '4': [['09:00', '12:30'], ['14:00', '19:00']],
      '5': [['09:00', '12:30'], ['14:00', '19:00']],
      '6': [['09:00', '13:00']],
    } as ReturnType<typeof defaultWeeklyHours>
    expect(summarizeWeek(weekly)).toBe('Lun – Ven 09:00 – 12:30 et 14:00 – 19:00 · Sam 09:00 – 13:00 · Dim fermé')
  })
})
