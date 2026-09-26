import { Link } from 'react-router-dom'

/** Jauge « n / max » d'un plafond de plan, avec lien d'upgrade une fois atteint.
 *  N'affiche rien pour un plan illimité (`max === null`). */
export function PlanLimitBanner({
  used,
  max,
  singular,
  plural,
}: {
  used: number
  max: number | null
  singular: string
  plural: string
}) {
  if (max === null) return null
  const reached = used >= max
  return (
    <div
      className={`mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm ${
        reached ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-gray-200 bg-white text-gray-600'
      }`}
    >
      <span>
        {used} / {max} {max > 1 ? plural : singular}
        {reached ? ' — limite du plan atteinte.' : ''}
      </span>
      {reached && (
        <Link to="/admin/parametres/facturation" className="font-medium text-brand-700 hover:text-brand-800">
          Voir les plans
        </Link>
      )}
    </div>
  )
}
