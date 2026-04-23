import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, ClipboardCheck, FileSearch, FileText, History, Layers3, PackageCheck, Upload } from 'lucide-react'
import { Button, EmptyState, ErrorState, Kpi, LoadingState, RealtimeIndicator } from '../components/ui'
import { subscribeTodayInventory } from '../services/inventoryService'
import { formatDateKey, formatDisplayDate, formatNumber, formatTime, getCategoryProgress } from '../utils/inventory'

export default function HomePage() {
  const [error, setError] = useState('')
  const [inventory, setInventory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState('connecting')
  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = subscribeTodayInventory(
      formatDateKey(),
      (todayInventory) => {
        setInventory(todayInventory)
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
    return () => {
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    function handleOnline() {
      setSyncStatus('synced')
    }
    function handleOffline() {
      setSyncStatus('offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (loading) return <LoadingState label="Preparando inicio" />

  return (
    <>
      <ErrorState message={error} />
      <section className="mb-5 rounded-2xl border border-white/10 bg-slate-900/85 p-5 shadow-2xl shadow-black/20 sm:p-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-200">Inicio operativo</p>
            <h2 className="mt-2 break-words text-3xl font-black tracking-tight text-slate-50 sm:text-4xl">
              SIO-Control
            </h2>
            <p className="mt-3 max-w-3xl text-base font-semibold leading-7 text-slate-300">
              Panel central para cargar el PDF diario, continuar conteos, revisar diferencias y consultar historial.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[520px]">
            <Button onClick={() => navigate('/inventario/conteo')} tone="blue"><ClipboardCheck size={18} />Ir a conteo</Button>
            <Button onClick={() => navigate('/inventario/cargar')} tone="light"><Upload size={18} />Cargar PDF</Button>
            <Button onClick={() => navigate('/inventario/historial')} tone="light"><History size={18} />Historial</Button>
            <RealtimeIndicator status={syncStatus} />
          </div>
        </div>
      </section>

      {!inventory ? (
        <EmptyState
          action={<Button onClick={() => navigate('/inventario/cargar')} tone="blue"><Upload size={18} />Cargar inventario del dia</Button>}
          description="No hay inventario creado para hoy. Carga el PDF para generar categorias, productos y el flujo de conteo."
          icon={FileSearch}
          title="Sin inventario activo"
        />
      ) : (
        <HomeDashboard inventory={inventory} />
      )}
    </>
  )
}

function HomeDashboard({ inventory }) {
  const navigate = useNavigate()
  const updatedAt = inventory.updatedAt?.toDate ? inventory.updatedAt.toDate() : new Date()

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Kpi label="Categorias" value={inventory.totalCategories} icon={Layers3} />
        <Kpi label="Productos" value={inventory.totalProducts} icon={PackageCheck} />
        <Kpi label="Stock total" value={formatNumber(inventory.totalStock)} icon={FileText} />
        <Kpi label="Total contado" value={formatNumber(inventory.totalCounted)} icon={ClipboardCheck} />
        <Kpi label="Diferencia" value={formatNumber(inventory.difference)} icon={BarChart3} tone={inventory.difference === 0 ? 'green' : 'red'} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-black/15">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold text-slate-400">{formatDisplayDate(inventory.dateKey)} - {inventory.cedis}</p>
              <h3 className="mt-1 text-2xl font-black text-slate-50">Inventario del dia</h3>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-4xl font-black text-blue-300">{inventory.progress}%</div>
              <div className="text-sm font-bold text-slate-400">avance general</div>
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
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-black/15">
          <h3 className="text-2xl font-black text-slate-50">Actividad reciente</h3>
          <div className="mt-5 space-y-4">
            {[
              ['Inventario cargado', inventory.createdAt?.toDate ? formatTime(inventory.createdAt.toDate()) : '--:--'],
              ['Productos revisados', `${inventory.countedProducts} de ${inventory.totalProducts}`],
              ['Movimientos', `${inventory.totalMovements || 0} registros`],
              ['Ultima actualizacion', formatTime(updatedAt)],
            ].map(([label, value]) => (
              <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10" key={label}>
                <div className="text-sm font-black uppercase tracking-wider text-slate-400">{label}</div>
                <div className="mt-1 break-words text-lg font-black text-slate-50">{value}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
