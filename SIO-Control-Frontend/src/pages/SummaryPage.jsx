import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, ClipboardCheck, Clock3, FileSearch, FileText, Layers3, PackageCheck, Upload } from 'lucide-react'
import { Button, EmptyState, ErrorState, Kpi, LoadingState, PageTitle, RealtimeIndicator } from '../components/ui'
import { subscribeTodayInventory } from '../services/inventoryService'
import { formatDateKey, formatDisplayDate, formatNumber, formatTime, getCategoryProgress } from '../utils/inventory'

export default function SummaryPage() {
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

  if (loading) return <LoadingState label="Consultando inventario del dia" />

  return (
    <>
      <ErrorState message={error} />
      {!inventory ? (
        <EmptyState
          action={<Button onClick={() => navigate('/inventario/cargar')} tone="blue"><Upload className="mr-2 inline" size={18} />Cargar PDF de inventario</Button>}
          description="No existe un inventario creado para hoy. Carga el PDF diario para generar categorias, productos y comenzar el conteo."
          icon={FileSearch}
          title="No hay inventario del dia"
        />
      ) : (
        <InventorySummary inventory={inventory} syncStatus={syncStatus} />
      )}
    </>
  )
}

function InventorySummary({ inventory, syncStatus }) {
  const navigate = useNavigate()
  const updatedAt = inventory.updatedAt?.toDate ? inventory.updatedAt.toDate() : new Date()

  return (
    <>
      <PageTitle
        action={
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button onClick={() => navigate('/inventario/cargar')} tone="blue"><Upload className="mr-2 inline" size={18} />Cargar PDF</Button>
            <Button onClick={() => navigate('/inventario/conteo')} tone="light"><ClipboardCheck className="mr-2 inline" size={18} />Continuar conteo</Button>
            <Button onClick={() => navigate('/inventario/historial')} tone="light">Ver historial</Button>
            <RealtimeIndicator status={syncStatus} />
          </div>
        }
        eyebrow="Inventario actual"
        title="Inventario del dia"
      >
        {formatDisplayDate(inventory.dateKey)} - {inventory.semana || 'Semana sin definir'} - {inventory.cedis} - Ultima actualizacion {formatTime(updatedAt)}
      </PageTitle>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Kpi label="Total categorias" value={inventory.totalCategories} icon={Layers3} />
        <Kpi label="Total productos" value={inventory.totalProducts} icon={PackageCheck} />
        <Kpi label="Stock sistema" value={formatNumber(inventory.totalStock)} icon={FileText} />
        <Kpi label="Total contado" value={formatNumber(inventory.totalCounted)} icon={ClipboardCheck} />
        <Kpi label="Diferencia" value={formatNumber(inventory.difference)} icon={BarChart3} tone={inventory.difference === 0 ? 'green' : 'red'} />
        <Kpi label="Estado" value={inventory.status || 'en_proceso'} icon={Clock3} tone="blue" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-black/15">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-2xl font-black text-slate-50">Progreso de revision</h3>
              <p className="mt-1 text-slate-300">
                {inventory.reviewedCategories} categorias revisadas, {inventory.totalCategories - inventory.reviewedCategories} pendientes
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-black text-blue-300">{inventory.progress}%</div>
              <div className="text-sm font-bold text-slate-400">avance general</div>
            </div>
          </div>
          <div className="mt-5 h-4 overflow-hidden rounded-full bg-slate-950">
            <div className="h-full rounded-full bg-blue-500" style={{ width: `${inventory.progress}%` }} />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {inventory.categories.map((category) => {
              const progress = getCategoryProgress(category)
              return (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4" key={category.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="break-words font-black text-slate-100">{category.name}</div>
                    <span className="text-sm font-black text-slate-400">{progress}%</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-950 ring-1 ring-white/10">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-black/15">
          <h3 className="text-2xl font-black text-slate-50">Actividad reciente</h3>
          <div className="mt-5 space-y-4">
            {[
              ['Inventario cargado', inventory.createdAt?.toDate ? formatTime(inventory.createdAt.toDate()) : '--:--'],
              ['Conteo en proceso', `${inventory.countedProducts} productos con conteo`],
              ['Ultima edicion', formatTime(updatedAt)],
              ['Ultimo guardado', inventory.updatedBy?.name || 'Sistema'],
            ].map(([label, value]) => (
              <div className="flex gap-3" key={label}>
                <div className="grid h-11 w-11 flex-none place-items-center rounded-lg bg-blue-500/10 text-blue-200 ring-1 ring-blue-300/15">
                  <Clock3 size={20} />
                </div>
                <div>
                  <div className="font-black text-slate-100">{label}</div>
                  <div className="text-sm font-semibold text-slate-400">{value}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
