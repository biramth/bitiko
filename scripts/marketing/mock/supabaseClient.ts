// Faux client Supabase pour produire les visuels marketing : l'interface réelle de Bitiko
// tourne sur des données fictives (« Salon Awa Beauté »), sans base ni compte.
// Utilisé uniquement par scripts/marketing/vite.config.ts — jamais par l'application.
import { STORE_TEMPLATE_BY_KEY } from '@/config/storeTemplates'
import { generateStorefront } from '@/features/onboarding/generateStorefront'
import { buildBoutique } from './boutique'

// Profil : 'salon' (services, défaut) ou 'boutique' (commerce). Choisi par localStorage.mock_profile.
const profile = (typeof localStorage !== 'undefined' && localStorage.getItem('mock_profile')) || 'salon'
const isShop = profile === 'boutique'

const uid = '00000000-0000-0000-0000-00000000aaaa'
const shopId = '00000000-0000-0000-0000-00000000bbbb'
const now = new Date()
const iso = (d: Date) => d.toISOString()

const at = (h: number, m = 0, dayOffset = 0) => {
  const d = new Date(now)
  d.setDate(d.getDate() + dayOffset)
  d.setHours(h, m, 0, 0)
  return iso(d)
}
const ymd = (monthOffset: number, day: number) => {
  const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, day)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const template = STORE_TEMPLATE_BY_KEY[isShop ? 'mode' : 'institut']
const storefront = generateStorefront({
  template,
  answers: {
    description: isShop
      ? 'Robes, ensembles et accessoires en tissu wax, confectionnés à Dakar. Livraison partout au Sénégal.'
      : 'Soins du visage, massages et onglerie à Dakar. Réservez votre moment en ligne.',
    audience: 'particuliers',
    homeDelivery: false,
    payOnDelivery: false,
    madeToOrder: false,
    expressDelivery: false,
    priceRange: 'milieu',
    story: '',
    faq: [],
  },
})
const homeSections = storefront.layoutSections.filter((s) => s.type !== 'testimonials' && s.type !== 'lookbook' && (isShop || s.type !== 'products'))

const shop = {
  id: shopId,
  owner_id: uid,
  name: isShop ? 'Wax & Style by Fatou' : 'Salon Awa Beauté',
  slug: isShop ? 'wax-style' : 'salon-awa',
  description: storefront.description,
  whatsapp_number: '+221771234567',
  currency: 'XOF',
  country_code: 'SN',
  logo_url: null,
  banner_url: null,
  business_type: isShop ? 'mode' : 'beaute',
  business_type_id: null,
  theme_color: storefront.themeColor,
  theme_config: storefront.themeConfig,
  layout_sections: homeSections,
  page_templates: storefront.pageTemplates,
  builder_draft: null,
  social_links: {},
  address: isShop ? 'Marché HLM, Dakar' : 'Sacré-Cœur 3, Dakar',
  delivery_fee: 0,
  free_delivery_threshold: null,
  low_stock_threshold: 3,
  payment_instructions: null,
  onboarding_responses: null,
  template_id: null,
  organization_id: null,
  ga_measurement_id: null,
  created_at: iso(now),
  updated_at: iso(now),
}

const category = { id: 'c1', shop_id: shopId, name: 'Soins', slug: 'soins', kind: 'service', position: 0, emoji: null, description: null, color: null, image_url: null }
const svc = (id: string, name: string, price: number, duration_minutes: number, description: string, active = true) => ({
  id, shop_id: shopId, name, price, duration_minutes, active, description, category_id: 'c1',
  sort_order: 0, created_at: iso(now), updated_at: iso(now), category: { id: 'c1', name: 'Soins' },
})
const services = [
  svc('s1', 'Soin visage éclat', 12000, 60, 'Nettoyage, gommage et masque hydratant.'),
  svc('s2', 'Massage relaxant', 15000, 60, 'Un moment de détente, huiles chaudes.'),
  svc('s3', 'Manucure', 5000, 45, 'Soin des mains et pose de vernis.'),
  svc('s4', 'Pose semi-permanent', 7000, 45, 'Tenue jusqu’à trois semaines.'),
  svc('s5', 'Gommage corps', 10000, 45, 'Peau douce et éclatante.'),
  svc('s6', 'Épilation sourcils', 2500, 20, 'Ligne nette, au fil ou à la cire.', false),
]
const member = (id: string, name: string, role: string, specialty: string | null, phone: string | null, rating: number | null, sort: number) => ({
  id, shop_id: shopId, name, role, specialty, phone, email: null, avatar_url: null, rating, active: true, show_contact: !!phone,
  sort_order: sort, created_at: iso(now), updated_at: iso(now),
})
const team = [
  member('t1', 'Awa Diop', 'Esthéticienne', 'Soins du visage', '771111111', 4.9, 0),
  member('t2', 'Mariama Fall', 'Prothésiste ongulaire', 'Onglerie', null, 4.8, 1),
  member('t3', 'Coumba Sarr', 'Masseuse', 'Massages', '772222222', 4.7, 2),
]

