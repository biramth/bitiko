import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { TextAreaField, TextField } from '@/components/ui/Field'
import type { TontineInput } from '@/services/tontine.service'
import { formatCurrency, localDateIso } from '@/utils/format'
import { FREQUENCIES, installmentsBetween, type Frequency } from './schedule'
import type { Tontine } from './types'

interface FormState {
  name: string
  goal: string
  amount: string
  frequency: Frequency
  start: string
  end: string
  note: string
}

function initialState(tontine: Tontine | null): FormState {
  if (tontine) {
    return {
      name: tontine.name,
      goal: tontine.goal_label ?? '',
      amount: String(tontine.installment_amount),
      frequency: tontine.frequency,
      start: tontine.start_date,
      end: tontine.end_date,
      note: tontine.note ?? '',
    }
  }
  return { name: '', goal: '', amount: '', frequency: 'weekly', start: localDateIso(), end: '', note: '' }
}

/** Création / modification d'une tontine : quoi, combien, à quel rythme, jusqu'à quand. */
export function TontineFormDialog({
  open,
  tontine,
  currency,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean
  tontine: Tontine | null
  currency: string
  pending: boolean
  onClose: () => void
  onSubmit: (input: TontineInput) => void
}) {
  return (
    <Dialog open={open} onClose={onClose} title={tontine ? 'Modifier la tontine' : 'Nouvelle tontine'} size="md">
      {open && <TontineForm key={tontine?.id ?? 'new'} tontine={tontine} currency={currency} pending={pending} onClose={onClose} onSubmit={onSubmit} />}
    </Dialog>
  )
}

function TontineForm({
  tontine,
  currency,
  pending,
  onClose,
  onSubmit,
}: {
  tontine: Tontine | null
  currency: string
  pending: boolean
  onClose: () => void
  onSubmit: (input: TontineInput) => void
}) {
  const [form, setForm] = useState<FormState>(() => initialState(tontine))
  const currencyLabel = currency === 'XOF' ? 'F CFA' : currency
  const amount = Math.round(Number(form.amount))
  const datesValid = !!form.start && !!form.end && form.end >= form.start
  const valid = form.name.trim().length > 0 && amount > 0 && datesValid
  const count = datesValid ? installmentsBetween(form.start, form.end, form.frequency) : 0

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        onSubmit({
          name: form.name.trim(),
          goal_label: form.goal.trim() || null,
          installment_amount: amount,
          frequency: form.frequency,
          start_date: form.start,
          end_date: form.end,
          note: form.note.trim() || null,
        })
      }}
    >
      <TextField
        label="Nom de la tontine"
        required
        autoFocus
        maxLength={80}
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder="Ex. Tontine Tabaski 2027"
      />
      <TextField
        label="Ce que les membres recevront"
        maxLength={120}
        value={form.goal}
        onChange={(e) => setForm({ ...form, goal: e.target.value })}
        placeholder="Ex. Mouton, tissus, fournitures scolaires…"
        hint="Facultatif. Chaque membre peut aussi avoir son propre objectif."
      />

      <div>
        <p className="mb-1.5 text-sm font-medium text-gray-700">Rythme des versements</p>
        <div role="radiogroup" aria-label="Rythme des versements" className="grid grid-cols-3 gap-2">
          {FREQUENCIES.map((f) => {
            const active = form.frequency === f.code
            return (
              <button
                key={f.code}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setForm({ ...form, frequency: f.code })}
                className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                  active ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {f.label}
              </button>
            )
          })}
        </div>
      </div>

      <TextField
        label={`Versement conseillé (${currencyLabel})`}
        type="number"
        inputMode="numeric"
        min={1}
        required
        value={form.amount}
        onChange={(e) => setForm({ ...form, amount: e.target.value })}
        hint="Montant proposé à chaque échéance ; modifiable pour chaque membre."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField label="Premier versement" type="date" required value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
        <TextField
          label="Date de remise"
          type="date"
          required
          min={form.start}
          value={form.end}
          onChange={(e) => setForm({ ...form, end: e.target.value })}
          error={form.end && form.start && form.end < form.start ? 'La remise doit avoir lieu après le premier versement.' : null}
        />
      </div>

      {valid && (
        <p className="rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
          {count} échéance{count > 1 ? 's' : ''} : un membre qui verse {formatCurrency(amount, currency)} à chaque fois aura épargné{' '}
          <span className="font-semibold text-gray-900">{formatCurrency(amount * count, currency)}</span> à la remise.
        </p>
      )}

      <TextAreaField label="Note" rows={2} maxLength={500} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} hint="Facultatif : règles, conditions de désistement…" />

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        <Button type="submit" loading={pending} disabled={!valid}>
          {tontine ? 'Enregistrer' : 'Créer la tontine'}
        </Button>
      </div>
    </form>
  )
}
