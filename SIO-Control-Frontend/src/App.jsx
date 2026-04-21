import { useMemo, useState } from 'react'
import {
  ArchiveRestore,
  BadgeCheck,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Copy,
  Download,
  Edit3,
  Eye,
  FileSearch,
  FileText,
  Filter,
  History,
  Layers3,
  Menu,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react'

const inventoryMeta = {
  date: '21 abril 2026',
  week: 'Semana 17',
  cedis: 'CEDIS Tijuana',
  updatedAt: '10:42 AM',
}

const categories = [
  {
    id: 'cereal',
    name: 'Cereal',
    progress: 86,
    reviewed: true,
    products: [
      {
        id: 'cer-01',
        name: 'Avena integral premium 1 kg',
        stock: 1240,
        unavailable: 18,
        counted: 1235,
        status: 'Faltante',
        observation: 'Buen estado',
        comment: 'Pendiente tarima final',
        records: [
          { qty: 720, observation: 'Buen estado', time: '09:14', user: 'MG' },
          { qty: 515, observation: 'Buen estado', time: '09:31', user: 'AR' },
        ],
      },
      {
        id: 'cer-02',
        name: 'Granola frutos secos 500 g',
        stock: 860,
        unavailable: 0,
        counted: 860,
        status: 'Coincide',
        observation: 'Buen estado',
        comment: '',
        records: [{ qty: 860, observation: 'Buen estado', time: '09:42', user: 'MG' }],
      },
      {
        id: 'cer-03',
        name: 'Cereal chocolate familiar',
        stock: 310,
        unavailable: 8,
        counted: 336,
        status: 'Sobrante',
        observation: 'Otro',
        comment: 'Caja sin etiqueta',
        records: [
          { qty: 300, observation: 'Buen estado', time: '10:02', user: 'AR' },
          { qty: 36, observation: 'Otro', time: '10:08', user: 'MG' },
        ],
      },
    ],
  },
  {
    id: 'bebidas',
    name: 'Bebidas',
    progress: 58,
    reviewed: false,
    products: [
      {
        id: 'beb-01',
        name: 'Agua natural 600 ml paquete',
        stock: 4200,
        unavailable: 96,
        counted: 3890,
        status: 'Faltante',
        observation: 'Buen estado',
        comment: 'Conteo en proceso',
        records: [{ qty: 3890, observation: 'Buen estado', time: '10:18', user: 'MG' }],
      },
      {
        id: 'beb-02',
        name: 'Bebida hidratante naranja',
        stock: 1550,
        unavailable: 22,
        counted: 1550,
        status: 'Coincide',
        observation: 'Buen estado',
        comment: '',
        records: [{ qty: 1550, observation: 'Buen estado', time: '10:21', user: 'AR' }],
      },
    ],
  },
  {
    id: 'snacks',
    name: 'Snacks',
    progress: 34,
    reviewed: false,
    products: [
      {
        id: 'snk-01',
        name: 'Papas saladas caja exhibidora',
        stock: 980,
        unavailable: 12,
        counted: 905,
        status: 'Faltante',
        observation: 'Dañado',
        comment: 'Varias bolsas abiertas',
        records: [
          { qty: 620, observation: 'Buen estado', time: '10:26', user: 'MG' },
          { qty: 285, observation: 'Dañado', time: '10:31', user: 'AR' },
        ],
      },
      {
        id: 'snk-02',
        name: 'Mix frutos secos individual',
        stock: 1420,
        unavailable: 0,
        counted: 0,
        status: 'Pendiente',
        observation: 'Buen estado',
        comment: '',
        records: [],
      },
    ],
  },
  {
    id: 'exhibidores',
    name: 'Exhibidores',
    progress: 100,
    reviewed: true,
    products: [
      {
        id: 'exh-01',
        name: 'Display metalico promocional',
        stock: 42,
        unavailable: 2,
        counted: 42,
        status: 'Coincide',
        observation: 'Buen estado',
        comment: '',
        records: [{ qty: 42, observation: 'Buen estado', time: '08:55', user: 'MG' }],
      },
    ],
  },
  {
    id: 'dulces',
    name: 'Dulces',
    progress: 12,
    reviewed: false,
    products: [
      {
        id: 'dul-01',
        name: 'Caramelo surtido bolsa 1 kg',
        stock: 2400,
        unavailable: 14,
        counted: 470,
        status: 'Pendiente',
        observation: 'Buen estado',
        comment: 'Primera mesa contada',
        records: [{ qty: 470, observation: 'Buen estado', time: '10:37', user: 'AR' }],
      },
    ],
  },
]

const historyRows = [
  { date: '20 abril 2026', week: 'Semana 17', cedis: 'CEDIS Tijuana', categories: 18, products: 342, counted: 48760, diff: -134, status: 'Cerrado', user: 'Maydel' },
  { date: '19 abril 2026', week: 'Semana 16', cedis: 'CEDIS Tijuana', categories: 17, products: 331, counted: 46120, diff: 42, status: 'Auditado', user: 'Andrea' },
  { date: '18 abril 2026', week: 'Semana 16', cedis: 'CEDIS Mexicali', categories: 14, products: 287, counted: 39240, diff: -18, status: 'Reabierto', user: 'Carlos' },
]

const activity = [
  { label: 'Inventario cargado desde PDF', time: '08:15 AM', icon: Upload },
  { label: 'Conteo iniciado por turno operativo', time: '08:32 AM', icon: ClipboardCheck },
  { label: 'Ultima edicion en categoria Snacks', time: '10:31 AM', icon: Pencil },
  { label: 'Guardado automatico del avance', time: '10:42 AM', icon: Save },
]

const navItems = [
  { id: 'summary', label: 'Resumen del dia', icon: BarChart3 },
  { id: 'upload', label: 'Cargar inventario', icon: Upload },
  { id: 'count', label: 'Conteo en proceso', icon: ClipboardCheck },
  { id: 'history', label: 'Historial de inventarios', icon: History },
]

function numberFormat(value) {
  return new Intl.NumberFormat('es-MX').format(value)
}

function getTotals() {
  const products = categories.flatMap((category) => category.products)
  const stock = products.reduce((total, product) => total + product.stock, 0)
  const counted = products.reduce((total, product) => total + product.counted, 0)
  return { products, stock, counted, diff: counted - stock }
}

function Badge({ children, tone = 'slate' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-200',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-800 ring-amber-200',
    red: 'bg-rose-50 text-rose-700 ring-rose-200',
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  }

  return <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ring-1 ${tones[tone]}`}>{children}</span>
}

function App() {
  const [activeView, setActiveView] = useState('summary')
  const [activeCategory, setActiveCategory] = useState(categories[0].id)
  const [compactView, setCompactView] = useState(false)
  const [inventoryOpen, setInventoryOpen] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const totals = useMemo(() => getTotals(), [])

  function openView(view) {
    setActiveView(view)
    setDrawerOpen(false)
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <button
        className="fixed left-4 top-4 z-50 grid h-12 w-12 place-items-center rounded-lg bg-slate-950 text-white shadow-lg lg:hidden"
        onClick={() => setDrawerOpen(true)}
        type="button"
        aria-label="Abrir menu"
      >
        <Menu size={22} />
      </button>

      {drawerOpen && <button className="fixed inset-0 z-40 bg-slate-950/45 lg:hidden" onClick={() => setDrawerOpen(false)} type="button" aria-label="Cerrar menu" />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex bg-slate-950 text-white transition-all duration-300 lg:translate-x-0 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${sidebarCollapsed ? 'w-[88px]' : 'w-[320px] xl:w-[340px]'}`}
      >
        <Sidebar
          activeView={activeView}
          collapsed={sidebarCollapsed}
          inventoryOpen={inventoryOpen}
          onCloseDrawer={() => setDrawerOpen(false)}
          onOpenView={openView}
          onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
          onToggleInventory={() => setInventoryOpen((value) => !value)}
        />
      </aside>

      <main className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-[88px]' : 'lg:pl-[320px] xl:pl-[340px]'}`}>
        <TopHeader activeView={activeView} />
        <div className="mx-auto max-w-[1600px] px-4 pb-8 pt-4 sm:px-6 lg:px-8">
          {activeView === 'summary' && <SummaryScreen totals={totals} onOpenView={openView} />}
          {activeView === 'upload' && <UploadScreen />}
          {activeView === 'count' && (
            <CountScreen
              activeCategory={activeCategory}
              compactView={compactView}
              onSetActiveCategory={setActiveCategory}
              onSetCompactView={setCompactView}
            />
          )}
          {activeView === 'history' && <HistoryScreen onOpenDetail={() => openView('detail')} />}
          {activeView === 'detail' && <DetailScreen onBack={() => openView('history')} totals={totals} />}
        </div>
      </main>
    </div>
  )
}

