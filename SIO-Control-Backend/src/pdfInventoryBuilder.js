import { createId, formatDateKey, slugify } from './inventoryCore.js'

const nameColumnMax = 155
const stockColumnMin = 150
const stockColumnMax = 205
const unavailableColumnMin = 205
const unavailableColumnMax = 245

const monthMap = {
  abr: 4,
  abril: 4,
  ago: 8,
  agosto: 8,
  dic: 12,
  diciembre: 12,
  ene: 1,
  enero: 1,
  feb: 2,
  febrero: 2,
  jul: 7,
  julio: 7,
  jun: 6,
  junio: 6,
  mar: 3,
  marzo: 3,
  may: 5,
  mayo: 5,
  nov: 11,
  noviembre: 11,
  oct: 10,
  octubre: 10,
  sep: 9,
  septiembre: 9,
}

function cleanText(value) {
  return String(value || '')
    .replace(/_{2,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeForMatch(value) {
  return cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function parseNumber(value) {
  if (value === null || value === undefined) return 0
  const cleaned = String(value)
    .replace(/\s/g, '')
    .replace(/,/g, '')
  return Number.parseFloat(cleaned) || 0
}

function isNumericText(value) {
  return /^-?\d[\d,]*(?:\.\d+)?$/.test(cleanText(value))
}

function normalizeDate(value) {
  if (!value) return formatDateKey()

  const cleaned = cleanText(value).replace(/\//g, '-')
  const numeric = cleaned.match(/^(\d{1,4})-(\d{1,2})-(\d{1,4})$/)
  if (numeric) {
    const first = Number(numeric[1])
    const second = Number(numeric[2])
    const third = Number(numeric[3])

    if (first > 1900) {
      return `${first}-${String(second).padStart(2, '0')}-${String(third).padStart(2, '0')}`
    }

    const year = third < 100 ? 2000 + third : third
    return `${year}-${String(second).padStart(2, '0')}-${String(first).padStart(2, '0')}`
  }

  const spanish = normalizeForMatch(cleaned).match(/(\d{1,2})\s+de\s+([a-z.]+)\s+(?:de\s+)?(\d{4})/)
  if (spanish) {
    const day = Number(spanish[1])
    const monthName = spanish[2].replace('.', '')
    const month = monthMap[monthName]
    const year = Number(spanish[3])
    if (month) return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  return formatDateKey()
}

function lineTextFromItems(items) {
  return cleanText(
    items
      .slice()
      .sort((a, b) => a.x - b.x)
      .map((item) => item.str)
      .join(' '),
  )
}

export function groupTextItemsIntoLines(items, pageNumber = 1) {
  const positioned = (items || [])
    .map((item) => ({
      str: item.str,
      x: Number(item.transform?.[4] || 0),
      y: Number(item.transform?.[5] || 0),
      pageNumber,
    }))
    .filter((item) => cleanText(item.str))
    .sort((a, b) => b.y - a.y || a.x - b.x)

  const lines = []
  for (const item of positioned) {
    const existing = lines.find((line) => Math.abs(line.y - item.y) <= 2.8)
    if (existing) {
      existing.items.push(item)
    } else {
      lines.push({ items: [item], pageNumber, y: item.y })
    }
  }

  return lines.map((line, lineIndex) => {
    const sortedItems = line.items.slice().sort((a, b) => a.x - b.x)
    return {
      items: sortedItems,
      lineIndex,
      pageNumber,
      text: lineTextFromItems(sortedItems),
      y: line.y,
    }
  })
}

function isHeaderOrNoise(line) {
  const text = normalizeForMatch(line.text)
  if (!text) return true
  if (text.includes('distribuciones a detalle')) return true
  if (text.includes('informe de inventario diario')) return true
  if (text.includes('producto cantidad')) return true
  if (text === 'disponib' || text === 'le' || text === 'no') return true
  if (text.startsWith('hoja ') || text.includes('fecha y hora de generacion')) return true
  if (/^-+$/.test(text)) return true
  return false
}

function isTotalLine(line) {
  const text = normalizeForMatch(line.text)
  return /^total(?:\s+general)?\.-/.test(text) || /^total(?:\s+general)?\b/.test(text)
}

function findNumberInRange(items, min, max) {
  return items.find((item) => item.x >= min && item.x <= max && isNumericText(item.str))
}

function parseCategoryLine(line) {
  if (isHeaderOrNoise(line) || isTotalLine(line)) return null
  const text = cleanText(line.text)
  const startsInNameColumn = line.items[0]?.x <= 35
  const parts = text.split(/\s+-\s+/).map((part) => cleanText(part)).filter(Boolean)
  const looksLikeCategory = startsInNameColumn && parts.length >= 4 && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[2])

  if (!looksLikeCategory) return null

  return {
    displayName: parts.slice(3).join(' - ') || text,
    sourceName: text,
  }
}

function parseProductLine(line) {
  if (isHeaderOrNoise(line) || isTotalLine(line)) return null

  const stockItem = findNumberInRange(line.items, stockColumnMin, stockColumnMax)
  if (!stockItem) return null

  const name = cleanText(
    line.items
      .filter((item) => item.x < nameColumnMax)
      .map((item) => item.str)
      .join(' '),
  )

  if (!name || normalizeForMatch(name).startsWith('total')) return null

  const unavailableItem = findNumberInRange(line.items, unavailableColumnMin, unavailableColumnMax)

  return {
    name,
    noDisponible: unavailableItem ? parseNumber(unavailableItem.str) : 0,
    pageNumber: line.pageNumber,
    sourceLine: line.text,
    stock: parseNumber(stockItem.str),
  }
}

function parseTotalLine(line) {
  if (!isTotalLine(line)) return null
  const stockItem = findNumberInRange(line.items, stockColumnMin, stockColumnMax)
  const unavailableItem = findNumberInRange(line.items, unavailableColumnMin, unavailableColumnMax)
  return {
    isGeneral: normalizeForMatch(line.text).startsWith('total general'),
    noDisponible: unavailableItem ? parseNumber(unavailableItem.str) : 0,
    stock: stockItem ? parseNumber(stockItem.str) : 0,
  }
}

function extractMetadata(lines, fileName) {
  const headerLine = lines.find((line) => /semana|fecha|cedis/i.test(line.text))
  const headerText = headerLine?.text || lines.map((line) => line.text).join('\n')
  const semana = headerText.match(/semana\s*:?\s*([^\s]+)/i)?.[1] || ''
  const fechaText =
    headerText.match(/fecha\s*:?\s*(.+?)\s+cedis\s*:/i)?.[1] ||
    headerText.match(/fecha\s*:?\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4}|[0-9]{4}[/-][0-9]{1,2}[/-][0-9]{1,2})/i)?.[1] ||
    ''
  const cedis = headerText.match(/cedis\s*:?\s*([a-z0-9 ._-]+)/i)?.[1]?.trim() || 'CEDIS sin definir'
  const generalTotal = lines.map(parseTotalLine).find((total) => total?.isGeneral)
  const dateKey = normalizeDate(fechaText)

  return {
    cedis,
    dateKey,
    fecha: dateKey,
    semana,
    sourcePdfName: fileName,
    totalGeneralPdf: generalTotal?.stock || 0,
  }
}

function createCategory(categoryLine, order) {
  const idBase = slugify(categoryLine.sourceName) || createId('cat')
  return {
    id: `cat-${idBase}`,
    name: categoryLine.displayName,
    order,
    products: [],
    sourceName: categoryLine.sourceName,
    totalNoDisponiblePdf: 0,
    totalStockPdf: 0,
  }
}

export function buildInventoryFromLines(lines, fileName = '') {
  const metadata = extractMetadata(lines, fileName)
  const categories = []
  const categoriesBySource = new Map()
  let currentCategory = null

  for (const line of lines) {
    if (isHeaderOrNoise(line)) continue

    const categoryLine = parseCategoryLine(line)
    if (categoryLine) {
      const categoryKey = slugify(categoryLine.sourceName)
      currentCategory = categoriesBySource.get(categoryKey)
      if (!currentCategory) {
        currentCategory = createCategory(categoryLine, categories.length)
        categoriesBySource.set(categoryKey, currentCategory)
        categories.push(currentCategory)
      }
      continue
    }

    const totalLine = parseTotalLine(line)
    if (totalLine) {
      if (totalLine.isGeneral) {
        metadata.totalGeneralPdf = totalLine.stock
      } else if (currentCategory) {
        currentCategory.totalStockPdf = totalLine.stock
        currentCategory.totalNoDisponiblePdf = totalLine.noDisponible
      }
      continue
    }

    const product = parseProductLine(line)
    if (product) {
      if (!currentCategory) {
        currentCategory = createCategory({ displayName: 'Sin categoria', sourceName: 'Sin categoria' }, categories.length)
        categories.push(currentCategory)
      }

      currentCategory.products.push({
        ...product,
        id: createId('prod'),
        order: currentCategory.products.length,
      })
    }
  }

  return {
    ...metadata,
    categories: categories.filter((category) => category.products.length > 0),
  }
}

export function buildInventoryFromTextPages(pages, fileName = '') {
  const lines = []
  for (let pageIndex = 0; pageIndex < (pages || []).length; pageIndex += 1) {
    const page = pages[pageIndex]
    lines.push(...groupTextItemsIntoLines(page.items || [], page.pageNumber || pageIndex + 1))
  }
  return buildInventoryFromLines(lines, fileName)
}
