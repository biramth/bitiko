/** Événements métier pour lesquels un commerçant peut activer un email
 *  (envoyé au propriétaire de la boutique). Miroir des types émis par la base :
 *  ORDER_* (0107), APPOINTMENT_CREATED / RESERVATION_CREATED (0124) et STOCK_LOW / STOCK_OUT (0131). */
export interface AutomationEventDef {
  type: string
  label: string
  description: string
  /** Variables {{…}} disponibles dans l'objet et le message. */
  variables: string[]
  defaultSubject: string
  defaultBody: string
  /** Valeurs d'exemple pour l'aperçu du message. */
  sample: Record<string, string>
  /** Libellés lisibles des variables (puces cliquables). */
  variableLabels: Record<string, string>
  /** Alerte envoyée d'office au propriétaire tant qu'il ne l'a pas désactivée (les commandes et le stock, qui ne
   *  peuvent pas attendre le prochain passage sur le tableau de bord). */
  defaultEnabled?: boolean
}

export const AUTOMATION_EVENTS: AutomationEventDef[] = [
  {
    type: 'ORDER_CREATED',
    label: 'Nouvelle commande',
    description: 'Dès qu’un client passe commande sur votre boutique.',
    defaultEnabled: true,
    variables: ['order_number', 'total', 'customer_name', 'customer_phone', 'payment', 'shop_name'],
    sample: { order_number: '#0042', total: '51 500 F CFA', customer_name: 'Awa Mbaye', customer_phone: '+221771234567', payment: 'Mobile money', shop_name: 'Ma boutique' },
    variableLabels: {
      order_number: 'Numéro de commande',
      total: 'Montant',
      customer_name: 'Nom du client',
      customer_phone: 'Téléphone du client',
      payment: 'Mode de paiement',
      shop_name: 'Nom de votre boutique',
    },
    defaultSubject: 'Nouvelle commande {{order_number}} — {{total}}',
    defaultBody: '{{customer_name}} ({{customer_phone}}) vient de commander pour {{total}} sur {{shop_name}}. Paiement : {{payment}}. Confirmez-la vite pour rassurer votre client.',
  },
  {
    type: 'ORDER_PAID',
    label: 'Commande payée',
    description: 'Quand une commande passe au statut « payée ».',
    variables: ['order_number', 'total', 'shop_name'],
    sample: { order_number: 'CMD-1042', total: '15 000 F CFA', shop_name: 'Ma boutique' },
    variableLabels: { order_number: 'Numéro de commande', total: 'Montant', shop_name: 'Nom de votre boutique' },
    defaultSubject: 'Commande {{order_number}} payée',
    defaultBody: 'La commande {{order_number}} ({{total}}) est marquée comme payée.',
  },
  {
    type: 'ORDER_CANCELLED',
    label: 'Commande annulée',
    description: 'Quand une commande est annulée (le stock est restitué).',
    variables: ['order_number', 'total', 'shop_name'],
    sample: { order_number: 'CMD-1042', total: '15 000 F CFA', shop_name: 'Ma boutique' },
    variableLabels: { order_number: 'Numéro de commande', total: 'Montant', shop_name: 'Nom de votre boutique' },
    defaultSubject: 'Commande {{order_number}} annulée',
    defaultBody: 'La commande {{order_number}} a été annulée.',
  },
  {
    type: 'STOCK_LOW',
    label: 'Stock bas',
    description: 'Quand un produit passe sous votre seuil d’alerte (réglable dans Paramètres › Livraison et stock).',
    defaultEnabled: true,
    variables: ['product_name', 'stock', 'threshold', 'shop_name'],
    sample: { product_name: 'Robe wax Aminata', stock: '3', threshold: '5', shop_name: 'Ma boutique' },
    variableLabels: { product_name: 'Nom du produit', stock: 'Stock restant', threshold: 'Seuil d’alerte', shop_name: 'Nom de votre boutique' },
    defaultSubject: 'Stock bas : {{product_name}} ({{stock}} restant)',
    defaultBody: 'Il ne reste que {{stock}} « {{product_name}} » (seuil d’alerte : {{threshold}}). Pensez à réapprovisionner avant la rupture.',
  },
  {
    type: 'STOCK_OUT',
    label: 'Rupture de stock',
    description: 'Quand un produit est épuisé : il n’est plus commandable jusqu’au réapprovisionnement.',
    defaultEnabled: true,
    variables: ['product_name', 'shop_name'],
    sample: { product_name: 'Robe wax Aminata', shop_name: 'Ma boutique' },
    variableLabels: { product_name: 'Nom du produit', shop_name: 'Nom de votre boutique' },
    defaultSubject: 'Rupture de stock : {{product_name}}',
    defaultBody: '« {{product_name}} » est épuisé sur {{shop_name}}. Mettez le stock à jour dès le réapprovisionnement pour reprendre les ventes.',
  },
  {
    type: 'APPOINTMENT_CREATED',
    label: 'Nouveau rendez-vous',
    description: 'Dès qu’un client demande un rendez-vous en ligne.',
    variables: ['customer_name', 'service_name', 'when', 'shop_name'],
    sample: { customer_name: 'Fatou Ndiaye', service_name: 'Coupe femme', when: 'mardi 29 septembre à 10:00', shop_name: 'Mon salon' },
    variableLabels: { customer_name: 'Nom du client', service_name: 'Prestation', when: 'Jour et heure', shop_name: 'Nom de votre boutique' },
    defaultSubject: 'Nouveau rendez-vous — {{customer_name}}',
    defaultBody: '{{customer_name}} demande un rendez-vous pour « {{service_name}} » le {{when}}.',
  },
  {
    type: 'RESERVATION_CREATED',
    label: 'Nouvelle réservation de table',
    description: 'Dès qu’un client réserve une table en ligne.',
    variables: ['customer_name', 'party_size', 'when', 'shop_name'],
    sample: { customer_name: 'Moussa Diallo', party_size: '4', when: 'vendredi 2 octobre à 20:00', shop_name: 'Mon restaurant' },
    variableLabels: { customer_name: 'Nom du client', party_size: 'Nombre de personnes', when: 'Jour et heure', shop_name: 'Nom de votre boutique' },
    defaultSubject: 'Nouvelle réservation — {{customer_name}}',
    defaultBody: '{{customer_name}} réserve une table pour {{party_size}} personnes le {{when}}.',
  },
]

/** Aperçu d'un message : remplace {{variable}} par la valeur d'exemple (même règle
 *  que le serveur — variable inconnue = vide). */
export function renderPreview(template: string, sample: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => sample[key] ?? '')
}

/** Événements qui partent par email d'office, sauf désactivation explicite par le marchand. */
export const DEFAULT_ALERT_EVENT_TYPES = AUTOMATION_EVENTS.filter((event) => event.defaultEnabled).map((event) => event.type)
