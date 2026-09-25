import { describe, expect, it } from 'vitest'
import { matchRules, renderTemplate } from './automation-dispatch.js'

const rule = (over: Record<string, unknown> = {}) => ({
  id: 'r1',
  shop_id: 'shop-a',
  event_type: 'ORDER_CREATED',
  channel: 'email',
  template: {},
  ...over,
})

describe('matchRules', () => {
  it('matches enabled rules of the same shop and event type', () => {
    const rules = [
      rule(),
      rule({ id: 'r2', event_type: 'ORDER_PAID' }),
      rule({ id: 'r3', shop_id: 'shop-b' }),
    ]
    expect(matchRules(rules, { shop_id: 'shop-a', type: 'ORDER_CREATED' }).map((r) => r.id)).toEqual(['r1'])
  })

  it('returns nothing when nothing matches', () => {
    expect(matchRules([rule()], { shop_id: 'shop-a', type: 'NOPE' })).toEqual([])
  })
})

describe('renderTemplate', () => {
  it('substitutes {{variables}} and blanks unknown keys', () => {
    expect(renderTemplate('Commande {{order_number}} — {{total}} F ({{missing}})', { order_number: 'CMD-1', total: 5000 })).toBe(
      'Commande CMD-1 — 5000 F ()',
    )
  })
})
