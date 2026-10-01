import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { TextAreaField, TextField } from '@/components/ui/Field'
import { phonePlaceholder } from '@/config/countries'
import type { MemberInput } from '@/services/tontine.service'
import { formatPhoneNumberForDisplay, normalizePhoneNumber, PHONE_ERROR_MESSAGES } from '@/utils/phone'
import { localDateIso } from '@/utils/format'
import { suggestedTarget } from './schedule'
import type { Tontine, TontineMember } from './types'

interface FormState {
  name: string
  phone: string
  targetLabel: string
  target: string
  /** L'objectif suit le versement tant que le commerçant ne l'a pas saisi lui-même. */
  targetTouched: boolean
  installment: string
  joined: string
  note: string
}

function initialState(tontine: Tontine, member: TontineMember | null): FormState {
  if (member) {
    return {
      name: member.name,
      phone: member.phone ? formatPhoneNumberForDisplay(member.phone) : '',
      targetLabel: member.target_label ?? '',
      target: String(member.target_amount),
      targetTouched: true,
      installment: member.installment_amount ? String(member.installment_amount) : '',
      joined: member.joined_on,
      note: member.note ?? '',
    }
  }
  const joined = localDateIso()
  return {
    name: '',
    phone: '',
    targetLabel: tontine.goal_label ?? '',
    target: String(suggestedTarget(tontine, joined)),
    targetTouched: false,
    installment: '',
    joined,
    note: '',
  }
}

/** Inscription d'un client à la tontine (ou correction de sa fiche). */
export function MemberFormDialog({
  open,
  tontine,
  member,
  currency,
  countryCode,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean
  tontine: Tontine
  member: TontineMember | null
  currency: string
  countryCode: string
  pending: boolean
  onClose: () => void
  onSubmit: (input: MemberInput) => void
}) {
  return (
    <Dialog open={open} onClose={onClose} title={member ? 'Modifier le membre' : 'Inscrire un membre'} size="md">
      {open && (
        <MemberForm
          key={member?.id ?? 'new'}
          tontine={tontine}
          member={member}
          currency={currency}
          countryCode={countryCode}
          pending={pending}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      )}
    </Dialog>
  )
}

function MemberForm({
  tontine,
  member,
  currency,
  countryCode,
  pending,
  onClose,
  onSubmit,
}: {
  tontine: Tontine
  member: TontineMember | null
  currency: string
  countryCode: string
  pending: boolean
  onClose: () => void
  onSubmit: (input: MemberInput) => void
}) {
  const [form, setForm] = useState<FormState>(() => initialState(tontine, member))
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const currencyLabel = currency === 'XOF' ? 'F CFA' : currency
  const target = Math.round(Number(form.target))
  const installment = form.installment ? Math.round(Number(form.installment)) : null
  const valid = form.name.trim().length > 0 && target > 0 && (installment === null || installment > 0) && !!form.joined

  const update = (patch: Partial<FormState>) =>
    setForm((current) => {
      const next = { ...current, ...patch }
      if (!next.targetTouched && ('installment' in patch || 'joined' in patch)) {
        const own = next.installment ? Math.round(Number(next.installment)) : 0
        next.target = String(suggestedTarget(tontine, next.joined || localDateIso(), own > 0 ? own : tontine.installment_amount))
      }
      return next
    })

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        let phone: string | null = null
        if (form.phone.trim()) {
          const normalized = normalizePhoneNumber(form.phone, countryCode)
          if (!normalized.ok || !normalized.value) {
            setPhoneError(PHONE_ERROR_MESSAGES[normalized.error ?? 'invalid_length'])
            return
          }
          phone = normalized.value
        }
        onSubmit({
          name: form.name.trim(),
          phone,
          target_amount: target,
          target_label: form.targetLabel.trim() || null,
          installment_amount: installment,
          joined_on: form.joined,
          note: form.note.trim() || null,
        })
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField label="Nom" required autoFocus maxLength={80} value={form.name} onChange={(e) => update({ name: e.target.value })} placeholder="Ex. Awa Diop" />
        <TextField
          label="Téléphone"
          type="tel"
          inputMode="tel"
          value={form.phone}
          onChange={(e) => {
            update({ phone: e.target.value })
            setPhoneError(null)
          }}
          placeholder={phonePlaceholder(countryCode)}
          error={phoneError}
          hint="Facultatif : pour envoyer reçus et rappels par WhatsApp."
        />
      </div>

      <TextField
        label="Ce qu’il veut recevoir"
        maxLength={120}
        value={form.targetLabel}
        onChange={(e) => update({ targetLabel: e.target.value })}
        placeholder="Ex. 1 mouton, 3 pagnes, sac de riz…"
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField
          label={`Objectif d’épargne (${currencyLabel})`}
          type="number"
          inputMode="numeric"
          min={1}
          required
          value={form.target}
          onChange={(e) => update({ target: e.target.value, targetTouched: true })}
        />
        <TextField
          label={`Versement (${currencyLabel})`}
          type="number"
          inputMode="numeric"
          min={1}
          value={form.installment}
          onChange={(e) => update({ installment: e.target.value })}
          placeholder={String(tontine.installment_amount)}
          hint="Vide = versement de la tontine."
        />
      </div>

      <TextField
        label="Inscrit le"
        type="date"
        required
        value={form.joined}
        onChange={(e) => update({ joined: e.target.value })}
        hint="Le calcul du retard démarre à cette date."
      />

      <TextAreaField label="Note" rows={2} maxLength={500} value={form.note} onChange={(e) => update({ note: e.target.value })} hint="Facultatif : taille, couleur, préférence…" />

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        <Button type="submit" loading={pending} disabled={!valid}>
          {member ? 'Enregistrer' : 'Inscrire'}
        </Button>
      </div>
    </form>
  )
}