const appt = (id: string, dayOffset: number, h: number, m: number, name: string, phone: string, status: string, s: (typeof services)[number], t: (typeof team)[number] | null) => ({
  id, shop_id: shopId, service_id: s.id, team_member_id: t?.id ?? null, customer_name: name, customer_phone: phone,
  start_at: at(h, m, dayOffset), end_at: at(h + (s.duration_minutes >= 60 ? 1 : 0), (m + (s.duration_minutes % 60)) % 60, dayOffset),
  status, notes: null, created_at: iso(now),
  service_name: s.name, service_price: s.price, service_duration: s.duration_minutes,
  service: { id: s.id, name: s.name, price: s.price, duration_minutes: s.duration_minutes },
  team_member: t ? { id: t.id, name: t.name } : null,
})
const appointments = [
  appt('a1', 0, 9, 0, 'Fatou Ndiaye', '+221771234567', 'done', services[0], team[0]),
  appt('a2', 0, 10, 30, 'Khady Sow', '+221781234567', 'confirmed', services[1], team[2]),
  appt('a3', 0, 14, 0, 'Aïssatou Ba', '+221761234567', 'pending', services[2], team[1]),
  appt('a4', 0, 16, 0, 'Ndeye Gueye', '+221701234567', 'pending', services[0], null),
  appt('a5', 1, 9, 30, 'Rokhaya Sy', '+221771112233', 'confirmed', services[3], team[1]),
  appt('a6', 1, 15, 0, 'Bineta Cissé', '+221772223344', 'pending', services[4], team[2]),
  appt('a7', 2, 11, 0, 'Mame Diarra', '+221773334455', 'confirmed', services[1], team[2]),
  appt('a8', 2, 16, 30, 'Sokhna Thiam', '+221774445566', 'confirmed', services[0], team[0]),
  appt('a9', 3, 10, 0, 'Astou Mbaye', '+221775556677', 'pending', services[2], null),
  appt('a10', 4, 9, 0, 'Diarra Faye', '+221776667788', 'confirmed', services[3], team[1]),
]

const boutique = isShop ? buildBoutique({ shopId, now, iso }) : null
const caps = boutique?.caps ?? ['HAS_SHOP', 'HAS_PRODUCTS', 'HAS_SERVICES', 'HAS_APPOINTMENTS', 'HAS_CALENDAR', 'HAS_ORDERS', 'HAS_CUSTOMERS', 'HAS_TEAM', 'HAS_ANALYTICS', 'HAS_REVIEWS', 'HAS_PROMOTIONS']

const plan = (typeof localStorage !== 'undefined' && localStorage.getItem('mock_plan')) || 'pro'

