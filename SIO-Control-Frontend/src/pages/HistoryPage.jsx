import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArchiveRestore, Edit3, Eye, Filter } from 'lucide-react'
import { Button, EmptyState, ErrorState, LoadingState, Metric, PageTitle } from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import { listInventories, updateInventoryStatus } from '../services/inventoryService'
import { formatDisplayDate, formatNumber, inventoryStatuses } from '../utils/inventory'

export default function HistoryPage() {
  const [cedisFilter, setCedisFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [error, setError] = useState('')
  const [inventories, setInventories] = useState([])
  const [loading, setLoading] = useState(true)
  const [textFilter, setTextFilter] = useState('')
  const { user } = useAuth()
  const navigate = useNavigate()

  async function refreshInventories() {
    setLoading(true)
    setError('')
    try {
      setInventories(await listInventories())
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    async function loadInitialInventories() {
      try {
        const savedInventories = await listInventories()
        if (!active) return
        setInventories(savedInventories)
        setError('')
      } catch (loadError) {
        if (active) setError(loadError.message)
      } finally {
        if (active) setLoading(false)
      }
    }
    loadInitialInventories()
    return () => {
      active = false
    }
  }, [])

  const filteredInventories = useMemo(() => {
    return inventories.filter((inventory) => {
      const matchesDate = !dateFilter || inventory.dateKey === dateFilter
      const matchesCedis = !cedisFilter || inventory.cedis?.toLowerCase().includes(cedisFilter.toLowerCase())
      const matchesText = !textFilter || `${inventory.semana} ${inventory.cedis} ${inventory.status}`.toLowerCase().includes(textFilter.toLowerCase())
      return matchesDate && matchesCedis && matchesText
    })
  }, [cedisFilter, dateFilter, inventories, textFilter])

  async function reopenInventory(id) {
    try {
      await updateInventoryStatus(id, inventoryStatuses.reopened, user)
      await refreshInventories()
    } catch (reopenError) {
      setError(reopenError.message)
    }
  }

  if (loading) return <LoadingState label="Cargando historial" />

  return (
    <>
      <PageTitle eyebrow="Auditoria" title="Historial de inventarios">
        Consulta inventarios guardados, reabre conteos y revisa diferencias con trazabilidad.
      </PageTitle>
      <ErrorState message={error} />

      <section className="rounded-xl border border-white/10 bg-slate-900/80 p-4 shadow-xl shadow-black/15 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[160px_220px_minmax(220px,1fr)_auto]">
          <input className="min-h-12 rounded-lg border border-white/10 bg-slate-950/70 px-4 font-bold text-slate-50 outline-none placeholder:text-slate-500 focus:border-blue-400" onChange={(event) => setDateFilter(event.target.value)} type="date" value={dateFilter} />
          <input className="min-h-12 rounded-lg border border-white/10 bg-slate-950/70 px-4 font-bold text-slate-50 outline-none placeholder:text-slate-500 focus:border-blue-400" onChange={(event) => setCedisFilter(event.target.value)} placeholder="CEDIS" value={cedisFilter} />
          <input className="min-h-12 rounded-lg border border-white/10 bg-slate-950/70 px-4 font-bold text-slate-50 outline-none placeholder:text-slate-500 focus:border-blue-400" onChange={(event) => setTextFilter(event.target.value)} placeholder="Buscar semana, estado o texto" value={textFilter} />
          <Button tone="dark"><Filter className="mr-2 inline" size={18} />Filtrar</Button>
        </div>
      </section>

      {filteredInventories.length === 0 ? (
        <div className="mt-5">
          <EmptyState description="Cuando guardes inventarios apareceran aqui para consulta y auditoria." title="Sin inventarios guardados" />
        </div>
      ) : (
        <section className="mt-5 grid gap-4">
          {filteredInventories.map((inventory) => (
            <article className="rounded-xl border border-white/10 bg-slate-900/80 p-4 shadow-xl shadow-black/15 sm:p-5" key={inventory.id}>
              <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr_auto] xl:items-center">
                <div>
                  <div className="text-xl font-black text-slate-50">{formatDisplayDate(inventory.dateKey)}</div>
                  <div className="mt-1 text-sm font-bold text-slate-400">{inventory.semana || 'Sin semana'} - {inventory.cedis}</div>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                  <Metric label="Categorias" value={inventory.totalCategories} />
                  <Metric label="Productos" value={inventory.totalProducts} />
                  <Metric label="Contado" value={inventory.totalCounted} />
                  <Metric label="Dif." value={inventory.difference} tone={inventory.difference === 0 ? 'green' : inventory.difference > 0 ? 'amber' : 'red'} />
                  <div>
                    <div className="text-xs font-black uppercase text-slate-400">Estado</div>
                    <div className="mt-1 font-black">{inventory.status}</div>
                    <div className="break-all text-sm text-slate-400">{inventory.createdBy?.name}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => navigate(`/inventario/${inventory.id}`)} tone="light"><Eye className="mr-1 inline" size={16} />Ver detalle</Button>
                  <Button onClick={() => navigate(`/inventario/${inventory.id}/editar`)} tone="light"><Edit3 className="mr-1 inline" size={16} />Editar</Button>
                  <Button onClick={() => reopenInventory(inventory.id)} tone="light"><ArchiveRestore className="mr-1 inline" size={16} />Reabrir</Button>
                  <Button onClick={() => window.print()} tone="light">Exportar resumen</Button>
                </div>
              </div>
              <div className="mt-3 text-sm font-bold text-slate-400">Total contado: {formatNumber(inventory.totalCounted)} unidades</div>
            </article>
          ))}
        </section>
      )}
    </>
  )
}
