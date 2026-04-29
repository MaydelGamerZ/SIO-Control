import { useState } from 'react'
import { Search, AlertTriangle } from 'lucide-react'

const initialItems = [
  { id: 1, name: 'Acero 304', category: 'Placas', stock: 420, min: 200, unit: 'kg', location: 'A-01' },
  { id: 2, name: 'Acero 316L', category: 'Barras', stock: 85, min: 100, unit: 'kg', location: 'A-02' },
  { id: 3, name: 'Acero 430', category: 'Laminas', stock: 310, min: 150, unit: 'kg', location: 'B-01' },
  { id: 4, name: 'Tubo 304L', category: 'Tubos', stock: 60, min: 80, unit: 'm', location: 'C-03' },
  { id: 5, name: 'Angulo 304', category: 'Perfiles', stock: 190, min: 100, unit: 'kg', location: 'B-04' },
  { id: 6, name: 'Solera 316', category: 'Perfiles', stock: 45, min: 60, unit: 'kg', location: 'B-05' },
  { id: 7, name: 'Placa 316L', category: 'Placas', stock: 250, min: 120, unit: 'kg', location: 'A-03' },
  { id: 8, name: 'Barra 304', category: 'Barras', stock: 130, min: 90, unit: 'kg', location: 'A-04' },
]

export default function Inventario() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('Todos')
  const [items, setItems] = useState(initialItems)

  const categories = ['Todos', ...new Set(items.map((i) => i.category))]

  const filtered = items.filter((i) => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase()) || i.location.toLowerCase().includes(search.toLowerCase())
    const matchCat = categoryFilter === 'Todos' || i.category === categoryFilter
    return matchSearch && matchCat
  })

  const lowStock = items.filter((i) => i.stock < i.min)
  const totalItems = items.reduce((acc, i) => acc + i.stock, 0)

  const adjustStock = (id, delta) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, stock: Math.max(0, item.stock + delta) } : item
      )
    )
  }

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-cyan-700">Almacen</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950 md:text-3xl">Inventario</h1>
          </div>
        </div>
      </header>

      <div className="p-4 md:p-8">
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total items</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{items.length}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Stock total</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{totalItems.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600" />
              <p className="text-sm font-medium text-amber-700">Stock bajo</p>
            </div>
            <p className="mt-2 text-3xl font-semibold text-amber-700">{lowStock.length}</p>
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar material o ubicacion..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  categoryFilter === cat ? 'bg-slate-950 text-white' : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Material</th>
                  <th className="px-5 py-3 font-semibold">Categoria</th>
                  <th className="px-5 py-3 font-semibold">Stock</th>
                  <th className="px-5 py-3 font-semibold">Minimo</th>
                  <th className="px-5 py-3 font-semibold">Ubicacion</th>
                  <th className="px-5 py-3 font-semibold">Ajustar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((item) => {
                  const isLow = item.stock < item.min
                  return (
                    <tr className={`hover:bg-slate-50 ${isLow ? 'bg-amber-50/50' : ''}`} key={item.id}>
                      <td className="px-5 py-4 font-medium text-slate-950">{item.name}</td>
                      <td className="px-5 py-4 text-slate-600">{item.category}</td>
                      <td className="px-5 py-4">
                        <span className={`font-semibold ${isLow ? 'text-amber-600' : 'text-slate-950'}`}>
                          {item.stock} {item.unit}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-500">{item.min} {item.unit}</td>
                      <td className="px-5 py-4 text-slate-600">{item.location}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => adjustStock(item.id, -10)} className="flex size-7 items-center justify-center rounded border border-slate-300 text-slate-600 hover:bg-slate-100">-</button>
                          <button onClick={() => adjustStock(item.id, 10)} className="flex size-7 items-center justify-center rounded border border-slate-300 text-slate-600 hover:bg-slate-100">+</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
