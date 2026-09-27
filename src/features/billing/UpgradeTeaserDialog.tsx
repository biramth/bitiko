import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { buttonClass } from '@/components/ui/styles'

/** Relance douce quand un commerçant tente une action réservée à un plan
 *  supérieur : l'écran reste utilisable (rien n'est grisé ni caché), seule
 *  l'action bloquée ouvre cette pop-up au lieu d'un mur "Pro" en amont. */
export function UpgradeTeaserDialog({
  open,
  onClose,
  feature,
  description,
}: {
  open: boolean
  onClose: () => void
  /** ex. "L'accès collaborateurs" */
  feature: string
  description: string
}) {
  return (
    <Dialog open={open} onClose={onClose} title="Votre activité grandit !">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Sparkles size={22} aria-hidden />
        </span>
        <p className="text-sm text-gray-600">
          <strong className="font-semibold text-gray-900">{feature}</strong> n'est pas disponible sur votre plan
          actuel. {description}
        </p>
        <Link
          to="/admin/parametres/compte?billing=1"
          onClick={onClose}
          className={buttonClass({ fullWidth: true, className: 'mt-1' })}
        >
          Voir les abonnements
        </Link>
        <button type="button" onClick={onClose} className="text-sm font-medium text-gray-500 hover:text-gray-700">
          Plus tard
        </button>
      </div>
    </Dialog>
  )
}