// Vingt-quatre mois d'activité plausible, en légère croissance (permet de comparer avec l'année précédente).
const monthly = Array.from({ length: 24 }, (_, i) => {
  const offset = i - 23
  const growth = 0.7 + i * 0.03
  return {
    offset,
    orders: Math.round(((isShop ? 470000 : 210000) + ((i * 37) % 5) * 12000) * growth / 1000) * 1000,
    appointments: isShop ? 0 : Math.round((260000 + ((i * 53) % 4) * 15000) * growth / 1000) * 1000,
    orderCount: 9 + (i % 4),
    appointmentCount: isShop ? 0 : 24 + (i % 6) * 2,
  }
})
const financeEntries: Record<string, unknown>[] = []
monthly.forEach((m, i) => {
  const fe = (kind: string, category: string, label: string, amount: number, day: number, method: string | null) =>
    financeEntries.push({ id: `f-${i}-${category}-${day}`, shop_id: shopId, kind, category, label, amount, entry_date: ymd(m.offset, day), payment_method: method, note: null, created_at: iso(now) })
  fe('expense', 'loyer', isShop ? 'Loyer de la boutique' : 'Loyer du local', 150000, 1, 'mobile_money')
  fe('expense', 'salaires', isShop ? 'Couturier à la pièce' : 'Salaire Mariama', 120000, 28, 'mobile_money')
  fe('expense', 'stock', isShop ? 'Tissus wax et bazin' : 'Produits de soin et vernis', (isShop ? 190000 : 70000) + ((i * 29) % 5) * 9000, 5, 'cash')
  fe('expense', 'energie', 'Électricité et internet', 38000 + ((i * 11) % 3) * 4000, 12, 'mobile_money')
  fe('expense', 'marketing', 'Publicité Instagram', 15000, 15, 'mobile_money')
  fe('income', 'vente_comptoir', isShop ? 'Ventes au marché du samedi' : 'Ventes en boutique du samedi', 45000 + ((i * 17) % 4) * 8000, 8, 'cash')
})

const tables: Record<string, unknown[]> = {
  finance_entries: financeEntries,
  shop_subscriptions: plan === 'free' ? [] : [{ shop_id: shopId, plan, status: 'active', current_period_end: iso(new Date(Date.now() + 20 * 86400000)), updated_at: iso(now) }],
  shops: [shop],
  services: isShop ? [] : services,
  team_members: isShop ? [] : team,
  appointments: isShop ? [] : appointments,
  reservations: [],
  categories: boutique?.categories ?? [category],
  delivery_secteurs: boutique?.secteurs ?? [],
  delivery_villes: [],
  shop_members: [],
  booking_settings: [{
    shop_id: shopId, timezone: 'Africa/Dakar', open_time: '09:00', close_time: '19:00', open_days: [1, 2, 3, 4, 5, 6], slot_minutes: 30,
    max_days_ahead: 60, table_capacity: 40, reservation_minutes: 90, updated_at: iso(now), closed_dates: [],
    weekly_hours: {
      '1': [['09:00', '13:00'], ['15:00', '19:00']],
      '2': [['09:00', '13:00'], ['15:00', '19:00']],
      '3': [['09:00', '13:00'], ['15:00', '19:00']],
      '4': [['09:00', '13:00'], ['15:00', '19:00']],
      '5': [['09:00', '13:00'], ['15:00', '18:00']],
      '6': [['09:00', '17:00']],
    },
  }],
  automation_rules: [],
  orders: boutique?.orders ?? [],
  order_items: boutique?.orders.flatMap((o) => o.items as Row[]) ?? [],
  products: boutique?.products ?? [],
  customers: boutique?.customers ?? [],
}

type Row = Record<string, unknown>

