import { createContext, useContext } from 'react'
import type { UpgradeMomentKey } from '@/config/upgradeMoments'

export interface UpgradeApi {
  /** Ouvre le panneau contextuel d'activation pour un besoin précis. */
  openUpgrade: (moment: UpgradeMomentKey) => void
}

export const UpgradeContext = createContext<UpgradeApi | null>(null)

export function useUpgrade(): UpgradeApi {
  const api = useContext(UpgradeContext)
  if (!api) throw new Error('useUpgrade doit être utilisé dans <UpgradeProvider>.')
  return api
}
