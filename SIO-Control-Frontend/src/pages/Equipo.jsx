import { Users } from 'lucide-react'

const members = [
  { name: 'Carlos Mendoza', role: 'Jefe de turno', area: 'Produccion', status: 'Activo', orders: 18 },
  { name: 'Ana Torres', role: 'Inspectora', area: 'Calidad', status: 'Activo', orders: 12 },
  { name: 'Roberto Diaz', role: 'Operador', area: 'Linea A', status: 'Activo', orders: 24 },
  { name: 'Laura Mendez', role: 'Coordinadora', area: 'Logistica', status: 'Descanso', orders: 9 },
  { name: 'Miguel Herrera', role: 'Operador', area: 'Linea B', status: 'Activo', orders: 21 },
  { name: 'Patricia Rios', role: 'Supervisora', area: 'Embarques', status: 'Activo', orders: 15 },
]

const statusColor = {
  'Activo': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Descanso': 'bg-slate-100 text-slate-600 border-slate-200',
}

export default function Equipo() {
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-cyan-700">Personal</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950 md:text-3xl">Equipo</h1>
          </div>
        </div>
      </header>

      <div className="p-4 md:p-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => (
            <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={m.name}>
              <div className="flex items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
                  <Users size={22} />
                </div>
                <div>
                  <p className="font-semibold text-slate-950">{m.name}</p>
                  <p className="text-sm text-slate-500">{m.role}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
                <div>
                  <p className="text-slate-500">Area</p>
                  <p className="font-medium text-slate-950">{m.area}</p>
                </div>
                <div>
                  <p className="text-slate-500">Ordenes</p>
                  <p className="font-medium text-slate-950">{m.orders}</p>
                </div>
                <span className={`rounded-md border px-2 py-1 text-xs font-medium ${statusColor[m.status]}`}>{m.status}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </>
  )
}
