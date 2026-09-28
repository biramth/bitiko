import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { useShopRole } from '@/features/shop-settings/useShopRole'
import { useShopPlan } from '@/features/billing/useShopPlan'
import { PlanCheckout } from '@/features/billing/PlanCheckout'
import { UpgradeContext } from '@/features/billing/upgradeContext'
import { PLANS } from '@/config/plans'
import { getUpgradeMoment, type UpgradeMomentKey } from '@/config/upgradeMoments'
import { formatCurrency } from '@/utils/format'
import { Dialog } from '@/components/ui/Dialog'
import { buttonClass } from '@/components/ui/styles'

/** Un seul panneau d'activation pour toute l'administration : les écrans
 *  signalent un besoin (`openUpgrade('products')`), ce panneau explique ce que
 *  ce besoin débloque, puis mène au paiement du seul plan concerné — jamais à
 *  une page de tarifs complète. */
export function UpgradeProvider({ children }: { children: React.ReactNode }) {
  const { data: shop } = useMyShop()
  const { role } = useShopRole()
  const { planKey } = useShopPlan(shop?.id)
  const [moment, setMoment] = useState<UpgradeMomentKey | null>(null)
  const [step, setStep] = useState<'intro' | 'checkout'>('intro')

  const openUpgrade = useCallback((key: UpgradeMomentKey) => {
    setStep('intro')
    setMoment(key)
  }, [])
  const api = useMemo(() => ({ openUpgrade }), [openUpgrade])
  const close = () => setMoment(null)

  const copy = moment ? getUpgradeMoment(moment, planKey) : null
  const tier = copy ? PLANS[copy.plan] : null
  const price = tier ? `${formatCurrency(tier.priceXof, 'XOF')} / mois` : ''
  // L'abonnement se règle depuis le compte propriétaire (les managers n'y ont pas accès).
  const canActivate = role == null || role === 'owner'

  return (
    <UpgradeContext.Provider value={api}>
      {children}
      {copy && tier && shop && (
        <Dialog
          open
          onClose={close}
          title={step === 'intro' ? copy.title : `Activer ${tier.label}`}
          description={
            step === 'checkout'
              ? 'Réglez avec Wave, puis envoyez la capture du reçu : votre plan est activé après vérification.'
              : undefined
          }
          titleClassName="pr-6 text-base sm:text-lg"
        >
          {step === 'intro' ? (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-gray-600">{copy.body}</p>
              {canActivate ? (
                <>
                  <p className="text-xs text-gray-400">{price}</p>
                  <div className="flex flex-col gap-2">
                    <button type="button" onClick={() => setStep('checkout')} className={buttonClass({ fullWidth: true })}>
                      {copy.cta}
                    </button>
                    <button type="button" onClick={close} className="py-1 text-sm font-medium text-gray-500 hover:text-gray-700">
                      Pas maintenant
                    </button>
                  </div>
                  <p className="text-center text-xs text-gray-400">
                    <Link
                      to="/admin/parametres/compte?billing=1"
                      onClick={close}
                      className="underline underline-offset-2 hover:text-gray-600"
                    >
                      Comparer les offres
                    </Link>
                  </p>
                </>
              ) : (
                <>
                  <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                    L'abonnement se gère depuis le compte du propriétaire de la boutique : partagez-lui ce besoin.
                  </p>
                  <button type="button" onClick={close} className={buttonClass({ variant: 'secondary', fullWidth: true })}>
                    Compris
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-gray-400">
                {tier.label} · {price}
              </p>
              <PlanCheckout shopId={shop.id} plan={copy.plan} showRefusal />
              <button type="button" onClick={() => setStep('intro')} className="w-full py-1 text-sm font-medium text-gray-500 hover:text-gray-700">
                Retour
              </button>
            </div>
          )}
        </Dialog>
      )}
    </UpgradeContext.Provider>
  )
}
