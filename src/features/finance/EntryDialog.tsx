import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Field'
import { localDateIso } from '@/utils/format'
import type { FinanceEntry } from './bilan'
import { CATEGORY_BY_CODE, PAYMENT_METHODS, categoriesFor, type EntryKind } from './categories'
import type { FinanceEntryInput } from '@/services/finance.service'

interface FormState {
  kind: EntryKind
  amount: string
  category: string
  label: string
  date: string
  method: string
  note: string
}

function initialState(entry: FinanceEntry | null, defaultDate: string): FormState {
  if (!entry) {
    return { kind: 'expense', amount: '', category: 'stock', label: '', date: defaultDate, method: '', note: '' }
  }
  return {
    kind: entry.kind,
    amount: String(entry.amount),
    category: entry.category,
    label: entry.label,
    date: entry.entry_date,
    method: entry.payment_method ?? '',
    note: entry.note ?? '',
  }
}

/** Formulaire d'ajout / modification d'une dépense ou d'une recette : peu de champs, des
 *  exemples partout, et une seule vraie décision (dépense ou recette). */
export function EntryDialog({
  open,
  entry,
  currencyLabel,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean
  entry: FinanceEntry | null
  currencyLabel: string
  pending: boolean
  onClose: () => void
  onSubmit: (input: FinanceEntryInput) => void
}) {
  // Le contenu est monté seulement à l'ouverture : l'état repart proprement à chaque saisie.
  return (
    <Dialog open={open} onClose={onClose} title={entry ? 'Modifier cette saisie' : 'Ajouter une dépense ou une recette'} size="md">
      {open && <EntryForm key={entry?.id ?? 'new'} entry={entry} currencyLabel={currencyLabel} pending={pending} onClose={onClose} onSubmit={onSubmit} />}
    </Dialog>
  )
}

function EntryForm({
  entry,
  currencyLabel,
  pending,
  onClose,
  onSubmit,
}: {
  entry: FinanceEntry | null
  currencyLabel: string
  pending: boolean
  onClose: () => void
  onSubmit: (input: FinanceEntryInput) => void
}) {
  const [form, setForm] = useState<FormState>(() => initialState(entry, localDateIso()))
  const categories = categoriesFor(form.kind)
  const amount = Math.round(Number(form.amount))
  const valid = amount > 0 && form.label.trim().length > 0 && !!form.date

  const setKind = (kind: EntryKind) =>
    setForm((current) => ({ ...current, kind, category: categoriesFor(kind)[0].code }))

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        onSubmit({
          kind: form.kind,
          category: form.category,
          label: form.label.trim(),
          amount,
          entry_date: form.date,
          payment_method: form.method || null,
          note: form.note.trim() || null,
        })
      }}
    >
      <div role="radiogroup" aria-label="Type de saisie" className="grid grid-cols-2 gap-2">
        {([
          { kind: 'expense', label: 'Dépense', hint: 'J’ai payé' },
          { kind: 'income', label: 'Recette', hint: 'J’ai encaissé' },
        ] as const).map((option) => {
          const active = form.kind === option.kind
          return (
            <button
              key={option.kind}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setKind(option.kind)}
              className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                active
                  ? option.kind === 'expense'
                    ? 'border-rose-300 bg-rose-50 text-rose-900'
                    : 'border-emerald-300 bg-emerald-50 text-emerald-900'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="block text-sm font-semibold">{option.label}</span>
              <span className="block text-xs opacity-70">{option.hint}</span>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TextField
          label={`Montant (${currencyLabel})`}
          type="number"
          inputMode="numeric"
          min={1}
          required
          autoFocus
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />
        <TextField label="Date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
      </div>

      <SelectField
        label="Catégorie"
        value={form.category}
        onChange={(e) => setForm({ ...form, category: e.target.value })}
        hint={CATEGORY_BY_CODE[form.category]?.hint}
      >
        {categories.map((c) => (
          <option key={c.code} value={c.code}>{c.label}</option>
        ))}
      </SelectField>

      <TextField
        label="Description"
        required
        maxLength={120}
        value={form.label}
        onChange={(e) => setForm({ ...form, label: e.target.value })}
        placeholder={form.kind === 'expense' ? 'Ex. Tissu wax chez Mme Ba' : 'Ex. Vente en boutique du samedi'}
      />

      <SelectField label="Payé / encaissé par" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} hint="Facultatif">
        <option value="">Non précisé</option>
        {PAYMENT_METHODS.map((m) => (
          <option key={m.code} value={m.code}>{m.label}</option>
        ))}
      </SelectField>

      <TextAreaField label="Note" rows={2} maxLength={500} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} hint="Facultatif : n° de facture, fournisseur…" />

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        <Button type="submit" loading={pending} disabled={!valid}>
          {entry ? 'Enregistrer' : 'Ajouter'}
        </Button>
      </div>
    </form>
  )
}
