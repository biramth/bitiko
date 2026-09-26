import { Check, CheckCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { BookingStatus } from './bookingStatus'

/** Boutons d'action selon le statut : à confirmer → Confirmer / Refuser ;
 *  confirmé → Terminé / Annuler ; sinon rien (statut final). */
export function StatusActions({
  status,
  disabled,
  onChange,
}: {
  status: BookingStatus
  disabled?: boolean
  onChange: (next: BookingStatus) => void
}) {
  if (status === 'pending') {
    return (
      <div className="flex flex-wrap gap-2">
        <Button size="sm" icon={<Check size={14} aria-hidden />} disabled={disabled} onClick={() => onChange('confirmed')}>
          Confirmer
        </Button>
        <Button size="sm" variant="secondary" icon={<X size={14} aria-hidden />} disabled={disabled} onClick={() => onChange('cancelled')}>
          Refuser
        </Button>
      </div>
    )
  }
  if (status === 'confirmed') {
    return (
      <div className="flex flex-wrap gap-2">
        <Button size="sm" icon={<CheckCheck size={14} aria-hidden />} disabled={disabled} onClick={() => onChange('done')}>
          Terminé
        </Button>
        <Button size="sm" variant="secondary" icon={<X size={14} aria-hidden />} disabled={disabled} onClick={() => onChange('cancelled')}>
          Annuler
        </Button>
      </div>
    )
  }
  return null
}
