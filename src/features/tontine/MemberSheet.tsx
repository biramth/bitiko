import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, Gift, HandCoins, MessageCircle, Pencil, Phone, RotateCcw, Trash2 } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { paymentMethodLabel } from '@/features/finance/categories'
import { frenchDate } from '@/features/finance/exportCsv'
import { telUrl, whatsappUrl } from '@/features/booking/bookingHelpers'
import { cancelContribution, listMemberContributions, tontineErrorCode } from '@/services/tontine.service'
import { formatCurrency } from '@/utils/format'
import { formatPhoneNumberForDisplay } from '@/utils/phone'
import { ProgressBar, StateBadge } from './TontineParts'
import type { MemberProgress } from './schedule'
import type { TontineMember } from './types'

/** Fiche d'un membre : où il en est, son historique de versements et les actions possibles. */
export function MemberSheet({
  member,
  progress,
  currency,
  tontineOpen,
  reminderText,
  onClose,
  onCollect,
  onEdit,
  onSettle,
  onReopen,
  onDelete,
}: {
  member: TontineMember | null
  progress: MemberProgress | null
  currency: string
  tontineOpen: boolean
  reminderText: string | null
  onClose: () => void
  onCollect: () => void
  onEdit: () => void
  onSettle: () => void
  onReopen: () => void
  onDelete: () => void
}) {
  return (
    <Dialog open={!!member} onClose={onClose} title={member?.name ?? 'Membre'} size="lg">
      {member && progress && (
        <SheetContent
          key={member.id}
          member={member}
          progress={progress}
          currency={currency}
          tontineOpen={tontineOpen}
          reminderText={reminderText}
          onCollect={onCollect}
          onEdit={onEdit}
          onSettle={onSettle}
          onReopen={onReopen}
          onDelete={onDelete}
        />
      )}
    </Dialog>
  )
}

function SheetContent({
  member,
  progress,
  currency,
  tontineOpen,
  reminderText,
  onCollect,
  onEdit,
  onSettle,
  onReopen,
  onDelete,
}: {
  member: TontineMember
  progress: MemberProgress
  currency: string
  tontineOpen: boolean
  reminderText: string | null
  onCollect: () => void
  onEdit: () => void
  onSettle: () => void
  onReopen: () => void
  onDelete: () => void
}) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const settled = member.status === 'settled'
  const money = (n: number) => formatCurrency(n, currency)

  const { data: contributions = [], isLoading, isError } = useQuery({
    queryKey: ['tontine', 'member-contributions', member.id],
    queryFn: () => listMemberContributions(member.id),
  })

  const cancelMutation = useMutation({
    mutationFn: ({ id, why }: { id: string; why: string }) => cancelContribution(id, why),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tontine'] })
      setCancelling(null)
      setReason('')
      toast.success('Versement annulé.')
    },
    onError: (e) =>
      toast.error(tontineErrorCode(e) === 'member_settled' ? 'Annulez d’abord la remise de ce membre.' : 'Annulation impossible.'),
  })

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <StateBadge state={progress.state} />
          {member.target_label && <span className="text-sm text-gray-600">Objectif : {member.target_label}</span>}
        </div>
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="font-semibold text-gray-900">{money(progress.saved)}</span>
            <span className="text-gray-500">sur {money(progress.target)}</span>
          </div>
          <ProgressBar percent={progress.percent} state={progress.state} />
          <p className="mt-1.5 text-xs text-gray-500">
            {settled
              ? `Remis le ${frenchDate(member.settled_on ?? '')} : ${money(member.settled_amount ?? 0)} en ${member.settlement_kind === 'goods' ? 'marchandise' : 'argent'}${member.settlement_note ? ` (${member.settlement_note})` : ''}.`
              : `Versement de ${money(progress.installment)}${progress.behind > 0 ? ` · ${money(progress.behind)} de retard` : ''} · reste ${money(progress.remaining)}`}
          </p>
        </div>
        {member.phone && (
          <p className="flex flex-wrap items-center gap-3 text-sm">
            <a href={telUrl(member.phone)} className="inline-flex items-center gap-1.5 text-gray-700 hover:text-gray-900">
              <Phone size={14} aria-hidden /> {formatPhoneNumberForDisplay(member.phone)}
            </a>
            {reminderText && (
              <a
                href={whatsappUrl(member.phone, reminderText)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-emerald-700 hover:text-emerald-800"
              >
                <MessageCircle size={14} aria-hidden /> Relancer sur WhatsApp
              </a>
            )}
          </p>
        )}
        {member.note && <p className="text-sm text-gray-500">{member.note}</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        {!settled && tontineOpen && (
          <Button icon={<HandCoins size={15} aria-hidden />} onClick={onCollect}>Encaisser</Button>
        )}
        {!settled && (
          <Button variant="secondary" icon={<Gift size={15} aria-hidden />} onClick={onSettle}>
            Faire la remise
          </Button>
        )}
        {settled && tontineOpen && (
          <Button variant="secondary" icon={<RotateCcw size={15} aria-hidden />} onClick={onReopen}>Annuler la remise</Button>
        )}
        <Button variant="ghost" icon={<Pencil size={15} aria-hidden />} onClick={onEdit}>Modifier</Button>
        {contributions.length === 0 && !isLoading && !settled && (
          <Button variant="ghost" icon={<Trash2 size={15} aria-hidden />} onClick={onDelete}>Retirer</Button>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-900">Versements</h3>
        {isLoading ? (
          <Spinner />
        ) : isError ? (
          <ErrorMessage />
        ) : contributions.length === 0 ? (
          <p className="rounded-xl bg-gray-50 px-3 py-4 text-center text-sm text-gray-500">Aucun versement pour l’instant.</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
            {contributions.map((c) => {
              const cancelled = !!c.cancelled_at
              return (
                <li key={c.id} className="px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium ${cancelled ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{money(c.amount)}</p>
                      <p className="text-xs text-gray-500">
                        {frenchDate(c.paid_on)}
                        {paymentMethodLabel(c.payment_method) && ` · ${paymentMethodLabel(c.payment_method)}`}
                        {c.note && ` · ${c.note}`}
                      </p>
                      {cancelled && <p className="mt-0.5 text-xs text-rose-600">Annulé : {c.cancel_reason}</p>}
                    </div>
                    {cancelled ? (
                      <Badge tone="neutral">Annulé</Badge>
                    ) : (
                      !settled &&
                      cancelling !== c.id && (
                        <button
                          type="button"
                          onClick={() => {
                            setCancelling(c.id)
                            setReason('')
                          }}
                          aria-label={`Annuler le versement de ${money(c.amount)} du ${frenchDate(c.paid_on)}`}
                          className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Ban size={15} aria-hidden />
                        </button>
                      )
                    )}
                  </div>
                  {cancelling === c.id && (
                    <form
                      className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end"
                      onSubmit={(e) => {
                        e.preventDefault()
                        if (reason.trim()) cancelMutation.mutate({ id: c.id, why: reason.trim() })
                      }}
                    >
                      <TextField
                        label="Motif de l’annulation"
                        autoFocus
                        required
                        maxLength={200}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Ex. Saisi deux fois"
                        wrapperClassName="flex-1"
                      />
                      <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => setCancelling(null)}>Garder</Button>
                        <Button type="submit" variant="danger" loading={cancelMutation.isPending} disabled={!reason.trim()}>
                          Annuler le versement
                        </Button>
                      </div>
                    </form>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        <p className="mt-2 text-xs text-gray-400">Un versement n’est jamais effacé : une erreur s’annule avec son motif, pour garder une trace en cas de désaccord.</p>
      </div>
    </div>
  )
}
