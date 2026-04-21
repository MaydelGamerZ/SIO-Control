import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, ChevronLeft, ChevronRight, Clock3, Edit3, Search, Trash2 } from 'lucide-react'
import { Badge, Button, EmptyState, ErrorState, LoadingState, Metric } from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import {
  addCountEntry,
  deleteCountEntry,
  getInventory,
  getLatestInventory,
  getTodayInventory,
  updateCountEntry,
  updateInventoryStatus,
} from '../services/inventoryService'
import { formatDateKey, formatNumber, formatTime, getCategoryProgress, getProductStatus, inventoryStatuses, observationOptions } from '../utils/inventory'

async function resolveInventory(id) {
  return id ? getInventory(id) : (await getTodayInventory(formatDateKey())) || (await getLatestInventory())
}

export default function CountPage() {
  const [activeCategoryId, setActiveCategoryId] = useState('')
  const [compactView, setCompactView] = useState(false)
  const [error, setError] = useState('')
  const [inventory, setInventory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  async function refreshInventory(showLoading = false) {
    if (showLoading) {
      setLoading(true)
    }
    setError('')
    try {
      const selectedInventory = await resolveInventory(id)
      setInventory(selectedInventory)
      setActiveCategoryId((current) => current || selectedInventory?.categories?.[0]?.id || '')
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    async function loadInitialInventory() {
      try {
        const selectedInventory = await resolveInventory(id)
        if (!active) return
        setInventory(selectedInventory)
        setActiveCategoryId(selectedInventory?.categories?.[0]?.id || '')
        setError('')
      } catch (loadError) {
        if (active) setError(loadError.message)
      } finally {
        if (active) setLoading(false)
      }
    }
    loadInitialInventory()
    return () => {
      active = false
    }
  }, [id])

  const activeCategory = inventory?.categories?.find((category) => category.id === activeCategoryId) || inventory?.categories?.[0]
  const activeIndex = inventory?.categories?.findIndex((category) => category.id === activeCategory?.id) ?? 0
  const filteredProducts = useMemo(() => {
    const products = activeCategory?.products || []
    if (!search.trim()) return products
    return products.filter((product) => product.name.toLowerCase().includes(search.toLowerCase()))
  }, [activeCategory, search])

  async function handleAdd(categoryId, productId, values) {
    if (!inventory?.id) return
    if (Number(values.quantity) <= 0) {
      setError('La cantidad debe ser mayor a cero.')
      return
    }
    setError('')
    try {
      await addCountEntry(inventory.id, categoryId, productId, values, user)
      await refreshInventory()
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  async function handleEdit(categoryId, productId, entry) {
    const quantity = window.prompt('Nueva cantidad', entry.quantity)
    if (quantity === null) return
    const observation = window.prompt('Observacion', entry.observation) || entry.observation
    const comment = window.prompt('Comentario', entry.comment || '') || ''
    try {
      await updateCountEntry(inventory.id, categoryId, productId, entry.id, { comment, observation, quantity: Number(quantity) }, user)
      await refreshInventory()
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  async function handleDelete(categoryId, productId, entryId) {
    if (!window.confirm('Eliminar este registro de conteo?')) return
    try {
      await deleteCountEntry(inventory.id, categoryId, productId, entryId, user)
      await refreshInventory()
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  async function handleSave(status = inventoryStatuses.saved) {
    try {
      await updateInventoryStatus(inventory.id, status, user)
      await refreshInventory()
      if (status === inventoryStatuses.saved) navigate('/inventario/resumen')
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  function goCategory(offset) {
    if (!inventory?.categories?.length) return
    const nextIndex = Math.min(Math.max(activeIndex + offset, 0), inventory.categories.length - 1)
    setActiveCategoryId(inventory.categories[nextIndex].id)
  }

  if (loading) return <LoadingState label="Cargando conteo" />
  if (!inventory) {
    return (
      <EmptyState
        action={<Button onClick={() => navigate('/inventario/cargar')} tone="blue">Cargar inventario</Button>}
        description="Carga un PDF diario para crear el inventario y comenzar la captura."
        icon={Clock3}
        title="No hay inventario disponible"
      />
    )
  }

  return (
    <>
      <ErrorState message={error} />
      <section className="sticky top-20 z-20 mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Conteo en proceso</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Inventario diario - {inventory.fecha || inventory.dateKey}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">{inventory.cedis} - Avance general {inventory.progress}%</p>
          </div>
          <div className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_auto_auto]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                className="min-h-14 w-full rounded-lg border border-slate-200 bg-slate-50 pl-12 pr-4 font-bold outline-none focus:border-blue-500 focus:bg-white"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar producto"
                value={search}
              />
            </label>
            <Button onClick={() => setCompactView((value) => !value)} tone="light">{compactView ? 'Vista detallada' : 'Vista compacta'}</Button>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => handleSave(inventoryStatuses.inProgress)} tone="blue">Guardar</Button>
              <Button onClick={() => handleSave(inventoryStatuses.saved)} tone="dark">Guardar y salir</Button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="xl:sticky xl:top-44 xl:h-[calc(100svh-12rem)]">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm xl:h-full xl:overflow-y-auto">
            <h3 className="text-lg font-black text-slate-950">Categorias del PDF</h3>
            <div className="mt-4 space-y-3">
              {inventory.categories.map((category) => {
                const progress = getCategoryProgress(category)
                return (
                  <button
                    className={`w-full rounded-lg border p-4 text-left transition ${
                      category.id === activeCategory?.id ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                    key={category.id}
                    onClick={() => setActiveCategoryId(category.id)}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-slate-950">{category.name}</strong>
                      {progress === 100 ? <CheckCircle2 className="text-emerald-600" size={20} /> : <Clock3 className="text-amber-500" size={20} />}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm font-bold text-slate-500">
                      <span>{category.products.length} productos</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button disabled={activeIndex <= 0} onClick={() => goCategory(-1)} tone="light"><ChevronLeft className="inline" size={18} /> Anterior</Button>
              <Button disabled={activeIndex >= inventory.categories.length - 1} onClick={() => goCategory(1)} tone="dark">Siguiente <ChevronRight className="inline" size={18} /></Button>
            </div>
          </section>
        </aside>

        <section>
          <div className="mb-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Categoria activa {activeIndex + 1} de {inventory.categories.length}</p>
                <h3 className="mt-1 text-3xl font-black text-slate-950">{activeCategory?.name}</h3>
              </div>
              <Badge tone={getCategoryProgress(activeCategory) === 100 ? 'green' : 'amber'}>{getCategoryProgress(activeCategory) === 100 ? 'Revisada' : 'Pendiente'}</Badge>
            </div>
          </div>

          <div className="space-y-4">
            {filteredProducts.map((product) =>
              compactView ? (
                <ProductCompactRow categoryId={activeCategory.id} key={product.id} onAdd={handleAdd} product={product} />
              ) : (
                <ProductCard
                  categoryId={activeCategory.id}
                  key={product.id}
                  onAdd={handleAdd}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  product={product}
                />
              ),
            )}
          </div>
        </section>
      </div>
    </>
  )
}

function ProductCompactRow({ categoryId, onAdd, product }) {
  const [quantity, setQuantity] = useState('')
  const diffTone = product.difference === 0 ? 'green' : product.difference > 0 ? 'amber' : 'red'

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_repeat(4,120px)_180px] lg:items-center">
        <div>
          <div className="font-black text-slate-950">{product.name}</div>
          <div className="mt-1 text-sm text-slate-500">{product.countEntries.length} registros capturados</div>
        </div>
        <Metric label="Stock" value={product.stock} />
        <Metric label="No disp." value={product.noDisponible} />
        <Metric label="Total" value={product.totalCounted} />
        <Metric label="Dif." value={product.difference} tone={diffTone} />
        <div className="flex gap-2">
          <input className="min-h-12 min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 font-black" onChange={(event) => setQuantity(event.target.value)} placeholder="0" type="number" value={quantity} />
          <Button onClick={() => { onAdd(categoryId, product.id, { quantity, observation: 'Buen estado', comment: '' }); setQuantity('') }} tone="blue">Agregar</Button>
        </div>
      </div>
    </article>
  )
}

function ProductCard({ categoryId, onAdd, onDelete, onEdit, product }) {
  const [comment, setComment] = useState('')
  const [observation, setObservation] = useState('Buen estado')
  const [quantity, setQuantity] = useState('')
  const status = getProductStatus(product)

  function submit() {
    onAdd(categoryId, product.id, { comment, observation, quantity })
    setComment('')
    setObservation('Buen estado')
    setQuantity('')
  }

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-2xl font-black text-slate-950">{product.name}</h4>
            <Badge tone={status.tone}>{status.label}</Badge>
            {product.countEntries.some((entry) => entry.observation !== 'Buen estado') && <Badge tone="amber">Observaciones</Badge>}
            {product.countEntries.length > 1 && <Badge tone="blue">{product.countEntries.length} registros</Badge>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label="Stock sistema" value={product.stock} />
          <Metric label="No disponible" value={product.noDisponible} />
          <Metric label="Total contado" value={product.totalCounted} />
          <Metric label="Diferencia" value={product.difference} tone={status.tone} />
        </div>
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-[150px_190px_minmax(180px,1fr)_160px]">
        <input className="min-h-14 rounded-lg border border-slate-200 bg-slate-50 px-4 text-xl font-black outline-none focus:border-blue-500 focus:bg-white" onChange={(event) => setQuantity(event.target.value)} placeholder="0" type="number" value={quantity} />
        <select className="min-h-14 rounded-lg border border-slate-200 bg-white px-4 font-bold outline-none focus:border-blue-500" onChange={(event) => setObservation(event.target.value)} value={observation}>
          {observationOptions.map((option) => <option key={option}>{option}</option>)}
        </select>
        <input className="min-h-14 rounded-lg border border-slate-200 bg-slate-50 px-4 font-semibold outline-none focus:border-blue-500 focus:bg-white" onChange={(event) => setComment(event.target.value)} placeholder="Comentario corto opcional" value={comment} />
        <Button onClick={submit} tone="blue">Agregar conteo</Button>
      </div>

      <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <h5 className="font-black text-slate-900">Registros capturados</h5>
          <span className="text-sm font-black text-blue-700">{product.countEntries.length} movimientos</span>
        </div>
        <div className="mt-3 grid gap-2">
          {product.countEntries.length === 0 && <div className="rounded-lg bg-white p-4 text-sm font-bold text-slate-400">Sin conteos capturados todavia</div>}
          {product.countEntries.map((entry) => (
            <div className="grid gap-3 rounded-lg bg-white p-3 sm:grid-cols-[90px_minmax(0,1fr)_80px_100px_80px] sm:items-center" key={entry.id}>
              <strong className="text-lg text-slate-950">+{formatNumber(entry.quantity)}</strong>
              <span className="font-bold text-slate-600">{entry.observation}{entry.comment ? ` - ${entry.comment}` : ''}</span>
              <span className="text-sm font-bold text-slate-400">{formatTime(entry.createdAt)}</span>
              <span className="text-sm font-black text-slate-700">{entry.userName}</span>
              <span className="flex gap-2 text-slate-400">
                <button onClick={() => onEdit(categoryId, product.id, entry)} type="button" aria-label="Editar registro"><Edit3 size={18} /></button>
                <button onClick={() => onDelete(categoryId, product.id, entry.id)} type="button" aria-label="Eliminar registro"><Trash2 size={18} /></button>
              </span>
            </div>
          ))}
        </div>
      </div>
    </article>
  )
}
