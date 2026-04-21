import { useEffect, useState } from 'react'
import { ShieldAlert, UserCheck, UserX } from 'lucide-react'
import { Badge, Button, EmptyState, ErrorState, LoadingState, PageTitle } from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import { isAdminUser, listUsers, updateUserActive, updateUserRole, upsertUserProfile } from '../services/userService'

const roles = ['administrador', 'auditor']

export default function AdminUsersPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const { user } = useAuth()

  async function refreshUsers() {
    setError('')
    setLoading(true)
    try {
      await upsertUserProfile(user)
      setUsers(await listUsers())
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    async function loadInitialUsers() {
      try {
        await upsertUserProfile(user)
        const savedUsers = await listUsers()
        if (active) {
          setUsers(savedUsers)
          setError('')
        }
      } catch (loadError) {
        if (active) setError(loadError.message)
      } finally {
        if (active) setLoading(false)
      }
    }
    loadInitialUsers()
    return () => {
      active = false
    }
  }, [user])

  async function changeRole(uid, role) {
    try {
      await updateUserRole(uid, role)
      await refreshUsers()
    } catch (roleError) {
      setError(roleError.message)
    }
  }

  async function toggleActive(uid, active) {
    try {
      await updateUserActive(uid, active)
      await refreshUsers()
    } catch (activeError) {
      setError(activeError.message)
    }
  }

  if (!isAdminUser(user)) {
    return (
      <EmptyState
        description="Esta seccion solo esta disponible para el administrador del sistema."
        icon={ShieldAlert}
        title="Acceso restringido"
      />
    )
  }

  if (loading) return <LoadingState label="Cargando usuarios" />

  return (
    <>
      <PageTitle eyebrow="Administracion" title="Usuarios">
        Gestiona roles y estado de acceso para operadores del sistema.
      </PageTitle>
      <ErrorState message={error} />

      <section className="rounded-xl border border-white/10 bg-slate-900/80 p-4 shadow-xl shadow-black/15 sm:p-5">
        <div className="grid gap-3 border-b border-white/10 pb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500 md:grid-cols-[minmax(260px,1fr)_160px_140px_220px]">
          <span>Usuario</span>
          <span>Rol</span>
          <span>Estado</span>
          <span>Acciones</span>
        </div>

        <div className="divide-y divide-white/10">
          {users.map((systemUser) => (
            <article className="grid gap-4 py-4 md:grid-cols-[minmax(260px,1fr)_160px_140px_220px] md:items-center" key={systemUser.uid || systemUser.id}>
              <div className="min-w-0">
                <div className="truncate font-black text-slate-50">{systemUser.displayName || systemUser.email || 'Usuario sin nombre'}</div>
                <div className="break-all text-sm font-semibold text-slate-400">{systemUser.email}</div>
              </div>

              <select
                className="min-h-11 rounded-lg border border-white/10 bg-slate-950 px-3 font-bold text-slate-50 outline-none focus:border-blue-400"
                onChange={(event) => changeRole(systemUser.uid || systemUser.id, event.target.value)}
                value={systemUser.role || 'auditor'}
              >
                {roles.map((role) => <option key={role}>{role}</option>)}
              </select>

              <Badge tone={systemUser.active === false ? 'red' : 'green'}>
                {systemUser.active === false ? 'Inactivo' : 'Activo'}
              </Badge>

              <div className="flex flex-wrap gap-2">
                <Button
                  className="min-w-[150px]"
                  onClick={() => toggleActive(systemUser.uid || systemUser.id, !(systemUser.active !== false))}
                  tone={systemUser.active === false ? 'blue' : 'danger'}
                >
                  {systemUser.active === false ? <UserCheck size={17} /> : <UserX size={17} />}
                  {systemUser.active === false ? 'Activar' : 'Desactivar'}
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
