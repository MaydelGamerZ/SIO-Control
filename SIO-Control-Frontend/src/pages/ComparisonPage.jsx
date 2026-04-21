import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BadgeCheck, CheckCircle2, Edit3, GitCompare, Plus, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react'
import { Badge, Button, EmptyState, ErrorState, LoadingState, PageTitle } from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import {
  addUserCountEntry,
  deleteUserCountEntry,
  generateFinalCount,
  getInventory,
  getLatestInventory,
  getTodayInventory,
  setComparisonProductVerification,
  updateUserCountEntry,
} from '../services/inventoryService'
import { flattenProducts, formatDateKey, formatDisplayDate, formatNumber, formatTime } from '../utils/inventory'

const comparisonFilters = [
  { id: 'all', label: 'Ver todos' },
  { id: 'match', label: 'Coinciden' },
  { id: 'different', label: 'Diferentes' },
  { id: 'pending', label: 'Pendientes' },
  { id: 'validated', label: 'Validados' },
  { id: 'observations', label: 'Con observaciones' },
]

async function resolveComparisonInventory(id) {
  if (id) return getInventory(id)
  return (await getTodayInventory(formatDateKey())) || (await getLatestInventory())
}

function makeProductMap(userCount) {
  const map = new Map()
  for (const row of flattenProducts(userCount?.categories || [])) {
    map.set(`${row.categoryId}:${row.product.id}`, row.product)
  }
  return map
}

function hasObservations(product) {
  return (product?.countEntries || []).some((entry) => (entry.observation && entry.observation !== 'Buen estado') || entry.comment)
}

