import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingState } from './ui'
import { useAuth } from '../hooks/useAuth'

export default function ProtectedRoute() {
  const { loading, user } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingState label="Verificando sesion" />
  if (!user) return <Navigate replace state={{ from: location }} to="/login" />

  return <Outlet />
}