function makeQuery(table: string) {
  let rows = [...((tables[table] ?? []) as Row[])]
  let single = false
  let maybe = false
  let head = false
  let count = false
  let write: { op: 'update' | 'insert' | 'delete'; payload?: Row } | null = null
  const q: Record<string, unknown> = {}
  const chain = (fn: () => void) => () => { fn(); return q }
  Object.assign(q, {
    select: (_c?: string, opts?: { head?: boolean; count?: string }) => { if (opts?.head) head = true; if (opts?.count) count = true; return q },
    eq: (c: string, v: unknown) => { rows = rows.filter((r) => r[c] === v); return q },
    neq: (c: string, v: unknown) => { rows = rows.filter((r) => r[c] !== v); return q },
    gte: (c: string, v: string) => { rows = rows.filter((r) => (r[c] as string) >= v); return q },
    lt: (c: string, v: string) => { rows = rows.filter((r) => (r[c] as string) < v); return q },
    lte: (c: string, v: string) => { rows = rows.filter((r) => (r[c] as string) <= v); return q },
    gt: (c: string, v: string) => { rows = rows.filter((r) => (r[c] as string) > v); return q },
    in: (c: string, v: unknown[]) => { rows = rows.filter((r) => v.includes(r[c])); return q },
    is: chain(() => {}),
    or: chain(() => {}),
    ilike: (c: string, v: string) => {
      if (typeof v === 'string' && !v.includes('%')) rows = rows.filter((r) => String(r[c]).toLowerCase() === v.toLowerCase())
      return q
    },
    not: chain(() => {}),
    order: (c: string, o?: { ascending?: boolean }) => {
      const asc = o?.ascending !== false
      rows.sort((a, b) => ((a[c] as string) > (b[c] as string) ? 1 : -1) * (asc ? 1 : -1))
      return q
    },
    limit: (n: number) => { rows = rows.slice(0, n); return q },
    range: (a: number, b: number) => { rows = rows.slice(a, b + 1); return q },
    single: () => { single = true; return q },
    maybeSingle: () => { maybe = true; return q },
    insert: (v: Row) => { write = { op: 'insert', payload: v }; return q },
    update: (v: Row) => { write = { op: 'update', payload: v }; return q },
    upsert: (v: Row) => { write = { op: 'insert', payload: v }; return q },
    delete: chain(() => { write = { op: 'delete' } }),
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => {
      // Les écritures modifient réellement les données : la démo montre l'effet d'un clic (ex. « Confirmer »).
      if (write?.op === 'update') rows.forEach((r) => Object.assign(r, write!.payload))
      else if (write?.op === 'delete') tables[table] = ((tables[table] ?? []) as Row[]).filter((r) => !rows.includes(r))
      else if (write?.op === 'insert') {
        const row = { id: 'new-' + Math.random().toString(36).slice(2), created_at: iso(new Date()), ...write.payload }
        tables[table] = [...((tables[table] ?? []) as Row[]), row]
        rows = [row]
      }
      const data = single || maybe ? rows[0] ?? null : rows
      return Promise.resolve({ data: head ? null : data, error: null, count: count ? rows.length : null }).then(res, rej)
    },
  })
  return q
}

/** Boutiques fictives pour l'outil Plateforme (non utilisé par les visuels marketing). */
function platformShops() {
  const day = 86400000
  const names = ['Salon Awa Beauté', 'Wax & Style by Fatou', 'Chez Moussa', 'Boutique Khady', 'Barber Ibou', 'Café Léa', 'Tech Dakar', 'Épicerie Sokhna', 'Ateliers Mame', 'Robes de Thiès']
  return names.flatMap((name, i) =>
    [0, 1, 2].map((k) => {
      const n = i * 3 + k
      const paid = n % 4 === 0 ? 'pro' : n % 4 === 1 ? 'essential' : 'free'
      const lapsed = paid !== 'free' && n % 7 === 0
      const end = paid === 'free' ? null : new Date(Date.now() + (lapsed ? -5 : (n % 5) * 6 - 1) * day).toISOString()
      return {
        id: `shop-${n}`, name: k === 0 ? name : `${name} ${k + 1}`, slug: `shop-${n}`, whatsapp_number: `+22177${String(1000000 + n * 731).slice(0, 7)}`, currency: 'XOF',
        created_at: new Date(Date.now() - n * 9 * day).toISOString(), products: n % 12, orders: (n * 7) % 40, revenue: ((n * 37) % 90) * 12000,
        plan: lapsed ? 'free' : paid, plan_status: paid === 'free' ? 'none' : 'active', owner_id: `owner-${n}`, owner_email: `owner${n}@example.sn`,
        country_code: n % 6 === 0 ? 'CI' : 'SN', business_type: n % 2 ? 'mode' : 'beaute', subscribed_plan: paid, period_end: end,
        suspended_at: n === 3 ? new Date(Date.now() - 2 * day).toISOString() : null,
        last_order_at: (n * 7) % 40 === 0 ? null : new Date(Date.now() - ((n * 5) % 60) * day).toISOString(),
      }
    }),
  )
}

const session = { access_token: 'mock', user: { id: uid, email: 'awa@example.sn', user_metadata: { full_name: 'Awa Diop' } } }