function Sidebar({ activeView, collapsed, inventoryOpen, onCloseDrawer, onOpenView, onToggleCollapsed, onToggleInventory }) {
  return (
    <div className="flex min-h-full w-full flex-col border-r border-white/10">
      <div className="flex min-h-20 items-center justify-between gap-3 border-b border-white/10 px-4">
        {!collapsed && (
          <div>
            <div className="text-xl font-black tracking-tight">SIO-Control</div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Inventario</div>
          </div>
        )}
        {collapsed && <div className="mx-auto text-lg font-black">SIO</div>}
        <div className="flex items-center gap-2">
          <button className="hidden h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-200 lg:grid" onClick={onToggleCollapsed} type="button" aria-label="Colapsar menu">
            {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>
          <button className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-200 lg:hidden" onClick={onCloseDrawer} type="button" aria-label="Cerrar menu">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="px-4 py-4">
        <div className={`inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-sm font-bold text-blue-200 ${collapsed ? 'justify-center px-2' : ''}`}>
          <ShieldCheck size={16} />
          {!collapsed && <span>Sistema activo</span>}
        </div>
      </div>

      <nav className="flex-1 space-y-2 px-3">
        <button
          className="flex min-h-14 w-full items-center justify-between rounded-lg bg-white/8 px-3 text-left text-sm font-black text-white ring-1 ring-white/10"
          onClick={onToggleInventory}
          type="button"
        >
          <span className="flex items-center gap-3">
            <PackageCheck size={22} />
            {!collapsed && <span>Inventario</span>}
          </span>
          {!collapsed && (inventoryOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />)}
        </button>

        {inventoryOpen && (
          <div className="space-y-1 pl-0">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeView === item.id || (activeView === 'detail' && item.id === 'history')
              return (
                <button
                  className={`flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-bold transition ${
                    isActive ? 'bg-blue-500 text-white shadow-lg shadow-blue-950/20' : 'text-slate-300 hover:bg-white/8 hover:text-white'
                  } ${collapsed ? 'justify-center' : ''}`}
                  key={item.id}
                  onClick={() => onOpenView(item.id)}
                  type="button"
                >
                  <Icon size={20} />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              )
            })}
          </div>
        )}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className={`rounded-lg border border-white/10 bg-white/5 p-4 ${collapsed ? 'grid place-items-center p-3' : ''}`}>
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-white text-sm font-black text-slate-950">MG</div>
          {!collapsed && (
            <div className="mt-3">
              <div className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Usuario</div>
              <div className="mt-1 font-black">Maydel</div>
              <div className="text-sm text-slate-400">auditoria@sio.mx</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TopHeader({ activeView }) {
  const titles = {
    summary: 'Resumen operativo',
    upload: 'Importacion diaria',
    count: 'Captura de conteo',
    history: 'Consulta historica',
    detail: 'Auditoria de inventario',
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex min-h-20 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="pl-14 lg:pl-0">
          <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">SIO-Control</div>
          <h1 className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{titles[activeView]}</h1>
        </div>
        <div className="hidden items-center gap-3 md:flex">
          <Badge tone="blue">CEDIS Tijuana</Badge>
          <Badge tone="green">Guardado visual</Badge>
        </div>
      </div>
    </header>
  )
}

function PageTitle({ eyebrow, title, children, action }) {
  return (
    <section className="mb-6 flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">{eyebrow}</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">{title}</h2>
        {children && <p className="mt-2 max-w-3xl text-base font-medium leading-7 text-slate-500">{children}</p>}
      </div>
      {action}
    </section>
  )
}

function SummaryScreen({ totals, onOpenView }) {
  const reviewed = categories.filter((category) => category.reviewed).length
  const progress = Math.round(categories.reduce((total, category) => total + category.progress, 0) / categories.length)

  return (
    <>
      <PageTitle
        eyebrow="Inventario actual"
        title="Inventario del dia"
        action={
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <ActionButton icon={Upload} label="Cargar PDF de inventario" onClick={() => onOpenView('upload')} primary />
            <ActionButton icon={ClipboardCheck} label="Continuar conteo" onClick={() => onOpenView('count')} />
            <ActionButton icon={History} label="Ver historial" onClick={() => onOpenView('history')} />
          </div>
        }
      >
        {inventoryMeta.date} · {inventoryMeta.week} · {inventoryMeta.cedis} · Ultima actualizacion {inventoryMeta.updatedAt}
      </PageTitle>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Kpi label="Total categorias" value={categories.length} icon={Layers3} />
        <Kpi label="Total productos" value={totals.products.length} icon={PackageCheck} />
        <Kpi label="Stock sistema" value={numberFormat(totals.stock)} icon={FileText} />
        <Kpi label="Total contado" value={numberFormat(totals.counted)} icon={ClipboardCheck} />
        <Kpi label="Diferencia acumulada" value={numberFormat(totals.diff)} icon={BarChart3} tone="red" />
        <Kpi label="Estado del conteo" value="En proceso" icon={Clock3} tone="blue" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-2xl font-black text-slate-950">Progreso de revision</h3>
              <p className="mt-1 text-slate-500">{reviewed} categorias revisadas, {categories.length - reviewed} pendientes</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-black text-blue-600">{progress}%</div>
              <div className="text-sm font-bold text-slate-400">avance general</div>
            </div>
          </div>
          <div className="mt-5 h-4 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {categories.map((category) => (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4" key={category.id}>
                <div className="flex items-center justify-between gap-3">
                  <div className="font-black text-slate-900">{category.name}</div>
                  {category.reviewed ? <Badge tone="green">Revisada</Badge> : <Badge tone="amber">Pendiente</Badge>}
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
                  <div className="h-full rounded-full bg-slate-900" style={{ width: `${category.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-2xl font-black text-slate-950">Actividad reciente</h3>
          <div className="mt-5 space-y-4">
            {activity.map((event) => {
              const Icon = event.icon
              return (
                <div className="flex gap-3" key={event.label}>
                  <div className="grid h-11 w-11 flex-none place-items-center rounded-lg bg-blue-50 text-blue-700">
                    <Icon size={20} />
                  </div>
                  <div>
                    <div className="font-black text-slate-900">{event.label}</div>
                    <div className="text-sm font-semibold text-slate-400">{event.time}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
        <FileSearch className="mx-auto text-slate-400" size={34} />
        <h3 className="mt-3 text-xl font-black text-slate-900">Estado vacio preparado</h3>
        <p className="mx-auto mt-2 max-w-2xl text-slate-500">Si no existe inventario del dia, esta zona mostraria el llamado principal para subir el PDF diario y crear la estructura inicial del conteo.</p>
      </section>
    </>
  )
}

function UploadScreen() {
  return (
    <>
      <PageTitle eyebrow="PDF diario" title="Cargar inventario diario">
        El sistema leera el PDF y conservara el orden original de categorias y productos para iniciar el conteo fisico.
      </PageTitle>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid min-h-[260px] place-items-center rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/60 p-6 text-center">
            <div>
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-lg bg-white text-blue-700 shadow-sm">
                <Upload size={30} />
              </div>
              <h3 className="mt-4 text-2xl font-black text-slate-950">Arrastra aqui el PDF de inventario</h3>
              <p className="mt-2 text-slate-500">Solo maqueta visual. Aqui se conectara el lector PDF posteriormente.</p>
              <button className="mt-5 min-h-14 rounded-lg bg-blue-600 px-6 text-base font-black text-white shadow-sm" type="button">Seleccionar archivo PDF</button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button className="min-h-12 rounded-lg border border-slate-300 bg-white px-5 font-black text-slate-700" type="button">Cancelar carga</button>
            <button className="min-h-12 rounded-lg border border-slate-300 bg-white px-5 font-black text-slate-700" type="button">Confirmar importacion</button>
            <button className="min-h-12 rounded-lg bg-slate-950 px-5 font-black text-white" type="button">Crear inventario del dia</button>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xl font-black text-slate-950">Datos detectados</h3>
          <div className="mt-4 grid gap-3">
            {[
              ['Semana', inventoryMeta.week],
              ['Fecha', inventoryMeta.date],
              ['CEDIS', inventoryMeta.cedis],
              ['Total general', '50,112 unidades'],
              ['Categorias', `${categories.length}`],
              ['Productos', `${getTotals().products.length}`],
            ].map(([label, value]) => (
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3" key={label}>
                <span className="font-bold text-slate-500">{label}</span>
                <strong className="text-slate-950">{value}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <InventoryPreview />
    </>
  )
}

function InventoryPreview() {
  return (
    <section className="mt-6 rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <h3 className="text-2xl font-black text-slate-950">Previsualizacion del inventario importado</h3>
        <p className="mt-1 text-slate-500">Categorias y productos respetando el orden original del PDF.</p>
      </div>
      <div className="divide-y divide-slate-200">
        {categories.slice(0, 3).map((category) => (
          <div className="p-5" key={category.id}>
            <div className="rounded-lg bg-slate-950 px-4 py-3 text-lg font-black text-white">{category.name}</div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3">Stock PDF</th>
                    <th className="px-4 py-3">No disponible</th>
                    <th className="px-4 py-3">Conteo fisico</th>
                    <th className="px-4 py-3">Diferencia</th>
                    <th className="px-4 py-3">Observacion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {category.products.map((product) => (
                    <tr key={product.id}>
                      <td className="px-4 py-4 font-black text-slate-900">{product.name}</td>
                      <td className="px-4 py-4">{numberFormat(product.stock)}</td>
                      <td className="px-4 py-4">{numberFormat(product.unavailable)}</td>
                      <td className="px-4 py-4"><div className="h-11 rounded-lg border border-slate-200 bg-slate-50" /></td>
                      <td className="px-4 py-4 text-slate-400">Pendiente</td>
                      <td className="px-4 py-4"><div className="h-11 rounded-lg border border-slate-200 bg-slate-50" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function CountScreen({ activeCategory, compactView, onSetActiveCategory, onSetCompactView }) {
  const currentCategory = categories.find((category) => category.id === activeCategory) || categories[0]
  const index = categories.findIndex((category) => category.id === currentCategory.id)

  return (
    <>
      <section className="sticky top-20 z-20 mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Conteo en proceso</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Inventario diario · {inventoryMeta.date}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">{inventoryMeta.cedis} · Avance general 58%</p>
          </div>
          <div className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_auto_auto]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input className="min-h-14 w-full rounded-lg border border-slate-200 bg-slate-50 pl-12 pr-4 font-bold outline-none focus:border-blue-500 focus:bg-white" placeholder="Buscar producto" />
            </label>
            <button className="min-h-14 rounded-lg border border-slate-300 bg-white px-5 font-black text-slate-700" onClick={() => onSetCompactView(!compactView)} type="button">
              {compactView ? 'Vista detallada' : 'Vista compacta'}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button className="min-h-14 rounded-lg bg-blue-600 px-5 font-black text-white" type="button">Guardar</button>
              <button className="min-h-14 rounded-lg bg-slate-950 px-5 font-black text-white" type="button">Guardar y salir</button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="xl:sticky xl:top-44 xl:h-[calc(100svh-12rem)]">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm xl:h-full xl:overflow-y-auto">
            <h3 className="text-lg font-black text-slate-950">Categorias del PDF</h3>
            <div className="mt-4 space-y-3">
              {categories.map((category) => (
                <button
                  className={`w-full rounded-lg border p-4 text-left transition ${
                    category.id === currentCategory.id ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                  key={category.id}
                  onClick={() => onSetActiveCategory(category.id)}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-slate-950">{category.name}</strong>
                    {category.reviewed ? <CheckCircle2 className="text-emerald-600" size={20} /> : <Clock3 className="text-amber-500" size={20} />}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm font-bold text-slate-500">
                    <span>{category.products.length} productos</span>
                    <span>{category.progress}%</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${category.progress}%` }} />
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button className="min-h-12 rounded-lg border border-slate-300 bg-white px-3 font-black text-slate-700" type="button"><ChevronLeft className="inline" size={18} /> Anterior</button>
              <button className="min-h-12 rounded-lg bg-slate-950 px-3 font-black text-white" type="button">Siguiente <ChevronRight className="inline" size={18} /></button>
            </div>
          </section>
        </aside>

        <section>
          <div className="mb-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Categoria activa {index + 1} de {categories.length}</p>
                <h3 className="mt-1 text-3xl font-black text-slate-950">{currentCategory.name}</h3>
              </div>
              <Badge tone={currentCategory.reviewed ? 'green' : 'amber'}>{currentCategory.reviewed ? 'Revisada' : 'Pendiente'}</Badge>
            </div>
          </div>

          <div className="space-y-4">
            {currentCategory.products.map((product) => compactView ? <ProductCompactRow key={product.id} product={product} /> : <ProductCard key={product.id} product={product} />)}
          </div>
        </section>
      </div>
    </>
  )
}

function ProductCompactRow({ product }) {
  const diff = product.counted - product.stock
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_repeat(4,120px)_180px] lg:items-center">
        <div>
          <div className="font-black text-slate-950">{product.name}</div>
          <div className="mt-1 text-sm text-slate-500">{product.records.length} registros capturados</div>
        </div>
        <Metric label="Stock" value={product.stock} />
        <Metric label="No disp." value={product.unavailable} />
        <Metric label="Total" value={product.counted} />
        <Metric label="Dif." value={diff} tone={diff === 0 ? 'green' : diff > 0 ? 'amber' : 'red'} />
        <div className="flex gap-2">
          <input className="min-h-12 min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 font-black" placeholder="0" />
          <button className="min-h-12 rounded-lg bg-blue-600 px-4 font-black text-white" type="button">Agregar</button>
        </div>
      </div>
    </article>
  )
}

function ProductCard({ product }) {
  const diff = product.counted - product.stock
  const tone = diff === 0 ? 'green' : diff > 0 ? 'amber' : 'red'

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-2xl font-black text-slate-950">{product.name}</h4>
            <Badge tone={tone}>{product.status}</Badge>
            {product.comment && <Badge tone="amber">Observacion</Badge>}
            {product.records.length > 1 && <Badge tone="blue">{product.records.length} registros</Badge>}
          </div>
          <p className="mt-2 text-slate-500">{product.comment || 'Sin comentarios registrados'}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label="Stock sistema" value={product.stock} />
          <Metric label="No disponible" value={product.unavailable} />
          <Metric label="Total contado" value={product.counted} />
          <Metric label="Diferencia" value={diff} tone={tone} />
        </div>
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-[150px_190px_minmax(180px,1fr)_160px]">
        <input className="min-h-14 rounded-lg border border-slate-200 bg-slate-50 px-4 text-xl font-black outline-none focus:border-blue-500 focus:bg-white" placeholder="0" type="number" />
        <select className="min-h-14 rounded-lg border border-slate-200 bg-white px-4 font-bold outline-none focus:border-blue-500">
          {['Buen estado', 'Danado', 'Mojado', 'Caducado', 'Otro'].map((option) => <option key={option}>{option}</option>)}
        </select>
        <input className="min-h-14 rounded-lg border border-slate-200 bg-slate-50 px-4 font-semibold outline-none focus:border-blue-500 focus:bg-white" placeholder="Comentario corto opcional" />
        <button className="min-h-14 rounded-lg bg-blue-600 px-5 font-black text-white" type="button">Agregar conteo</button>
      </div>

      <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <h5 className="font-black text-slate-900">Registros capturados</h5>
          <button className="text-sm font-black text-blue-700" type="button">Ver historial</button>
        </div>
        <div className="mt-3 grid gap-2">
          {product.records.length === 0 && <div className="rounded-lg bg-white p-4 text-sm font-bold text-slate-400">Sin conteos capturados todavia</div>}
          {product.records.map((record, index) => (
            <div className="grid gap-3 rounded-lg bg-white p-3 sm:grid-cols-[90px_minmax(0,1fr)_80px_70px_80px] sm:items-center" key={`${product.id}-${index}`}>
              <strong className="text-lg text-slate-950">+{record.qty}</strong>
              <span className="font-bold text-slate-600">{record.observation}</span>
              <span className="text-sm font-bold text-slate-400">{record.time}</span>
              <span className="text-sm font-black text-slate-700">{record.user}</span>
              <span className="flex gap-2 text-slate-400">
                <Edit3 size={18} />
                <Trash2 size={18} />
              </span>
            </div>
          ))}
        </div>
      </div>
    </article>
  )
}

function HistoryScreen({ onOpenDetail }) {
  return (
    <>
      <PageTitle eyebrow="Auditoria" title="Historial de inventarios">
        Consulta inventarios guardados, reabre conteos y exporta resumenes para auditoria interna.
      </PageTitle>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[160px_180px_180px_minmax(220px,1fr)_auto]">
          <input className="min-h-12 rounded-lg border border-slate-200 bg-slate-50 px-4 font-bold" placeholder="Fecha" />
          <select className="min-h-12 rounded-lg border border-slate-200 bg-white px-4 font-bold"><option>CEDIS</option></select>
          <select className="min-h-12 rounded-lg border border-slate-200 bg-white px-4 font-bold"><option>Estado</option></select>
          <input className="min-h-12 rounded-lg border border-slate-200 bg-slate-50 px-4 font-bold" placeholder="Buscar texto" />
          <button className="min-h-12 rounded-lg bg-slate-950 px-5 font-black text-white" type="button"><Filter className="inline" size={18} /> Filtrar</button>
        </div>
      </section>

      <section className="mt-5 grid gap-4">
        {historyRows.map((row) => (
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={`${row.date}-${row.cedis}`}>
            <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr_auto] xl:items-center">
              <div>
                <div className="text-xl font-black text-slate-950">{row.date}</div>
                <div className="mt-1 text-sm font-bold text-slate-500">{row.week} · {row.cedis}</div>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <Metric label="Categorias" value={row.categories} />
                <Metric label="Productos" value={row.products} />
                <Metric label="Contado" value={row.counted} />
                <Metric label="Dif." value={row.diff} tone={row.diff === 0 ? 'green' : row.diff > 0 ? 'amber' : 'red'} />
                <div><div className="text-xs font-black uppercase text-slate-400">Usuario</div><div className="mt-1 font-black">{row.user}</div></div>
              </div>
              <div className="flex flex-wrap gap-2">
                <SmallAction icon={Eye} label="Ver detalle" onClick={onOpenDetail} />
                <SmallAction icon={ArchiveRestore} label="Reabrir" />
                <SmallAction icon={Edit3} label="Editar" />
                <SmallAction icon={Copy} label="Duplicar" />
                <SmallAction icon={Download} label="Exportar" />
              </div>
            </div>
          </article>
        ))}
      </section>
    </>
  )
}

function DetailScreen({ onBack, totals }) {
  return (
    <>
      <PageTitle
        eyebrow="Modo edicion"
        title="Detalle de inventario guardado"
        action={<button className="min-h-12 rounded-lg border border-slate-300 bg-white px-5 font-black text-slate-700" onClick={onBack} type="button"><RotateCcw className="inline" size={18} /> Volver al historial</button>}
      >
        Inventario guardado con resumen estadistico, categorias desplegables y trazabilidad de conteos por producto.
      </PageTitle>
      <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 font-bold text-amber-900">Modo edicion visual activo: los cambios se guardaran cuando se conecte Firebase.</div>
      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label="Stock original" value={numberFormat(totals.stock)} icon={FileText} />
        <Kpi label="Total contado" value={numberFormat(totals.counted)} icon={ClipboardCheck} />
        <Kpi label="Diferencia total" value={numberFormat(totals.diff)} icon={BarChart3} tone="red" />
        <Kpi label="Estatus final" value="Reabierto" icon={BadgeCheck} tone="blue" />
      </div>
      <section className="mt-6 space-y-4">
        {categories.map((category) => (
          <details className="rounded-lg border border-slate-200 bg-white shadow-sm" key={category.id} open={category.id === 'cereal'}>
            <summary className="cursor-pointer list-none p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-2xl font-black text-slate-950">{category.name}</h3>
                <Badge tone={category.reviewed ? 'green' : 'amber'}>{category.reviewed ? 'Revisada' : 'Pendiente'}</Badge>
              </div>
            </summary>
            <div className="divide-y divide-slate-100 border-t border-slate-200">
              {category.products.map((product) => (
                <div className="grid gap-4 p-5 xl:grid-cols-[minmax(260px,1fr)_repeat(4,130px)_auto]" key={product.id}>
                  <div>
                    <div className="font-black text-slate-950">{product.name}</div>
                    <div className="mt-1 text-sm text-slate-500">{product.records.length} conteos registrados · {product.observation}</div>
                  </div>
                  <Metric label="Stock" value={product.stock} />
                  <Metric label="Contado" value={product.counted} />
                  <Metric label="Dif." value={product.counted - product.stock} tone={product.counted - product.stock === 0 ? 'green' : 'red'} />
                  <Metric label="No disp." value={product.unavailable} />
                  <button className="min-h-12 rounded-lg bg-slate-950 px-5 font-black text-white" type="button">Editar conteo</button>
                </div>
              ))}
            </div>
          </details>
        ))}
      </section>
    </>
  )
}

function Kpi({ label, value, icon, tone = 'slate' }) {
  const IconComponent = icon
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    red: 'bg-rose-50 text-rose-700',
    slate: 'bg-slate-100 text-slate-700',
  }
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</span>
        <div className={`grid h-10 w-10 place-items-center rounded-lg ${tones[tone] || tones.slate}`}>
          <IconComponent size={20} />
        </div>
      </div>
      <strong className="mt-3 block text-2xl font-black tracking-tight text-slate-950">{value}</strong>
    </article>
  )
}

function Metric({ label, value, tone = 'slate' }) {
  const tones = {
    green: 'text-emerald-700',
    amber: 'text-amber-700',
    red: 'text-rose-700',
    slate: 'text-slate-950',
  }
  return (
    <div>
      <div className="text-xs font-black uppercase text-slate-400">{label}</div>
      <div className={`mt-1 text-lg font-black ${tones[tone]}`}>{numberFormat(value)}</div>
    </div>
  )
}

function ActionButton({ icon, label, onClick, primary = false }) {
  const IconComponent = icon

  return (
    <button className={`min-h-14 rounded-lg px-5 text-sm font-black shadow-sm ${primary ? 'bg-blue-600 text-white' : 'border border-slate-300 bg-white text-slate-700'}`} onClick={onClick} type="button">
      <IconComponent className="mr-2 inline" size={18} />
      {label}
    </button>
  )
}

function SmallAction({ icon, label, onClick }) {
  const IconComponent = icon

  return (
    <button className="min-h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-700" onClick={onClick} type="button">
      <IconComponent className="mr-1 inline" size={16} />
      {label}
    </button>
  )
}

export default App
