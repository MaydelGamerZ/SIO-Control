import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  GitCompare,
  History,
  Home,
  LogOut,
  Menu,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Upload,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useUserProfile } from '../hooks/useUserProfile'
import { canAuditUser } from '../services/userService'

const inventoryItems = [
  { to: '/inventario/resumen', label: 'Resumen del dia', icon: BarChart3 },
  { to: '/inventario/cargar', label: 'Cargar inventario', icon: Upload },
  { to: '/inventario/conteo', label: 'Conteo en proceso', icon: ClipboardCheck },
  { to: '/inventario/comparar', label: 'Comparar conteos', icon: GitCompare, auditOnly: true },
  { to: '/inventario/historial', label: 'Historial', icon: History },
]

const mainItems = [
  { to: '/inicio', label: 'Inicio', icon: Home },
]

const adminItems = [
  { to: '/administracion/usuarios', label: 'Usuarios', icon: Users },
]

function SidebarTooltip({ children, visible }) {
  if (!visible) return null
  return (
    <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden w-max -translate-y-1/2 rounded-md bg-slate-800 px-2.5 py-1.5 text-xs font-black text-white shadow-xl ring-1 ring-white/10 group-hover:block">
      {children}
    </span>
  )
}

function NavItem({ collapsed, exactActive = false, icon, label, onSelect, to }) {
  const IconComponent = icon
  return (
    <NavLink
      className={({ isActive }) =>
        `group relative flex min-h-12 items-center gap-3 rounded-xl text-sm font-black transition ${
          collapsed ? 'justify-center px-0' : 'px-3'
        } ${
          isActive || exactActive
            ? 'bg-blue-500/15 text-blue-100 ring-1 ring-blue-300/25'
            : 'text-slate-300 hover:bg-white/10 hover:text-white'
        }`
      }
      onClick={onSelect}
      title={collapsed ? label : undefined}
      to={to}
    >
      {({ isActive }) => (
        <>
          {(isActive || exactActive) && <span className="absolute left-0 top-2 h-8 w-1 rounded-r-full bg-blue-400" />}
          <IconComponent size={21} />
          {!collapsed && <span className="truncate">{label}</span>}
          <SidebarTooltip visible={collapsed}>{label}</SidebarTooltip>
        </>
      )}
    </NavLink>
  )
}

