/** Événements métier pour lesquels un commerçant peut activer un email
 *  (envoyé au propriétaire de la boutique). Miroir des types émis par la base :
 *  ORDER_* (0107) et APPOINTMENT_CREATED / RESERVATION_CREATED (0124). */
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
}

export const AUTOMATION_EVENTS: AutomationEventDef[] = [
  {
    type: 'ORDER_CREATED',
    label: 'Nouvelle commande',
    description: 'Dès qu’un client passe commande sur votre boutique.',
    variables: ['order_number', 'total', 'shop_name'],
    sample: { order_number: 'CMD-1042', total: '15 000 F CFA', shop_name: 'Ma boutique' },
    variableLabels: { order_number: 'Numéro de commande', total: 'Montant', shop_name: 'Nom de votre boutique' },
    defaultSubject: 'Nouvelle commande {{order_number}}',
    defaultBody: 'Bonne nouvelle ! La commande {{order_number}} ({{total}}) vient d’arriver sur {{shop_name}}.',
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
