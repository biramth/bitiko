// Jeu de données « commerce » : une boutique de mode fictive (« Wax & Style by Fatou »).
// Photos : si des images sont déposées dans scripts/marketing/photos/, elles servent de photos produit
// (dans l'ordre alphabétique) ; sinon des motifs de tissu générés remplacent les photos absentes.
type Row = Record<string, unknown>

const photos = Object.values(
  import.meta.glob('../photos/*.{jpg,jpeg,png,webp}', { eager: true, query: '?url', import: 'default' }),
) as string[]

const PALETTES: [string, string, string][] = [
  ['#c2481c', '#f6c453', '#1c1917'],
  ['#0f766e', '#f4a261', '#fdfbf7'],
  ['#7f1d1d', '#e9c46a', '#fdfbf7'],
  ['#1d4ed8', '#fbbf24', '#fdfbf7'],
  ['#4d7c0f', '#f97316', '#fdfbf7'],
  ['#86198f', '#fcd34d', '#fdfbf7'],
  ['#0e7490', '#fb7185', '#fdfbf7'],
  ['#9a3412', '#a3e635', '#fdfbf7'],
]

function waxPattern(index: number): string {
  const [a, b, c] = PALETTES[index % PALETTES.length]
  const motif = index % 3
  const tiles: string[] = []
  for (let row = 0; row < 6; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      const x = col * 120 + (row % 2 ? 60 : 0)
      const y = row * 125
      if (motif === 0) tiles.push(`<circle cx="${x}" cy="${y}" r="46" fill="${b}"/><circle cx="${x}" cy="${y}" r="30" fill="${c}"/><circle cx="${x}" cy="${y}" r="14" fill="${a}"/>`)
      else if (motif === 1) tiles.push(`<path d="M${x} ${y - 50} L${x + 42} ${y} L${x} ${y + 50} L${x - 42} ${y}Z" fill="${b}"/><path d="M${x} ${y - 26} L${x + 22} ${y} L${x} ${y + 26} L${x - 22} ${y}Z" fill="${c}"/>`)
      else tiles.push(`<path d="M${x - 44} ${y + 30} Q${x} ${y - 60} ${x + 44} ${y + 30}Z" fill="${b}"/><circle cx="${x}" cy="${y + 8}" r="12" fill="${c}"/>`)
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 750"><rect width="600" height="750" fill="${a}"/>${tiles.join('')}</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const imageFor = (index: number) => photos[index] ?? waxPattern(index)

export function buildBoutique(ctx: { shopId: string; now: Date; iso: (d: Date) => string }) {
  const { shopId, now, iso } = ctx
  const ago = (days: number, hour = 10) => {
    const d = new Date(now)
    d.setDate(d.getDate() - days)
    d.setHours(hour, 15, 0, 0)
    return iso(d)
  }

  const categories = [
    { id: 'k1', shop_id: shopId, name: 'Robes', slug: 'robes', kind: 'product', position: 0, emoji: null, description: null, color: null, image_url: null },
    { id: 'k2', shop_id: shopId, name: 'Ensembles', slug: 'ensembles', kind: 'product', position: 1, emoji: null, description: null, color: null, image_url: null },
    { id: 'k3', shop_id: shopId, name: 'Accessoires', slug: 'accessoires', kind: 'product', position: 2, emoji: null, description: null, color: null, image_url: null },
  ]

  const catalogue: [string, number, number, string, string | null][] = [
    ['Robe wax Aminata', 25000, 14, 'k1', 'Nouveau'],
    ['Ensemble bazin Sokhna', 35000, 6, 'k2', null],
    ['Boubou brodé Ndeye', 45000, 3, 'k1', 'Best-seller'],
    ['Sac en pagne Kaolack', 12000, 22, 'k3', null],
    ['Robe portefeuille Mame', 28000, 9, 'k1', null],
    ['Ensemble wax Ibrahima', 32000, 0, 'k2', null],
    ['Pochette wax Thioro', 6000, 40, 'k3', null],
    ['Foulard imprimé Awa', 8000, 18, 'k3', 'Promo'],
  ]
  const products = catalogue.map(([name, price, stock, categoryId, badge], i) => {
    const id = `p${i + 1}`
    const image = { id: `i${i + 1}`, product_id: id, public_url: imageFor(i), storage_path: `mock/${id}`, sort_order: 0, created_at: iso(now) }
    return {
      id, shop_id: shopId, name, slug: name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      description: 'Tissu wax de qualité, coupe soignée, confectionné à Dakar.', price, stock, active: true, badge, category_id: categoryId,
      option_fields: [], sort_order: i, created_at: ago(30 - i), updated_at: iso(now),
      category: categories.find((c) => c.id === categoryId), images: [image], variants: [],
    }
  })

  const customersSeed: [string, string, number, number][] = [
    ['Fatou Ndiaye', '+221771234567', 5, 142000],
    ['Khady Sow', '+221781234567', 3, 96000],
    ['Aïssatou Ba', '+221761234567', 2, 57000],
    ['Ndeye Gueye', '+221701234567', 4, 118000],
    ['Rokhaya Sy', '+221771112233', 1, 28000],
    ['Bineta Cissé', '+221772223344', 2, 43000],
  ]
  const customers = customersSeed.map(([name, phone, orders_count, total_spent], i) => ({
    id: `cu${i + 1}`, shop_id: shopId, name, phone, email: null, address: 'Dakar', orders_count, total_spent,
    first_order_at: ago(60 - i * 5), last_order_at: ago(i * 2), created_at: ago(60 - i * 5), updated_at: iso(now),
  }))

  const statuses = ['pending', 'pending', 'confirmed', 'paid', 'delivered', 'paid', 'delivered', 'delivered', 'confirmed', 'cancelled', 'delivered', 'paid']
  const orders = statuses.map((status, i) => {
    const customer = customers[i % customers.length]
    const first = products[i % products.length]
    const second = products[(i + 3) % products.length]
    const quantity = 1 + (i % 2)
    const fee = i % 3 === 0 ? 0 : 1500
    const items = [
      { id: `oi${i}a`, order_id: `o${i + 1}`, product_id: first.id, product_name: first.name, quantity, unit_price: first.price, subtotal: first.price * quantity, variant_id: null, variant_name: null, options: null },
      ...(i % 2 === 0 ? [{ id: `oi${i}b`, order_id: `o${i + 1}`, product_id: second.id, product_name: second.name, quantity: 1, unit_price: second.price, subtotal: second.price, variant_id: null, variant_name: null, options: null }] : []),
    ]
    const total = items.reduce((sum, item) => sum + item.subtotal, 0) + fee
    return {
      id: `o${i + 1}`, shop_id: shopId, order_number: `#${String(48 - i).padStart(4, '0')}`, customer_name: customer.name, customer_phone: customer.phone,
      customer_email: null, customer_address: 'Parcelles Assainies, Dakar', delivery_zone_name: 'Dakar', delivery_fee: fee, payment_method: i % 2 ? 'mobile_money' : 'cod',
      notes: null, status, total, created_at: ago(Math.floor(i / 2), 9 + (i % 8)), updated_at: iso(now), items,
    }
  })

  const secteurs = [
    { id: 'd1', shop_id: shopId, name: 'Dakar', fee: 1500, is_active: true, created_at: iso(now), updated_at: iso(now) },
    { id: 'd2', shop_id: shopId, name: 'Rufisque et banlieue', fee: 2500, is_active: true, created_at: iso(now), updated_at: iso(now) },
    { id: 'd3', shop_id: shopId, name: 'Thiès', fee: 4000, is_active: true, created_at: iso(now), updated_at: iso(now) },
  ]

  const topItems = [
    { name: 'Boubou brodé Ndeye', kind: 'product', quantity: 34, amount: 1530000 },
    { name: 'Ensemble bazin Sokhna', kind: 'product', quantity: 28, amount: 980000 },
    { name: 'Robe wax Aminata', kind: 'product', quantity: 37, amount: 925000 },
    { name: 'Robe portefeuille Mame', kind: 'product', quantity: 24, amount: 672000 },
    { name: 'Sac en pagne Kaolack', kind: 'product', quantity: 41, amount: 492000 },
  ]

  return {
    categories,
    products,
    customers,
    orders: orders as Row[],
    secteurs,
    topItems,
    caps: ['HAS_SHOP', 'HAS_PRODUCTS', 'HAS_DELIVERY', 'HAS_ORDERS', 'HAS_CUSTOMERS', 'HAS_ANALYTICS', 'HAS_REVIEWS', 'HAS_PROMOTIONS'],
  }
}
