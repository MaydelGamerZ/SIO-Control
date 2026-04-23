import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  Download,
  FileEdit,
  FilePlus2,
  Filter,
  History,
  LogIn,
  PackagePlus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  UserCog,
  Users,
} from 'lucide-react'
import { Badge, Button, EmptyState, ErrorState, Kpi, LoadingState, PageTitle, RealtimeIndicator } from '../components/ui'
import { auditActionOptions, formatAuditLogTime, getAuditActionMeta, subscribeAuditLogs } from '../services/auditLogService'

const actionIcons = {
  'badge-check': ShieldCheck,
  download: Download,
  edit: FileEdit,
  login: LogIn,
  plus: FilePlus2,
  'package-plus': PackagePlus,
  refresh: History,
  'shield-alert': ShieldAlert,
  'shield-check': ShieldCheck,
  trash: Trash2,
  upload: Upload,
  'user-plus': Users,
  users: UserCog,
}

function matchesDateRange(logDate, dateFrom, dateTo) {
  if (!logDate) return false
  const normalizedDate = new Date(logDate)
  normalizedDate.setHours(0, 0, 0, 0)

  if (dateFrom) {
    const start = new Date(`${dateFrom}T00:00:00`)
    if (normalizedDate < start) return false
  }

  if (dateTo) {
    const end = new Date(`${dateTo}T23:59:59`)
    if (logDate > end) return false
  }

  return true
}

function detailEntries(details = {}) {
  return Object.entries(details).filter(([, value]) => value !== '' && value !== null && value !== undefined)
}

export default function AuditLogPage() {
  const [actionType, setActionType] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [error, setError] = useState('')
  const [inventoryFilter, setInventoryFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState([])
  const [productFilter, setProductFilter] = useState('')
  const [syncStatus, setSyncStatus] = useState('connecting')
  const [userFilter, setUserFilter] = useState('')
  const [viewMode, setViewMode] = useState('timeline')

  useEffect(() => {
    const unsubscribe = subscribeAuditLogs(
      (items) => {
        setLogs(items)
        setLoading(false)
        setSyncStatus(navigator.onLine ? 'synced' : 'offline')
        setError('')
      },
      (loadError) => {
        setError(loadError.message)
        setLoading(false)
        setSyncStatus('offline')
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
      unsubscribe()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesAction = actionType === 'all' || log.actionType === actionType
      const matchesUser = !userFilter || `${log.actor?.name || ''} ${log.actor?.email || ''}`.toLowerCase().includes(userFilter.toLowerCase())
      const matchesInventory = !inventoryFilter || `${log.inventoryLabel || ''} ${log.inventoryId || ''} ${log.inventoryCedis || ''}`.toLowerCase().includes(inventoryFilter.toLowerCase())
      const matchesProduct = !productFilter || `${log.productName || ''} ${log.categoryName || ''} ${log.productId || ''}`.toLowerCase().includes(productFilter.toLowerCase())
      const matchesDate = matchesDateRange(log.happenedAtDate, dateFrom, dateTo)
      return matchesAction && matchesUser && matchesInventory && matchesProduct && matchesDate
    })
  }, [actionType, dateFrom, dateTo, inventoryFilter, logs, productFilter, userFilter])

  const summary = useMemo(() => {
    const impactedUsers = new Set()
    const impactedInventories = new Set()
    const impactedProducts = new Set()

    for (const log of filteredLogs) {
      if (log.actor?.uid) impactedUsers.add(log.actor.uid)
      if (log.inventoryId) impactedInventories.add(log.inventoryId)
      if (log.productKey || log.productId) impactedProducts.add(log.productKey || log.productId)
    }

    return {
      inventories: impactedInventories.size,
      products: impactedProducts.size,
      total: filteredLogs.length,
      users: impactedUsers.size,
    }
  }, [filteredLogs])

  if (loading) return <LoadingState label="Cargando bitacora global" />

  return (
    <>
      <PageTitle
        action={
          <div className="flex flex-wrap gap-2">
            <RealtimeIndicator status={syncStatus} />
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
          </div>
        }
        eyebrow="Trazabilidad"
        title="Bitacora global"
      >
        Historial centralizado de accesos, cambios operativos, validaciones, exportaciones y acciones administrativas.
      </PageTitle>
      <ErrorState message={error} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Activity} label="Eventos visibles" value={summary.total} />
        <Kpi icon={Users} label="Usuarios activos en bitacora" value={summary.users} tone="blue" />
        <Kpi icon={PackagePlus} label="Inventarios impactados" value={summary.inventories} tone="green" />
        <Kpi icon={FileEdit} label="Productos impactados" value={summary.products} tone="amber" />
      </div>

      <section className="mt-5 rounded-xl border border-white/10 bg-slate-900/80 p-4 shadow-xl shadow-black/15 sm:p-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(220px,1fr)_minmax(180px,0.8fr)_minmax(180px,0.8fr)_minmax(200px,1fr)_minmax(200px,1fr)_180px]">
          <SearchInput label="Usuario" onChange={setUserFilter} placeholder="Nombre o correo" value={userFilter} />
          <SearchInput label="Inventario" onChange={setInventoryFilter} placeholder="CEDIS o id" value={inventoryFilter} />
          <SearchInput label="Producto" onChange={setProductFilter} placeholder="Producto o categoria" value={productFilter} />
          <label className="grid gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            Fecha inicial
            <input className="min-h-12 rounded-lg border border-white/10 bg-slate-950/70 px-4 font-bold text-slate-50 outline-none focus:border-blue-400" onChange={(event) => setDateFrom(event.target.value)} type="date" value={dateFrom} />
          </label>
          <label className="grid gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            Fecha final
            <input className="min-h-12 rounded-lg border border-white/10 bg-slate-950/70 px-4 font-bold text-slate-50 outline-none focus:border-blue-400" onChange={(event) => setDateTo(event.target.value)} type="date" value={dateTo} />
          </label>
          <label className="grid gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            Tipo de accion
            <select className="min-h-12 rounded-lg border border-white/10 bg-slate-950/70 px-4 font-bold text-slate-50 outline-none focus:border-blue-400" onChange={(event) => setActionType(event.target.value)} value={actionType}>
              <option value="all">Todas</option>
              {auditActionOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => {
            setActionType('all')
            setDateFrom('')
            setDateTo('')
            setInventoryFilter('')
            setProductFilter('')
            setUserFilter('')
          }} tone="light">
            <Filter size={17} />
            Limpiar filtros
          </Button>
        </div>
      </section>

      <section className="mt-5">
        {filteredLogs.length === 0 ? (
          <EmptyState
            description="No hay eventos que coincidan con los filtros actuales. Ajusta rango, usuario o tipo de accion."
            icon={Activity}
            title="Sin eventos visibles"
          />
        ) : viewMode === 'timeline' ? (
          <TimelineView logs={filteredLogs} />
        ) : (
          <TableView logs={filteredLogs} />
        )}
      </section>
    </>
  )
}

