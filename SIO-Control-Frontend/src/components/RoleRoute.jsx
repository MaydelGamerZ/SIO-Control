import { Navigate, Outlet } from 'react-router-dom'
import { Button, EmptyState, LoadingState } from './ui'
import { useAuth } from '../hooks/useAuth'
import { useUserProfile } from '../hooks/useUserProfile'
import { canAuditUser } from '../services/userService'

export default function RoleRoute() {
  const { loading, user } = useAuth()
  const { loadingProfile, profile } = useUserProfile()

  if (loading || loadingProfile) return <LoadingState label="Validando permisos" />
  if (!user) return <Navigate replace to="/login" />
  if (!canAuditUser(user, profile)) {
    return (
      <EmptyState
        action={<Button onClick={() => window.history.back()} tone="light">Volver</Button>}
        description="Tu rol actual permite capturar conteos, pero no comparar inventarios ni administrar usuarios."
        title="Permiso de auditor requerido"
      />
    )
  }

  return <Outlet />
}
