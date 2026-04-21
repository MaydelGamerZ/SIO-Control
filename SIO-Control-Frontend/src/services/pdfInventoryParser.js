import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'
import { createId, formatDateKey, slugify } from '../utils/inventory'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

const metadataPatterns = {
  cedis: /(?:cedis|almacen|sucursal)\s*:?\s*(.+)/i,
  fecha: /(?:fecha|dia)\s*:?\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4}|[0-9]{4}[/-][0-9]{1,2}[/-][0-9]{1,2})/i,
  semana: /semana\s*:?\s*([a-z0-9\s-]+)/i,
  totalGeneral: /total\s+general.*?(-?\d[\d,.\s]*)/i,
}

function parseNumber(value) {
  if (!value) return 0
  const cleaned = String(value)
    .replace(/\s/g, '')
    .replace(/,/g, '')
  return Number.parseFloat(cleaned) || 0
}

function normalizeDate(value) {
  if (!value) return formatDateKey()
  const cleaned = value.replace(/\//g, '-')
  const parts = cleaned.split('-').map((part) => Number.parseInt(part, 10))

  if (parts[0] > 1900) {
    return `${parts[0]}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`
  }

  const year = parts[2] < 100 ? 2000 + parts[2] : parts[2]
  return `${year}-${String(parts[1]).padStart(2, '0')}-${String(parts[0]).padStart(2, '0')}`
}

function isIgnoredLine(line) {
  return /^(producto|stock|no disponible|conteo|observacion|pagina|page|diferencia|total)$/i.test(line.trim())
}

function isLikelyCategory(line) {
  const cleanLine = line.trim()
  if (!cleanLine || isIgnoredLine(cleanLine)) return false
  if (/\d/.test(cleanLine)) return false
  if (cleanLine.length < 3) return false

  const letters = cleanLine.replace(/[^a-zA-Z]/g, '')
  const upperLetters = cleanLine.replace(/[^A-Z]/g, '')
  return upperLetters.length / Math.max(letters.length, 1) > 0.62 || cleanLine.split(/\s+/).length <= 4
}

function parseProductLine(line) {
  const matches = [...line.matchAll(/-?\d[\d,]*(?:\.\d+)?/g)]
  if (matches.length === 0) return null

  const stockMatch = matches.length >= 2 ? matches[matches.length - 2] : matches[matches.length - 1]
  const unavailableMatch = matches.length >= 2 ? matches[matches.length - 1] : null
  const name = line.slice(0, stockMatch.index).replace(/\s+/g, ' ').trim()

  if (!name || name.length < 2 || /total\s+general/i.test(name)) return null

  return {
    name,
    noDisponible: unavailableMatch ? parseNumber(unavailableMatch[0]) : 0,
    stock: parseNumber(stockMatch[0]),
  }
}

function groupItemsIntoLines(items) {
  const positioned = items
    .map((item) => ({
      str: item.str,
      x: item.transform[4],
      y: Math.round(item.transform[5]),
    }))
    .filter((item) => item.str?.trim())
    .sort((a, b) => b.y - a.y || a.x - b.x)

  const lines = []
  for (const item of positioned) {
    const existing = lines.find((line) => Math.abs(line.y - item.y) <= 3)
    if (existing) {
      existing.items.push(item)
    } else {
      lines.push({ y: item.y, items: [item] })
    }
  }

  return lines.map((line) =>
    line.items
      .sort((a, b) => a.x - b.x)
      .map((item) => item.str.trim())
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim(),
  )
}

function extractMetadata(lines, fileName) {
  const joined = lines.join('\n')
  const fechaMatch = joined.match(metadataPatterns.fecha)
  const semanaMatch = joined.match(metadataPatterns.semana)
  const cedisMatch = joined.match(metadataPatterns.cedis)
  const totalMatch = joined.match(metadataPatterns.totalGeneral)

  const dateKey = normalizeDate(fechaMatch?.[1])

  return {
    cedis: cedisMatch?.[1]?.split('\n')[0]?.trim() || 'CEDIS sin definir',
    dateKey,
    fecha: dateKey,
    semana: semanaMatch?.[1]?.split('\n')[0]?.trim() || '',
    sourcePdfName: fileName,
    totalGeneralPdf: totalMatch ? parseNumber(totalMatch[1]) : 0,
  }
}

function buildInventory(lines, metadata) {
  const categories = []
  let currentCategory = null

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || isIgnoredLine(line) || /semana|fecha|cedis|almacen|sucursal/i.test(line)) continue

    if (/total\s+general/i.test(line)) continue

    const product = parseProductLine(line)
    if (product && currentCategory) {
      currentCategory.products.push({
        ...product,
        id: createId('prod'),
        order: currentCategory.products.length,
      })
      continue
    }

    if (product && !currentCategory) {
      currentCategory = {
        id: createId('cat'),
        name: 'Sin categoria',
        order: categories.length,
        products: [],
      }
      categories.push(currentCategory)
      currentCategory.products.push({
        ...product,
        id: createId('prod'),
        order: currentCategory.products.length,
      })
      continue
    }

    if (isLikelyCategory(line)) {
      currentCategory = {
        id: `cat-${slugify(line) || createId('cat')}`,
        name: line,
        order: categories.length,
        products: [],
      }
      categories.push(currentCategory)
    }
  }

  return {
    ...metadata,
    categories: categories.filter((category) => category.products.length > 0),
  }
}

export async function parseInventoryPdf(file) {
  const data = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data }).promise
  const allLines = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const textContent = await page.getTextContent()
    allLines.push(...groupItemsIntoLines(textContent.items))
  }

  const metadata = extractMetadata(allLines, file.name)
  const parsedInventory = buildInventory(allLines, metadata)

  if (parsedInventory.categories.length === 0) {
    throw new Error('No se detectaron categorias y productos en el PDF. Revisa que sea un inventario legible.')
  }

  return parsedInventory
}