export default function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [inventoryOpen, setInventoryOpen] = useState(true)
  const [adminOpen, setAdminOpen] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { logout, user } = useAuth()
  const { profile } = useUserProfile()
  const navigate = useNavigate()
  const location = useLocation()
  const userLabel = user?.displayName || user?.email || 'Usuario'
  const canAudit = canAuditUser(user, profile)
  const inventoryDetailActive = /^\/inventario\/(?!resumen$|cargar$|conteo$|comparar$|historial$)[^/]+(?:\/editar|\/comparar)?$/.test(location.pathname)

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  function closeDrawer() {
    setDrawerOpen(false)
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
          className="fixed inset-0 z-40 bg-slate-950/75 backdrop-blur-sm lg:hidden"
          onClick={closeDrawer}
          type="button"
        />
      )}

      <aside
        className={`safe-top safe-bottom fixed inset-y-0 left-0 z-50 flex max-w-[calc(100vw-1rem)] bg-[#060b13] text-white shadow-2xl shadow-black/40 transition-transform duration-300 lg:max-w-none lg:translate-x-0 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${sidebarCollapsed ? 'w-[88px]' : 'w-[304px] xl:w-[320px]'}`}
      >
        <div className="flex min-h-0 w-full flex-col border-r border-white/10">
          <header className={`flex min-h-20 flex-none items-center border-b border-white/10 px-4 ${sidebarCollapsed ? 'justify-center' : 'justify-between gap-3'}`}>
            {!sidebarCollapsed ? (
              <div className="min-w-0">
                <div className="truncate text-xl font-black tracking-tight">SIO-Control</div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Inventario operativo</div>
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-black">SIO</div>
            )}
            <div className="flex items-center gap-2">
              <button
                aria-label="Colapsar menu"
                className="hidden h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 lg:grid"
                onClick={() => setSidebarCollapsed((value) => !value)}
                type="button"
              >
                {sidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
              </button>
              <button
                aria-label="Cerrar menu"
                className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 lg:hidden"
                onClick={closeDrawer}
                type="button"
              >
                <X size={20} />
              </button>
            </div>
          </header>

          <nav className="touch-scroll min-h-0 flex-1 overflow-y-auto px-3 py-4">
            <div className={`mb-4 flex items-center gap-2 rounded-full border border-blue-400/25 bg-blue-500/10 px-3 py-2 text-sm font-bold text-blue-200 ${sidebarCollapsed ? 'justify-center px-0' : ''}`}>
              <ShieldCheck size={16} />
              {!sidebarCollapsed && <span>Sistema activo</span>}
            </div>

            <div className="space-y-2">
              {mainItems.map((item) => (
                <NavItem collapsed={sidebarCollapsed} key={item.to} onSelect={closeDrawer} {...item} />
              ))}

              <button
                className={`group relative flex min-h-12 w-full items-center rounded-xl bg-white/5 text-sm font-black text-white ring-1 ring-white/10 transition hover:bg-white/10 ${
                  sidebarCollapsed ? 'justify-center px-0' : 'justify-between px-3'
                }`}
                onClick={() => setInventoryOpen((value) => !value)}
                type="button"
                title={sidebarCollapsed ? 'Inventario' : undefined}
              >
                <span className="flex items-center gap-3">
                  <PackageCheck size={21} />
                  {!sidebarCollapsed && <span>Inventario</span>}
                </span>
                {!sidebarCollapsed && (inventoryOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />)}
                <SidebarTooltip visible={sidebarCollapsed}>Inventario</SidebarTooltip>
              </button>

              {(inventoryOpen || sidebarCollapsed) && (
                <div className={`space-y-1 ${sidebarCollapsed ? '' : 'pl-2'}`}>
                  {inventoryItems.filter((item) => !item.auditOnly || canAudit).map((item) => (
                    <NavItem
                      collapsed={sidebarCollapsed}
                      exactActive={item.to.includes('historial') && inventoryDetailActive}
                      key={item.to}
                      onSelect={closeDrawer}
                      {...item}
                    />
                  ))}
                </div>
              )}

              {canAudit && (
                <>
                  <button
                    className={`group relative mt-4 flex min-h-12 w-full items-center rounded-xl bg-white/5 text-sm font-black text-white ring-1 ring-white/10 transition hover:bg-white/10 ${
                      sidebarCollapsed ? 'justify-center px-0' : 'justify-between px-3'
                    }`}
                    onClick={() => setAdminOpen((value) => !value)}
                    type="button"
                    title={sidebarCollapsed ? 'Administracion' : undefined}
                  >
                    <span className="flex items-center gap-3">
                      <Users size={21} />
                      {!sidebarCollapsed && <span>Administracion</span>}
                    </span>
                    {!sidebarCollapsed && (adminOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />)}
                    <SidebarTooltip visible={sidebarCollapsed}>Administracion</SidebarTooltip>
                  </button>
                  {(adminOpen || sidebarCollapsed) && (
                    <div className={`space-y-1 ${sidebarCollapsed ? '' : 'pl-2'}`}>
                      {adminItems.map((item) => (
                        <NavItem collapsed={sidebarCollapsed} key={item.to} onSelect={closeDrawer} {...item} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </nav>

          <footer className="flex-none border-t border-white/10 bg-[#060b13] p-3">
            {!sidebarCollapsed && (
              <div className="mb-3 min-w-0 px-1">
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Usuario</div>
                <div className="mt-1 truncate text-sm font-black text-slate-200">{userLabel}</div>
              </div>
            )}
            <button
              className={`group relative flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-rose-300/20 bg-rose-600/15 px-3 font-black text-rose-100 transition hover:bg-rose-600 hover:text-white ${
                sidebarCollapsed ? 'px-0' : ''
              }`}
              onClick={handleLogout}
              type="button"
              title={sidebarCollapsed ? 'Cerrar sesion' : undefined}
            >
              <LogOut size={20} />
              {!sidebarCollapsed && <span>Cerrar sesion</span>}
              <SidebarTooltip visible={sidebarCollapsed}>Cerrar sesion</SidebarTooltip>
            </button>
          </footer>
        </div>
      </aside>

      <main className={`min-w-0 transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-[88px]' : 'lg:pl-[304px] xl:pl-[320px]'}`}>
        <header className="safe-top sticky top-0 z-30 border-b border-white/10 bg-slate-950/90 backdrop-blur">
          <div className="safe-x mx-auto flex min-h-20 max-w-[1600px] items-center justify-between gap-4 sm:px-6 lg:px-8">
            <div className="min-w-0 pl-14 lg:pl-0">
              <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">SIO-Control</div>
              <h1 className="mt-1 truncate text-xl font-black tracking-tight text-slate-50 sm:text-2xl">Conteo de inventario</h1>
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
