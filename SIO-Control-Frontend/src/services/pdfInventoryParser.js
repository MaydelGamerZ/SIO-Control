import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'
import { buildInventoryFromTextPages } from './pdfInventoryBuilder.js'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

export async function parseInventoryPdf(file) {
  const data = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data }).promise
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
