import * as pdfjsLib from 'pdfjs-dist/build/pdf'
import { buildInventoryFromTextPages } from '@sio-backend/pdfInventoryBuilder.js'

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

function isPdfFile(file) {
  return file?.type === 'application/pdf' || String(file?.name || '').toLowerCase().endsWith('.pdf')
}

function isIosDevice() {
  if (typeof navigator === 'undefined') return false

  const userAgent = navigator.userAgent || ''
  const platform = navigator.platform || ''
  return /iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function configurePdfWorker() {
  if (isIosDevice() && pdfjsLib.PDFWorkerUtil) {
    pdfjsLib.PDFWorkerUtil.isWorkerDisabled = true
  }
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Selecciona un archivo PDF valido.'))
      return
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer el archivo PDF en este dispositivo. Intenta seleccionarlo nuevamente.'))
    reader.onabort = () => reject(new Error('La lectura del PDF fue cancelada.'))
    reader.onload = (event) => {
      const result = event?.target?.result || reader.result
      if (!(result instanceof ArrayBuffer)) {
        reject(new Error('El archivo no se pudo convertir a ArrayBuffer.'))
        return
      }
      resolve(result)
    }
    reader.readAsArrayBuffer(file)
  })
}

export async function parseInventoryPdf(file) {
  if (!isPdfFile(file)) {
    throw new Error('Archivo invalido. Selecciona un PDF de inventario.')
  }

  const buffer = await readFileAsArrayBuffer(file)
  configurePdfWorker()
  const pdf = await pdfjsLib.getDocument({
    data: buffer,
    isEvalSupported: false,
    useWorkerFetch: false,
  }).promise
  const pages = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const textContent = await page.getTextContent()
    pages.push({ items: textContent.items, pageNumber })
  }

  const parsedInventory = buildInventoryFromTextPages(pages, file.name)

  if (parsedInventory.categories.length === 0) {
    throw new Error('No se detectaron categorias y productos en el PDF. Revisa que sea el inventario diario correcto y que el archivo no este corrupto.')
  }

  return parsedInventory
}
