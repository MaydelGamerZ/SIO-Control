// @ts-nocheck
import { flattenProducts, formatNumber } from '../domain/inventory-core'

function escapeCell(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function downloadHtmlWorkbook(fileName, sheets) {
  const html = `
    <html>
      <head><meta charset="utf-8" /></head>
      <body>
        ${sheets.map((sheet) => `
          <h1>${escapeCell(sheet.name)}</h1>
          <table border="1">
            <thead>
              <tr>${sheet.headers.map((header) => `<th>${escapeCell(header)}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${sheet.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeCell(cell)}</td>`).join('')}</tr>`).join('')}
            </tbody>
          </table>
        `).join('<br />')}
      </body>
    </html>
  `
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName.endsWith('.xls') ? fileName : `${fileName}.xls`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function inventoryFileBase(inventory, suffix) {
  const cedis = String(inventory?.cedis || 'cedis').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')
  return `inventario-${inventory?.dateKey || 'sin-fecha'}-${cedis}-${suffix}`
}

export function exportInventoryToExcel(inventory) {
  if (!inventory) return
  const count = inventory.finalCount || inventory.activeUserCount || inventory.userCounts?.[0] || { categories: inventory.categories || [] }
  const rows = flattenProducts(count.categories || []).map((row) => [
    inventory.dateKey,
    inventory.cedis,
    row.categoryName,
    row.product.name,
    row.product.stock,
    row.product.noDisponible,
    row.product.totalCounted,
    row.product.difference,
    (row.product.countEntries || []).map((entry) => `${entry.quantity} ${entry.observation || entry.condition || ''}`).join(' | '),
  ])

  downloadHtmlWorkbook(`${inventoryFileBase(inventory, 'detalle')}.xls`, [{
    headers: ['Fecha', 'CEDIS', 'Categoria', 'Producto', 'Stock', 'No disponible', 'Total contado', 'Diferencia', 'Movimientos'],
    name: 'Detalle inventario',
    rows,
  }])
}

export function exportInventoryDifferencesToExcel(inventory) {
  if (!inventory) return
  const count = inventory.finalCount || inventory.userCounts?.[0] || { categories: inventory.categories || [] }
  const rows = flattenProducts(count.categories || [])
    .filter((row) => Number(row.product.difference || 0) !== 0)
    .map((row) => [
      inventory.dateKey,
      inventory.cedis,
      row.categoryName,
      row.product.name,
      row.product.stock,
      row.product.totalCounted,
      row.product.difference,
      Math.abs(Number(row.product.difference || 0)),
    ])

  downloadHtmlWorkbook(`${inventoryFileBase(inventory, 'diferencias')}.xls`, [{
    headers: ['Fecha', 'CEDIS', 'Categoria', 'Producto', 'Stock', 'Total contado', 'Diferencia', 'Impacto absoluto'],
    name: 'Diferencias',
    rows,
  }])
}

export function exportInventoriesSummaryToExcel(inventories = []) {
  const rows = inventories.map((inventory) => [
    inventory.dateKey,
    inventory.cedis,
    inventory.semana,
    inventory.status,
    inventory.totalProducts,
    inventory.countedProducts,
    `${inventory.progress || 0}%`,
    inventory.finalCount?.totalCounted ?? inventory.totalCounted,
    inventory.finalCount?.difference ?? inventory.difference,
    (inventory.participants || []).map((participant) => participant.userName).join(', '),
  ])

  downloadHtmlWorkbook('sio-control-resumen-inventarios.xls', [{
    headers: ['Fecha', 'CEDIS', 'Semana', 'Estado', 'Productos', 'Productos contados', 'Avance', 'Total contado', 'Diferencia', 'Participantes'],
    name: 'Resumen',
    rows,
  }])
}

export function exportUserPerformanceToExcel(performance = []) {
  const rows = performance.map((user) => [
    user.name,
    user.email,
    user.countedProducts,
    user.errors,
    formatNumber(user.differences),
    user.validations,
    `${user.efficiency}%`,
  ])

  downloadHtmlWorkbook('sio-control-rendimiento-usuarios.xls', [{
    headers: ['Usuario', 'Correo', 'Productos contados', 'Errores detectados', 'Diferencias generadas', 'Validaciones', 'Eficiencia'],
    name: 'Rendimiento usuarios',
    rows,
  }])
}
