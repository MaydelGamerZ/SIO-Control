import { doc as firestoreDoc, increment, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { safeCreateAuditLog } from './auditLogService'
import { formatDisplayDate, formatNumber } from '../utils/inventory'

const page = {
  height: 792,
  marginX: 20,
  width: 612,
}

const table = {
  columns: [
    { align: 'left', key: 'product', label: 'PRODUCTO', width: 178 },
    { align: 'right', key: 'stock', label: 'CANTIDAD', width: 55 },
    { align: 'right', key: 'unavailable', label: 'NO\nDISPONIBLE', width: 55 },
    { align: 'left', key: 'physical', label: 'CONTEO FISICO', width: 110 },
    { align: 'right', key: 'total', label: 'TOTAL', width: 50 },
    { align: 'right', key: 'difference', label: 'DIFERENCIA', width: 55 },
    { align: 'left', key: 'observation', label: 'OBSERVACION', width: 69 },
  ],
  headerHeight: 26,
  lineHeight: 9,
  startY: 126,
}

function numberValue(value) {
  return Number(value || 0)
}

function textValue(value, fallback = '-') {
  const text = String(value || '').trim()
  return text || fallback
}

function getExportCount(inventory) {
  if (inventory.finalCount) return inventory.finalCount
  if (inventory.activeUserCount) return inventory.activeUserCount
  if (inventory.userCounts?.length) {
    return inventory.userCounts.find((count) => count.status === 'guardado') || inventory.userCounts[0]
  }
  return { categories: inventory.categories || [] }
}

function formatGeneratedDate(date = new Date()) {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function sumCategory(category) {
  return (category.products || []).reduce(
    (totals, product) => ({
      difference: totals.difference + numberValue(product.difference),
      noDisponible: totals.noDisponible + numberValue(product.noDisponible),
      stock: totals.stock + numberValue(product.stock),
      totalCounted: totals.totalCounted + numberValue(product.totalCounted),
    }),
    { difference: 0, noDisponible: 0, stock: 0, totalCounted: 0 },
  )
}

function sumInventory(categories) {
  return (categories || []).reduce(
    (totals, category) => {
      const categoryTotals = sumCategory(category)
      return {
        difference: totals.difference + categoryTotals.difference,
        noDisponible: totals.noDisponible + categoryTotals.noDisponible,
        stock: totals.stock + categoryTotals.stock,
        totalCounted: totals.totalCounted + categoryTotals.totalCounted,
      }
    },
    { difference: 0, noDisponible: 0, stock: 0, totalCounted: 0 },
  )
}

function getCountDetails(product) {
  const entries = product.countEntries || []
  if (!entries.length) return '-'

  const grouped = new Map()
  for (const entry of entries) {
    const label = textValue(entry.observation || entry.condition, 'Buen estado')
    grouped.set(label, numberValue(grouped.get(label)) + numberValue(entry.quantity))
  }

  return Array.from(grouped.entries())
    .filter(([, quantity]) => quantity !== 0)
    .map(([label, quantity]) => `${formatNumber(quantity)} ${label}`)
    .join('\n') || '-'
}

function getObservationDetails(product) {
  const entries = product.countEntries || []
  const comments = []
  for (const entry of entries) {
    const comment = String(entry.comment || '').trim()
    if (comment && !comments.includes(comment)) comments.push(comment)
  }
  return comments.length ? comments.join('\n') : '-'
}

function makeFileName(inventory) {
  const date = inventory.dateKey || 'inventario'
  const cedis = String(inventory.cedis || 'cedis').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')
  return `inventario-${date}-${cedis}.pdf`
}

function drawPageHeader(doc, inventory, pageNumber, totalPagesToken, generatedAt) {
  const margin = page.marginX
  doc.setDrawColor(80, 80, 80)
  doc.setLineWidth(0.3)
  doc.line(margin, 24, page.width - margin, 24)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text(`Hoja ${pageNumber} de ${totalPagesToken}, Fecha y Hora de Generacion del Reporte: ${formatGeneratedDate(generatedAt)}`, margin, 38)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('DISTRIBUCIONES A DETALLE S.A. DE C.V.', page.width / 2, 58, { align: 'center' })

  doc.setFontSize(10)
  doc.text('INFORME DE INVENTARIO DIARIO', page.width / 2, 76, { align: 'center' })

  doc.setFontSize(8)
  doc.text(`Semana: ${textValue(inventory.semana, '')}`, margin + 115, 100)
  doc.text(`Fecha: ${formatDisplayDate(inventory.dateKey || inventory.fecha)}`, margin + 230, 100)
  doc.text(`Cedis: ${textValue(inventory.cedis, '')}`, margin + 420, 100)

  drawTableHeader(doc, table.startY)
}

function drawTableHeader(doc, y) {
  let x = page.marginX
  doc.setFillColor(240, 240, 240)
  doc.setDrawColor(80, 80, 80)
  doc.setLineWidth(0.3)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.6)

  for (const column of table.columns) {
    doc.rect(x, y, column.width, table.headerHeight, 'FD')
    const lines = String(column.label).split('\n')
    lines.forEach((line, index) => {
      doc.text(line, x + column.width / 2, y + 10 + index * 8, { align: 'center' })
    })
    x += column.width
  }
}

function ensureSpace(doc, y, needed, inventory, pageInfo) {
  if (y + needed <= page.height - 42) return y
  doc.addPage()
  pageInfo.number += 1
  drawPageHeader(doc, inventory, pageInfo.number, pageInfo.totalPagesToken, pageInfo.generatedAt)
  return table.startY + table.headerHeight
}

function drawCellText(doc, text, x, y, width, align = 'left') {
  const xPosition = align === 'right' ? x + width - 3 : x + 3
  const options = align === 'right' ? { align: 'right' } : {}
  const lines = Array.isArray(text) ? text : String(text).split('\n')
  lines.forEach((line, index) => doc.text(line, xPosition, y + 10 + index * table.lineHeight, options))
}

function splitCell(doc, value, width) {
  return doc.splitTextToSize(textValue(value), width - 6)
}

function drawCategoryHeader(doc, y, categoryName) {
  const totalWidth = table.columns.reduce((sum, column) => sum + column.width, 0)
  const lines = doc.splitTextToSize(textValue(categoryName, 'SIN CATEGORIA'), totalWidth - 8)
  const height = Math.max(18, lines.length * table.lineHeight + 8)

  doc.setFillColor(210, 210, 210)
  doc.setDrawColor(80, 80, 80)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.2)
  doc.rect(page.marginX, y, totalWidth, height, 'FD')
  drawCellText(doc, lines, page.marginX, y + 1, totalWidth)
  return y + height
}

