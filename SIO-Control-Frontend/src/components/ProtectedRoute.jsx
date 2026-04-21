import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Button, EmptyState, LoadingState } from './ui'
import { useAuth } from '../hooks/useAuth'
import { getUserProfile, isAdminUser } from '../services/userService'

export default function ProtectedRoute() {
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const { loading, logout, user } = useAuth()
  const location = useLocation()

  useEffect(() => {
    let active = true
    async function loadProfile() {
      if (!user?.uid) {
        setProfile(null)
        setProfileLoading(false)
        return
      }

      setProfileLoading(true)
      const loadedProfile = await getUserProfile(user.uid).catch(() => null)
      if (active) {
        setProfile(loadedProfile)
        setProfileLoading(false)
      }
    }
    loadProfile()
    return () => {
      active = false
    }
  }, [user])

  if (loading) return <LoadingState label="Verificando sesion" />
  if (!user) return <Navigate replace state={{ from: location }} to="/login" />
  if (profileLoading) return <LoadingState label="Verificando usuario" />
  if (profile?.active === false && !isAdminUser(user)) {
    return (
      <div className="min-h-app bg-slate-950 p-4 text-slate-100">
        <EmptyState
          action={<Button onClick={logout} tone="danger">Cerrar sesion</Button>}
          description="Tu usuario esta desactivado. Solicita acceso al administrador."
          title="Usuario desactivado"
        />
      </div>
    )
  }

  return <Outlet />
}
