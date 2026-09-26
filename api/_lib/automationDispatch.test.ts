import { describe, expect, it } from 'vitest'
import { alertTarget, eventVariables, matchRules, renderTemplate, resolveRules } from './automationDispatch.js'
import { merchantAlertEmailHtml } from './emailTemplates.js'

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
    // 2 exécutions : la règle journal r1 + l'email d'alerte par défaut d'une nouvelle commande (non journalisé, sans ligne en base).
    expect(await dispatchEvents(admin)).toEqual({ processed: 1, runs: 2 })
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

describe('resolveRules — alertes par défaut', () => {
  const event = { shop_id: 'shop-a', type: 'ORDER_CREATED' }

  it('envoie l’email d’alerte d’office quand le marchand n’a rien réglé', () => {
    const resolved = resolveRules([], event)
    expect(resolved).toHaveLength(1)
    expect(resolved[0]).toMatchObject({ id: null, channel: 'email', event_type: 'ORDER_CREATED' })
    expect(resolved[0].template.subject).toContain('{{order_number}}')
  })

  it('respecte une désactivation explicite (pas d’email par défaut)', () => {
    expect(resolveRules([rule({ enabled: false })], event)).toEqual([])
  })

  it('utilise le message personnalisé du marchand plutôt que le défaut', () => {
    const custom = rule({ enabled: true, template: { subject: 'Hop !', body: 'Une vente' } })
    const resolved = resolveRules([custom], event)
    expect(resolved.map((r) => r.id)).toEqual(['r1'])
    expect(resolved[0].template.subject).toBe('Hop !')
  })

  it('un canal journal seul n’empêche pas l’email par défaut', () => {
    const resolved = resolveRules([rule({ channel: 'log', enabled: true })], event)
    expect(resolved.map((r) => r.channel).sort()).toEqual(['email', 'log'])
  })

  it('couvre le stock, mais pas les événements sans alerte par défaut', () => {
    expect(resolveRules([], { shop_id: 'shop-a', type: 'STOCK_LOW' })).toHaveLength(1)
    expect(resolveRules([], { shop_id: 'shop-a', type: 'STOCK_OUT' })).toHaveLength(1)
    expect(resolveRules([], { shop_id: 'shop-a', type: 'ORDER_PAID' })).toEqual([])
  })

  it('ne mélange pas les boutiques', () => {
    expect(resolveRules([rule({ shop_id: 'shop-b', enabled: false })], event)).toHaveLength(1)
  })
})

describe('eventVariables', () => {
  it('formate le montant et le mode de paiement', () => {
    const vars = eventVariables({ total: 51500, payment_method: 'mobile_money' }, { shopName: 'Wax', when: '', currency: 'XOF' })
    expect(String(vars.total)).toMatch(/51\s?500/)
    expect(vars.payment).toBe('mobile money')
    expect(vars.shop_name).toBe('Wax')
  })

  it('tolère une devise invalide et l’absence de montant', () => {
    expect(String(eventVariables({ total: 100 }, { shopName: '', when: '', currency: 'nope' }).total)).toContain('100')
    expect(eventVariables({}, { shopName: '', when: '', currency: 'XOF' }).total).toBeUndefined()
  })
})

describe('alertTarget', () => {
  it('ouvre la bonne page de l’admin', () => {
    expect(alertTarget('ORDER_CREATED').path).toBe('/admin/commandes')
    expect(alertTarget('STOCK_OUT').path).toBe('/admin/produits?stock=low')
    expect(alertTarget('APPOINTMENT_CREATED').path).toBe('/admin/rendez-vous')
    expect(alertTarget('OTHER').path).toBe('/admin')
  })
})

describe('merchantAlertEmailHtml', () => {
  it('échappe tout ce qui vient d’un client', () => {
    const html = merchantAlertEmailHtml({
      origin: 'https://bitiko.shop',
      shopName: 'Wax <i>Style</i>',
      heading: 'Commande <script>x</script>',
      body: 'Awa & "Fils"\nLigne 2',
      buttonLabel: 'Ouvrir',
      path: '/admin/commandes',
    })
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<i>Style</i>')
    expect(html).toContain('Awa &amp; &quot;Fils&quot;<br>Ligne 2')
    expect(html).toContain('https://bitiko.shop/admin/commandes')
  })
})
