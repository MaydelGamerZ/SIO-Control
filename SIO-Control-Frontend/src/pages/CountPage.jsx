import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, ChevronLeft, ChevronRight, Clock3, Edit3, Search, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { Badge, Button, EmptyState, ErrorState, LoadingState, Metric, RealtimeIndicator } from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import { useUserProfile } from '../hooks/useUserProfile'
import {
  addCountEntry,
  deleteCountEntry,
  subscribeCurrentInventoryForUser,
  updateCountEntry,
  updateInventoryStatus,
} from '../services/inventoryService'
import { filterProductRows, formatNumber, formatTime, getCategoryProgress, getProductStatus, inventoryStatuses, observationOptions, productFilters } from '../utils/inventory'
import { canAuditUser } from '../services/userService'

export default function CountPage() {
  const [activeCategoryId, setActiveCategoryId] = useState('')
  const [compactView, setCompactView] = useState(false)
  const [error, setError] = useState('')
  const [filterId, setFilterId] = useState('global')
  const [inventory, setInventory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchActive, setSearchActive] = useState(false)
  const [syncStatus, setSyncStatus] = useState('connecting')
  const [toolsOpen, setToolsOpen] = useState(false)
  const productsSectionRef = useRef(null)
  const { id } = useParams()
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const navigate = useNavigate()
  const canAudit = canAuditUser(user, profile)

  useEffect(() => {
    if (!user) return undefined

    const unsubscribe = subscribeCurrentInventoryForUser(
      id,
      user,
      (selectedInventory) => {
        setInventory(selectedInventory)
        setActiveCategoryId((current) => {
          if (selectedInventory?.categories?.some((category) => category.id === current)) return current
          return selectedInventory?.categories?.[0]?.id || ''
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
  }, [id, user])

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

  const categories = useMemo(() => inventory?.categories || [], [inventory])
  const activeCategory = categories.find((category) => category.id === activeCategoryId) || categories[0]
  const activeIndex = Math.max(categories.findIndex((category) => category.id === activeCategory?.id), 0)
  const normalizedSearch = search.trim().toLowerCase()
  const globalProductView = Boolean(normalizedSearch) || filterId === 'global'
  const visibleProductRows = useMemo(() => {
    if (!inventory) return []
    return filterProductRows({
      categories,
      categoryId: activeCategory?.id || '',
      filterId,
      search,
    })
  }, [activeCategory, categories, filterId, inventory, search])

  async function handleAdd(categoryId, productId, values) {
    if (!inventory?.id) return
    if (Number(values.quantity) <= 0) {
      setError('La cantidad debe ser mayor a cero.')
      return
    }
    setError('')
    try {
      await addCountEntry(inventory.id, categoryId, productId, values, user)
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  async function handleEdit(categoryId, productId, entry, values) {
    try {
      await updateCountEntry(inventory.id, categoryId, productId, entry.id, values, user)
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  async function handleDelete(categoryId, productId, entryId) {
    try {
      await deleteCountEntry(inventory.id, categoryId, productId, entryId, user)
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  async function handleSave(status = inventoryStatuses.saved) {
    if (!inventory?.id) return
    try {
      await updateInventoryStatus(inventory.id, status, user)
      if (status === inventoryStatuses.saved) navigate('/inventario/resumen')
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  function goCategory(offset) {
    if (!categories.length) return
    const nextIndex = Math.min(Math.max(activeIndex + offset, 0), categories.length - 1)
    setActiveCategoryId(categories[nextIndex].id)
  }

  function scrollToProducts() {
    productsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function clearAllFilters() {
    setFilterId('global')
    setSearch('')
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

  if (!categories.length) {
    return (
      <EmptyState
        action={<Button onClick={() => navigate('/inventario/cargar')} tone="blue">Cargar otro PDF</Button>}
        description="El inventario cargado no contiene categorias detectadas. Vuelve a cargar el PDF diario."
        icon={Clock3}
        title="Inventario sin categorias"
      />
    )
  }

  return (
    <>
      <ErrorState message={error} />

      <section className="mb-4 rounded-xl border border-white/10 bg-slate-900/85 p-4 shadow-xl shadow-black/15 sm:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Conteo en proceso</p>
            <Badge tone="blue">{inventory.status || inventoryStatuses.inProgress}</Badge>
            <Badge tone="green">Modo individual</Badge>
            <RealtimeIndicator status={syncStatus} />
          </div>
          <h2 className="mt-2 break-words text-2xl font-black leading-tight tracking-tight text-slate-50 sm:text-3xl">
            Inventario diario - {inventory.fecha || inventory.dateKey}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2 text-sm font-bold text-slate-300">
            <span className="rounded-md bg-white/10 px-3 py-1 ring-1 ring-white/10">{inventory.cedis}</span>
            <span className="rounded-md bg-white/10 px-3 py-1 ring-1 ring-white/10">Avance {inventory.progress}%</span>
            <span className="rounded-md bg-white/10 px-3 py-1 ring-1 ring-white/10">{inventory.countedProducts}/{inventory.totalProducts} productos</span>
            <span className="rounded-md bg-white/10 px-3 py-1 ring-1 ring-white/10">{inventory.totalMovements || 0} movimientos</span>
            <span className="rounded-md bg-blue-500/10 px-3 py-1 text-blue-100 ring-1 ring-blue-300/20">{inventory.activeUserCount?.userName || user?.email}</span>
            <span className="rounded-md bg-white/10 px-3 py-1 ring-1 ring-white/10">{inventory.userCountCount} conteo{inventory.userCountCount === 1 ? '' : 's'}</span>
          </div>
        </div>
      </section>

      <CountSearchToolbar
        active={searchActive}
        canAudit={canAudit}
        onBlur={() => setSearchActive(false)}
        onClear={() => setSearch('')}
        onCompare={() => navigate(`/inventario/${inventory.id}/comparar`)}
        onFocus={() => setSearchActive(true)}
        onOpenTools={() => setToolsOpen(true)}
        onSave={() => handleSave(inventoryStatuses.inProgress)}
        onSaveAndExit={() => handleSave(inventoryStatuses.saved)}
        search={search}
        setSearch={setSearch}
      />

      <ToolsPanel
        activeCategory={activeCategory}
        activeIndex={activeIndex}
        categories={categories}
        compactView={compactView}
        filterId={filterId}
        inventory={inventory}
        onCategoryChange={setActiveCategoryId}
        onClearFilters={clearAllFilters}
        onClearSearch={() => setSearch('')}
        onClose={() => setToolsOpen(false)}
        onCompactViewChange={setCompactView}
        onFilterChange={setFilterId}
        onGoCategory={goCategory}
        onSave={() => handleSave(inventoryStatuses.inProgress)}
        onSaveAndExit={() => handleSave(inventoryStatuses.saved)}
        onScrollToProducts={scrollToProducts}
        onCompare={canAudit ? () => navigate(`/inventario/${inventory.id}/comparar`) : null}
        open={toolsOpen}
        search={search}
      />

      <div className="min-w-0">
        <section className="min-w-0 scroll-mt-28" ref={productsSectionRef}>
          <div className="mb-4 rounded-xl border border-white/10 bg-slate-900/80 p-4 shadow-xl shadow-black/15 sm:p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                  {normalizedSearch ? `${visibleProductRows.length} resultados` : globalProductView ? `${visibleProductRows.length} productos visibles` : `Categoria activa ${activeIndex + 1} de ${categories.length}`}
                </p>
                <h3 className="mt-1 break-words text-2xl font-black leading-tight text-slate-50 sm:text-3xl">
                  {normalizedSearch ? 'Resultados de busqueda' : globalProductView ? 'Todos los productos' : activeCategory?.name}
                </h3>
              </div>
              {!globalProductView && (
                <Badge tone={getCategoryProgress(activeCategory) === 100 ? 'green' : 'amber'}>
                  {getCategoryProgress(activeCategory) === 100 ? 'Revisada' : 'Pendiente'}
                </Badge>
              )}
            </div>
          </div>

          {visibleProductRows.length === 0 ? (
            <EmptyState description="Ajusta la busqueda o cambia de categoria para continuar." title="Sin productos visibles" />
          ) : (
            <div className="space-y-4">
              {visibleProductRows.map((row) =>
                compactView ? (
                  <ProductCompactRow categoryId={row.categoryId} categoryName={row.categoryName} key={`${row.categoryId}-${row.product.id}`} onAdd={handleAdd} product={row.product} showCategory={globalProductView} />
                ) : (
                  <ProductCard
                    categoryId={row.categoryId}
                    categoryName={row.categoryName}
                    key={`${row.categoryId}-${row.product.id}`}
                    onAdd={handleAdd}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    product={row.product}
                    showCategory={globalProductView}
                  />
                ),
              )}
            </div>
          )}
        </section>
      </div>
    </>
  )
}

function CountSearchToolbar({ active, canAudit, onBlur, onClear, onCompare, onFocus, onOpenTools, onSave, onSaveAndExit, search, setSearch }) {
  return (
    <section className="safe-x sticky top-[calc(5rem_+_env(safe-area-inset-top))] z-20 -mx-3 mb-4 border-y border-white/10 bg-slate-950/95 px-3 py-2 shadow-lg shadow-black/20 backdrop-blur md:mx-0 md:rounded-xl md:border md:px-4">
      <div className={`grid gap-2 transition-all duration-200 md:grid-cols-[minmax(260px,1fr)_auto] md:items-center ${active ? 'py-1' : ''}`}>
        <div className="flex min-w-0 items-center gap-2">
          <SearchBox
            active={active}
            onBlur={onBlur}
            onClear={onClear}
            onFocus={onFocus}
            search={search}
            setSearch={setSearch}
            variant="mobile"
          />
          <button
            aria-label="Abrir herramientas de conteo"
            className="grid h-11 w-11 flex-none place-items-center rounded-xl border border-white/10 bg-blue-600 text-white shadow-lg shadow-blue-950/25 transition hover:bg-blue-500 md:h-12 md:w-12"
            onClick={onOpenTools}
            type="button"
          >
            <SlidersHorizontal size={20} />
          </button>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <Button className="whitespace-nowrap" onClick={onSave} tone="blue">Guardar</Button>
          <Button className="whitespace-nowrap" onClick={onSaveAndExit} tone="dark">Guardar y salir</Button>
          {canAudit && <Button className="whitespace-nowrap" onClick={onCompare} tone="light">Comparar</Button>}
        </div>
      </div>
      {active && (
        <div className="mt-1 flex items-center justify-between gap-2 px-1 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
          <span>{search ? 'Busqueda activa' : 'Escribe para filtrar'}</span>
          {search && (
            <button className="text-blue-200" onClick={onClear} type="button">
              Limpiar
            </button>
          )}
        </div>
      )}
    </section>
  )
}

function SearchBox({ active = false, onBlur, onClear, onFocus, search, setSearch, variant = 'default' }) {
  const isMobile = variant === 'mobile'

  return (
    <label className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={isMobile ? 18 : 20} />
      <input
        className={`w-full rounded-lg border border-white/10 bg-slate-950/70 pl-11 font-bold text-slate-50 outline-none transition-all duration-200 placeholder:text-slate-500 focus:border-blue-400 focus:bg-slate-950 ${
          isMobile
            ? `${active ? 'min-h-[52px] text-base shadow-lg shadow-blue-950/15 ring-2 ring-blue-500/15' : 'min-h-11 text-base'} ${search ? 'pr-11' : 'pr-3'}`
            : 'min-h-14 pl-12 pr-4'
        }`}
        inputMode="search"
        onChange={(event) => setSearch(event.target.value)}
        onBlur={onBlur}
        onFocus={onFocus}
        placeholder="Buscar producto"
        type="search"
        value={search}
      />
      {isMobile && search && (
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

function FilterChips({ excludeIds = [], filterId, ids = null, layout = 'scroll', setFilterId }) {
  const visibleFilters = productFilters.filter((filter) => {
    if (ids) return ids.includes(filter.id)
    return !excludeIds.includes(filter.id)
  })

  return (
    <div className={`touch-scroll flex gap-2 pb-1 ${layout === 'wrap' ? 'flex-wrap overflow-visible' : 'overflow-x-auto xl:flex-wrap xl:overflow-visible'}`}>
      {visibleFilters.map((filter) => (
        <button
          className={`min-h-11 flex-none rounded-full border px-4 text-sm font-black transition ${
            filterId === filter.id
              ? 'border-blue-300/40 bg-blue-500/20 text-blue-100'
              : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
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

function ToolsPanel({
  activeCategory,
  activeIndex,
  categories,
  compactView,
  filterId,
  inventory,
  onCategoryChange,
  onClearFilters,
  onClearSearch,
  onClose,
  onCompactViewChange,
  onFilterChange,
  onGoCategory,
  onCompare,
  onSave,
  onSaveAndExit,
  onScrollToProducts,
  open,
  search,
}) {
  if (!open) return null

  function selectCategory(categoryId) {
    onCategoryChange(categoryId)
    onFilterChange('all')
    onClose()
    window.setTimeout(onScrollToProducts, 0)
  }

  return (
    <div className="fixed inset-0 z-50">
      <button aria-label="Cerrar herramientas" className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm" onClick={onClose} type="button" />
      <section className="safe-top safe-bottom absolute inset-y-0 right-0 flex w-[min(92vw,430px)] max-w-full flex-col border-l border-white/10 bg-[#070c15] shadow-2xl shadow-black md:w-[430px]">
        <div className="safe-x border-b border-white/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Herramientas</p>
              <h3 className="mt-1 truncate text-2xl font-black text-slate-50">Conteo</h3>
            </div>
            <button className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-white/10 text-slate-100" onClick={onClose} type="button" aria-label="Cerrar">
              <X size={20} />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-white/10 bg-white/5 p-2">
              <div className="text-xs font-black uppercase text-slate-500">Avance</div>
              <div className="mt-1 font-black text-blue-200">{inventory.progress}%</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-2">
              <div className="text-xs font-black uppercase text-slate-500">Prod.</div>
              <div className="mt-1 font-black text-slate-100">{inventory.countedProducts}/{inventory.totalProducts}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-2">
              <div className="text-xs font-black uppercase text-slate-500">Mov.</div>
              <div className="mt-1 font-black text-slate-100">{inventory.totalMovements || 0}</div>
            </div>
          </div>
        </div>

        <div className="safe-x touch-scroll flex-1 space-y-5 overflow-y-auto p-4">
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Categorias</p>
                <p className="mt-1 text-sm font-bold text-slate-500">{activeIndex + 1} de {categories.length}</p>
              </div>
              <div className="flex gap-2">
                <button
                  aria-label="Categoria anterior"
                  className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-200 disabled:opacity-40"
                  disabled={activeIndex <= 0}
                  onClick={() => {
                    onFilterChange('all')
                    onGoCategory(-1)
                  }}
                  type="button"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  aria-label="Categoria siguiente"
                  className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-200 disabled:opacity-40"
                  disabled={activeIndex >= categories.length - 1}
                  onClick={() => {
                    onFilterChange('all')
                    onGoCategory(1)
                  }}
                  type="button"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {categories.map((category) => {
                const progress = getCategoryProgress(category)
                const selected = category.id === activeCategory?.id
                return (
                  <button
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      selected ? 'border-blue-300/40 bg-blue-500/15 text-blue-100 ring-2 ring-blue-500/10' : 'border-white/10 bg-white/5 text-slate-300'
                    }`}
                    key={category.id}
                    onClick={() => selectCategory(category.id)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <strong className="min-w-0 break-words text-sm">{category.name}</strong>
                      <span className="flex-none text-xs font-black">{progress}%</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs font-bold text-slate-500">
                      <span>{category.products.length} productos</span>
                      <span>{progress === 100 ? 'Revisada' : 'Pendiente'}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-950">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${progress}%` }} />
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          <section>
            <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Vista global</div>
            <FilterChips filterId={filterId} ids={['global']} layout="wrap" setFilterId={onFilterChange} />
          </section>

          <section>
            <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Filtros de estado</div>
            <FilterChips filterId={filterId} excludeIds={['global']} layout="wrap" setFilterId={onFilterChange} />
          </section>

          <section>
            <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Vista</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                className={`min-h-12 rounded-lg border px-3 font-black ${compactView ? 'border-blue-300/40 bg-blue-500/20 text-blue-100' : 'border-white/10 bg-white/5 text-slate-300'}`}
                onClick={() => onCompactViewChange(true)}
                type="button"
              >
                Compacta
              </button>
              <button
                className={`min-h-12 rounded-lg border px-3 font-black ${!compactView ? 'border-blue-300/40 bg-blue-500/20 text-blue-100' : 'border-white/10 bg-white/5 text-slate-300'}`}
                onClick={() => onCompactViewChange(false)}
                type="button"
              >
                Detallada
              </button>
            </div>
          </section>

          <section>
            <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Herramientas</div>
            <div className="grid gap-2">
              <Button className="w-full justify-start" onClick={onScrollToProducts} tone="light">Ir al inicio de categoria</Button>
              <Button className="w-full justify-start" onClick={onClearSearch} tone="light" disabled={!search}>Limpiar busqueda</Button>
              <Button className="w-full justify-start" onClick={onClearFilters} tone="light" disabled={filterId === 'global' && !search}>Limpiar filtros</Button>
              <Button className="w-full justify-start" onClick={() => onFilterChange('counted')} tone="light">Solo con movimientos</Button>
              <Button className="w-full justify-start" onClick={() => onFilterChange('pending')} tone="light">Solo sin contar</Button>
              {onCompare && <Button className="w-full justify-start" onClick={onCompare} tone="light">Comparar conteos</Button>}
            </div>
          </section>
        </div>

        <div className="safe-x safe-bottom border-t border-white/10 bg-slate-950/80 p-4">
          <div className="grid grid-cols-2 gap-2">
            <Button className="w-full" onClick={onSave} tone="blue">Guardar</Button>
            <Button className="w-full" onClick={onSaveAndExit} tone="dark">Guardar y salir</Button>
          </div>
        </div>
      </section>
    </div>
  )
}

function ProductCompactRow({ categoryId, categoryName, onAdd, product, showCategory }) {
  const [quantity, setQuantity] = useState('')
  const status = getProductStatus(product)

  return (
    <article className="rounded-xl border border-white/10 bg-slate-900/80 p-4 shadow-xl shadow-black/15">
      <div className="grid gap-4 lg:grid-cols-[minmax(260px,1fr)_minmax(360px,0.85fr)_190px] lg:items-center">
        <div className="min-w-0">
          {showCategory && <Badge tone="blue">{categoryName}</Badge>}
          <div className="mt-2 break-words text-lg font-black text-slate-50">{product.name}</div>
          <div className="mt-1 text-sm text-slate-400">{product.countEntries.length} registros capturados</div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Stock" value={product.stock} />
          <Metric label="No disp." value={product.noDisponible} />
          <Metric label="Total" value={product.totalCounted} />
          <Metric label="Dif." value={product.difference} tone={status.tone} />
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <input
            className="min-h-12 min-w-0 rounded-lg border border-white/10 bg-slate-950/70 px-3 font-black text-slate-50 outline-none placeholder:text-slate-500 focus:border-blue-400"
            inputMode="decimal"
            min="0"
            onChange={(event) => setQuantity(event.target.value)}
            placeholder="0"
            type="number"
            value={quantity}
          />
          <Button
            onClick={() => {
              onAdd(categoryId, product.id, { quantity, observation: 'Buen estado', comment: '' })
              setQuantity('')
            }}
            tone="blue"
          >
            Agregar
          </Button>
        </div>
      </div>
    </article>
  )
}

function ProductCard({ categoryId, categoryName, onAdd, onDelete, onEdit, product, showCategory }) {
  const [comment, setComment] = useState('')
  const [deletingEntryId, setDeletingEntryId] = useState('')
  const [editingEntryId, setEditingEntryId] = useState('')
  const [observation, setObservation] = useState('Buen estado')
  const [quantity, setQuantity] = useState('')
  const status = getProductStatus(product)
  const hasSpecialObservation = product.countEntries.some((entry) => entry.observation !== 'Buen estado')

  function submit() {
    onAdd(categoryId, product.id, { comment, observation, quantity })
    setComment('')
    setObservation('Buen estado')
    setQuantity('')
  }

  return (
    <article className="rounded-xl border border-white/10 bg-slate-900/85 p-4 shadow-xl shadow-black/15 sm:p-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.72fr)] xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {showCategory && <Badge tone="blue">{categoryName}</Badge>}
            <Badge tone={status.tone}>{status.label}</Badge>
            {hasSpecialObservation && <Badge tone="amber">Observaciones</Badge>}
            {product.countEntries.length > 1 && <Badge tone="blue">{product.countEntries.length} registros</Badge>}
          </div>
          <h4 className="mt-3 break-words text-2xl font-black leading-tight text-slate-50 sm:text-3xl">{product.name}</h4>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
          <Metric label="Stock sistema" value={product.stock} />
          <Metric label="No disponible" value={product.noDisponible} />
          <Metric label="Total contado" value={product.totalCounted} />
          <Metric label="Diferencia" value={product.difference} tone={status.tone} />
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[150px_190px_minmax(180px,1fr)_170px]">
        <input
          className="min-h-14 rounded-lg border border-white/10 bg-slate-950/70 px-4 text-xl font-black text-slate-50 outline-none placeholder:text-slate-500 focus:border-blue-400 focus:bg-slate-950"
          inputMode="decimal"
          min="0"
          onChange={(event) => setQuantity(event.target.value)}
          placeholder="0"
          type="number"
          value={quantity}
        />
        <select
          className="min-h-14 rounded-lg border border-white/10 bg-slate-950/70 px-4 font-bold text-slate-50 outline-none focus:border-blue-400"
          onChange={(event) => setObservation(event.target.value)}
          value={observation}
        >
          {observationOptions.map((option) => <option key={option}>{option}</option>)}
        </select>
        <input
          className="min-h-14 rounded-lg border border-white/10 bg-slate-950/70 px-4 font-semibold text-slate-50 outline-none placeholder:text-slate-500 focus:border-blue-400 focus:bg-slate-950"
          onChange={(event) => setComment(event.target.value)}
          placeholder="Comentario corto opcional"
          value={comment}
        />
        <Button className="w-full" onClick={submit} tone="blue">Agregar conteo</Button>
      </div>

      <details className="mt-5 rounded-xl border border-white/10 bg-slate-950/45" defaultOpen={product.countEntries.length > 0}>
        <summary className="cursor-pointer list-none p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h5 className="font-black text-slate-100">Registros capturados</h5>
            <span className="text-sm font-black text-blue-200">{product.countEntries.length} movimientos</span>
          </div>
        </summary>
        <div className="grid gap-2 border-t border-white/10 p-3 sm:p-4">
          {product.countEntries.length === 0 && <div className="rounded-lg bg-white/5 p-4 text-sm font-bold text-slate-400">Sin conteos capturados todavia</div>}
          {product.countEntries.map((entry) => (
            <div className="rounded-lg bg-slate-900 p-3 ring-1 ring-white/10" key={entry.id}>
              {editingEntryId === entry.id ? (
                <CountEntryInlineForm
                  initialValues={entry}
                  onCancel={() => setEditingEntryId('')}
                  onSubmit={async (values) => {
                    await onEdit(categoryId, product.id, entry, values)
                    setEditingEntryId('')
                  }}
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-[90px_minmax(0,1fr)_80px_110px_72px] sm:items-center">
                  <strong className="text-lg text-slate-50">+{formatNumber(entry.quantity)}</strong>
                  <span className="min-w-0 break-words font-bold text-slate-300">
                    {entry.observation || entry.condition || 'Buen estado'}{entry.comment ? ` - ${entry.comment}` : ''}{entry.updatedBy?.name ? ` - modificado por ${entry.updatedBy.name}` : ''}
                    {entry.updatedBy?.name && <Badge tone="blue">Editado</Badge>}
                  </span>
                  <span className="text-sm font-bold text-slate-400">{formatTime(entry.updatedAt || entry.createdAt)}</span>
                  <span className="min-w-0 break-all text-sm font-black text-slate-200">{entry.userName}</span>
                  <span className="flex gap-2 text-slate-300">
                    <button
                      className="grid h-10 w-10 place-items-center rounded-lg bg-white/10 hover:bg-white/15"
                      onClick={() => {
                        setDeletingEntryId('')
                        setEditingEntryId(entry.id)
                      }}
                      type="button"
                      aria-label="Editar registro"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button
                      className="grid h-10 w-10 place-items-center rounded-lg bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
                      onClick={() => {
                        setEditingEntryId('')
                        setDeletingEntryId(entry.id)
                      }}
                      type="button"
                      aria-label="Eliminar registro"
                    >
                      <Trash2 size={18} />
                    </button>
                  </span>
                </div>
              )}
              {deletingEntryId === entry.id && editingEntryId !== entry.id && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-300/20 bg-rose-500/10 p-3">
                  <span className="text-sm font-bold text-rose-100">Eliminar este registro de conteo?</span>
                  <div className="flex gap-2">
                    <Button onClick={() => setDeletingEntryId('')} tone="light">Cancelar</Button>
                    <Button
                      onClick={async () => {
                        await onDelete(categoryId, product.id, entry.id)
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
      </details>
    </article>
  )
}

function CountEntryInlineForm({ initialValues, onCancel, onSubmit }) {
  const [comment, setComment] = useState(initialValues.comment || '')
  const [localError, setLocalError] = useState('')
  const [observation, setObservation] = useState(initialValues.observation || initialValues.condition || 'Buen estado')
  const [quantity, setQuantity] = useState(initialValues.quantity ? String(initialValues.quantity) : '')

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
    <form className="rounded-lg border border-blue-300/20 bg-blue-500/10 p-3" onSubmit={handleSubmit}>
      <div className="grid gap-3 lg:grid-cols-[120px_170px_minmax(0,1fr)_auto_auto] lg:items-start">
        <label className="min-w-0">
          <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Cantidad</span>
          <input
            className="min-h-11 w-full rounded-lg border border-white/10 bg-slate-950/80 px-3 font-black text-slate-50 outline-none placeholder:text-slate-500 focus:border-blue-400"
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
            className="min-h-11 w-full rounded-lg border border-white/10 bg-slate-950/80 px-3 font-bold text-slate-50 outline-none focus:border-blue-400"
            onChange={(event) => setObservation(event.target.value)}
            value={observation}
          >
            {observationOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label className="min-w-0">
          <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Observacion</span>
          <input
            className="min-h-11 w-full rounded-lg border border-white/10 bg-slate-950/80 px-3 font-semibold text-slate-50 outline-none placeholder:text-slate-500 focus:border-blue-400"
            onChange={(event) => setComment(event.target.value)}
            placeholder="Sin observacion"
            value={comment}
          />
        </label>
        <Button className="lg:mt-5" tone="blue" type="submit"><CheckCircle2 size={17} />Guardar</Button>
        <Button className="lg:mt-5" onClick={onCancel} tone="light"><X size={17} />Cancelar</Button>
      </div>
      {localError && <div className="mt-2 rounded-md border border-rose-300/20 bg-rose-500/10 px-3 py-2 text-sm font-bold text-rose-100">{localError}</div>}
    </form>
  )
}
