import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  BarChart3,
  ClipboardCheck,
  FileSearch,
  GitCompare,
  History,
  Layers3,
  PackageCheck,
  ShieldCheck,
  Upload,
  Users,
} from 'lucide-react'
import { Badge, Button, EmptyState, ErrorState, Kpi, LoadingState, RealtimeIndicator } from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import { useUserProfile } from '../hooks/useUserProfile'
import { subscribeInventories, subscribeTodayInventory } from '../services/inventoryService'
import { canAuditUser, subscribeUsers } from '../services/userService'
import {
  flattenProducts,
  formatDateKey,
  formatDisplayDate,
  formatNumber,
  formatTime,
  getCategoryProgress,
  inventoryStatuses,
} from '../utils/inventory'

function toDateValue(value) {
  if (!value) return null
  if (value?.toDate) return value.toDate()
  return value instanceof Date ? value : new Date(value)
}

function isActiveWithin(value, minutes = 15) {
  const date = toDateValue(value)
  if (!date) return false
  return Date.now() - date.getTime() <= minutes * 60 * 1000
}

function summarizeExceptions(inventory) {
  const products = flattenProducts(inventory?.categories || []).map((row) => row.product)
  return products.reduce(
    (summary, product) => {
      const difference = Number(product.difference || 0)
      const entries = product.countEntries || []
      const hasObservation = entries.some((entry) => (entry.observation || entry.condition) && (entry.observation || entry.condition) !== 'Buen estado')
      if (difference < 0) summary.missing += 1
      if (difference > 0) summary.surplus += 1
      if (entries.length > 1) summary.multipleMovements += 1
      if (hasObservation) summary.observations += 1
      if (entries.some((entry) => (entry.observation || entry.condition) === 'Danado')) summary.damaged += 1
      if (entries.some((entry) => (entry.observation || entry.condition) === 'Caducado')) summary.expired += 1
      if (Math.abs(difference) >= 10 || hasObservation) summary.critical += 1
      return summary
    },
    {
      critical: 0,
      damaged: 0,
      expired: 0,
      missing: 0,
      multipleMovements: 0,
      observations: 0,
      surplus: 0,
    },
  )
}

function needsComparison(inventory) {
  if (!inventory) return false
  if (inventory.status === inventoryStatuses.pendingComparison) return true
  return !inventory.finalCount && (inventory.userCountCount || 0) >= 2
}

