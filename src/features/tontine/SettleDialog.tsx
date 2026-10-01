import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { Switch } from '@/components/ui/Switch'
import { formatCurrency, localDateIso } from '@/utils/format'
import type { MemberProgress } from './schedule'
import type { SettlementKind, TontineMember } from './types'

export interface SettleInput {
  kind: SettlementKind
  settled_on: string
  note: string | null
  record_income: boolean
}

/** Remise : le membre reçoit sa marchandise, ou son argent s'il se désiste. */
export function SettleDialog({
  member,
  progress,
  currency,
  pending,
  onClose,
  onSubmit,
}: {
  member: TontineMember | null
  progress: MemberProgress | null
  currency: string
  pending: boolean
  onClose: () => void
  onSubmit: (input: SettleInput) => void
}) {
  return (
    <Dialog open={!!member} onClose={onClose} title={member ? `Remise — ${member.name}` : 'Remise'} size="sm">
      {member && progress && (
        <SettleForm key={member.id} member={member} progress={progress} currency={currency} pending={pending} onClose={onClose} onSubmit={onSubmit} />
      )}
    </Dialog>
  )
}

function SettleForm({
  member,
  progress,
  currency,
  pending,
  onClose,
  onSubmit,
}: {
  member: TontineMember
  progress: MemberProgress
  currency: string
  pending: boolean
  onClose: () => void
  onSubmit: (input: SettleInput) => void
}) {
  const [kind, setKind] = useState<SettlementKind>('goods')
  const [date, setDate] = useState(localDateIso())
  const [note, setNote] = useState(member.target_label ?? '')
  const [recordIncome, setRecordIncome] = useState(true)
  const short = progress.saved < progress.target

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!date) return
        onSubmit({ kind, settled_on: date, note: note.trim() || null, record_income: kind === 'goods' && recordIncome })
      }}
    >
      <div className="rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
        Épargne à remettre : <span className="font-semibold text-gray-900">{formatCurrency(progress.saved, currency)}</span>
        {short && (
          <p className="mt-1 text-amber-700">
            L’objectif ({formatCurrency(progress.target, currency)}) n’est pas atteint : il manque {formatCurrency(progress.remaining, currency)}.
          </p>
        )}
      </div>

      <div role="radiogroup" aria-label="Type de remise" className="grid grid-cols-2 gap-2">
        {([
          { kind: 'goods', label: 'Marchandise', hint: 'Il repart avec ses articles' },
          { kind: 'cash', label: 'Argent', hint: 'Désistement, remboursement' },
        ] as const).map((option) => {
          const active = kind === option.kind
          return (
            <button
              key={option.kind}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setKind(option.kind)}
              className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                active ? 'border-brand-300 bg-brand-50 text-brand-900' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="block text-sm font-semibold">{option.label}</span>
              <span className="block text-xs opacity-70">{option.hint}</span>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField label="Date de remise" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        <TextField
          label={kind === 'goods' ? 'Articles remis' : 'Note'}
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={kind === 'goods' ? 'Ex. 1 mouton' : 'Facultatif'}
        />
      </div>

      {kind === 'goods' && progress.saved > 0 && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2.5">
          <p className="text-sm text-gray-600">
            Compter cette vente ({formatCurrency(progress.saved, currency)}) dans les recettes de Finances
          </p>
          <Switch checked={recordIncome} onChange={setRecordIncome} label={recordIncome ? 'Oui' : 'Non'} />
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        <Button type="submit" loading={pending} disabled={!date}>
          Confirmer la remise
        </Button>
      </div>
    </form>
  )
}
