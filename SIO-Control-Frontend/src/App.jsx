const metrics = [
  { label: 'Ordenes activas', value: '128', delta: '+12%', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { label: 'Produccion diaria', value: '86%', delta: '+4.8%', tone: 'text-cyan-700 bg-cyan-50 border-cyan-200' },
  { label: 'Alertas abiertas', value: '7', delta: '-3', tone: 'text-amber-700 bg-amber-50 border-amber-200' },
  { label: 'Entregas a tiempo', value: '94%', delta: '+2.1%', tone: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
]

const operations = [
  { area: 'Linea A', task: 'Corte y ensamble', status: 'En curso', owner: 'Turno Norte', progress: 76 },
  { area: 'Linea B', task: 'Control de calidad', status: 'Revision', owner: 'Calidad', progress: 54 },
  { area: 'Almacen', task: 'Surtido de materiales', status: 'Prioridad', owner: 'Logistica', progress: 88 },
  { area: 'Embarques', task: 'Ruta Tijuana Centro', status: 'Listo', owner: 'Distribucion', progress: 100 },
]

const incidents = [
  { title: 'Material bajo en acero 304', time: '08:40', level: 'Media' },
  { title: 'Mantenimiento preventivo P-12', time: '10:15', level: 'Baja' },
  { title: 'Retraso proveedor zona 3', time: '11:05', level: 'Alta' },
]

const team = [
  { name: 'Planeacion', value: '42 ordenes' },
  { name: 'Calidad', value: '18 revisiones' },
  { name: 'Logistica', value: '31 salidas' },
]

function App() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="flex min-h-screen">
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
            {['Panel', 'Ordenes', 'Inventario', 'Reportes', 'Equipo'].map((item, index) => (
              <a
                className={`flex items-center justify-between rounded-md px-3 py-2 font-medium ${
                  index === 0
                    ? 'bg-slate-950 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                }`}
                href="#"
                key={item}
              >
                {item}
                {index === 0 && <span className="h-2 w-2 rounded-full bg-emerald-400" />}
              </a>
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

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur md:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-cyan-700">Panel operativo</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950 md:text-3xl">
                  Control diario de produccion
                </h1>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100">
                  Exportar
                </button>
                <button className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800">
                  Nueva orden
                </button>
              </div>
            </div>
          </header>

          <div className="space-y-6 p-4 md:p-8">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => (
                <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={metric.label}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-slate-500">{metric.label}</p>
                    <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${metric.tone}`}>
                      {metric.delta}
                    </span>
                  </div>
                  <p className="mt-4 text-3xl font-semibold tracking-normal text-slate-950">{metric.value}</p>
                </article>
              ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
              <article className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold tracking-normal text-slate-950">Flujo de operaciones</h2>
                    <p className="text-sm text-slate-500">Estado por area y avance de tareas criticas</p>
                  </div>
                  <select className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100">
                    <option>Hoy</option>
                    <option>Esta semana</option>
                    <option>Este mes</option>
                  </select>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Area</th>
                        <th className="px-5 py-3 font-semibold">Tarea</th>
                        <th className="px-5 py-3 font-semibold">Responsable</th>
                        <th className="px-5 py-3 font-semibold">Estado</th>
                        <th className="px-5 py-3 font-semibold">Avance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {operations.map((operation) => (
                        <tr className="hover:bg-slate-50" key={operation.area}>
                          <td className="px-5 py-4 font-medium text-slate-950">{operation.area}</td>
                          <td className="px-5 py-4 text-slate-600">{operation.task}</td>
                          <td className="px-5 py-4 text-slate-600">{operation.owner}</td>
                          <td className="px-5 py-4">
                            <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700">
                              {operation.status}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-200">
                                <div className="h-full rounded-full bg-cyan-600" style={{ width: `${operation.progress}%` }} />
                              </div>
                              <span className="w-10 text-xs font-semibold text-slate-600">{operation.progress}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold tracking-normal text-slate-950">Alertas</h2>
                    <p className="text-sm text-slate-500">Eventos del turno actual</p>
                  </div>
                  <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">7 abiertas</span>
                </div>

                <div className="mt-5 space-y-4">
                  {incidents.map((incident) => (
                    <div className="border-l-2 border-cyan-600 pl-4" key={incident.title}>
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium text-slate-950">{incident.title}</p>
                        <span className="text-xs text-slate-500">{incident.time}</span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-slate-500">Prioridad {incident.level}</p>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="grid gap-6 lg:grid-cols-3">
              <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
                <h2 className="text-lg font-semibold tracking-normal text-slate-950">Capacidad semanal</h2>
                <div className="mt-6 flex h-52 items-end gap-3">
                  {[62, 74, 58, 86, 91, 68, 80].map((height, index) => (
                    <div className="flex flex-1 flex-col items-center gap-2" key={index}>
                      <div className="w-full rounded-t-md bg-cyan-600" style={{ height: `${height}%` }} />
                      <span className="text-xs font-medium text-slate-500">{['L', 'M', 'X', 'J', 'V', 'S', 'D'][index]}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-lg border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
                <p className="text-sm font-medium text-cyan-200">Objetivo del dia</p>
                <p className="mt-3 text-4xl font-semibold tracking-normal">1,840</p>
                <p className="mt-2 text-sm text-slate-300">piezas programadas</p>
                <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/15">
                  <div className="h-full w-[86%] rounded-full bg-emerald-400" />
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-slate-300">
                  <span>Avance</span>
                  <span className="font-semibold text-white">86%</span>
                </div>
              </article>
            </section>
          </div>
        </section>
      </div>
    </main>
  )
}

export default App
