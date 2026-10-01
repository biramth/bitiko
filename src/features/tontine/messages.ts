import { formatCurrency } from '@/utils/format'
import { frenchDate } from '@/features/finance/exportCsv'

interface MessageContext {
  shopName: string
  tontineName: string
  memberName: string
  currency: string
  saved: number
  target: number
}

/** Reçu envoyé depuis le WhatsApp du commerçant juste après un versement. */
export function receiptMessage(ctx: MessageContext & { amount: number; paidOn: string }): string {
  const money = (n: number) => formatCurrency(n, ctx.currency)
  return [
    `Bonjour ${ctx.memberName},`,
    `${ctx.shopName} confirme la réception de votre versement de ${money(ctx.amount)} le ${frenchDate(ctx.paidOn)} pour « ${ctx.tontineName} ».`,
    `Total épargné : ${money(ctx.saved)} sur ${money(ctx.target)}.`,
    'Merci pour votre confiance !',
  ].join('\n')
}

/** Rappel amical pour un membre en retard. */
export function reminderMessage(ctx: MessageContext & { behind: number; endDate: string }): string {
  const money = (n: number) => formatCurrency(n, ctx.currency)
  return [
    `Bonjour ${ctx.memberName},`,
    `Petit rappel de ${ctx.shopName} pour « ${ctx.tontineName} » : il manque ${money(ctx.behind)} pour être à jour.`,
    `Vous avez épargné ${money(ctx.saved)} sur ${money(ctx.target)} ; remise prévue le ${frenchDate(ctx.endDate)}.`,
    'À bientôt en boutique !',
  ].join('\n')
}
