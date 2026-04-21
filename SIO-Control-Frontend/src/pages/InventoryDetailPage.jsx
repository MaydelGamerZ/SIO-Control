import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BadgeCheck, BarChart3, ClipboardCheck, FileText, RotateCcw } from 'lucide-react'
import { Badge, Button, ErrorState, Kpi, LoadingState, Metric, PageTitle } from '../components/ui'
import { getInventory } from '../services/inventoryService'
import { formatDisplayDate, formatNumber, formatTime, getProductStatus } from '../utils/inventory'

export default function InventoryDetailPage() {
  const [error, setError] = useState('')
  const [inventory, setInventory] = useState(null)
  const [loading, setLoading] = useState(true)
  const { id } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    async function loadInventory() {
      setLoading(true)
      setError('')
      try {
        const selectedInventory = await getInventory(id)
        if (active) setInventory(selectedInventory)
      } catch (loadError) {
        if (active) setError(loadError.message)
      } finally {
        if (active) setLoading(false)
      }
    }
    loadInventory()
    return () => {
      active = false
    }
  }, [id])

  if (loading) return <LoadingState label="Cargando detalle" />
  if (!inventory) return <ErrorState message={error || 'Inventario no encontrado'} />

  return (
    <>
      <PageTitle
        action={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate('/inventario/historial')} tone="light"><RotateCcw className="mr-2 inline" size={18} />Volver al historial</Button>
            <Button onClick={() => navigate(`/inventario/${inventory.id}/editar`)} tone="dark">Editar conteo</Button>
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
        <Kpi label="Total contado" value={formatNumber(inventory.totalCounted)} icon={ClipboardCheck} />
        <Kpi label="Diferencia total" value={formatNumber(inventory.difference)} icon={BarChart3} tone={inventory.difference === 0 ? 'green' : 'red'} />
        <Kpi label="Estatus final" value={inventory.status} icon={BadgeCheck} tone="blue" />
      </div>

      <section className="mt-6 space-y-4">
        {inventory.categories.map((category) => (
          <details className="rounded-lg border border-slate-200 bg-white shadow-sm" key={category.id} open>
            <summary className="cursor-pointer list-none p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-2xl font-black text-slate-950">{category.name}</h3>
                <Badge tone="blue">{category.products.length} productos</Badge>
              </div>
            </summary>
            <div className="divide-y divide-slate-100 border-t border-slate-200">
              {category.products.map((product) => {
                const status = getProductStatus(product)
                return (
                  <div className="p-5" key={product.id}>
                    <div className="grid gap-4 xl:grid-cols-[minmax(260px,1fr)_repeat(4,130px)_auto] xl:items-center">
                      <div>
                        <div className="font-black text-slate-950">{product.name}</div>
                        <div className="mt-1 text-sm text-slate-500">{product.countEntries.length} conteos registrados</div>
                      </div>
                      <Metric label="Stock" value={product.stock} />
                      <Metric label="Contado" value={product.totalCounted} />
                      <Metric label="Dif." value={product.difference} tone={status.tone} />
                      <Metric label="No disp." value={product.noDisponible} />
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </div>
                    <div className="mt-4 rounded-lg bg-slate-50 p-4">
                      <h4 className="font-black text-slate-900">Historial de conteos</h4>
                      <div className="mt-3 grid gap-2">
                        {product.countEntries.length === 0 && <div className="text-sm font-bold text-slate-400">Sin registros.</div>}
                        {product.countEntries.map((entry) => (
                          <div className="grid gap-2 rounded-lg bg-white p-3 md:grid-cols-[90px_1fr_100px_120px]" key={entry.id}>
                            <strong>+{formatNumber(entry.quantity)}</strong>
                            <span>{entry.observation}{entry.comment ? ` - ${entry.comment}` : ''}</span>
                            <span className="text-slate-500">{formatTime(entry.createdAt)}</span>
                            <span className="font-bold">{entry.userName}</span>
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
      </section>
    </>
  )
}
