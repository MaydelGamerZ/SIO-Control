import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, ChevronLeft, ChevronRight, Clock3, Edit3, Search, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { Badge, Button, EmptyState, ErrorState, LoadingState, Metric } from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import {
  addCountEntry,
  deleteCountEntry,
  getInventoryForUser,
  getLatestInventory,
  getTodayInventory,
  updateCountEntry,
  updateInventoryStatus,
} from '../services/inventoryService'
import { filterProductRows, formatDateKey, formatNumber, formatTime, getCategoryProgress, getProductStatus, inventoryStatuses, observationOptions, productFilters } from '../utils/inventory'

async function resolveInventory(id, user) {
  if (id) return getInventoryForUser(id, user)
  const selectedInventory = (await getTodayInventory(formatDateKey())) || (await getLatestInventory())
  return selectedInventory?.id ? getInventoryForUser(selectedInventory.id, user) : null
}

export default function CountPage() {
  const [activeCategoryId, setActiveCategoryId] = useState('')
  const [compactView, setCompactView] = useState(false)
  const [error, setError] = useState('')
  const [filterId, setFilterId] = useState('global')
  const [inventory, setInventory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [mobileSearchActive, setMobileSearchActive] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const productsSectionRef = useRef(null)
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  async function refreshInventory(showLoading = false) {
    if (showLoading) setLoading(true)
    setError('')
    try {
      const selectedInventory = await resolveInventory(id, user)
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
        const selectedInventory = await resolveInventory(id, user)
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
  }, [id, user])

  useEffect(() => {
    function handleWindowScroll() {
      if (window.innerWidth < 768) setMobileSearchActive(false)
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
    if (!inventory?.id) return
    try {
      await updateInventoryStatus(inventory.id, status, user)
      await refreshInventory()
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

      <section className="mb-4 rounded-2xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl shadow-black/20 lg:sticky lg:top-[calc(5rem_+_env(safe-area-inset-top))] lg:z-20 lg:mb-5 sm:p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Conteo en proceso</p>
              <Badge tone="blue">{inventory.status || inventoryStatuses.inProgress}</Badge>
              <Badge tone="green">Modo individual</Badge>
            </div>
            <h2 className="mt-2 break-words text-2xl font-black leading-tight tracking-tight text-slate-50 sm:text-3xl lg:text-4xl">
              Inventario diario - {inventory.fecha || inventory.dateKey}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2 text-sm font-bold text-slate-300">
              <span className="rounded-md bg-white/10 px-3 py-1 ring-1 ring-white/10">{inventory.cedis}</span>
              <span className="rounded-md bg-white/10 px-3 py-1 ring-1 ring-white/10">Avance general {inventory.progress}%</span>
              <span className="rounded-md bg-white/10 px-3 py-1 ring-1 ring-white/10">{inventory.countedProducts} de {inventory.totalProducts} productos</span>
              <span className="rounded-md bg-white/10 px-3 py-1 ring-1 ring-white/10">{inventory.totalMovements || 0} movimientos</span>
              <span className="rounded-md bg-blue-500/10 px-3 py-1 text-blue-100 ring-1 ring-blue-300/20">{inventory.activeUserCount?.userName || user?.email}</span>
              <span className="rounded-md bg-white/10 px-3 py-1 ring-1 ring-white/10">{inventory.userCountCount} conteo{inventory.userCountCount === 1 ? '' : 's'} registrado{inventory.userCountCount === 1 ? '' : 's'}</span>
            </div>
          </div>

          <div className="hidden min-w-0 gap-2 md:grid md:grid-cols-3 xl:min-w-[620px]">
            <Button className="w-full" onClick={() => handleSave(inventoryStatuses.inProgress)} tone="blue">Guardar</Button>
            <Button className="w-full" onClick={() => handleSave(inventoryStatuses.saved)} tone="dark">Guardar y salir</Button>
            <Button className="w-full" onClick={() => navigate(`/inventario/${inventory.id}/comparar`)} tone="light">Comparar conteos</Button>
          </div>
        </div>
      </section>

      <MobileSearchToolbar
        active={mobileSearchActive}
        onBlur={() => setMobileSearchActive(false)}
        onClear={() => setSearch('')}
        onFocus={() => setMobileSearchActive(true)}
        onOpenTools={() => setToolsOpen(true)}
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
        onCompare={() => navigate(`/inventario/${inventory.id}/comparar`)}
        open={toolsOpen}
        search={search}
      />

      <section className="mb-4 hidden rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-xl shadow-black/15 md:block">
        <div className="grid gap-3 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1fr)_auto_auto] xl:items-start">
          <SearchBox search={search} setSearch={setSearch} />
          <div>
            <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Vista global y filtros</div>
            <FilterChips filterId={filterId} setFilterId={setFilterId} />
          </div>
          <Button className="whitespace-nowrap" onClick={() => setCompactView((value) => !value)} tone="light">
            {compactView ? 'Vista detallada' : 'Vista compacta'}
          </Button>
          <Button className="whitespace-nowrap" onClick={clearAllFilters} tone="light">
            Limpiar filtros
          </Button>
        </div>
      </section>

      <section className="mb-4 hidden rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-xl shadow-black/15 md:block xl:hidden">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-black text-slate-50">Categorias</h3>
          <span className="text-sm font-bold text-slate-400">{activeIndex + 1} de {categories.length}</span>
        </div>
        <div className="touch-scroll flex gap-2 overflow-x-auto pb-1">
          {categories.map((category) => {
            const progress = getCategoryProgress(category)
            return (
              <button
                className={`min-h-12 flex-none rounded-full border px-4 text-sm font-black transition ${
                  category.id === activeCategory?.id ? 'border-blue-300/40 bg-blue-500/20 text-blue-100' : 'border-white/10 bg-white/5 text-slate-300'
                }`}
                key={category.id}
                onClick={() => setActiveCategoryId(category.id)}
                type="button"
              >
                {category.name} {progress}%
              </button>
            )
          })}
        </div>
      </section>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="hidden xl:block xl:sticky xl:top-[calc(15rem_+_env(safe-area-inset-top))] xl:h-[calc(100dvh-16rem)]">
          <section className="touch-scroll h-full overflow-y-auto rounded-xl border border-white/10 bg-slate-900/80 p-4 shadow-xl shadow-black/15">
            <h3 className="text-lg font-black text-slate-50">Categorias del PDF</h3>
            <div className="mt-4 space-y-3">
              {categories.map((category) => {
                const progress = getCategoryProgress(category)
                return (
                  <button
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      category.id === activeCategory?.id ? 'border-blue-300/35 bg-blue-500/15 ring-2 ring-blue-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                    key={category.id}
                    onClick={() => setActiveCategoryId(category.id)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <strong className="break-words text-slate-50">{category.name}</strong>
                      {progress === 100 ? <CheckCircle2 className="flex-none text-emerald-300" size={20} /> : <Clock3 className="flex-none text-amber-300" size={20} />}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm font-bold text-slate-400">
                      <span>{category.products.length} productos</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-950">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${progress}%` }} />
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button disabled={activeIndex <= 0} onClick={() => goCategory(-1)} tone="light"><ChevronLeft size={18} /> Anterior</Button>
              <Button disabled={activeIndex >= categories.length - 1} onClick={() => goCategory(1)} tone="light">Siguiente <ChevronRight size={18} /></Button>
            </div>
          </section>
        </aside>

        <section className="min-w-0 scroll-mt-32" ref={productsSectionRef}>
          <div className="mb-4 rounded-xl border border-white/10 bg-slate-900/80 p-4 shadow-xl shadow-black/15 sm:p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                  {normalizedSearch ? `${visibleProductRows.length} resultados` : `Categoria activa ${activeIndex + 1} de ${categories.length}`}
                </p>
                <h3 className="mt-1 break-words text-2xl font-black leading-tight text-slate-50 sm:text-3xl">
                  {normalizedSearch ? 'Resultados de busqueda' : activeCategory?.name}
                </h3>
              </div>
              {!normalizedSearch && (
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
                  <ProductCompactRow categoryId={row.categoryId} categoryName={row.categoryName} key={`${row.categoryId}-${row.product.id}`} onAdd={handleAdd} product={row.product} showCategory={Boolean(normalizedSearch)} />
                ) : (
                  <ProductCard
                    categoryId={row.categoryId}
                    categoryName={row.categoryName}
                    key={`${row.categoryId}-${row.product.id}`}
                    onAdd={handleAdd}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    product={row.product}
                    showCategory={Boolean(normalizedSearch)}
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

function MobileSearchToolbar({ active, onBlur, onClear, onFocus, onOpenTools, search, setSearch }) {
  return (
    <section className="safe-x sticky top-[calc(5rem_+_env(safe-area-inset-top))] z-20 -mx-3 mb-4 border-y border-white/10 bg-slate-950/95 px-3 py-2 shadow-lg shadow-black/20 backdrop-blur md:hidden">
      <div className={`flex items-center gap-2 transition-all duration-200 ${active ? 'py-1' : ''}`}>
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
          className="grid h-11 w-11 flex-none place-items-center rounded-xl border border-white/10 bg-blue-600 text-white shadow-lg shadow-blue-950/25 transition hover:bg-blue-500"
          onClick={onOpenTools}
          type="button"
        >
          <SlidersHorizontal size={20} />
        </button>
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
    onClose()
    window.setTimeout(onScrollToProducts, 0)
  }

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button aria-label="Cerrar herramientas" className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm" onClick={onClose} type="button" />
      <section className="safe-top safe-bottom absolute inset-y-0 right-0 flex w-[min(92vw,390px)] max-w-full flex-col border-l border-white/10 bg-[#070c15] shadow-2xl shadow-black">
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
                  onClick={() => onGoCategory(-1)}
                  type="button"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  aria-label="Categoria siguiente"
                  className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-200 disabled:opacity-40"
                  disabled={activeIndex >= categories.length - 1}
                  onClick={() => onGoCategory(1)}
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
              <Button className="w-full justify-start" onClick={onCompare} tone="light">Comparar conteos</Button>
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
            <div className="grid gap-3 rounded-lg bg-slate-900 p-3 ring-1 ring-white/10 sm:grid-cols-[90px_minmax(0,1fr)_80px_110px_72px] sm:items-center" key={entry.id}>
              <strong className="text-lg text-slate-50">+{formatNumber(entry.quantity)}</strong>
              <span className="min-w-0 break-words font-bold text-slate-300">{entry.observation}{entry.comment ? ` - ${entry.comment}` : ''}</span>
              <span className="text-sm font-bold text-slate-400">{formatTime(entry.createdAt)}</span>
              <span className="min-w-0 break-all text-sm font-black text-slate-200">{entry.userName}</span>
              <span className="flex gap-2 text-slate-300">
                <button className="grid h-10 w-10 place-items-center rounded-lg bg-white/10 hover:bg-white/15" onClick={() => onEdit(categoryId, product.id, entry)} type="button" aria-label="Editar registro"><Edit3 size={18} /></button>
                <button className="grid h-10 w-10 place-items-center rounded-lg bg-rose-500/10 text-rose-100 hover:bg-rose-500/20" onClick={() => onDelete(categoryId, product.id, entry.id)} type="button" aria-label="Eliminar registro"><Trash2 size={18} /></button>
              </span>
            </div>
          ))}
        </div>
      </details>
    </article>
  )
}
