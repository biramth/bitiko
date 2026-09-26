import type { AuditEntry } from '@/services/platform.service'

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  support_access: 'Accès support à une boutique',
  user_delete: 'Suppression d’un compte',
  team_add: 'Ajout à l’équipe',
  biztype_save: 'Type d’activité modifié',
  payment_approve: 'Paiement validé',
  payment_reject: 'Paiement refusé',
  promo_save: 'Promotion enregistrée',
  template_save: 'Gabarit enregistré',
  subscription_grant: 'Abonnement offert / prolongé',
}

/** Phrase courte décrivant les détails utiles d'une entrée (jamais de données personnelles brutes). */
export function auditSummary(entry: Pick<AuditEntry, 'action' | 'details'>): string {
  const d = entry.details
  const str = (key: string) => (typeof d[key] === 'string' ? (d[key] as string) : null)
  switch (entry.action) {
    case 'subscription_grant':
      return [str('plan'), typeof d.days === 'number' ? `${d.days} j` : null, str('reason')].filter(Boolean).join(' · ')
    case 'payment_approve':
    case 'payment_reject':
      return [str('plan'), str('reason')].filter(Boolean).join(' · ')
    default:
      return str('reason') ?? str('role') ?? ''
  }
}
