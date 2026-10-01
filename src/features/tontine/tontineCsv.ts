import { CSV_BOM, csvLine, frenchDate } from '@/features/finance/exportCsv'
import { paymentMethodLabel } from '@/features/finance/categories'
import { formatPhoneNumberForDisplay } from '@/utils/phone'
import { STATE_LABELS, type MemberProgress } from './schedule'
import type { Tontine, TontineContribution, TontineMember } from './types'

const toFile = (rows: string[]) => CSV_BOM + rows.join('\r\n') + '\r\n'

/** État de la tontine : une ligne par membre (le « carnet » à imprimer ou partager). */
export function buildMembersCsv(tontine: Tontine, members: { member: TontineMember; progress: MemberProgress }[]): string {
  return toFile([
    csvLine(['Tontine', tontine.name]),
    csvLine(['Remise prévue', frenchDate(tontine.end_date)]),
    '',
    csvLine(['Membre', 'Téléphone', 'Objectif', 'Montant visé', 'Épargné', 'Reste', 'Retard', 'Statut', 'Remise', 'Date de remise']),
    ...members.map(({ member, progress }) =>
      csvLine([
        member.name,
        // « 00 » plutôt que « + » : Excel prendrait le « + » de tête pour une formule.
        member.phone ? formatPhoneNumberForDisplay(member.phone).replace(/^\+/, '00') : '',
        member.target_label,
        progress.target,
        progress.saved,
        progress.remaining,
        progress.behind,
        STATE_LABELS[progress.state],
        member.settlement_kind === 'goods' ? 'Marchandise' : member.settlement_kind === 'cash' ? 'Argent' : '',
        member.settled_on ? frenchDate(member.settled_on) : '',
      ]),
    ),
  ])
}

/** Historique complet des versements, annulations comprises (pour la trace). */
export function buildContributionsCsv(contributions: TontineContribution[], memberNames: Map<string, string>): string {
  return toFile([
    csvLine(['Date', 'Membre', 'Montant', 'Mode de paiement', 'Note', 'Annulé', 'Motif d’annulation']),
    ...contributions.map((c) =>
      csvLine([
        frenchDate(c.paid_on),
        memberNames.get(c.member_id) ?? '',
        c.amount,
        paymentMethodLabel(c.payment_method),
        c.note,
        c.cancelled_at ? 'Oui' : '',
        c.cancel_reason,
      ]),
    ),
  ])
}
