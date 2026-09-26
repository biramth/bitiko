import { describe, expect, it } from 'vitest'
import { matchRules, renderTemplate } from './automationDispatch.js'

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

describe('formatEventWhen', () => {
  it('formate dans le fuseau de la boutique et tolère les valeurs invalides', async () => {
    const { formatEventWhen } = await import('./automationDispatch.js')
    expect(formatEventWhen('2026-09-29T10:00:00Z', 'Africa/Dakar')).toContain('10:00')
    expect(formatEventWhen('2026-09-29T10:00:00Z', 'Africa/Lagos')).toContain('11:00')
    expect(formatEventWhen(undefined, 'Africa/Dakar')).toBe('')
    expect(formatEventWhen('pas une date', 'Africa/Dakar')).toBe('')
  })
})

describe('dispatchEvents', () => {
  /** Faux client Supabase : chaque table renvoie ses lignes ; les écritures sont journalisées. */
  function fakeAdmin(tables: Record<string, unknown[]>) {
    const writes: { table: string; op: string; values: unknown }[] = []
    const from = (table: string) => {
      const chain: Record<string, unknown> = {}
      const result = () => Promise.resolve({ data: tables[table] ?? [], error: null })
      for (const method of ['select', 'eq', 'order', 'limit', 'in', 'maybeSingle']) {
        chain[method] = () => chain
      }
      chain.insert = (values: unknown) => {
        writes.push({ table, op: 'insert', values })
        return Promise.resolve({ error: null })
      }
      chain.update = (values: unknown) => {
        writes.push({ table, op: 'update', values })
        return { eq: () => Promise.resolve({ error: null }) }
      }
      chain.then = (resolve: (value: unknown) => unknown) => result().then(resolve)
      return chain
    }
    return { admin: { from } as never, writes }
  }

  it('exécute uniquement les règles de la boutique de l’événement et marque l’événement traité', async () => {
    const { dispatchEvents } = await import('./automationDispatch.js')
    const { admin, writes } = fakeAdmin({
      business_events: [{ id: 'e1', shop_id: 'shop-a', type: 'ORDER_CREATED', payload: {} }],
      automation_rules: [
        { id: 'r1', shop_id: 'shop-a', event_type: 'ORDER_CREATED', channel: 'log', template: {} },
        { id: 'r2', shop_id: 'shop-b', event_type: 'ORDER_CREATED', channel: 'log', template: {} },
        { id: 'r3', shop_id: 'shop-a', event_type: 'ORDER_PAID', channel: 'log', template: {} },
      ],
    })
    expect(await dispatchEvents(admin)).toEqual({ processed: 1, runs: 1 })
    const runs = writes.filter((w) => w.table === 'automation_runs')
    expect(runs).toHaveLength(1)
    expect((runs[0].values as { rule_id: string }).rule_id).toBe('r1')
    expect(writes.some((w) => w.table === 'business_events' && w.op === 'update')).toBe(true)
  })

  it('ne fait rien sans événement', async () => {
    const { dispatchEvents } = await import('./automationDispatch.js')
    const { admin, writes } = fakeAdmin({ business_events: [] })
    expect(await dispatchEvents(admin)).toEqual({ processed: 0, runs: 0 })
    expect(writes).toHaveLength(0)
  })
})
