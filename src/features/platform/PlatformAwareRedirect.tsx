import { Navigate } from 'react-router-dom'
import { Spinner } from '@/components/ui/Spinner'
import { usePlatformRole } from './usePlatformRole'

/**
 * Sends an authenticated user to the right workspace: platform members land in
 * /plateforme, everyone else goes to `fallback`. Replaces the old hardcoded
 * email allowlist, which only ever recognised the owner.
 */
export function PlatformAwareRedirect({ fallback }: { fallback: string }) {
  const { data: role, isPending } = usePlatformRole()

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Connexion en cours…" />
      </div>
    )
  }

  return <Navigate to={role ? '/plateforme' : fallback} replace />
}
