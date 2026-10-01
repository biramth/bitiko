import { useState } from 'react'
import { CheckCircle2, MessageCircle } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { PAYMENT_METHODS } from '@/features/finance/categories'
import type { ContributionInput } from '@/services/tontine.service'
import { formatCurrency, localDateIso } from '@/utils/format'
import type { MemberProgress } from './schedule'
import type { TontineMember } from './types'

const METHOD_SHORT: Record<string, string> = { cash: 'Espèces', mobile_money: 'Mobile money', bank: 'Banque', other: 'Autre' }

/** Encaissement d'un versement : montant prérempli, un geste pour valider, puis reçu WhatsApp. */
export function ContributionDialog({
  member,
  progress,
  currency,
  onClose,
  onSubmit,
  receiptUrl,
}: {
  member: TontineMember | null
  progress: MemberProgress | null
  currency: string
  onClose: () => void
  onSubmit: (input: ContributionInput) => Promise<void>
  /** Lien WhatsApp du reçu (null sans téléphone). */
  receiptUrl: (input: ContributionInput, savedAfter: number) => string | null
}) {
  return (
    <Dialog open={!!member} onClose={onClose} title={member ? `Encaisser — ${member.name}` : 'Encaisser'} size="sm">
      {member && progress && (
        <ContributionForm key={member.id} progress={progress} currency={currency} onClose={onClose} onSubmit={onSubmit} receiptUrl={receiptUrl} />
      )}
    </Dialog>
  )
}

function ContributionForm({
  progress,
  currency,
  onClose,
  onSubmit,
  receiptUrl,
}: {
  progress: MemberProgress
  currency: string
  onClose: () => void
  onSubmit: (input: ContributionInput) => Promise<void>
  receiptUrl: (input: ContributionInput, savedAfter: number) => string | null
}) {
  const currencyLabel = currency === 'XOF' ? 'F CFA' : currency
  const initial = progress.remaining > 0 ? Math.min(progress.installment, progress.remaining) : progress.installment
  const [amount, setAmount] = useState(String(initial))
  const [date, setDate] = useState(localDateIso())
  const [method, setMethod] = useState('cash')
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(false)
  // Figé à l'enregistrement : la fiche se recharge pendant que le reçu est affiché.
  const [saved, setSaved] = useState<{ input: ContributionInput; savedAfter: number } | null>(null)

  const value = Math.round(Number(amount))
  const valid = value > 0 && !!date
  const shortcuts = [
    { label: '1 versement', value: progress.installment },
    { label: '2 versements', value: progress.installment * 2 },
    ...(progress.behind > 0 ? [{ label: 'Rattraper le retard', value: progress.behind }] : []),
    ...(progress.remaining > 0 ? [{ label: 'Tout le reste', value: progress.remaining }] : []),
  ].filter((s, i, all) => s.value > 0 && all.findIndex((o) => o.value === s.value) === i)

  if (saved) {
    const url = receiptUrl(saved.input, saved.savedAfter)
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 size={40} className="mx-auto text-emerald-500" aria-hidden />
        <div>
          <p className="font-semibold text-gray-900">{formatCurrency(saved.input.amount, currency)} encaissés</p>
          <p className="mt-1 text-sm text-gray-500">
            Épargne : {formatCurrency(saved.savedAfter, currency)} sur {formatCurrency(progress.target, currency)}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <MessageCircle size={16} aria-hidden />
              Envoyer le reçu par WhatsApp
            </a>
          )}
          <Button variant="secondary" onClick={onClose}>Fermer</Button>
        </div>
      </div>
    )
  }

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!valid || pending) return
        const input: ContributionInput = { amount: value, paid_on: date, payment_method: method || null, note: note.trim() || null }
        setPending(true)
        try {
          await onSubmit(input)
          setSaved({ input, savedAfter: progress.saved + input.amount })
        } catch {
          // Message d'erreur affiché par l'appelant.
        } finally {
          setPending(false)
        }
      }}
    >
      <p className="rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
        Épargné : <span className="font-semibold text-gray-900">{formatCurrency(progress.saved, currency)}</span> sur{' '}
        {formatCurrency(progress.target, currency)}
        {progress.behind > 0 && <span className="text-amber-700"> · {formatCurrency(progress.behind, currency)} de retard</span>}
      </p>

      <TextField
        label={`Montant reçu (${currencyLabel})`}
        type="number"
        inputMode="numeric"
        min={1}
        required
        autoFocus
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      {shortcuts.length > 1 && (
        <div className="-mt-2 flex flex-wrap gap-1.5">
          {shortcuts.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setAmount(String(s.value))}
              className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${
                value === s.value ? 'bg-ink-900 text-white ring-ink-900' : 'bg-white text-gray-600 ring-gray-200 hover:bg-gray-50'
              }`}
            >
              {s.label} · {formatCurrency(s.value, currency)}
            </button>
          ))}
        </div>
      )}

      <div>
        <p className="mb-1.5 text-sm font-medium text-gray-700">Reçu en</p>
        <div role="radiogroup" aria-label="Mode de paiement" className="grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m.code}
              type="button"
              role="radio"
              aria-checked={method === m.code}
              onClick={() => setMethod(m.code)}
              className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                method === m.code ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {METHOD_SHORT[m.code] ?? m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField label="Date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        <TextField label="Note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Facultatif" />
      </div>

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        <Button type="submit" loading={pending} disabled={!valid}>
          Encaisser {valid ? formatCurrency(value, currency) : ''}
        </Button>
      </div>
    </form>
  )
}