export default function ComparisonPage() {
  const [countAId, setCountAId] = useState('')
  const [countBId, setCountBId] = useState('')
  const [error, setError] = useState('')
  const [filterId, setFilterId] = useState('all')
  const [inventory, setInventory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  async function refresh() {
    setError('')
    const selectedInventory = await resolveComparisonInventory(id)
    setInventory(selectedInventory)
    const first = selectedInventory?.userCounts?.[0]?.id || ''
    const second = selectedInventory?.userCounts?.[1]?.id || ''
    setCountAId((current) => current || first)
    setCountBId((current) => current || second)
  }

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const selectedInventory = await resolveComparisonInventory(id)
        if (!active) return
        setInventory(selectedInventory)
        setCountAId(selectedInventory?.userCounts?.[0]?.id || '')
        setCountBId(selectedInventory?.userCounts?.[1]?.id || '')
      } catch (loadError) {
        if (active) setError(loadError.message)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [id])

  const countA = inventory?.userCounts?.find((count) => count.id === countAId)
  const countB = inventory?.userCounts?.find((count) => count.id === countBId)

  const comparisonRows = useMemo(() => {
    if (!inventory || !countA || !countB) return []
    const productsB = makeProductMap(countB)
    return flattenProducts(countA.categories).map((row) => {
      const productB = productsB.get(`${row.categoryId}:${row.product.id}`)
      const totalA = Number(row.product.totalCounted || 0)
      const totalB = Number(productB?.totalCounted || 0)
      const productKey = `${row.categoryId}:${row.product.id}`
      const verified = Boolean(inventory.verifiedProducts?.[productKey])
      const missingInfo = !row.product.countEntries.length || !productB?.countEntries?.length
      const observed = hasObservations(row.product) || hasObservations(productB)

      return {
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        difference: totalA - totalB,
        missingInfo,
        observed,
        product: row.product,
        productB,
        productId: row.product.id,
        productKey,
        totalA,
        totalB,
        verified,
      }
    })
  }, [countA, countB, inventory])

  const matchingRows = comparisonRows.filter((row) => row.difference === 0 && !row.missingInfo).length
  const differentRows = comparisonRows.filter((row) => row.difference !== 0).length
  const pendingRows = comparisonRows.filter((row) => row.missingInfo).length

  const filteredRows = useMemo(() => {
    return comparisonRows.filter((row) => {
      if (filterId === 'match') return row.difference === 0 && !row.missingInfo
      if (filterId === 'different') return row.difference !== 0
      if (filterId === 'pending') return row.missingInfo
      if (filterId === 'validated') return row.verified
      if (filterId === 'observations') return row.observed
      return true
    })
  }, [comparisonRows, filterId])

  async function addEntry(userCountId, row, label) {
    const quantity = window.prompt(`Cantidad para ${label}`, '0')
    if (quantity === null) return
    const observation = window.prompt('Condicion / observacion', 'Buen estado') || 'Buen estado'
    const comment = window.prompt('Comentario', '') || ''

    setSaving(true)
    try {
      await addUserCountEntry(inventory.id, userCountId, row.categoryId, row.productId, { quantity, observation, comment }, user)
      await refresh()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  async function editEntry(userCountId, row, entry) {
    const quantity = window.prompt('Nueva cantidad', String(entry.quantity ?? 0))
    if (quantity === null) return
    const observation = window.prompt('Condicion / observacion', entry.observation || entry.condition || 'Buen estado') || entry.observation || 'Buen estado'
    const comment = window.prompt('Comentario', entry.comment || '') || ''

    setSaving(true)
    try {
      await updateUserCountEntry(inventory.id, userCountId, row.categoryId, row.productId, entry.id, { quantity, observation, condition: observation, comment }, user)
      await refresh()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteEntry(userCountId, row, entryId) {
    if (!window.confirm('Eliminar este registro del historial?')) return
    setSaving(true)
    try {
      await deleteUserCountEntry(inventory.id, userCountId, row.categoryId, row.productId, entryId, user)
      await refresh()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleValidation(row, verified) {
    setSaving(true)
    try {
      await setComparisonProductVerification(inventory.id, row.productKey, verified, user)
      await refresh()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  async function createFinalCount() {
    setSaving(true)
    try {
      await generateFinalCount(inventory.id, user, countAId, countBId)
      await refresh()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState label="Cargando comparacion" />
  if (!inventory) return <EmptyState title="Sin inventario" description="No hay inventario disponible para comparar." />

  if ((inventory.userCounts || []).length < 2) {
    return (
      <>
        <PageTitle eyebrow="Validacion" title="Comparar conteos">
          Se necesitan dos usuarios con conteo independiente para comparar resultados.
        </PageTitle>
        <EmptyState
          action={<Button onClick={() => navigate(`/inventario/${inventory.id}/editar`)} tone="blue">Ir al conteo</Button>}
          description={`Actualmente hay ${inventory.userCounts?.length || 0} conteo registrado. Cuando otro usuario guarde su conteo, podras compararlos aqui.`}
          icon={GitCompare}
          title="Comparacion pendiente"
        />
      </>
    )
  }

  return (
    <>
      <PageTitle
        action={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate(`/inventario/${inventory.id}/editar`)} tone="light"><RotateCcw size={18} />Volver a conteo</Button>
            <Button disabled={saving || countAId === countBId} onClick={createFinalCount} tone="blue"><ShieldCheck size={18} />Generar conteo final</Button>
          </div>
        }
        eyebrow="Comparacion multiusuario"
        title={`Validacion ${formatDisplayDate(inventory.dateKey)}`}
      >
        {inventory.semana || 'Sin semana'} - {inventory.cedis} - revision por producto con historial completo.
      </PageTitle>
      <ErrorState message={error} />

      <section className="sticky top-[calc(5rem_+_env(safe-area-inset-top))] z-20 grid gap-4 rounded-xl border border-white/10 bg-slate-900/95 p-4 shadow-xl shadow-black/20 backdrop-blur lg:grid-cols-[minmax(240px,1fr)_310px_minmax(240px,1fr)] lg:items-center">
        <UserSelector label="Usuario A" tone="blue" count={countA} onChange={setCountAId} value={countAId} userCounts={inventory.userCounts} />
        <div className="grid grid-cols-3 gap-2">
          <SummaryBox label="Coinciden" value={matchingRows} tone="green" />
          <SummaryBox label="Diferencias" value={differentRows} tone="red" />
          <SummaryBox label="Pendientes" value={pendingRows} tone="amber" />
        </div>
        <UserSelector label="Usuario B" tone="amber" count={countB} onChange={setCountBId} value={countBId} userCounts={inventory.userCounts} />
      </section>

      <section className="sticky top-[calc(15.5rem_+_env(safe-area-inset-top))] z-10 mt-4 rounded-xl border border-white/10 bg-slate-900/90 p-3 shadow-lg shadow-black/15 backdrop-blur">
        <div className="touch-scroll flex gap-2 overflow-x-auto pb-1">
          {comparisonFilters.map((filter) => (
            <button
              className={`min-h-10 flex-none rounded-full border px-4 text-sm font-black transition ${
                filterId === filter.id ? 'border-blue-300/40 bg-blue-500/20 text-blue-100' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
              key={filter.id}
              onClick={() => setFilterId(filter.id)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>
      </section>

      {inventory.finalCount && (
        <section className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-400/10 p-4 text-emerald-100">
          <div className="flex items-center gap-2 font-black"><BadgeCheck size={20} />Conteo final validado generado</div>
          <p className="mt-1 text-sm font-bold text-emerald-200/80">Total final: {formatNumber(inventory.finalCount.totalCounted)} unidades.</p>
        </section>
      )}

      <section className="mt-5 grid gap-4">
        {filteredRows.map((row) => (
          <ComparisonProductCard
            countA={countA}
            countB={countB}
            disabled={saving}
            key={row.productKey}
            onAddEntry={addEntry}
            onDeleteEntry={deleteEntry}
            onEditEntry={editEntry}
            onToggleValidation={toggleValidation}
            row={row}
          />
        ))}
      </section>
    </>
  )
}

function UserSelector({ count, label, onChange, tone, userCounts, value }) {
  const toneClass = tone === 'blue' ? 'border-blue-300/20 bg-blue-500/10 text-blue-200' : 'border-amber-300/20 bg-amber-400/10 text-amber-200'
  return (
    <article className={`rounded-xl border p-4 ${toneClass}`}>
      <label className="text-xs font-black uppercase tracking-[0.18em]">{label}</label>
      <select className="mt-3 min-h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 font-bold text-slate-50 outline-none focus:border-blue-400" onChange={(event) => onChange(event.target.value)} value={value}>
        {userCounts.map((userCount) => <option key={userCount.id} value={userCount.id}>{userCount.userName}</option>)}
      </select>
      <div className="mt-3 text-sm font-bold text-slate-300">{formatNumber(count?.totalCounted || 0)} unidades capturadas</div>
    </article>
  )
}

function SummaryBox({ label, tone, value }) {
  const tones = {
    amber: 'border-amber-300/15 bg-amber-400/10 text-amber-100',
    green: 'border-emerald-300/15 bg-emerald-400/10 text-emerald-100',
    red: 'border-rose-300/15 bg-rose-500/10 text-rose-100',
  }
  return (
    <div className={`rounded-xl border p-3 text-center ${tones[tone]}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.12em]">{label}</div>
      <div className="mt-1 font-mono text-2xl font-black tabular-nums">{formatNumber(value)}</div>
    </div>
  )
}

function ComparisonProductCard({ countA, countB, disabled, onAddEntry, onDeleteEntry, onEditEntry, onToggleValidation, row }) {
  const stateTone = row.missingInfo ? 'amber' : row.difference === 0 || row.verified ? 'green' : 'red'
  const stateLabel = row.missingInfo ? 'Falta informacion' : row.difference === 0 ? 'Coincide' : row.verified ? 'Validado' : 'Diferente'

  return (
    <article className="rounded-xl border border-white/10 bg-slate-900/85 p-4 shadow-xl shadow-black/15 sm:p-5">
      <header className="mb-4 grid gap-4 border-b border-white/10 pb-4 xl:grid-cols-[minmax(0,1fr)_460px] xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="blue">{row.categoryName}</Badge>
            <Badge tone={stateTone}>{stateLabel}</Badge>
            {row.observed && <Badge tone="amber">Observaciones</Badge>}
          </div>
          <h3 className="mt-3 break-words text-xl font-black leading-tight text-slate-50 sm:text-2xl">{row.product.name}</h3>
          <div className="mt-2 flex flex-wrap gap-3 text-sm font-bold text-slate-400">
            <span>Stock: <strong className="font-mono text-slate-100 tabular-nums">{formatNumber(row.product.stock)}</strong></span>
            <span>No disponible: <strong className="font-mono text-slate-100 tabular-nums">{formatNumber(row.product.noDisponible)}</strong></span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <MiniMetric label="Usuario A" value={row.totalA} />
          <MiniMetric label="Usuario B" value={row.totalB} />
          <MiniMetric label="Diferencia" value={row.difference} tone={stateTone} />
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-2">
        <HistoryPanel
          count={countA}
          disabled={disabled}
          label="Historial Usuario A"
          onAdd={() => onAddEntry(countA.id, row, 'Usuario A')}
          onDelete={(entryId) => onDeleteEntry(countA.id, row, entryId)}
          onEdit={(entry) => onEditEntry(countA.id, row, entry)}
          product={row.product}
        />
        <HistoryPanel
          count={countB}
          disabled={disabled}
          label="Historial Usuario B"
          onAdd={() => onAddEntry(countB.id, row, 'Usuario B')}
          onDelete={(entryId) => onDeleteEntry(countB.id, row, entryId)}
          onEdit={(entry) => onEditEntry(countB.id, row, entry)}
          product={row.productB}
        />
      </div>

      <footer className="mt-4 flex flex-wrap justify-end gap-2 border-t border-white/10 pt-4">
        <Button disabled={disabled} onClick={() => onToggleValidation(row, false)} tone="light">Dejar pendiente</Button>
        <Button disabled={disabled} onClick={() => onToggleValidation(row, true)} tone="blue"><CheckCircle2 size={17} />Marcar validado</Button>
      </footer>
    </article>
  )
}

function MiniMetric({ label, tone = 'slate', value }) {
  const tones = {
    amber: 'text-amber-100',
    green: 'text-emerald-100',
    red: 'text-rose-100',
    slate: 'text-slate-50',
  }
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/45 p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className={`mt-1 font-mono text-xl font-black tabular-nums ${tones[tone]}`}>{formatNumber(value)}</div>
    </div>
  )
}

function HistoryPanel({ count, disabled, label, onAdd, onDelete, onEdit, product }) {
  const entries = product?.countEntries || []
  return (
    <section className="rounded-xl border border-white/10 bg-slate-950/45 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="font-black text-slate-50">{label}</h4>
          <p className="mt-1 text-sm font-bold text-slate-500">{count?.userName} - {entries.length} movimientos</p>
        </div>
        <Button disabled={disabled} onClick={onAdd} tone="light"><Plus size={17} />Agregar</Button>
      </div>

      <div className="grid gap-2">
        {entries.length === 0 && <div className="rounded-lg bg-white/5 p-4 text-sm font-bold text-slate-400">Sin registros capturados.</div>}
        {entries.map((entry) => (
          <div className="grid gap-3 rounded-lg bg-slate-900 p-3 ring-1 ring-white/10 md:grid-cols-[86px_minmax(0,1fr)_86px_88px] md:items-center" key={entry.id}>
            <strong className="font-mono text-lg text-slate-50 tabular-nums">+{formatNumber(entry.quantity)}</strong>
            <div className="min-w-0">
              <div className="break-words font-bold text-slate-200">{entry.observation || entry.condition || 'Buen estado'}</div>
              <div className="break-words text-sm text-slate-500">{entry.comment || 'Sin observacion'}{entry.updatedBy?.name ? ` - Editado por ${entry.updatedBy.name}` : ''}</div>
            </div>
            <span className="text-sm font-black text-slate-400">{formatTime(entry.updatedAt || entry.createdAt)}</span>
            <span className="flex gap-2">
              <button className="grid h-10 w-10 place-items-center rounded-lg bg-white/10 text-slate-100 hover:bg-white/15 disabled:opacity-50" disabled={disabled} onClick={() => onEdit(entry)} type="button" aria-label="Editar registro"><Edit3 size={17} /></button>
              <button className="grid h-10 w-10 place-items-center rounded-lg bg-rose-500/10 text-rose-100 hover:bg-rose-500/20 disabled:opacity-50" disabled={disabled} onClick={() => onDelete(entry.id)} type="button" aria-label="Eliminar registro"><Trash2 size={17} /></button>
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