function SearchInput({ label, onChange, placeholder, value }) {
  return (
    <label className="grid gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
      {label}
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input
          className="min-h-12 w-full rounded-lg border border-white/10 bg-slate-950/70 pl-11 pr-4 font-bold text-slate-50 outline-none focus:border-blue-400"
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          value={value}
        />
      </div>
    </label>
  )
}

function ViewModeToggle({ value, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-white/10 bg-slate-950/60 p-1">
      <button
        className={`rounded-md px-3 py-2 text-sm font-black transition ${value === 'timeline' ? 'bg-blue-600 text-white' : 'text-slate-300'}`}
        onClick={() => onChange('timeline')}
        type="button"
      >
        Timeline
      </button>
      <button
        className={`rounded-md px-3 py-2 text-sm font-black transition ${value === 'table' ? 'bg-blue-600 text-white' : 'text-slate-300'}`}
        onClick={() => onChange('table')}
        type="button"
      >
        Tabla
      </button>
    </div>
  )
}

function TimelineView({ logs }) {
  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <TimelineItem key={log.id} log={log} />
      ))}
    </div>
  )
}

function TimelineItem({ log }) {
  const meta = getAuditActionMeta(log.actionType)
  const Icon = actionIcons[meta.icon] || Activity

  return (
    <article className="grid gap-3 rounded-xl border border-white/10 bg-slate-900/85 p-4 shadow-xl shadow-black/15 sm:grid-cols-[56px_minmax(0,1fr)] sm:p-5">
      <div className="grid h-14 w-14 place-items-center rounded-xl bg-slate-950 ring-1 ring-white/10">
        <Icon className="text-blue-200" size={24} />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={meta.color}>{meta.label}</Badge>
          <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{formatAuditLogTime(log)}</span>
        </div>
        <h3 className="mt-3 break-words text-lg font-black text-slate-50">{log.summary || meta.label}</h3>
        <div className="mt-3 grid gap-3 xl:grid-cols-4">
          <InfoBlock label="Usuario" value={log.actor?.name || log.actor?.email || 'Sistema'} />
          <InfoBlock label="Inventario" value={log.inventoryLabel || log.inventoryId || 'No aplica'} />
          <InfoBlock label="Producto" value={log.productName || 'No aplica'} />
          <InfoBlock label="Categoria" value={log.categoryName || 'No aplica'} />
        </div>
        {detailEntries(log.details).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {detailEntries(log.details).map(([key, value]) => (
              <Badge key={key} tone="slate">{key}: {String(value)}</Badge>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}

function TableView({ logs }) {
  return (
    <div className="touch-scroll overflow-x-auto rounded-xl border border-white/10 bg-slate-900/85 shadow-xl shadow-black/15">
      <table className="w-full min-w-[1040px] text-left text-sm">
        <thead className="bg-slate-950 text-xs uppercase tracking-[0.18em] text-slate-400">
          <tr>
            <th className="px-4 py-3">Accion</th>
            <th className="px-4 py-3">Usuario</th>
            <th className="px-4 py-3">Inventario</th>
            <th className="px-4 py-3">Producto</th>
            <th className="px-4 py-3">Resumen</th>
            <th className="px-4 py-3">Fecha</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {logs.map((log) => {
            const meta = getAuditActionMeta(log.actionType)
            return (
              <tr key={log.id}>
                <td className="px-4 py-4"><Badge tone={meta.color}>{meta.label}</Badge></td>
                <td className="px-4 py-4 font-bold text-slate-100">{log.actor?.name || log.actor?.email || 'Sistema'}</td>
                <td className="px-4 py-4 text-slate-300">{log.inventoryLabel || log.inventoryId || 'No aplica'}</td>
                <td className="px-4 py-4 text-slate-300">{log.productName || log.categoryName || 'No aplica'}</td>
                <td className="px-4 py-4 text-slate-300">{log.summary || meta.label}</td>
                <td className="px-4 py-4 font-bold text-slate-400">{formatAuditLogTime(log)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function InfoBlock({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-950/55 p-3 ring-1 ring-white/10">
      <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="mt-1 break-words font-bold text-slate-100">{value}</div>
    </div>
  )
}
