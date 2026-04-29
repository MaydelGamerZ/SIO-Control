import { useState } from 'react'
import { Search, Plus, Filter } from 'lucide-react'

const initialOrders = [
  { id: 'ORD-001', client: 'Aceros del Norte', product: 'Placa 304', qty: 120, status: 'En proceso', priority: 'Alta', date: '2026-04-28' },
  { id: 'ORD-002', client: 'Metales Industriales', product: 'Barra 316L', qty: 85, status: 'Pendiente', priority: 'Media', date: '2026-04-28' },
  { id: 'ORD-003', client: 'Construmex', product: 'Tubo 304L', qty: 200, status: 'Completada', priority: 'Baja', date: '2026-04-27' },
  { id: 'ORD-004', client: 'Ferro Centro', product: 'Lamina 430', qty: 50, status: 'En proceso', priority: 'Alta', date: '2026-04-28' },
  { id: 'ORD-005', client: 'Aceros del Norte', product: 'Angulo 304', qty: 300, status: 'Pendiente', priority: 'Media', date: '2026-04-27' },
  { id: 'ORD-006', client: 'Distribuidora Sur', product: 'Solera 316', qty: 75, status: 'En proceso', priority: 'Alta', date: '2026-04-26' },
  { id: 'ORD-007', client: 'Metal Plus', product: 'Tubo 304', qty: 150, status: 'Completada', priority: 'Baja', date: '2026-04-26' },
  { id: 'ORD-008', client: 'Construmex', product: 'Placa 316L', qty: 90, status: 'Pendiente', priority: 'Alta', date: '2026-04-25' },
]

const statusColor = {
  'En proceso': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'Pendiente': 'bg-amber-50 text-amber-700 border-amber-200',
  'Completada': 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

const priorityColor = {
  'Alta': 'text-red-600',
  'Media': 'text-amber-600',
  'Baja': 'text-slate-500',
}

export default function Ordenes() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [showModal, setShowModal] = useState(false)
  const [orders, setOrders] = useState(initialOrders)

  const filtered = orders.filter((o) => {
    const matchSearch = o.id.toLowerCase().includes(search.toLowerCase()) || o.client.toLowerCase().includes(search.toLowerCase()) || o.product.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'Todos' || o.status === statusFilter
    return matchSearch && matchStatus
  })

  const handleNew = (e) => {
    e.preventDefault()
    const form = e.target
    const newOrder = {
      id: `ORD-${String(orders.length + 1).padStart(3, '0')}`,
      client: form.client.value,
      product: form.product.value,
      qty: Number(form.qty.value),
      status: 'Pendiente',
      priority: form.priority.value,
      date: new Date().toISOString().slice(0, 10),
    }
    setOrders([newOrder, ...orders])
    setShowModal(false)
    form.reset()
  }

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-cyan-700">Gestion</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950 md:text-3xl">Ordenes de trabajo</h1>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
          >
            <Plus size={16} /> Nueva orden
          </button>
        </div>
      </header>

      <div className="p-4 md:p-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por ID, cliente o producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            {['Todos', 'En proceso', 'Pendiente', 'Completada'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  statusFilter === s ? 'bg-slate-950 text-white' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[740px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">ID</th>
                  <th className="px-5 py-3 font-semibold">Cliente</th>
                  <th className="px-5 py-3 font-semibold">Producto</th>
                  <th className="px-5 py-3 font-semibold">Cantidad</th>
                  <th className="px-5 py-3 font-semibold">Prioridad</th>
                  <th className="px-5 py-3 font-semibold">Estado</th>
                  <th className="px-5 py-3 font-semibold">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((order) => (
                  <tr className="hover:bg-slate-50" key={order.id}>
                    <td className="px-5 py-4 font-medium text-slate-950">{order.id}</td>
                    <td className="px-5 py-4 text-slate-600">{order.client}</td>
                    <td className="px-5 py-4 text-slate-600">{order.product}</td>
                    <td className="px-5 py-4 text-slate-600">{order.qty}</td>
                    <td className={`px-5 py-4 text-sm font-medium ${priorityColor[order.priority]}`}>{order.priority}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-md border px-2 py-1 text-xs font-medium ${statusColor[order.status]}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{order.date}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-sm text-slate-500">No se encontraron ordenes</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-4 text-sm text-slate-500">{filtered.length} ordenes encontradas</p>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-950">Nueva orden</h2>
            <form onSubmit={handleNew} className="mt-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Cliente</label>
                <input name="client" required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Producto</label>
                <input name="product" required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Cantidad</label>
                  <input name="qty" type="number" min="1" required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Prioridad</label>
                  <select name="priority" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100">
                    <option>Alta</option>
                    <option>Media</option>
                    <option>Baja</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">Cancelar</button>
                <button type="submit" className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">Crear orden</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
