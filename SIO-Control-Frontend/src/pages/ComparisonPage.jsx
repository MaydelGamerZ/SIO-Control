import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BadgeCheck, CheckCircle2, Edit3, GitCompare, RotateCcw, ShieldCheck } from 'lucide-react'
import { Badge, Button, EmptyState, ErrorState, LoadingState, Metric, PageTitle } from '../components/ui'
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

  async function editTotal(userCountId, row, currentTotal) {
    const value = window.prompt('Nuevo total contado', String(currentTotal))
    if (value === null) return
    const numericValue = Number(value)
    if (!Number.isFinite(numericValue) || numericValue < 0) {
      setError('El total debe ser un numero valido mayor o igual a cero.')
      return
    }

    setSaving(true)
    try {
      await setUserProductTotal(inventory.id, userCountId, row.categoryId, row.productId, numericValue, user)
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

      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-xl border border-white/10 bg-slate-900/80 p-4">
          <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Usuario A</label>
          <select className="mt-2 min-h-12 w-full rounded-lg border border-white/10 bg-slate-950 px-3 font-bold text-slate-50" onChange={(event) => setCountAId(event.target.value)} value={countAId}>
            {inventory.userCounts.map((count) => <option key={count.id} value={count.id}>{count.userName}</option>)}
          </select>
        </article>
        <article className="rounded-xl border border-white/10 bg-slate-900/80 p-4">
          <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Usuario B</label>
          <select className="mt-2 min-h-12 w-full rounded-lg border border-white/10 bg-slate-950 px-3 font-bold text-slate-50" onChange={(event) => setCountBId(event.target.value)} value={countBId}>
            {inventory.userCounts.map((count) => <option key={count.id} value={count.id}>{count.userName}</option>)}
          </select>
        </article>
        <Metric label="Coinciden" value={matchingRows} tone="green" />
        <Metric label="Diferencias" value={differentRows + incompleteRows} tone={differentRows ? 'red' : 'amber'} />
      </section>

      {inventory.finalCount && (
        <section className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-400/10 p-4 text-emerald-100">
          <div className="flex items-center gap-2 font-black"><BadgeCheck size={20} />Conteo final validado generado</div>
          <p className="mt-1 text-sm font-bold text-emerald-200/80">Total final: {formatNumber(inventory.finalCount.totalCounted)} unidades.</p>
        </section>
      )}

      <section className="mt-5 grid gap-3">
        {comparisonRows.map((row) => {
          const stateTone = row.missingInfo ? 'amber' : row.difference === 0 || row.verified ? 'green' : 'red'
          const stateLabel = row.missingInfo ? 'Falta informacion' : row.difference === 0 ? 'Coincide' : row.verified ? 'Verificado' : 'No coincide'

          return (
            <article className="rounded-xl border border-white/10 bg-slate-900/80 p-4 shadow-xl shadow-black/15" key={row.productKey}>
              <div className="grid gap-4 xl:grid-cols-[minmax(280px,1fr)_repeat(5,120px)_auto] xl:items-center">
                <div className="min-w-0">
                  <Badge tone="blue">{row.categoryName}</Badge>
                  <h3 className="mt-2 break-words text-lg font-black text-slate-50">{row.product.name}</h3>
                </div>
                <Metric label="Stock" value={row.product.stock} />
                <Metric label={countA?.userName || 'Usuario A'} value={row.totalA} />
                <Metric label={countB?.userName || 'Usuario B'} value={row.totalB} />
                <Metric label="Dif. usuarios" value={row.difference} tone={stateTone} />
                <Badge tone={stateTone}>{stateLabel}</Badge>
                <div className="flex flex-wrap gap-2">
                  <button className="grid h-10 w-10 place-items-center rounded-lg bg-white/10 text-slate-100" onClick={() => editTotal(countA.id, row, row.totalA)} type="button" aria-label="Editar usuario A"><Edit3 size={17} /></button>
                  <button className="grid h-10 w-10 place-items-center rounded-lg bg-white/10 text-slate-100" onClick={() => editTotal(countB.id, row, row.totalB)} type="button" aria-label="Editar usuario B"><Edit3 size={17} /></button>
                  <button className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/15 text-emerald-100" onClick={() => verifyRow(row)} type="button" aria-label="Marcar verificado"><CheckCircle2 size={17} /></button>
                </div>
              </div>
            </article>
          )
        })}
      </section>
    </>
  )
}
