import { Link, Navigate, Outlet } from 'react-router-dom'
import type { ReactNode } from 'react'
import { ShieldAlert } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { Spinner } from '@/components/ui/Spinner'
import { can, type PlatformCapability } from './permissions'
import { usePlatformRole } from './usePlatformRole'

/**
 * Gate for the /plateforme workspace. Authentication is handled upstream by
 * ProtectedRoute; this adds the membership check. Anyone authenticated but
 * not on the platform team gets a neutral "reserved" page — the same
 * information leak tradeoff as the old super-admin placeholder (the real
 * gate is server-side).
 */
export function RequirePlatformMember() {
  const { user, loading: authLoading } = useAuth()
  const { data: role, isLoading } = usePlatformRole()

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!user) return <Navigate to="/admin/login" replace />

  if (!role) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
        <ShieldAlert size={30} className="text-gray-300" aria-hidden />
        <h1 className="font-heading text-lg font-semibold text-gray-900">Espace réservé</h1>
        <p className="text-sm text-gray-500">
          Ton compte n’a pas accès à l’espace plateforme. Si tu penses qu’il s’agit d’une erreur, contacte
          l’équipe Bitiko.
        </p>
        <Link to="/admin" className="mt-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
          Retour
        </Link>
      </div>
    )
  }

  return <Outlet />
}

/** Per-tool gate: renders `children` only when the role has `capability`. */
export function CapabilityGate({
  capability,
  children,
}: {
  capability: PlatformCapability
  children: ReactNode
}) {
  const { data: role, isLoading } = usePlatformRole()
  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (!can(role, capability)) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-20 text-center">
        <ShieldAlert size={28} className="text-gray-300" aria-hidden />
        <p className="text-sm text-gray-500">Ton rôle ne donne pas accès à cet outil.</p>
        <Link to="/plateforme" className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
          Retour à l’espace plateforme
        </Link>
      </div>
    )
  }
  return <>{children}</>
}