function drawProductRow(doc, y, product) {
  const values = {
    difference: formatNumber(product.difference),
    observation: getObservationDetails(product),
    physical: getCountDetails(product),
    product: textValue(product.name),
    stock: formatNumber(product.stock),
    total: formatNumber(product.totalCounted),
    unavailable: formatNumber(product.noDisponible),
  }

  const splitValues = {}
  for (const column of table.columns) {
    splitValues[column.key] = splitCell(doc, values[column.key], column.width)
  }

  const maxLines = Math.max(...Object.values(splitValues).map((lines) => lines.length))
  const height = Math.max(18, maxLines * table.lineHeight + 8)
  let x = page.marginX

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.8)
  doc.setDrawColor(120, 120, 120)
  doc.setLineWidth(0.25)

  for (const column of table.columns) {
    doc.rect(x, y, column.width, height)
    drawCellText(doc, splitValues[column.key], x, y + 1, column.width, column.align)
    x += column.width
  }

  return y + height
}

function drawTotalsRow(doc, y, label, totals, strong = false) {
  const totalWidth = table.columns.reduce((sum, column) => sum + column.width, 0)
  const rowHeight = strong ? 22 : 18
  let x = page.marginX

  doc.setFillColor(strong ? 220 : 245, strong ? 220 : 245, strong ? 220 : 245)
  doc.setDrawColor(80, 80, 80)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(strong ? 8 : 7)
  doc.rect(page.marginX, y, totalWidth, rowHeight, 'FD')

  const cells = [
    { text: label, width: table.columns[0].width, align: 'left' },
    { text: formatNumber(totals.stock), width: table.columns[1].width, align: 'right' },
    { text: formatNumber(totals.noDisponible), width: table.columns[2].width, align: 'right' },
    { text: '', width: table.columns[3].width, align: 'left' },
    { text: formatNumber(totals.totalCounted), width: table.columns[4].width, align: 'right' },
    { text: formatNumber(totals.difference), width: table.columns[5].width, align: 'right' },
    { text: '', width: table.columns[6].width, align: 'left' },
  ]

  for (const cell of cells) {
    drawCellText(doc, cell.text, x, y + 2, cell.width, cell.align)
    x += cell.width
  }

  return y + rowHeight
}

export async function exportInventoryToPdf(inventory, user = null, profile = null) {
  if (!inventory) return
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({ format: 'letter', orientation: 'portrait', unit: 'pt' })
  const totalPagesToken = '{total_pages_count_string}'
  const generatedAt = new Date()
  const pageInfo = { generatedAt, number: 1, totalPagesToken }
  const exportCount = getExportCount(inventory)
  const categories = exportCount.categories || inventory.categories || []

  drawPageHeader(doc, inventory, pageInfo.number, totalPagesToken, generatedAt)
  let y = table.startY + table.headerHeight

  doc.setLineHeightFactor(1)
  for (const category of categories) {
    y = ensureSpace(doc, y, 44, inventory, pageInfo)
    y = drawCategoryHeader(doc, y, category.name)

    for (const product of category.products || []) {
      const previewHeight = 34
      y = ensureSpace(doc, y, previewHeight, inventory, pageInfo)
      y = drawProductRow(doc, y, product)
    }

    y = ensureSpace(doc, y, 22, inventory, pageInfo)
    y = drawTotalsRow(doc, y, 'TOTAL.-', sumCategory(category))
  }

  y = ensureSpace(doc, y, 30, inventory, pageInfo)
  drawTotalsRow(doc, y, 'TOTAL GENERAL.-', sumInventory(categories), true)

  if (doc.putTotalPages) doc.putTotalPages(totalPagesToken)
  doc.save(makeFileName(inventory))

  if (inventory.id && user?.uid) {
    await updateDoc(firestoreDoc(db, 'inventory', inventory.id), {
      exportCount: increment(1),
      lastExportAt: serverTimestamp(),
      lastExportBy: {
        email: user.email || '',
        name: user.displayName || user.email || 'Usuario',
        uid: user.uid,
      },
      updatedAt: serverTimestamp(),
    }).catch(() => {})

    await safeCreateAuditLog({
      actionType: 'inventory_pdf_exported',
      details: {
        exportCount: Number(inventory.exportCount || 0) + 1,
        exportType: inventory.finalCount ? 'final' : inventory.activeUserCount ? 'usuario_activo' : 'general',
      },
      inventory,
      profile,
      summary: `${user.displayName || user.email} exporto el PDF de ${inventory.cedis || 'inventario'}.`,
      user,
    })
  }
}
