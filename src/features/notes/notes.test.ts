import { describe, expect, it } from 'vitest'
import { feedContext, feedGroup, feedLink, isNoteEmpty, matchesSearch, noteCardClass } from './notes'

describe('notes', () => {
  it('cherche chaque mot dans le titre ou le texte, sans tenir compte des accents ni de la casse', () => {
    const note = { title: 'Fournisseur tissu', body: 'Appeler Mme Bâ pour le wax' }
    expect(matchesSearch(note, 'ba WAX')).toBe(true)
    expect(matchesSearch(note, 'fournisseur appeler')).toBe(true)
    expect(matchesSearch(note, 'riz')).toBe(false)
    expect(matchesSearch(note, '   ')).toBe(true)
  })

  it('considère vide une note sans titre ni texte', () => {
    expect(isNoteEmpty({ title: '  ', body: '\n' })).toBe(true)
    expect(isNoteEmpty({ title: null, body: 'x' })).toBe(false)
  })

  it('retombe sur le blanc pour une couleur inconnue', () => {
    expect(noteCardClass('yellow')).toContain('amber')
    expect(noteCardClass('rouge' as never)).toContain('bg-white')
  })
})

describe('toutes les notes', () => {
  const base = { target_id: 't1', sub_id: 'm1', title: 'Tabaski', person: 'Awa', amount: 5000, on_date: '2026-10-08', note: 'x', noted_at: '' }
  const nbsp = (s: string | null) => (s ?? '').replace(/[  ]/g, ' ')

  it('renvoie vers la fiche d’origine', () => {
    expect(feedLink({ ...base, source: 'order' })).toBe('/admin/commandes/t1')
    expect(feedLink({ ...base, source: 'tontine_contribution' })).toBe('/admin/tontines/t1?membre=m1')
    expect(feedLink({ ...base, source: 'finance' })).toBe('/admin/gestion?tab=journal')
  })

  it('décrit l’origine et le détail de la note', () => {
    const order = feedContext({ ...base, source: 'order', title: 'CMD-1042', person: 'Fatou' }, 'XOF')
    expect(order.origin).toBe('Commande CMD-1042 · Fatou')
    expect(nbsp(order.detail)).toBe('08/10/2026 · 5 000 F CFA')
    const cancel = feedContext({ ...base, source: 'tontine_cancel' }, 'XOF')
    expect(cancel.origin).toBe('Tontine Tabaski › Awa')
    expect(nbsp(cancel.detail)).toBe('Versement annulé · 08/10/2026 · 5 000 F CFA')
    expect(feedContext({ ...base, source: 'tontine', person: null }, 'XOF')).toEqual({ origin: 'Tontine Tabaski', detail: null })
  })

  it('range chaque origine dans son groupe', () => {
    expect(feedGroup('tontine_settlement')).toBe('tontines')
    expect(feedGroup('reservation')).toBe('bookings')
  })
})
