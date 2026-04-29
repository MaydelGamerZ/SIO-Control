import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, Package, BarChart3, Users, Gamepad2 } from 'lucide-react'

const navItems = [
  { to: '/', label: 'Panel', icon: LayoutDashboard },
  { to: '/ordenes', label: 'Ordenes', icon: ClipboardList },
  { to: '/inventario', label: 'Inventario', icon: Package },
  { to: '/reportes', label: 'Reportes', icon: BarChart3 },
  { to: '/equipo', label: 'Equipo', icon: Users },
  { to: '/juego', label: 'Juego', icon: Gamepad2 },
]

const team = [
  { name: 'Planeacion', value: '42 ordenes' },
  { name: 'Calidad', value: '18 revisiones' },
  { name: 'Logistica', value: '31 salidas' },
]

export default function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white px-5 py-6 lg:block">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-lg bg-slate-950 text-sm font-bold text-white">
          SIO
        </div>
        <div>
          <p className="text-sm font-semibold leading-5">SIO Control</p>
          <p className="text-xs text-slate-500">Operacion integral</p>
        </div>
      </div>

      <nav className="mt-8 space-y-1 text-sm">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 font-medium transition-colors ${
                isActive
                  ? 'bg-slate-950 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-8 border-t border-slate-200 pt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Turno activo</p>
        <div className="mt-4 space-y-3">
          {team.map((item) => (
            <div className="flex items-center justify-between text-sm" key={item.name}>
              <span className="text-slate-600">{item.name}</span>
              <span className="font-medium text-slate-950">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