export const supabase = {
  auth: {
    getSession: async () => ({ data: { session } }),
    getUser: async () => ({ data: { user: session.user }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signOut: async () => ({ error: null }),
  },
  from: (t: string) => makeQuery(t),
  rpc: async (name: string, args: Record<string, string>) => {
    if (name === 'get_platform_role') return { data: 'owner', error: null }
    if (name === 'get_platform_shops') return { data: platformShops(), error: null }
    if (name === 'get_platform_stats') {
      const day = 86400000
      return {
        data: {
          total_shops: 30, paid_shops: 13, total_products: 214, active_products: 190, total_orders: 612, orders_today: 9,
          visits_today: 143, visitors_today: 98, visits_7d: 1180, visitors_7d: 760, visits_30d: 4920, visitors_30d: 2610,
          revenue_by_currency: [{ currency: 'XOF', total: 18450000 }], revenue_today_by_currency: [{ currency: 'XOF', total: 240000 }],
          visits_by_day: Array.from({ length: 14 }, (_, i) => ({ day: new Date(Date.now() - (13 - i) * day).toISOString().slice(0, 10), visits: 90 + ((i * 37) % 60), visitors: 55 + ((i * 23) % 35) })),
          top_pages: [], top_shops: [{ slug: 'a', name: 'Salon Awa Beauté', visits: 420 }], top_referrers: [{ referrer: 'instagram.com', visits: 210 }],
        },
        error: null,
      }
    }
    if (name === 'get_platform_health') {
      return {
        data: {
          generated_at: new Date().toISOString(), pending_events: 4, stuck_events: 3, oldest_pending_event: new Date(Date.now() - 30 * 3600000).toISOString(),
          failed_runs_7d: 2, skipped_runs_7d: { no_owner_email: 3 },
          recent_failures: [{ created_at: new Date(Date.now() - 7200000).toISOString(), event_type: 'ORDER_CREATED', shop_name: 'Chez Moussa', error: 'Resend 422: invalid to address' }],
          campaign_failures: [{ name: 'Rentrée 2026', sent_at: new Date(Date.now() - 5 * 86400000).toISOString(), failed_count: 3, recipient_count: 40 }],
          stale_payments: 1, suspended_shops: 1,
        },
        error: null,
      }
    }
    if (name === 'business_type_capability_codes') return { data: caps, error: null }
    if (name === 'shop_business_type_slug') return { data: shop.business_type, error: null }
    if (name === 'finance_revenue_by_month') {
      const rows = monthly.flatMap((m) => {
        const month = ymd(m.offset, 1)
        return [
          { month, source: 'orders', amount: m.orders, entries: m.orderCount },
          { month, source: 'appointments', amount: m.appointments, entries: m.appointmentCount },
        ]
      })
      return { data: rows.filter((r) => r.month >= args.p_from && r.month <= args.p_to), error: null }
    }
    if (name === 'get_shop_visit_stats') return { data: [{ visits_today: 84, visits_30d: 2310, visitors_30d: 1180 }], error: null }
    if (name === 'finance_top_items') {
      if (boutique) return { data: boutique.topItems, error: null }
      return {
        data: [
          { name: 'Soin visage éclat', kind: 'service', quantity: 46, amount: 552000 },
          { name: 'Massage relaxant', kind: 'service', quantity: 31, amount: 465000 },
          { name: 'Pose semi-permanent', kind: 'service', quantity: 58, amount: 406000 },
          { name: 'Sérum éclat', kind: 'product', quantity: 22, amount: 176000 },
          { name: 'Manucure', kind: 'service', quantity: 63, amount: 315000 },
        ],
        error: null,
      }
    }
    if (name === 'get_booking_slots' || name === 'get_reservation_slots') {
      return { data: ['09:00', '09:30', '10:30', '11:00', '15:30', '16:00', '17:30'].map((h) => ({ slot_start: `${args.p_date}T${h}:00.000Z` })), error: null }
    }
    if (name === 'create_appointment') return { data: 'appt-new', error: null }
    return { data: [], error: null }
  },
  storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }), list: async () => ({ data: [], error: null }), upload: async () => ({ error: null }), remove: async () => ({ error: null }) }) },
  channel: () => ({ on() { return this }, subscribe() { return this } }),
  removeChannel() {},
}
