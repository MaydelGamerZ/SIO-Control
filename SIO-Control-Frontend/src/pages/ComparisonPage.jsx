import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BadgeCheck, CheckCircle2, Edit3, GitCompare, Plus, RotateCcw, Search, ShieldCheck, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { Badge, Button, EmptyState, ErrorState, LoadingState, PageTitle, RealtimeIndicator } from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import {
  addUserCountEntry,
  deleteUserCountEntry,
  generateFinalCount,
  setComparisonProductVerification,
  subscribeCurrentInventory,
  updateUserCountEntry,
} from '../services/inventoryService'
import { flattenProducts, formatDisplayDate, formatNumber, formatTime, observationOptions } from '../utils/inventory'

const comparisonFilters = [
  { id: 'all', label: 'Ver todos' },
  { id: 'match', label: 'Coinciden' },
  { id: 'different', label: 'Diferentes' },
  { id: 'pending', label: 'Pendientes' },
  { id: 'validated', label: 'Validados' },
  { id: 'observations', label: 'Con observaciones' },
]

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
  const [categoryFilterId, setCategoryFilterId] = useState('all')
  const [countAId, setCountAId] = useState('')
  const [countBId, setCountBId] = useState('')
  const [error, setError] = useState('')
  const [filterId, setFilterId] = useState('all')
  const [inventory, setInventory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [searchActive, setSearchActive] = useState(false)
  const [syncStatus, setSyncStatus] = useState('connecting')
  const [toolsOpen, setToolsOpen] = useState(false)
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = subscribeCurrentInventory(
      id,
      (selectedInventory) => {
        setInventory(selectedInventory)
        setCountAId((current) => {
          if (selectedInventory?.userCounts?.some((count) => count.id === current)) return current
          return selectedInventory?.userCounts?.[0]?.id || ''
        })
        setCountBId((current) => {
          if (selectedInventory?.userCounts?.some((count) => count.id === current)) return current
          return selectedInventory?.userCounts?.[1]?.id || ''
        })
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

  useEffect(() => {
    function handleWindowScroll() {
      setSearchActive(false)
    }

    window.addEventListener('scroll', handleWindowScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleWindowScroll)
  }, [])

  useEffect(() => {
    if (!toolsOpen) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [toolsOpen])

  const countA = inventory?.userCounts?.find((count) => count.id === countAId)
  const countB = inventory?.userCounts?.find((count) => count.id === countBId)
  const comparisonCategories = useMemo(() => countA?.categories || inventory?.categories || [], [countA, inventory])

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
  const normalizedSearch = search.trim().toLowerCase()

  const filteredRows = useMemo(() => {
    return comparisonRows.filter((row) => {
      const matchesSearch = !normalizedSearch || `${row.product.name} ${row.categoryName}`.toLowerCase().includes(normalizedSearch)
      if (!matchesSearch) return false
      if (categoryFilterId !== 'all' && row.categoryId !== categoryFilterId) return false
      if (filterId === 'match') return row.difference === 0 && !row.missingInfo
      if (filterId === 'different') return row.difference !== 0
      if (filterId === 'pending') return row.missingInfo
      if (filterId === 'validated') return row.verified
      if (filterId === 'observations') return row.observed
      return true
    })
  }, [categoryFilterId, comparisonRows, filterId, normalizedSearch])

  function clearComparisonTools() {
    setCategoryFilterId('all')
    setFilterId('all')
    setSearch('')
  }

  async function addEntry(userCountId, row, values) {
    setSaving(true)
    try {
      await addUserCountEntry(inventory.id, userCountId, row.categoryId, row.productId, values, user)
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  async function editEntry(userCountId, row, entry, values) {
    setSaving(true)
    try {
      await updateUserCountEntry(inventory.id, userCountId, row.categoryId, row.productId, entry.id, values, user)
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteEntry(userCountId, row, entryId) {
    setSaving(true)
    try {
      await deleteUserCountEntry(inventory.id, userCountId, row.categoryId, row.productId, entryId, user)
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
      <section className="mb-4 rounded-xl border border-white/10 bg-slate-900/85 p-4 shadow-xl shadow-black/15 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Comparacion multiusuario</p>
              <Badge tone="blue">{inventory.status}</Badge>
              <Badge tone="green">{inventory.cedis}</Badge>
              <RealtimeIndicator status={syncStatus} />
            </div>
            <h2 className="mt-2 break-words text-2xl font-black tracking-tight text-slate-50 sm:text-3xl">
              Validacion {formatDisplayDate(inventory.dateKey)}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2 text-sm font-bold text-slate-300">
              <span className="rounded-md bg-white/10 px-3 py-1 ring-1 ring-white/10">{inventory.semana || 'Sin semana'}</span>
              <span className="rounded-md bg-emerald-400/10 px-3 py-1 text-emerald-100 ring-1 ring-emerald-300/20">Coinciden {matchingRows}</span>
              <span className="rounded-md bg-rose-500/10 px-3 py-1 text-rose-100 ring-1 ring-rose-300/20">Diferencias {differentRows}</span>
              <span className="rounded-md bg-amber-400/10 px-3 py-1 text-amber-100 ring-1 ring-amber-300/20">Pendientes {pendingRows}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button onClick={() => navigate(`/inventario/${inventory.id}/editar`)} tone="light"><RotateCcw size={18} />Volver a conteo</Button>
            <Button disabled={saving || countAId === countBId} onClick={createFinalCount} tone="blue"><ShieldCheck size={18} />Generar conteo final</Button>
          </div>
        </div>
      </section>
      <ErrorState message={error} />

      <ComparisonSearchToolbar
        active={searchActive}
        countA={countA}
        countB={countB}
        differentRows={differentRows}
        matchingRows={matchingRows}
        onBlur={() => setSearchActive(false)}
        onClear={() => setSearch('')}
        onFocus={() => setSearchActive(true)}
        onOpenTools={() => setToolsOpen(true)}
        pendingRows={pendingRows}
        search={search}
        setSearch={setSearch}
      />

      <ComparisonToolsPanel
        categories={comparisonCategories}
        categoryFilterId={categoryFilterId}
        countA={countA}
        countAId={countAId}
        countB={countB}
        countBId={countBId}
        disabled={saving || countAId === countBId}
        filterId={filterId}
        inventory={inventory}
        onClear={clearComparisonTools}
        onClose={() => setToolsOpen(false)}
        onCreateFinal={createFinalCount}
        onCategoryChange={setCategoryFilterId}
        onFilterChange={setFilterId}
        onReturn={() => navigate(`/inventario/${inventory.id}/editar`)}
        onSelectA={setCountAId}
        onSelectB={setCountBId}
        open={toolsOpen}
        search={search}
        setSearch={setSearch}
      />

      {inventory.finalCount && (
        <section className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-400/10 p-4 text-emerald-100">
          <div className="flex items-center gap-2 font-black"><BadgeCheck size={20} />Conteo final validado generado</div>
          <p className="mt-1 text-sm font-bold text-emerald-200/80">Total final: {formatNumber(inventory.finalCount.totalCounted)} unidades.</p>
        </section>
      )}

      <section className="mt-5 grid gap-4">
        {filteredRows.length === 0 ? (
          <EmptyState description="Ajusta la busqueda o los filtros desde herramientas para volver a ver productos." title="Sin productos visibles" />
        ) : (
          filteredRows.map((row) => (
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
          ))
        )}
      </section>
    </>
  )
}

function ComparisonSearchToolbar({
  active,
  countA,
  countB,
  differentRows,
  matchingRows,
  onBlur,
  onClear,
  onFocus,
  onOpenTools,
  pendingRows,
  search,
  setSearch,
}) {
  return (
    <section className="safe-x sticky top-[calc(5rem_+_env(safe-area-inset-top))] z-20 -mx-3 mb-4 border-y border-white/10 bg-slate-950/95 px-3 py-2 shadow-lg shadow-black/20 backdrop-blur md:mx-0 md:rounded-xl md:border md:px-4">
      <div className={`grid gap-2 transition-all duration-200 lg:grid-cols-[minmax(280px,1fr)_330px] lg:items-center ${active ? 'py-1' : ''}`}>
        <div className="flex min-w-0 items-center gap-2">
          <ComparisonSearchInput active={active} onBlur={onBlur} onClear={onClear} onFocus={onFocus} search={search} setSearch={setSearch} />
          <button
            aria-label="Abrir herramientas de comparacion"
            className="grid h-11 w-11 flex-none place-items-center rounded-xl border border-white/10 bg-blue-600 text-white shadow-lg shadow-blue-950/25 transition hover:bg-blue-500 md:h-12 md:w-12"
            onClick={onOpenTools}
            type="button"
          >
            <SlidersHorizontal size={20} />
          </button>
        </div>
        <div className="hidden grid-cols-3 gap-2 lg:grid">
          <SummaryBox label="Coinciden" value={matchingRows} tone="green" />
          <SummaryBox label="Dif." value={differentRows} tone="red" />
          <SummaryBox label="Pend." value={pendingRows} tone="amber" />
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 px-1 text-xs font-bold text-slate-400">
        <span className="rounded-md bg-blue-500/10 px-2.5 py-1 text-blue-100 ring-1 ring-blue-300/20">A: {countA?.userName || 'Sin usuario'}</span>
        <span className="rounded-md bg-amber-400/10 px-2.5 py-1 text-amber-100 ring-1 ring-amber-300/20">B: {countB?.userName || 'Sin usuario'}</span>
        {active && <span className="rounded-md bg-white/5 px-2.5 py-1 ring-1 ring-white/10">{search ? 'Busqueda activa' : 'Escribe para filtrar'}</span>}
      </div>
    </section>
  )
}

function ComparisonSearchInput({ active, onBlur, onClear, onFocus, search, setSearch }) {
  return (
    <label className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
      <input
        className={`w-full rounded-lg border border-white/10 bg-slate-950/70 pl-11 font-bold text-slate-50 outline-none transition-all duration-200 placeholder:text-slate-500 focus:border-blue-400 focus:bg-slate-950 ${
          active ? 'min-h-[52px] text-base shadow-lg shadow-blue-950/15 ring-2 ring-blue-500/15' : 'min-h-11 text-base md:min-h-12'
        } ${search ? 'pr-11' : 'pr-3'}`}
        inputMode="search"
        onBlur={onBlur}
        onChange={(event) => setSearch(event.target.value)}
        onFocus={onFocus}
        placeholder="Buscar producto o categoria"
        type="search"
        value={search}
      />
      {search && (
        <button
          aria-label="Limpiar busqueda"
          className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg bg-white/10 text-slate-200"
          onClick={onClear}
          type="button"
        >
          <X size={16} />
        </button>
      )}
    </label>
  )
}

function ComparisonToolsPanel({
  categories,
  categoryFilterId,
  countA,
  countAId,
  countB,
  countBId,
  disabled,
  filterId,
  inventory,
  onClear,
  onCategoryChange,
  onClose,
  onCreateFinal,
  onFilterChange,
  onReturn,
  onSelectA,
  onSelectB,
  open,
  search,
  setSearch,
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <button aria-label="Cerrar herramientas" className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm" onClick={onClose} type="button" />
      <section className="safe-top safe-bottom absolute inset-y-0 right-0 flex w-[min(92vw,430px)] max-w-full flex-col border-l border-white/10 bg-[#070c15] shadow-2xl shadow-black md:w-[430px]">
        <div className="safe-x border-b border-white/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Herramientas</p>
              <h3 className="mt-1 truncate text-2xl font-black text-slate-50">Comparacion</h3>
            </div>
            <button aria-label="Cerrar" className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-white/10 text-slate-100" onClick={onClose} type="button">
              <X size={20} />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <SummaryBox label="A" value={countA?.totalCounted || 0} tone="green" />
            <SummaryBox label="B" value={countB?.totalCounted || 0} tone="amber" />
            <SummaryBox label="Prod." value={inventory.totalProducts || 0} tone="green" />
          </div>
        </div>

        <div className="safe-x touch-scroll flex-1 space-y-5 overflow-y-auto p-4">
          <section>
            <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Conteos a comparar</div>
            <div className="grid gap-3">
              <UserSelector label="Usuario A" tone="blue" count={countA} onChange={onSelectA} value={countAId} userCounts={inventory.userCounts} />
              <UserSelector label="Usuario B" tone="amber" count={countB} onChange={onSelectB} value={countBId} userCounts={inventory.userCounts} />
            </div>
          </section>

          <section>
            <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Buscar</div>
            <ComparisonSearchInput active={Boolean(search)} onBlur={() => {}} onClear={() => setSearch('')} onFocus={() => {}} search={search} setSearch={setSearch} />
          </section>

          <section>
            <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Categorias</div>
            <div className="touch-scroll max-h-72 space-y-2 overflow-y-auto pr-1">
              <button
                className={`w-full rounded-xl border p-3 text-left text-sm font-black transition ${
                  categoryFilterId === 'all' ? 'border-blue-300/40 bg-blue-500/15 text-blue-100 ring-2 ring-blue-500/10' : 'border-white/10 bg-white/5 text-slate-300'
                }`}
                onClick={() => onCategoryChange('all')}
                type="button"
              >
                Ver todas las categorias
              </button>
              {categories.map((category) => (
                <button
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    categoryFilterId === category.id ? 'border-blue-300/40 bg-blue-500/15 text-blue-100 ring-2 ring-blue-500/10' : 'border-white/10 bg-white/5 text-slate-300'
                  }`}
                  key={category.id}
                  onClick={() => onCategoryChange(category.id)}
                  type="button"
                >
                  <div className="break-words text-sm font-black">{category.name}</div>
                  <div className="mt-1 text-xs font-bold text-slate-500">{category.products?.length || 0} productos</div>
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Vista global</div>
            <ComparisonFilterChips filterId={filterId} ids={['all']} setFilterId={onFilterChange} />
          </section>

          <section>
            <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Estado de comparacion</div>
            <ComparisonFilterChips excludeIds={['all', 'observations']} filterId={filterId} setFilterId={onFilterChange} />
          </section>

          <section>
            <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Condiciones</div>
            <ComparisonFilterChips filterId={filterId} ids={['observations']} setFilterId={onFilterChange} />
          </section>

          <section>
            <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Acciones</div>
            <div className="grid gap-2">
              <Button className="w-full justify-start" onClick={onClear} tone="light" disabled={filterId === 'all' && !search}>Limpiar filtros</Button>
              <Button className="w-full justify-start" onClick={() => onFilterChange('different')} tone="light">Mostrar solo diferencias</Button>
              <Button className="w-full justify-start" onClick={() => onFilterChange('pending')} tone="light">Mostrar pendientes</Button>
              <Button className="w-full justify-start" onClick={() => onFilterChange('validated')} tone="light">Mostrar validados</Button>
              <Button className="w-full justify-start" onClick={onReturn} tone="light"><RotateCcw size={17} />Volver a conteo</Button>
            </div>
          </section>
        </div>

        <div className="safe-x safe-bottom border-t border-white/10 bg-slate-950/80 p-4">
          <Button className="w-full" disabled={disabled} onClick={onCreateFinal} tone="blue"><ShieldCheck size={18} />Generar conteo final</Button>
        </div>
      </section>
    </div>
  )
}

function ComparisonFilterChips({ excludeIds = [], filterId, ids = null, setFilterId }) {
  const visibleFilters = comparisonFilters.filter((filter) => {
    if (ids) return ids.includes(filter.id)
    return !excludeIds.includes(filter.id)
  })

  return (
    <div className="touch-scroll flex flex-wrap gap-2">
      {visibleFilters.map((filter) => (
        <button
          className={`min-h-11 flex-none rounded-full border px-4 text-sm font-black transition ${
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
  )
}

function UserSelector({ count, label, onChange, tone, userCounts, value }) {
  const toneClass = tone === 'blue' ? 'border-blue-300/20 bg-blue-500/10 text-blue-200' : 'border-amber-300/20 bg-amber-400/10 text-amber-200'
  return (
    <article className={`rounded-xl border p-3 ${toneClass}`}>
      <label className="text-xs font-black uppercase tracking-[0.18em]">{label}</label>
      <select className="mt-2 min-h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 font-bold text-slate-50 outline-none focus:border-blue-400" onChange={(event) => onChange(event.target.value)} value={value}>
        {userCounts.map((userCount) => <option key={userCount.id} value={userCount.id}>{userCount.userName}</option>)}
      </select>
      <div className="mt-2 text-sm font-bold text-slate-300">{formatNumber(count?.totalCounted || 0)} unidades capturadas</div>
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
      <header className="mb-4 border-b border-white/10 pb-4">
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
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_280px] xl:items-stretch">
        <HistoryPanel
          accent="blue"
          count={countA}
          disabled={disabled}
          label="Historial Usuario A"
          onAdd={(values) => onAddEntry(countA.id, row, values)}
          onDelete={(entryId) => onDeleteEntry(countA.id, row, entryId)}
          onEdit={(entry, values) => onEditEntry(countA.id, row, entry, values)}
          product={row.product}
        />
        <HistoryPanel
          accent="amber"
          count={countB}
          disabled={disabled}
          label="Historial Usuario B"
          onAdd={(values) => onAddEntry(countB.id, row, values)}
          onDelete={(entryId) => onDeleteEntry(countB.id, row, entryId)}
          onEdit={(entry, values) => onEditEntry(countB.id, row, entry, values)}
          product={row.productB}
        />
        <DifferencePanel
          disabled={disabled}
          onToggleValidation={onToggleValidation}
          row={row}
          stateLabel={stateLabel}
          stateTone={stateTone}
        />
      </div>
    </article>
  )
}

function DifferencePanel({ disabled, onToggleValidation, row, stateLabel, stateTone }) {
  const tones = {
    amber: 'border-amber-300/20 bg-amber-400/10 text-amber-100',
    green: 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100',
    red: 'border-rose-300/20 bg-rose-500/10 text-rose-100',
  }

  return (
    <aside className="flex h-full min-h-[360px] flex-col rounded-xl border border-white/10 bg-slate-950/55 p-4">
      <div className="border-b border-white/10 pb-4 text-center">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Diferencia</div>
        <div className={`mx-auto mt-3 rounded-xl border px-4 py-5 ${tones[stateTone]}`}>
          <div className="font-mono text-4xl font-black tabular-nums">{formatNumber(row.difference)}</div>
          <div className="mt-2 text-xs font-black uppercase tracking-[0.14em]">{stateLabel}</div>
        </div>
      </div>

      <div className="grid gap-3 py-4">
        <DifferenceMetric label="Usuario A" value={row.totalA} />
        <DifferenceMetric label="Usuario B" value={row.totalB} />
        <DifferenceMetric label="Stock sistema" value={row.product.stock} />
        <DifferenceMetric label="No disponible" value={row.product.noDisponible} />
      </div>

      <div className="mt-auto grid gap-2 border-t border-white/10 pt-4">
        <Button disabled={disabled} onClick={() => onToggleValidation(row, true)} tone="blue"><CheckCircle2 size={17} />Validar</Button>
        <Button disabled={disabled} onClick={() => onToggleValidation(row, false)} tone="light">Dejar pendiente</Button>
      </div>
    </aside>
  )
}

function DifferenceMetric({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
      <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <strong className="font-mono text-base font-black text-slate-100 tabular-nums">{formatNumber(value)}</strong>
    </div>
  )
}

function HistoryPanel({ accent = 'blue', count, disabled, label, onAdd, onDelete, onEdit, product }) {
  const [adding, setAdding] = useState(false)
  const [deletingEntryId, setDeletingEntryId] = useState('')
  const [editingEntryId, setEditingEntryId] = useState('')
  const entries = product?.countEntries || []
  const accentClass = accent === 'amber' ? 'border-amber-300/20 bg-amber-400/10 text-amber-100' : 'border-blue-300/20 bg-blue-500/10 text-blue-100'

  return (
    <section className="flex h-full min-h-[360px] flex-col rounded-xl border border-white/10 bg-slate-950/45 p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-white/10 pb-4">
        <div className="min-w-0">
          <h4 className="font-black text-slate-50">{label}</h4>
          <p className="mt-1 truncate text-sm font-bold text-slate-500">{count?.userName} - {entries.length} movimientos</p>
          <div className={`mt-3 inline-flex rounded-lg border px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] ${accentClass}`}>
            Total {formatNumber(product?.totalCounted || 0)}
          </div>
        </div>
        <Button className="min-h-11 px-3" disabled={disabled || adding} onClick={() => setAdding(true)} tone="light"><Plus size={17} />Agregar</Button>
      </div>

      <div className="mt-4 grid flex-1 content-start gap-3">
        {adding && (
          <EntryInlineForm
            disabled={disabled}
            onCancel={() => setAdding(false)}
            onSubmit={async (values) => {
              await onAdd(values)
              setAdding(false)
            }}
            submitLabel="Agregar conteo"
            title="Nuevo conteo"
          />
        )}
        {entries.length === 0 && <div className="rounded-lg bg-white/5 p-4 text-sm font-bold text-slate-400">Sin registros capturados.</div>}
        {entries.map((entry) => (
          <div
            className={`rounded-lg border p-3 ${
              editingEntryId === entry.id ? 'border-blue-300/30 bg-blue-500/5 shadow-lg shadow-blue-950/10' : 'border-white/10 bg-slate-900'
            }`}
            key={entry.id}
          >
            {editingEntryId === entry.id ? (
              <EntryInlineForm
                disabled={disabled}
                initialValues={entry}
                onCancel={() => setEditingEntryId('')}
                onSubmit={async (values) => {
                  await onEdit(entry, values)
                  setEditingEntryId('')
                }}
                submitLabel="Guardar cambios"
                title="Editando registro"
              />
            ) : (
              <div className="grid gap-3 xl:grid-cols-[82px_minmax(0,1fr)_72px_88px] xl:items-center">
                <strong className="font-mono text-lg text-slate-50 tabular-nums">+{formatNumber(entry.quantity)}</strong>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="break-words font-bold text-slate-200">{entry.observation || entry.condition || 'Buen estado'}</span>
                    {entry.updatedBy?.name && <Badge tone="blue">Editado</Badge>}
                  </div>
                  <div className="break-words text-sm text-slate-500">
                    {entry.comment || 'Sin observacion'}{entry.updatedBy?.name ? ` - Modificado por ${entry.updatedBy.name}` : ''}
                  </div>
                </div>
                <span className="text-sm font-black text-slate-400 xl:text-center">{formatTime(entry.updatedAt || entry.createdAt)}</span>
                <span className="flex justify-end gap-2">
                  <button
                    aria-label="Editar registro"
                    className="grid h-10 w-10 place-items-center rounded-lg bg-white/10 text-slate-100 hover:bg-white/15 disabled:opacity-50"
                    disabled={disabled}
                    onClick={() => {
                      setDeletingEntryId('')
                      setEditingEntryId(entry.id)
                    }}
                    type="button"
                  >
                    <Edit3 size={17} />
                  </button>
                  <button
                    aria-label="Eliminar registro"
                    className="grid h-10 w-10 place-items-center rounded-lg bg-rose-500/10 text-rose-100 hover:bg-rose-500/20 disabled:opacity-50"
                    disabled={disabled}
                    onClick={() => {
                      setEditingEntryId('')
                      setDeletingEntryId(entry.id)
                    }}
                    type="button"
                  >
                    <Trash2 size={17} />
                  </button>
                </span>
              </div>
            )}
            {deletingEntryId === entry.id && editingEntryId !== entry.id && (
              <div className="mt-3 grid gap-3 rounded-lg border border-rose-300/20 bg-rose-500/10 p-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                <span className="text-sm font-bold text-rose-100">Eliminar este movimiento del historial?</span>
                <div className="flex justify-end gap-2">
                  <Button className="min-h-11 px-3" disabled={disabled} onClick={() => setDeletingEntryId('')} tone="light">Cancelar</Button>
                  <Button
                    className="min-h-11 px-3"
                    disabled={disabled}
                    onClick={async () => {
                      await onDelete(entry.id)
                      setDeletingEntryId('')
                    }}
                    tone="danger"
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function EntryInlineForm({ disabled, initialValues = {}, onCancel, onSubmit, submitLabel, title }) {
  const [comment, setComment] = useState(initialValues.comment || '')
  const [localError, setLocalError] = useState('')
  const [observation, setObservation] = useState(initialValues.observation || initialValues.condition || 'Buen estado')
  const [quantity, setQuantity] = useState(initialValues.quantity ? String(initialValues.quantity) : '')
  const editing = Boolean(initialValues.id)
  const actionLabel = submitLabel.includes('Agregar') ? 'Agregar' : 'Guardar'

  async function handleSubmit(event) {
    event.preventDefault()
    const numericQuantity = Number(quantity)
    if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
      setLocalError('Ingresa una cantidad mayor a cero.')
      return
    }

    setLocalError('')
    await onSubmit({
      comment: comment.trim(),
      condition: observation,
      observation,
      quantity: numericQuantity,
    })
  }

  return (
    <form className="rounded-xl border border-blue-300/25 bg-slate-950/80 p-4 shadow-inner shadow-black/20" onSubmit={handleSubmit}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3">
        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-200">{title || (editing ? 'Editando registro' : 'Nuevo conteo')}</div>
          <p className="mt-1 text-sm font-bold text-slate-500">
            {editing ? 'Modifica el movimiento seleccionado sin perder el contexto del producto.' : 'Captura un nuevo movimiento para este usuario.'}
          </p>
        </div>
        {editing && <Badge tone="blue">Modo edicion</Badge>}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="min-w-0">
          <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Cantidad</span>
          <input
            className="min-h-12 w-full rounded-lg border border-white/10 bg-slate-900 px-3 font-black text-slate-50 outline-none placeholder:text-slate-500 focus:border-blue-400"
            inputMode="decimal"
            min="0"
            onChange={(event) => setQuantity(event.target.value)}
            placeholder="0"
            type="number"
            value={quantity}
          />
        </label>
        <label className="min-w-0">
          <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Condicion</span>
          <select
            className="min-h-12 w-full rounded-lg border border-white/10 bg-slate-900 px-3 font-bold text-slate-50 outline-none focus:border-blue-400"
            onChange={(event) => setObservation(event.target.value)}
            value={observation}
          >
            {observationOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label className="min-w-0 md:col-span-2">
          <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Observacion</span>
          <textarea
            className="min-h-20 w-full resize-none rounded-lg border border-white/10 bg-slate-900 px-3 py-3 font-semibold text-slate-50 outline-none placeholder:text-slate-500 focus:border-blue-400"
            onChange={(event) => setComment(event.target.value)}
            placeholder="Sin observacion"
            rows={2}
            value={comment}
          />
        </label>
      </div>

      {localError && <div className="mt-3 rounded-md border border-rose-300/20 bg-rose-500/10 px-3 py-2 text-sm font-bold text-rose-100">{localError}</div>}

      <div className="mt-4 flex flex-col-reverse gap-2 border-t border-white/10 pt-4 sm:flex-row sm:justify-end">
        <Button className="w-full sm:w-auto" disabled={disabled} onClick={onCancel} tone="light"><X size={17} />Cancelar</Button>
        <Button
          className="w-full sm:w-auto"
          disabled={disabled}
          tone="blue"
          type="submit"
        >
          <CheckCircle2 size={17} />
          {actionLabel}
        </Button>
      </div>
    </form>
  )
}
