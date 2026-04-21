import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Upload } from 'lucide-react'
import { Button, EmptyState, ErrorState, LoadingState, PageTitle } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { createInventoryFromParsed } from '../services/inventoryService'
import { parseInventoryPdf } from '../services/pdfInventoryParser'
import { formatDisplayDate, formatNumber } from '../utils/inventory'

export default function UploadInventoryPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [parsedInventory, setParsedInventory] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const { user } = useAuth()
  const navigate = useNavigate()

  async function parseFile(file) {
    if (!file) return
    setError('')
    setLoading(true)
    setSelectedFile(file)
    try {
      const parsed = await parseInventoryPdf(file)
      setParsedInventory(parsed)
    } catch (parseError) {
      setParsedInventory(null)
      setError(parseError.message)
    } finally {
      setLoading(false)
    }
  }

  async function confirmInventory() {
    if (!parsedInventory) return
    setError('')
    setLoading(true)
    try {
      const inventoryId = await createInventoryFromParsed(parsedInventory, user)
      navigate(`/inventario/${inventoryId}/editar`)
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PageTitle eyebrow="PDF diario" title="Cargar inventario diario">
        Sube el PDF operativo. El lector extrae texto real del archivo, identifica categorias y productos, y conserva su orden original para Firestore.
      </PageTitle>

      <ErrorState message={error} />

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <label className="grid min-h-[260px] cursor-pointer place-items-center rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/60 p-6 text-center transition hover:border-blue-400">
            <input
              accept="application/pdf"
              className="sr-only"
              disabled={loading}
              onChange={(event) => parseFile(event.target.files?.[0])}
              type="file"
            />
            <div>
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-lg bg-white text-blue-700 shadow-sm">
                <Upload size={30} />
              </div>
              <h3 className="mt-4 text-2xl font-black text-slate-950">Arrastra o selecciona el PDF de inventario</h3>
              <p className="mt-2 text-slate-500">{selectedFile ? selectedFile.name : 'El parser usa pdfjs-dist y lee el contenido real del PDF.'}</p>
              <span className="mt-5 inline-flex min-h-14 items-center rounded-lg bg-blue-600 px-6 text-base font-black text-white shadow-sm">
                Seleccionar archivo PDF
              </span>
            </div>
          </label>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => { setParsedInventory(null); setSelectedFile(null); setError('') }} tone="light">Cancelar carga</Button>
            <Button disabled={!parsedInventory || loading} onClick={confirmInventory} tone="dark">Crear inventario del dia</Button>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xl font-black text-slate-950">Datos detectados</h3>
          {!parsedInventory && !loading && (
            <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm font-bold text-slate-500">
              Aun no hay PDF cargado. Los datos apareceran despues de leer el archivo.
            </p>
          )}
          {loading && <LoadingState label="Leyendo PDF" />}
          {parsedInventory && (
            <div className="mt-4 grid gap-3">
              {[
                ['Semana', parsedInventory.semana || 'Sin semana'],
                ['Fecha', formatDisplayDate(parsedInventory.dateKey)],
                ['CEDIS', parsedInventory.cedis],
                ['Total general PDF', formatNumber(parsedInventory.totalGeneralPdf)],
                ['Categorias', parsedInventory.categories.length],
                ['Productos', parsedInventory.categories.flatMap((category) => category.products).length],
              ].map(([label, value]) => (
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3" key={label}>
                  <span className="font-bold text-slate-500">{label}</span>
                  <strong className="text-right text-slate-950">{value}</strong>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h3 className="text-2xl font-black text-slate-950">Previsualizacion del inventario importado</h3>
          <p className="mt-1 text-slate-500">Categorias y productos se guardaran con el orden detectado en el PDF.</p>
        </div>
        {!parsedInventory ? (
          <EmptyState
            description="Cuando cargues el PDF veras categorias como bloques y productos debajo de cada categoria."
            icon={FileText}
            title="Sin previsualizacion"
          />
        ) : (
          <div className="divide-y divide-slate-200">
            {parsedInventory.categories.map((category) => (
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
                          <td className="px-4 py-4">{formatNumber(product.stock)}</td>
                          <td className="px-4 py-4">{formatNumber(product.noDisponible)}</td>
                          <td className="px-4 py-4 text-slate-400">Pendiente</td>
                          <td className="px-4 py-4 text-slate-400">Pendiente</td>
                          <td className="px-4 py-4 text-slate-400">Sin observacion</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
