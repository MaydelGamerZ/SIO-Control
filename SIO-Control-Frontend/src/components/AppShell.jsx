import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  History,
  LogOut,
  Menu,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const navItems = [
  { to: '/inventario/resumen', label: 'Resumen del dia', icon: BarChart3 },
  { to: '/inventario/cargar', label: 'Cargar inventario', icon: Upload },
  { to: '/inventario/conteo', label: 'Conteo en proceso', icon: ClipboardCheck },
  { to: '/inventario/historial', label: 'Historial de inventarios', icon: History },
]

function getInitials(user) {
  const source = user?.displayName || user?.email || 'Usuario'
  return source
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export default function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [inventoryOpen, setInventoryOpen] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isInventoryDetail = /^\/inventario\/(?!resumen$|cargar$|conteo$|historial$)[^/]+(?:\/editar)?$/.test(location.pathname)

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-app bg-slate-950 text-slate-100">
      <button
        className="safe-top fixed left-4 top-0 z-50 mt-4 grid h-12 w-12 place-items-center rounded-xl border border-white/10 bg-slate-950 text-white shadow-xl shadow-black/40 lg:hidden"
        onClick={() => setDrawerOpen(true)}
        type="button"
        aria-label="Abrir menu"
      >
        <Menu size={22} />
      </button>

      {drawerOpen && (
        <button
          aria-label="Cerrar menu"
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden"
          onClick={() => setDrawerOpen(false)}
          type="button"
        />
      )}

      <aside
        className={`safe-top safe-bottom fixed inset-y-0 left-0 z-50 flex max-w-[calc(100vw-1.25rem)] bg-[#060b13] text-white transition-all duration-300 lg:max-w-none lg:translate-x-0 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${sidebarCollapsed ? 'w-[88px]' : 'w-[320px] xl:w-[340px]'}`}
      >
        <div className="flex min-h-full w-full flex-col border-r border-white/10">
          <div className="flex min-h-20 items-center justify-between gap-3 border-b border-white/10 px-4">
            {!sidebarCollapsed && (
              <div>
                <div className="text-xl font-black tracking-tight">SIO-Control</div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Inventario</div>
              </div>
            )}
            {sidebarCollapsed && <div className="mx-auto text-lg font-black">SIO</div>}
            <div className="flex items-center gap-2">
              <button
                aria-label="Colapsar menu"
                className="hidden h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-200 lg:grid"
                onClick={() => setSidebarCollapsed((value) => !value)}
                type="button"
              >
                {sidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
              </button>
              <button
                aria-label="Cerrar menu"
                className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-200 lg:hidden"
                onClick={() => setDrawerOpen(false)}
                type="button"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="px-4 py-4">
            <div className={`inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-sm font-bold text-blue-200 ${sidebarCollapsed ? 'justify-center px-2' : ''}`}>
              <ShieldCheck size={16} />
              {!sidebarCollapsed && <span>Sistema activo</span>}
            </div>
          </div>

          <nav className="flex-1 space-y-2 px-3">
            <button
              className="flex min-h-14 w-full items-center justify-between rounded-lg bg-white/10 px-3 text-left text-sm font-black text-white ring-1 ring-white/10"
              onClick={() => setInventoryOpen((value) => !value)}
              type="button"
            >
              <span className="flex items-center gap-3">
                <PackageCheck size={22} />
                {!sidebarCollapsed && <span>Inventario</span>}
              </span>
              {!sidebarCollapsed && (inventoryOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />)}
            </button>

            {inventoryOpen && (
              <div className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      className={({ isActive }) =>
                        `flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-bold transition ${
                          isActive || (item.to.includes('historial') && isInventoryDetail)
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-950/20'
                            : 'text-slate-300 hover:bg-white/10 hover:text-white'
                        } ${sidebarCollapsed ? 'justify-center' : ''}`
                      }
                      key={item.to}
                      onClick={() => setDrawerOpen(false)}
                      to={item.to}
                    >
                      <Icon size={20} />
                      {!sidebarCollapsed && <span>{item.label}</span>}
                    </NavLink>
                  )
                })}
              </div>
            )}
          </nav>

          <div className="space-y-3 border-t border-white/10 p-4">
            <div className={`rounded-lg border border-white/10 bg-white/5 p-4 ${sidebarCollapsed ? 'grid place-items-center p-3' : ''}`}>
              <div className="grid h-12 w-12 place-items-center rounded-lg bg-blue-500 text-sm font-black text-white">
                {getInitials(user)}
              </div>
              {!sidebarCollapsed && (
                <div className="mt-3">
                  <div className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Usuario</div>
                  <div className="mt-1 font-black">{user?.displayName || 'Usuario'}</div>
                  <div className="break-all text-sm text-slate-400">{user?.email}</div>
                </div>
              )}
            </div>
            <button
              className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 font-black text-white hover:bg-rose-700 ${sidebarCollapsed ? 'px-2' : ''}`}
              onClick={handleLogout}
              type="button"
            >
              <LogOut size={20} />
              {!sidebarCollapsed && <span>Cerrar sesion</span>}
            </button>
          </div>
        </div>
      </aside>

      <main className={`min-w-0 transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-[88px]' : 'lg:pl-[320px] xl:pl-[340px]'}`}>
        <header className="safe-top sticky top-0 z-30 border-b border-white/10 bg-slate-950/90 backdrop-blur">
          <div className="safe-x mx-auto flex min-h-20 max-w-[1600px] items-center justify-between gap-4 sm:px-6 lg:px-8">
            <div className="pl-14 lg:pl-0">
              <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">SIO-Control</div>
              <h1 className="mt-1 text-xl font-black tracking-tight text-slate-50 sm:text-2xl">Conteo de inventario</h1>
            </div>
            <div className="hidden items-center gap-3 md:flex">
              <span className="rounded-md bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-200 ring-1 ring-blue-300/20">Tablet ready</span>
              <span className="rounded-md bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-200 ring-1 ring-emerald-300/20">Firestore activo</span>
            </div>
          </div>
        </header>
        <div className="safe-x safe-bottom mx-auto max-w-[1600px] pt-4 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
