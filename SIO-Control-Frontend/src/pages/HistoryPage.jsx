import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArchiveRestore, Edit3, Eye, Filter, GitCompare } from 'lucide-react'
import { Badge, Button, EmptyState, ErrorState, LoadingState, PageTitle } from '../components/ui'
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
            <article className="rounded-xl border border-white/10 bg-slate-900/85 p-4 shadow-xl shadow-black/15 sm:p-5" key={inventory.id}>
              <header className="grid gap-4 border-b border-white/10 pb-4 lg:grid-cols-[minmax(260px,1fr)_minmax(320px,1.4fr)] lg:items-start">
                <div className="min-w-0">
                  <div className="break-words text-2xl font-black text-slate-50">{formatDisplayDate(inventory.dateKey)}</div>
                  <div className="mt-1 text-sm font-bold uppercase tracking-[0.12em] text-slate-500">{inventory.cedis}</div>
                  <div className="mt-1 text-sm font-bold text-slate-400">{inventory.semana || 'Sin semana'}</div>
                </div>
                <div className="min-w-0">
                  <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Usuarios participantes</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(inventory.participants || []).length === 0 ? (
                      <Badge tone="amber">Sin conteos individuales</Badge>
                    ) : (
                      inventory.participants.map((participant, index) => (
                        <Badge key={`${participant.userId}-${index}`} tone={participant.status === inventoryStatuses.saved ? 'green' : 'blue'}>
                          Conteo {index + 1}: {participant.userName}
                        </Badge>
                      ))
                    )}
                    {inventory.finalCount && <Badge tone="green">Conteo final validado</Badge>}
                  </div>
                </div>
              </header>

              <div className="grid gap-3 py-4 sm:grid-cols-2 lg:grid-cols-5">
                <HistoryKpi label="Categorias" value={inventory.totalCategories} />
                <HistoryKpi label="Productos" value={inventory.totalProducts} />
                <HistoryKpi label="Total contado" value={inventory.finalCount?.totalCounted ?? inventory.totalCounted} />
                <HistoryKpi label="Diferencia" value={inventory.finalCount?.difference ?? inventory.difference} tone={(inventory.finalCount?.difference ?? inventory.difference) === 0 ? 'green' : (inventory.finalCount?.difference ?? inventory.difference) > 0 ? 'amber' : 'red'} />
                <HistoryKpi label="Estado" value={inventory.status} text />
              </div>

              <div className="grid gap-2 border-t border-white/10 pt-4 sm:grid-cols-2 xl:grid-cols-5">
                <Button className="w-full" onClick={() => navigate(`/inventario/${inventory.id}`)} tone="light"><Eye size={16} />Ver detalle</Button>
                <Button className="w-full" onClick={() => navigate(`/inventario/${inventory.id}/editar`)} tone="light"><Edit3 size={16} />Editar</Button>
                <Button className="w-full" onClick={() => navigate(`/inventario/${inventory.id}/comparar`)} tone="light"><GitCompare size={16} />Comparar</Button>
                <Button className="w-full" onClick={() => reopenInventory(inventory.id)} tone="light"><ArchiveRestore size={16} />Reabrir</Button>
                <Button className="w-full" onClick={() => window.print()} tone="light">Exportar</Button>
              </div>
            </article>
          ))}
        </section>
      )}
    </>
  )
}

function HistoryKpi({ label, text = false, tone = 'slate', value }) {
  const tones = {
    amber: 'text-amber-200',
    green: 'text-emerald-200',
    red: 'text-rose-200',
    slate: 'text-slate-50',
  }

  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-slate-950/45 p-4">
      <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className={`mt-2 truncate text-xl font-black ${text ? 'text-base uppercase tracking-wide' : 'font-mono tabular-nums'} ${tones[tone]}`}>
        {text ? value : formatNumber(value)}
      </div>
    </div>
  )
}
