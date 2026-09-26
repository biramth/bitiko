import { Navigate, Outlet } from 'react-router-dom'
import { useWorkspaceModules } from '@/features/workspace/useWorkspaceModules'

/** Garde de route par capabilities métier : sans la capability requise, retour
 *  au tableau de bord. Capabilities inconnues (chargement, boutique legacy)
 *  = fail-open, jamais de blocage — même philosophie que la sidebar et le
 *  dashboard. Les rôles staff restent gérés par les pages elles-mêmes. */
export function RequireCapabilities({ capabilities: required }: { capabilities: string[] }) {
  const { capabilities: caps, isReady } = useWorkspaceModules()
  if (!isReady || caps === null) return <Outlet />
  if (!required.every((c) => caps.has(c))) return <Navigate to="/admin" replace />
  return <Outlet />
}
