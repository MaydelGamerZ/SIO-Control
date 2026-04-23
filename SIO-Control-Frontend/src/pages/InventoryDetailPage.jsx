import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BadgeCheck, BarChart3, ClipboardCheck, Download, FileText, GitCompare, RotateCcw } from 'lucide-react'
import { Badge, Button, ErrorState, Kpi, LoadingState, Metric, PageTitle, RealtimeIndicator } from '../components/ui'
import { subscribeInventory } from '../services/inventoryService'
import { exportInventoryToPdf } from '../services/inventoryPdfExport'
import { useAuth } from '../hooks/useAuth'
import { useUserProfile } from '../hooks/useUserProfile'
import { canAuditUser } from '../services/userService'
import { formatDisplayDate, formatNumber, formatTime, getProductStatus } from '../utils/inventory'

export default function InventoryDetailPage() {
  const [error, setError] = useState('')
  const [inventory, setInventory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState('connecting')
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const canAudit = canAuditUser(user, profile)

  useEffect(() => {
    const unsubscribe = subscribeInventory(
      id,
      (selectedInventory) => {
        setInventory(selectedInventory)
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
  }, [id])

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

  if (loading) return <LoadingState label="Cargando detalle" />
  if (!inventory) return <ErrorState message={error || 'Inventario no encontrado'} />

  return (
    <>
      <PageTitle
        action={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate('/inventario/historial')} tone="light"><RotateCcw className="mr-2 inline" size={18} />Volver al historial</Button>
            <Button onClick={() => navigate(`/inventario/${inventory.id}/editar`)} tone="dark">Editar conteo</Button>
            {canAudit && <Button onClick={() => navigate(`/inventario/${inventory.id}/comparar`)} tone="blue"><GitCompare className="mr-2 inline" size={18} />Comparar</Button>}
            <Button onClick={() => exportInventoryToPdf(inventory, user, profile)} tone="light"><Download className="mr-2 inline" size={18} />Exportar PDF</Button>
            <RealtimeIndicator status={syncStatus} />
          </div>
        }
        eyebrow="Detalle auditado"
        title={`Inventario ${formatDisplayDate(inventory.dateKey)}`}
      >
        {inventory.semana || 'Sin semana'} - {inventory.cedis} - Estado {inventory.status}
      </PageTitle>
      <ErrorState message={error} />

      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label="Stock original" value={formatNumber(inventory.totalStock)} icon={FileText} />
        <Kpi label="Total contado" value={formatNumber(inventory.finalCount?.totalCounted ?? inventory.totalCounted)} icon={ClipboardCheck} />
        <Kpi label="Diferencia total" value={formatNumber(inventory.difference)} icon={BarChart3} tone={inventory.difference === 0 ? 'green' : 'red'} />
        <Kpi label="Estatus final" value={inventory.status} icon={BadgeCheck} tone="blue" />
      </div>

      <section className="mt-6 space-y-5">
        {inventory.userCounts.length > 0 ? (
          inventory.userCounts.map((count, index) => (
            <CountAuditSection count={count} key={count.id} title={`Conteo Usuario ${index + 1}: ${count.userName}`} />
          ))
        ) : (
          <CountAuditSection count={{ categories: inventory.categories }} title="Conteo registrado" />
        )}
        {canAudit && inventory.userCounts.length >= 2 && (
          <section className="rounded-xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-black/15">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Comparacion</p>
                <h3 className="mt-1 text-2xl font-black text-slate-50">Validacion entre usuarios</h3>
              </div>
              <Button onClick={() => navigate(`/inventario/${inventory.id}/comparar`)} tone="light">Abrir comparacion</Button>
            </div>
          </section>
        )}
        {inventory.finalCount && <CountAuditSection count={inventory.finalCount} title="Conteo final validado" />}
      </section>
    </>
  )
}

function CountAuditSection({ count, title }) {
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-2xl font-black text-slate-50">{title}</h3>
        <Badge tone="blue">{formatNumber(count.totalCounted || 0)} unidades</Badge>
      </div>
      <div className="space-y-4">
        {(count.categories || []).map((category) => (
          <details className="rounded-xl border border-white/10 bg-slate-900/80 shadow-xl shadow-black/15" key={category.id}>
            <summary className="cursor-pointer list-none p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h4 className="break-words text-xl font-black text-slate-50">{category.name}</h4>
                <Badge tone="blue">{category.products.length} productos</Badge>
              </div>
            </summary>
            <div className="divide-y divide-white/10 border-t border-white/10">
              {category.products.map((product) => {
                const status = getProductStatus(product)
                return (
                  <div className="p-5" key={product.id}>
                    <div className="grid gap-4 xl:grid-cols-[minmax(260px,1fr)_repeat(4,130px)_auto] xl:items-center">
                      <div>
                        <div className="break-words font-black text-slate-50">{product.name}</div>
                        <div className="mt-1 text-sm text-slate-400">{product.countEntries.length} conteos registrados</div>
                      </div>
                      <Metric label="Stock" value={product.stock} />
                      <Metric label="Contado" value={product.totalCounted} />
                      <Metric label="Dif." value={product.difference} tone={status.tone} />
                      <Metric label="No disp." value={product.noDisponible} />
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </div>
                    <div className="mt-4 rounded-xl bg-slate-950/50 p-4 ring-1 ring-white/10">
                      <h5 className="font-black text-slate-100">Historial de conteos</h5>
                      <div className="mt-3 grid gap-2">
                        {product.countEntries.length === 0 && <div className="text-sm font-bold text-slate-400">Sin registros.</div>}
                        {product.countEntries.map((entry) => (
                          <div className="grid gap-2 rounded-lg bg-slate-900 p-3 text-slate-300 ring-1 ring-white/10 md:grid-cols-[90px_1fr_100px_120px]" key={entry.id}>
                            <strong className="text-slate-50">+{formatNumber(entry.quantity)}</strong>
                            <span>{entry.observation || entry.condition || 'Buen estado'}{entry.comment ? ` - ${entry.comment}` : ''}{entry.updatedBy?.name ? ` - editado por ${entry.updatedBy.name}` : ''}</span>
                            <span className="text-slate-400">{formatTime(entry.createdAt)}</span>
                            <span className="break-all font-bold text-slate-100">{entry.userName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}
