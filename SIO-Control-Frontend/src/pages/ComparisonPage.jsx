import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BadgeCheck, CheckCircle2, Edit3, GitCompare, RotateCcw, ShieldCheck } from 'lucide-react'
import { Badge, Button, EmptyState, ErrorState, LoadingState, PageTitle } from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import { generateFinalCount, getInventory, getLatestInventory, getTodayInventory, setUserProductTotal, verifyComparisonProduct } from '../services/inventoryService'
import { flattenProducts, formatDateKey, formatDisplayDate, formatNumber } from '../utils/inventory'

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

export default function ComparisonPage() {
  const [countAId, setCountAId] = useState('')
  const [countBId, setCountBId] = useState('')
  const [error, setError] = useState('')
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
      return {
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        product: row.product,
        productB,
        productId: row.product.id,
        productKey,
        totalA,
        totalB,
        difference: totalA - totalB,
        missingInfo,
        verified,
      }
    })
  }, [countA, countB, inventory])

  const matchingRows = comparisonRows.filter((row) => row.difference === 0 && !row.missingInfo).length
  const differentRows = comparisonRows.filter((row) => row.difference !== 0).length
  const incompleteRows = comparisonRows.filter((row) => row.missingInfo).length

  async function editTotal(userCountId, row, currentTotal, currentObservation = 'Ajuste comparacion') {
    const value = window.prompt('Nuevo total contado', String(currentTotal))
    if (value === null) return
    const observation = window.prompt('Observacion', currentObservation || 'Ajuste comparacion') || currentObservation || 'Ajuste comparacion'
    const comment = window.prompt('Comentario', '') || ''
    const numericValue = Number(value)
    if (!Number.isFinite(numericValue) || numericValue < 0) {
      setError('El total debe ser un numero valido mayor o igual a cero.')
      return
    }

    setSaving(true)
    try {
      await setUserProductTotal(inventory.id, userCountId, row.categoryId, row.productId, numericValue, user, observation, comment)
      await refresh()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  async function verifyRow(row) {
    setSaving(true)
    try {
      await verifyComparisonProduct(inventory.id, row.productKey, user)
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
        {inventory.semana || 'Sin semana'} - {inventory.cedis} - compara dos conteos independientes antes de cerrar el inventario.
      </PageTitle>
      <ErrorState message={error} />

      <section className="grid gap-4 rounded-xl border border-white/10 bg-slate-900/80 p-4 shadow-xl shadow-black/15 lg:grid-cols-[minmax(240px,1fr)_280px_minmax(240px,1fr)] lg:items-center">
        <article className="rounded-xl border border-blue-300/20 bg-blue-500/10 p-4">
          <label className="text-xs font-black uppercase tracking-[0.18em] text-blue-200">Usuario A</label>
          <select className="mt-3 min-h-12 w-full rounded-lg border border-white/10 bg-slate-950 px-3 font-bold text-slate-50 outline-none focus:border-blue-400" onChange={(event) => setCountAId(event.target.value)} value={countAId}>
            {inventory.userCounts.map((count) => <option key={count.id} value={count.id}>{count.userName}</option>)}
          </select>
          <div className="mt-3 text-sm font-bold text-slate-300">{countA?.totalCounted || 0} unidades capturadas</div>
        </article>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-emerald-300/15 bg-emerald-400/10 p-4 text-center">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-emerald-200">Coinciden</div>
            <div className="mt-2 font-mono text-3xl font-black tabular-nums text-emerald-100">{matchingRows}</div>
          </div>
          <div className="rounded-xl border border-rose-300/15 bg-rose-500/10 p-4 text-center">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-rose-200">Diferencias</div>
            <div className="mt-2 font-mono text-3xl font-black tabular-nums text-rose-100">{differentRows + incompleteRows}</div>
          </div>
        </div>
        <article className="rounded-xl border border-amber-300/20 bg-amber-400/10 p-4">
          <label className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">Usuario B</label>
          <select className="mt-3 min-h-12 w-full rounded-lg border border-white/10 bg-slate-950 px-3 font-bold text-slate-50 outline-none focus:border-blue-400" onChange={(event) => setCountBId(event.target.value)} value={countBId}>
            {inventory.userCounts.map((count) => <option key={count.id} value={count.id}>{count.userName}</option>)}
          </select>
          <div className="mt-3 text-sm font-bold text-slate-300">{countB?.totalCounted || 0} unidades capturadas</div>
        </article>
      </section>

      {inventory.finalCount && (
        <section className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-400/10 p-4 text-emerald-100">
          <div className="flex items-center gap-2 font-black"><BadgeCheck size={20} />Conteo final validado generado</div>
          <p className="mt-1 text-sm font-bold text-emerald-200/80">Total final: {formatNumber(inventory.finalCount.totalCounted)} unidades.</p>
        </section>
      )}

      <section className="mt-5 grid gap-4">
        {comparisonRows.map((row) => {
          const stateTone = row.missingInfo ? 'amber' : row.difference === 0 || row.verified ? 'green' : 'red'
          const stateLabel = row.missingInfo ? 'Falta informacion' : row.difference === 0 ? 'Coincide' : row.verified ? 'Verificado' : 'No coincide'
          const observationA = row.product.countEntries?.[0]?.observation || 'Sin observacion'
          const observationB = row.productB?.countEntries?.[0]?.observation || 'Sin observacion'

          return (
            <article className="rounded-xl border border-white/10 bg-slate-900/85 p-4 shadow-xl shadow-black/15 sm:p-5" key={row.productKey}>
              <header className="mb-4 flex flex-col gap-3 border-b border-white/10 pb-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="blue">{row.categoryName}</Badge>
                    <Badge tone={stateTone}>{stateLabel}</Badge>
                  </div>
                  <h3 className="mt-3 break-words text-xl font-black leading-tight text-slate-50 sm:text-2xl">{row.product.name}</h3>
                  <div className="mt-2 text-sm font-bold text-slate-400">Stock sistema: <span className="font-mono text-slate-100 tabular-nums">{formatNumber(row.product.stock)}</span></div>
                </div>
                <Button className="w-full md:w-auto" onClick={() => verifyRow(row)} tone={row.verified ? 'blue' : 'light'}>
                  <CheckCircle2 size={17} />Validar
                </Button>
              </header>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px]">
                <ComparisonCountPanel
                  label="Usuario A"
                  observation={observationA}
                  onEdit={() => editTotal(countA.id, row, row.totalA, observationA)}
                  total={row.totalA}
                  userName={countA?.userName || 'Usuario A'}
                />
                <ComparisonCountPanel
                  label="Usuario B"
                  observation={observationB}
                  onEdit={() => editTotal(countB.id, row, row.totalB, observationB)}
                  total={row.totalB}
                  userName={countB?.userName || 'Usuario B'}
                />
                <div className={`rounded-xl border p-4 ${
                  stateTone === 'green' ? 'border-emerald-300/20 bg-emerald-400/10' : stateTone === 'amber' ? 'border-amber-300/20 bg-amber-400/10' : 'border-rose-300/20 bg-rose-500/10'
                }`}>
                  <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Diferencia</div>
                  <div className={`mt-3 font-mono text-3xl font-black tabular-nums ${
                    stateTone === 'green' ? 'text-emerald-100' : stateTone === 'amber' ? 'text-amber-100' : 'text-rose-100'
                  }`}>
                    {formatNumber(row.difference)}
                  </div>
                  <div className="mt-2 text-sm font-black text-slate-300">{stateLabel}</div>
                </div>
              </div>
            </article>
          )
        })}
      </section>
    </>
  )
}

function ComparisonCountPanel({ label, observation, onEdit, total, userName }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/45 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</div>
          <div className="mt-1 truncate font-black text-slate-100">{userName}</div>
        </div>
        <button className="grid h-10 w-10 flex-none place-items-center rounded-lg bg-white/10 text-slate-100 hover:bg-white/15" onClick={onEdit} type="button" aria-label={`Editar ${label}`}>
          <Edit3 size={17} />
        </button>
      </div>
      <div className="mt-4 font-mono text-3xl font-black tabular-nums text-slate-50">{formatNumber(total)}</div>
      <div className="mt-2 rounded-lg bg-white/5 p-3 text-sm font-bold text-slate-300">{observation}</div>
    </div>
  )
}
