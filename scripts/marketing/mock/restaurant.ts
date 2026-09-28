// Jeu de données « restaurant » : un restaurant de quartier fictif (« Le Comptoir de Moussa »).
// Photos : des assiettes dessinées remplacent les photos absentes (aucune image externe).
type Row = Record<string, unknown>

const PLATES: [string, string, string][] = [
  ['#9a3412', '#fbbf24', '#65a30d'],
  ['#7c2d12', '#f97316', '#84cc16'],
  ['#b45309', '#fde68a', '#dc2626'],
  ['#57534e', '#f59e0b', '#16a34a'],
  ['#be123c', '#fecaca', '#f59e0b'],
  ['#0f766e', '#fde047', '#ea580c'],
]

function plate(index: number): string {
  const [food, side, garnish] = PLATES[index % PLATES.length]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
<rect width="600" height="600" fill="#f5efe6"/>
<circle cx="300" cy="300" r="230" fill="#fff" stroke="#e7e0d4" stroke-width="10"/>
<circle cx="300" cy="300" r="170" fill="#fbfaf7"/>
<ellipse cx="255" cy="290" rx="95" ry="70" fill="${food}"/>
<ellipse cx="365" cy="330" rx="70" ry="50" fill="${side}"/>
<circle cx="330" cy="230" r="26" fill="${garnish}"/><circle cx="370" cy="255" r="18" fill="${garnish}"/>
</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export function buildRestaurant(ctx: { shopId: string; now: Date; iso: (d: Date) => string }) {
  const { shopId, now, iso } = ctx
  const ago = (days: number, hour = 12) => {
    const d = new Date(now)
    d.setDate(d.getDate() - days)
    d.setHours(hour, 20, 0, 0)
    return iso(d)
  }
  const at = (dayOffset: number, hour: number, minute = 0) => {
    const d = new Date(now)
    d.setDate(d.getDate() + dayOffset)
    d.setHours(hour, minute, 0, 0)
    return iso(d)
  }

  const categories = [
    { id: 'r1', shop_id: shopId, name: 'Entrées', slug: 'entrees', kind: 'product', position: 0, emoji: null, description: null, color: null, image_url: null },
    { id: 'r2', shop_id: shopId, name: 'Plats', slug: 'plats', kind: 'product', position: 1, emoji: null, description: null, color: null, image_url: null },
    { id: 'r3', shop_id: shopId, name: 'Desserts', slug: 'desserts', kind: 'product', position: 2, emoji: null, description: null, color: null, image_url: null },
    { id: 'r4', shop_id: shopId, name: 'Boissons', slug: 'boissons', kind: 'product', position: 3, emoji: null, description: null, color: null, image_url: null },
  ]

  const carte: [string, number, string, string, string | null][] = [
    ['Salade fraîcheur', 3500, 'r1', 'Crudités du marché, avocat, vinaigrette maison.', null],
    ['Accras croustillants', 3000, 'r1', 'Six beignets, sauce piquante à part.', null],
    ['Poulet braisé', 6500, 'r2', 'Mariné 24 h, braisé au feu de bois, frites maison.', 'Best-seller'],
    ['Poisson grillé', 8000, 'r2', 'Poisson du jour, légumes sautés, riz parfumé.', null],
    ['Brochettes de bœuf', 7000, 'r2', 'Trois brochettes, oignons confits, alloco.', null],
    ['Burger du Comptoir', 6000, 'r2', 'Steak haché maison, cheddar, sauce secrète.', 'Nouveau'],
    ['Fondant au chocolat', 2500, 'r3', 'Cœur coulant, servi tiède.', null],
    ['Salade de fruits', 2000, 'r3', 'Fruits frais de saison.', null],
    ['Citronnade maison', 1500, 'r4', 'Citron, menthe fraîche, gingembre.', null],
    ['Jus de gingembre', 1500, 'r4', 'Pressé chaque matin.', null],
  ]
  const products = carte.map(([name, price, categoryId, description, badge], i) => {
    const id = `m${i + 1}`
    const image = { id: `mi${i + 1}`, product_id: id, public_url: plate(i), storage_path: `mock/${id}`, sort_order: 0, created_at: iso(now) }
    return {
      id, shop_id: shopId, name, slug: name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      description, price, stock: 50, active: true, badge, category_id: categoryId,
      option_fields: [], sort_order: i, created_at: ago(20 - i), updated_at: iso(now),
      category: categories.find((c) => c.id === categoryId), images: [image], variants: [],
    }
  })

  const customersSeed: [string, string, number, number][] = [
    ['Moussa Kane', '+221771230001', 9, 96000],
    ['Léa Martin', '+221771230002', 4, 41000],
    ['Ibrahima Diallo', '+221771230003', 6, 63500],
    ['Sarah Benali', '+221771230004', 3, 29500],
    ['Kevin Mensah', '+221771230005', 2, 21000],
  ]
  const customers = customersSeed.map(([name, phone, orders_count, total_spent], i) => ({
    id: `rc${i + 1}`, shop_id: shopId, name, phone, email: null, address: 'Centre-ville', orders_count, total_spent,
    first_order_at: ago(40 - i * 4), last_order_at: ago(i), created_at: ago(40 - i * 4), updated_at: iso(now),
  }))

  const statuses = ['pending', 'confirmed', 'pending', 'paid', 'delivered', 'delivered', 'paid', 'delivered', 'cancelled', 'delivered']
  const orders = statuses.map((status, i) => {
    const customer = customers[i % customers.length]
    const main = products[2 + (i % 4)]
    const drink = products[8 + (i % 2)]
    const quantity = 1 + (i % 3)
    const delivery = i % 2 === 0
    const fee = delivery ? 1000 : 0
    const items = [
      { id: `ri${i}a`, order_id: `ro${i + 1}`, product_id: main.id, product_name: main.name, quantity, unit_price: main.price, subtotal: main.price * quantity, variant_id: null, variant_name: null, options: null },
      { id: `ri${i}b`, order_id: `ro${i + 1}`, product_id: drink.id, product_name: drink.name, quantity, unit_price: drink.price, subtotal: drink.price * quantity, variant_id: null, variant_name: null, options: null },
    ]
    const total = items.reduce((sum, item) => sum + item.subtotal, 0) + fee
    return {
      id: `ro${i + 1}`, shop_id: shopId, order_number: `#${String(126 - i).padStart(4, '0')}`, customer_name: customer.name, customer_phone: customer.phone,
      customer_email: null, customer_address: delivery ? '14 avenue des Fleurs, Centre-ville' : 'À emporter', delivery_zone_name: delivery ? 'Centre-ville' : null,
      delivery_fee: fee, payment_method: i % 3 === 0 ? 'mobile_money' : 'cod', notes: null, status, total,
      created_at: ago(Math.floor(i / 3), 12 + (i % 9)), updated_at: iso(now), items,
    }
  })

  const secteurs = [
    { id: 'rd1', shop_id: shopId, name: 'Centre-ville', fee: 1000, is_active: true, created_at: iso(now), updated_at: iso(now) },
    { id: 'rd2', shop_id: shopId, name: 'Quartiers voisins', fee: 2000, is_active: true, created_at: iso(now), updated_at: iso(now) },
  ]

  const resa = (id: string, dayOffset: number, hour: number, minute: number, name: string, party: number, status: string, notes: string | null = null) => ({
    id, shop_id: shopId, customer_name: name, customer_phone: `+22177${4410000 + Number(id.slice(2)) * 7919}`.slice(0, 13), party_size: party, start_at: at(dayOffset, hour, minute),
    status, notes, source: 'online', created_at: ago(1), updated_at: iso(now),
  })
  const reservations = [
    resa('rs1', 0, 12, 30, 'Famille Ndiaye', 6, 'confirmed', 'Anniversaire, prévoir une bougie'),
    resa('rs2', 0, 13, 0, 'Léa Martin', 2, 'confirmed'),
    resa('rs3', 0, 19, 30, 'Ibrahima Diallo', 4, 'pending'),
    resa('rs4', 0, 20, 0, 'Sarah Benali', 2, 'pending', 'En terrasse si possible'),
    resa('rs5', 0, 20, 30, 'Équipe Tech Corner', 8, 'confirmed'),
    resa('rs6', 0, 21, 0, 'Kevin Mensah', 3, 'pending'),
    resa('rs7', 1, 12, 30, 'Awa Sow', 2, 'confirmed'),
    resa('rs8', 1, 20, 0, 'Moussa Kane', 5, 'confirmed'),
    resa('rs9', 2, 19, 30, 'Claire Dubois', 4, 'pending'),
    resa('rs10', 3, 20, 30, 'Omar Faye', 6, 'confirmed'),
  ]

  const topItems = [
    { name: 'Poulet braisé', kind: 'product', quantity: 212, amount: 1378000 },
    { name: 'Brochettes de bœuf', kind: 'product', quantity: 151, amount: 1057000 },
    { name: 'Poisson grillé', kind: 'product', quantity: 118, amount: 944000 },
    { name: 'Burger du Comptoir', kind: 'product', quantity: 97, amount: 582000 },
    { name: 'Citronnade maison', kind: 'product', quantity: 305, amount: 457500 },
  ]

  return {
    categories,
    products,
    customers,
    orders: orders as Row[],
    secteurs,
    reservations: reservations as Row[],
    topItems,
    // Mêmes capacités que le type d'activité « restauration » réel.
    caps: ['HAS_ANALYTICS', 'HAS_CUSTOMERS', 'HAS_DELIVERY', 'HAS_ORDERS', 'HAS_PREPARATION_TIME', 'HAS_PRODUCTS', 'HAS_PROMOTIONS', 'HAS_RESERVATIONS', 'HAS_REVIEWS', 'HAS_SERVICES', 'HAS_SHOP', 'HAS_TEAM'],
  }
}
