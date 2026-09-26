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
}

export const AUTOMATION_EVENTS: AutomationEventDef[] = [
  {
    type: 'ORDER_CREATED',
    label: 'Nouvelle commande',
    description: 'Dès qu’un client passe commande sur votre boutique.',
    variables: ['order_number', 'total', 'shop_name'],
    defaultSubject: 'Nouvelle commande {{order_number}}',
    defaultBody: 'Bonne nouvelle ! La commande {{order_number}} ({{total}}) vient d’arriver sur {{shop_name}}.',
  },
  {
    type: 'ORDER_PAID',
    label: 'Commande payée',
    description: 'Quand une commande passe au statut « payée ».',
    variables: ['order_number', 'total', 'shop_name'],
    defaultSubject: 'Commande {{order_number}} payée',
    defaultBody: 'La commande {{order_number}} ({{total}}) est marquée comme payée.',
  },
  {
    type: 'ORDER_CANCELLED',
    label: 'Commande annulée',
    description: 'Quand une commande est annulée (le stock est restitué).',
    variables: ['order_number', 'total', 'shop_name'],
    defaultSubject: 'Commande {{order_number}} annulée',
    defaultBody: 'La commande {{order_number}} a été annulée.',
  },
  {
    type: 'APPOINTMENT_CREATED',
    label: 'Nouveau rendez-vous',
    description: 'Dès qu’un client demande un rendez-vous en ligne.',
    variables: ['customer_name', 'service_name', 'when', 'shop_name'],
    defaultSubject: 'Nouveau rendez-vous — {{customer_name}}',
    defaultBody: '{{customer_name}} demande un rendez-vous pour « {{service_name}} » le {{when}}.',
  },
  {
    type: 'RESERVATION_CREATED',
    label: 'Nouvelle réservation de table',
    description: 'Dès qu’un client réserve une table en ligne.',
    variables: ['customer_name', 'party_size', 'when', 'shop_name'],
    defaultSubject: 'Nouvelle réservation — {{customer_name}}',
    defaultBody: '{{customer_name}} réserve une table pour {{party_size}} personnes le {{when}}.',
  },
]