export default function HomePage() {
  const [error, setError] = useState('')
  const [inventories, setInventories] = useState([])
  const [inventory, setInventory] = useState(null)
  const [loadingInventories, setLoadingInventories] = useState(true)
  const [loadingToday, setLoadingToday] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [syncStatus, setSyncStatus] = useState('connecting')
  const [users, setUsers] = useState([])
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const canAudit = canAuditUser(user, profile)

  useEffect(() => {
    const unsubscribeToday = subscribeTodayInventory(
      formatDateKey(),
      (todayInventory) => {
        setInventory(todayInventory)
        setLoadingToday(false)
        setSyncStatus(navigator.onLine ? 'synced' : 'offline')
        setError('')
      },
      (loadError) => {
        setError(loadError.message)
        setLoadingToday(false)
        setSyncStatus('offline')
      },
    )

    const unsubscribeInventories = subscribeInventories(
      (items) => {
        setInventories(items)
        setLoadingInventories(false)
      },
      (loadError) => {
        setError(loadError.message)
        setLoadingInventories(false)
      },
    )

    const unsubscribeUsers = subscribeUsers(
      (items) => {
        setUsers(items)
        setLoadingUsers(false)
      },
      (loadError) => {
        setError(loadError.message)
        setLoadingUsers(false)
      },
    )

    function handleOnline() {
      setSyncStatus('synced')
    }
    function handleOffline() {
      setSyncStatus('offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      unsubscribeToday()
      unsubscribeInventories()
      unsubscribeUsers()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const loading = loadingToday || loadingInventories || loadingUsers
  const activeInventories = useMemo(
    () => inventories.filter((item) => ![inventoryStatuses.validated, inventoryStatuses.closed].includes(item.status)),
    [inventories],
  )
  const readyToCompare = useMemo(() => inventories.filter(needsComparison), [inventories])
  const validatedToday = useMemo(
    () => inventories.filter((item) => item.dateKey === formatDateKey() && item.status === inventoryStatuses.validated).length,
    [inventories],
  )
  const exceptionSummary = useMemo(() => summarizeExceptions(inventory), [inventory])
  const userMap = useMemo(() => new Map(users.map((item) => [item.uid || item.id, item])), [users])
  const participantStatus = useMemo(() => {
    if (!inventory) return []
    return (inventory.participants || []).map((participant) => {
      const profileData = userMap.get(participant.userId)
      const lastActivity = toDateValue(profileData?.lastInventoryActivityAt || profileData?.lastSeenAt)
      return {
        ...participant,
        activeNow: isActiveWithin(lastActivity),
        currentCategoryName: profileData?.currentCategoryName || '',
        currentView: profileData?.currentView || '',
        lastActivity,
      }
    })
  }, [inventory, userMap])
  const alerts = useMemo(() => {
    const items = []
    if (!inventory) {
      items.push({ text: 'No hay inventario activo hoy. Carga el PDF diario para iniciar operación.', tone: 'amber' })
      return items
    }

    if (needsComparison(inventory)) {
      items.push({ text: 'El inventario actual ya está listo para comparación o tiene dos conteos activos.', tone: 'blue' })
    }
    if (exceptionSummary.critical > 0) {
      items.push({ text: `Hay ${exceptionSummary.critical} productos críticos con diferencia alta u observaciones.`, tone: 'red' })
    }
    if (participantStatus.some((participant) => !participant.activeNow)) {
      items.push({ text: 'Hay participantes sin actividad reciente en el inventario del día.', tone: 'amber' })
    }
    if (!items.length) {
      items.push({ text: 'La operación del día no muestra alertas críticas en este momento.', tone: 'green' })
    }

    return items
  }, [exceptionSummary.critical, inventory, participantStatus])

  if (loading) return <LoadingState label="Preparando centro de control" />

  return (
    <>
      <ErrorState message={error} />
      <section className="mb-5 rounded-2xl border border-white/10 bg-slate-900/85 p-5 shadow-2xl shadow-black/20 sm:p-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-200">Centro de control</p>
            <h2 className="mt-2 break-words text-3xl font-black tracking-tight text-slate-50 sm:text-4xl">SIO-Control</h2>
            <p className="mt-3 max-w-3xl text-base font-semibold leading-7 text-slate-300">
              Vista ejecutiva de la operación diaria: progreso, participantes activos, prioridades de auditoría y trazabilidad del inventario.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[640px]">
            <Button onClick={() => navigate('/inventario/cargar')} tone="blue"><Upload size={18} />Cargar PDF</Button>
            <Button onClick={() => navigate('/inventario/conteo')} tone="light"><ClipboardCheck size={18} />Ir a conteo</Button>
            <Button onClick={() => navigate('/inventario/historial')} tone="light"><History size={18} />Historial</Button>
            {canAudit && <Button onClick={() => navigate('/bitacora')} tone="light"><ShieldCheck size={18} />Bitacora</Button>}
            {canAudit && <Button disabled={!inventory} onClick={() => navigate(inventory ? `/inventario/${inventory.id}/comparar` : '/inventario/comparar')} tone="light"><GitCompare size={18} />Comparar</Button>}
            <RealtimeIndicator status={syncStatus} />
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Kpi icon={Layers3} label="Inventarios activos" value={activeInventories.length} />
        <Kpi icon={GitCompare} label="Listos para comparar" value={readyToCompare.length} tone="blue" />
        <Kpi icon={ShieldCheck} label="Validados hoy" value={validatedToday} tone="green" />
        <Kpi icon={Users} label="Usuarios activos hoy" value={participantStatus.filter((item) => item.activeNow).length} tone="blue" />
        <Kpi icon={PackageCheck} label="Progreso del día" value={inventory ? `${inventory.progress}%` : '0%'} tone="green" />
        <Kpi icon={AlertTriangle} label="Excepciones críticas" value={exceptionSummary.critical} tone={exceptionSummary.critical > 0 ? 'red' : 'green'} />
      </div>

      {!inventory ? (
        <div className="mt-5">
          <EmptyState
            action={<Button onClick={() => navigate('/inventario/cargar')} tone="blue"><Upload size={18} />Cargar inventario del dia</Button>}
            description="No hay inventario creado para hoy. Carga el PDF para generar categorías, productos y comenzar el conteo multiusuario."
            icon={FileSearch}
            title="Sin inventario activo"
          />
        </div>
      ) : (
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <section className="space-y-5">
            <article className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-black/15">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-400">{formatDisplayDate(inventory.dateKey)} · {inventory.cedis}</p>
                  <h3 className="mt-1 text-2xl font-black text-slate-50">Inventario del día</h3>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-4xl font-black text-blue-300">{inventory.progress}%</div>
                  <div className="text-sm font-bold text-slate-400">avance global</div>
                </div>
              </div>
              <div className="mt-5 h-4 overflow-hidden rounded-full bg-slate-950 ring-1 ring-white/10">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${inventory.progress}%` }} />
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {inventory.categories.slice(0, 6).map((category) => {
                  const progress = getCategoryProgress(category)
                  return (
                    <button
                      className="rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:bg-white/10"
                      key={category.id}
                      onClick={() => navigate(`/inventario/${inventory.id}/editar`)}
                      type="button"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <strong className="break-words text-slate-100">{category.name}</strong>
                        <span className="text-sm font-black text-slate-400">{progress}%</span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-950">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${progress}%` }} />
                      </div>
                    </button>
                  )
                })}
              </div>
            </article>

            <article className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-black/15">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Vista por excepciones</p>
                  <h3 className="mt-1 text-2xl font-black text-slate-50">Prioridades operativas</h3>
                </div>
                <Button onClick={() => navigate('/inventario/conteo')} tone="light">Abrir conteo</Button>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <ExceptionCard label="Faltantes" value={exceptionSummary.missing} tone={exceptionSummary.missing > 0 ? 'red' : 'green'} />
                <ExceptionCard label="Sobrantes" value={exceptionSummary.surplus} tone={exceptionSummary.surplus > 0 ? 'amber' : 'green'} />
                <ExceptionCard label="Observaciones" value={exceptionSummary.observations} tone={exceptionSummary.observations > 0 ? 'amber' : 'green'} />
                <ExceptionCard label="Danados" value={exceptionSummary.damaged} tone={exceptionSummary.damaged > 0 ? 'red' : 'green'} />
                <ExceptionCard label="Caducados" value={exceptionSummary.expired} tone={exceptionSummary.expired > 0 ? 'red' : 'green'} />
                <ExceptionCard label="Movimientos multiples" value={exceptionSummary.multipleMovements} tone={exceptionSummary.multipleMovements > 0 ? 'amber' : 'green'} />
              </div>
            </article>
          </section>

          <section className="space-y-5">
            <article className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-black/15">
              <h3 className="text-2xl font-black text-slate-50">Alertas y seguimiento</h3>
              <div className="mt-5 space-y-3">
                {alerts.map((alert) => (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4" key={alert.text}>
                    <Badge tone={alert.tone}>{alert.tone === 'red' ? 'Critico' : alert.tone === 'amber' ? 'Atencion' : alert.tone === 'blue' ? 'Seguimiento' : 'Estable'}</Badge>
                    <div className="mt-2 text-sm font-bold leading-6 text-slate-200">{alert.text}</div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-black/15">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Actividad actual</p>
                  <h3 className="mt-1 text-2xl font-black text-slate-50">Participantes del inventario</h3>
                </div>
                <Badge tone="blue">{participantStatus.length} participante{participantStatus.length === 1 ? '' : 's'}</Badge>
              </div>
              <div className="mt-5 grid gap-3">
                {participantStatus.length === 0 ? (
                  <div className="rounded-xl bg-white/5 p-4 text-sm font-bold text-slate-400">
                    Aún no hay participantes registrados en el inventario del día.
                  </div>
                ) : (
                  participantStatus.map((participant) => (
                    <article className="rounded-xl border border-white/10 bg-slate-950/55 p-4" key={participant.userId || participant.userEmail}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <strong className="text-slate-100">{participant.userName}</strong>
                        <Badge tone={participant.activeNow ? 'green' : 'amber'}>
                          {participant.activeNow ? 'Activo ahora' : 'Sin actividad reciente'}
                        </Badge>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm font-bold text-slate-300 sm:grid-cols-2">
                        <span>Estado: {participant.status || inventoryStatuses.inProgress}</span>
                        <span>Categoria: {participant.currentCategoryName || 'Sin categoria activa'}</span>
                        <span>Vista: {participant.currentView || 'Sin dato'}</span>
                        <span>Ultima actividad: {participant.lastActivity ? formatTime(participant.lastActivity) : '--:--'}</span>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </article>
          </section>
        </div>
      )}
    </>
  )
}

function ExceptionCard({ label, tone = 'green', value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/55 p-4">
      <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className={`mt-2 text-3xl font-black ${tone === 'red' ? 'text-rose-200' : tone === 'amber' ? 'text-amber-200' : 'text-emerald-200'}`}>
        {formatNumber(value)}
      </div>
    </div>
  )
}
