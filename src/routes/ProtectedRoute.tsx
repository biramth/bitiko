import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'

export function ProtectedRoute() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">
        Chargement…
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
