import { useEffect, useMemo, useState } from 'react'
import { Search, ShieldAlert, UserCheck, UserX } from 'lucide-react'
import { Badge, Button, EmptyState, ErrorState, LoadingState, PageTitle } from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import { useUserProfile } from '../hooks/useUserProfile'
import { canAuditUser, listUsers, updateUserActive, updateUserRole, upsertUserProfile, userRoles } from '../services/userService'
import { formatTime } from '../utils/inventory'

const roles = [userRoles.adminAuditor, userRoles.auditor, userRoles.counter]

export default function AdminUsersPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('email')
  const [users, setUsers] = useState([])
  const { user } = useAuth()
  const { profile } = useUserProfile()

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

  const filteredUsers = useMemo(() => {
    return users
      .filter((systemUser) => {
        const haystack = `${systemUser.displayName || ''} ${systemUser.email || ''}`.toLowerCase()
        const matchesText = !search || haystack.includes(search.toLowerCase())
        const matchesRole = roleFilter === 'all' || (systemUser.role || userRoles.counter) === roleFilter
        return matchesText && matchesRole
      })
      .sort((a, b) => {
        if (sortBy === 'name') return (a.displayName || a.email || '').localeCompare(b.displayName || b.email || '')
        if (sortBy === 'lastSeenAt') return String(b.lastSeenAt?.seconds || '').localeCompare(String(a.lastSeenAt?.seconds || ''))
        return (a.email || '').localeCompare(b.email || '')
      })
  }, [roleFilter, search, sortBy, users])

  async function changeRole(uid, role) {
    try {
      await updateUserRole(uid, role, user, profile)
      await refreshUsers()
    } catch (roleError) {
      setError(roleError.message)
    }
  }

  async function toggleActive(uid, active) {
    try {
      await updateUserActive(uid, active, user, profile)
      await refreshUsers()
    } catch (activeError) {
      setError(activeError.message)
    }
  }

  if (!canAuditUser(user, profile)) {
    return (
      <EmptyState
        description="Esta seccion solo esta disponible para usuarios con rol auditor."
        icon={ShieldAlert}
        title="Acceso restringido"
      />
    )
  }

  if (loading) return <LoadingState label="Cargando usuarios" />

  return (
    <>
      <PageTitle eyebrow="Administracion" title="Usuarios y permisos">
        Gestiona roles de auditoria, contadores y estado de acceso.
      </PageTitle>
      <ErrorState message={error} />

      <section className="mb-5 rounded-xl border border-white/10 bg-slate-900/80 p-4 shadow-xl shadow-black/15">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_180px_200px_auto]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input className="min-h-12 w-full rounded-lg border border-white/10 bg-slate-950/70 pl-11 pr-4 font-bold text-slate-50 outline-none placeholder:text-slate-500 focus:border-blue-400" onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre o correo" value={search} />
          </label>
          <select className="min-h-12 rounded-lg border border-white/10 bg-slate-950/70 px-4 font-bold text-slate-50 outline-none focus:border-blue-400" onChange={(event) => setRoleFilter(event.target.value)} value={roleFilter}>
            <option value="all">Todos los roles</option>
            {roles.map((role) => <option key={role} value={role}>{role}</option>)}
          </select>
          <select className="min-h-12 rounded-lg border border-white/10 bg-slate-950/70 px-4 font-bold text-slate-50 outline-none focus:border-blue-400" onChange={(event) => setSortBy(event.target.value)} value={sortBy}>
            <option value="email">Ordenar por correo</option>
            <option value="name">Ordenar por nombre</option>
            <option value="lastSeenAt">Ultima actividad</option>
          </select>
          <Button onClick={refreshUsers} tone="light">Actualizar</Button>
        </div>
      </section>

      <section className="grid gap-3">
        {filteredUsers.map((systemUser) => (
          <article className="rounded-xl border border-white/10 bg-slate-900/85 p-4 shadow-xl shadow-black/15" key={systemUser.uid || systemUser.id}>
            <div className="grid gap-4 xl:grid-cols-[minmax(260px,1fr)_160px_140px_220px_180px] xl:items-center">
              <div className="min-w-0">
                <div className="truncate text-lg font-black text-slate-50">{systemUser.displayName || systemUser.email || 'Usuario sin nombre'}</div>
                <div className="break-all text-sm font-semibold text-slate-400">{systemUser.email}</div>
                <div className="mt-1 text-xs font-bold text-slate-500">Ultima actividad: {formatTime(systemUser.lastSeenAt?.toDate?.() || systemUser.lastSeenAt)}</div>
              </div>

              <select
                className="min-h-11 rounded-lg border border-white/10 bg-slate-950 px-3 font-bold text-slate-50 outline-none focus:border-blue-400"
                onChange={(event) => changeRole(systemUser.uid || systemUser.id, event.target.value)}
                value={systemUser.role || userRoles.counter}
              >
                {roles.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>

              <Badge tone={systemUser.active === false ? 'red' : 'green'}>
                {systemUser.active === false ? 'Inactivo' : 'Activo'}
              </Badge>

              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => changeRole(systemUser.uid || systemUser.id, userRoles.auditor)} tone="light">Auditor</Button>
                <Button onClick={() => changeRole(systemUser.uid || systemUser.id, userRoles.counter)} tone="light">Contador</Button>
              </div>

              <Button
                className="w-full"
                onClick={() => toggleActive(systemUser.uid || systemUser.id, !(systemUser.active !== false))}
                tone={systemUser.active === false ? 'blue' : 'danger'}
              >
                {systemUser.active === false ? <UserCheck size={17} /> : <UserX size={17} />}
                {systemUser.active === false ? 'Activar' : 'Desactivar'}
              </Button>
            </div>
          </article>
        ))}
      </section>
    </>
  )
}
