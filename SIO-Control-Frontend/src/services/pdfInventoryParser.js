import { buildInventoryFromTextPages } from '@sio-backend/pdfInventoryBuilder.js'

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Selecciona un archivo PDF valido.'))
      return
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer el archivo PDF en este dispositivo.'))
    reader.onload = () => {
      if (!(reader.result instanceof ArrayBuffer)) {
        reject(new Error('El archivo no se pudo convertir a ArrayBuffer.'))
        return
      }
      resolve(reader.result)
    }
    reader.readAsArrayBuffer(file)
  })
}

export async function parseInventoryPdf(file) {
  const buffer = await readFileAsArrayBuffer(file)
  const data = new Uint8Array(buffer)
  const [pdfjsLib, workerModule] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.mjs?url'),
  ])
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default
  const pdf = await pdfjsLib.getDocument({ data, useWorkerFetch: false, isEvalSupported: false }).promise
  const pages = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const textContent = await page.getTextContent()
    pages.push({ items: textContent.items, pageNumber })
  }

  const parsedInventory = buildInventoryFromTextPages(pages, file.name)

  if (parsedInventory.categories.length === 0) {
    throw new Error('No se detectaron categorias y productos en el PDF. Revisa que sea un inventario legible.')
  }

  return parsedInventory
}
