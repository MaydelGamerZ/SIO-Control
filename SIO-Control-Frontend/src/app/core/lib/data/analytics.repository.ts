// @ts-nocheck
import { flattenProducts, formatDateKey } from '../domain/inventory-core'

function timestampValue(value) {
  if (!value) return 0
  if (value.toDate) return value.toDate().getTime()
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

function allProductRows(inventories = []) {
  return inventories.flatMap((inventory) => {
    const sourceCategories = inventory.finalCount?.categories || inventory.userCounts?.[0]?.categories || inventory.categories || []
    return flattenProducts(sourceCategories).map((row) => ({ ...row, inventory }))
  })
}

function hasObservation(product, observation) {
  return (product?.countEntries || []).some((entry) => (entry.observation || entry.condition) === observation)
}

export function buildDashboardMetrics(inventories = [], users = []) {
  const today = formatDateKey()
  const todayInventories = inventories.filter((inventory) => inventory.dateKey === today)
  const pendingStatuses = ['en_proceso', 'conteo_1_completo', 'conteo_2_completo', 'pendiente_comparacion', 'en_revision', 'reabierto']
  const activeUsers = users.filter((user) => user.active !== false)

  return {
    activeUsers: activeUsers.length,
    inventoriesToday: todayInventories.length,
    pendingInventories: inventories.filter((inventory) => pendingStatuses.includes(inventory.status)).length,
    validatedInventories: inventories.filter((inventory) => ['validado', 'cerrado'].includes(inventory.status)).length,
  }
}

export function buildRecentActivity(inventories = [], logs = []) {
  const logItems = logs.slice(0, 16).map((log) => ({
    action: log.action,
    at: log.createdAtLocal || log.createdAt,
    cedis: log.cedis,
    id: log.id,
    inventoryId: log.inventoryId,
    label: actionLabel(log.action),
    userName: log.userName || log.user?.name || 'Sistema',
  }))

  if (logItems.length) return logItems

  return inventories
    .slice()
    .sort((a, b) => timestampValue(b.updatedAt) - timestampValue(a.updatedAt))
    .slice(0, 8)
    .map((inventory) => ({
      action: 'actualizar_inventario',
      at: inventory.updatedAt,
      cedis: inventory.cedis,
      id: inventory.id,
      inventoryId: inventory.id,
      label: 'Inventario actualizado',
      userName: inventory.updatedBy?.name || inventory.createdBy?.name || 'Sistema',
    }))
}

export function buildInventoryAlerts(inventories = [], users = []) {
  const rows = allProductRows(inventories)
  const highDifferences = rows
    .filter((row) => Math.abs(Number(row.product.difference || 0)) > 0)
    .sort((a, b) => Math.abs(Number(b.product.difference || 0)) - Math.abs(Number(a.product.difference || 0)))
    .slice(0, 8)
    .map((row) => ({
      cedis: row.inventory.cedis,
      detail: `${row.categoryName} - ${row.product.name}`,
      id: `${row.inventory.id}-${row.categoryId}-${row.product.id}`,
      inventoryId: row.inventory.id,
      label: 'Diferencia alta',
      severity: Math.abs(Number(row.product.difference || 0)) >= 10 ? 'red' : 'amber',
      value: row.product.difference,
    }))

  const incomplete = inventories
    .filter((inventory) => Number(inventory.progress || 0) < 100 && !['cerrado', 'validado'].includes(inventory.status))
    .slice(0, 6)
    .map((inventory) => ({
      cedis: inventory.cedis,
      detail: `${inventory.progress || 0}% de avance`,
      id: `incomplete-${inventory.id}`,
      inventoryId: inventory.id,
      label: 'Inventario incompleto',
      severity: 'amber',
      value: inventory.progress || 0,
    }))

  const inactiveUsers = users
    .filter((user) => user.active === false)
    .slice(0, 6)
    .map((user) => ({
      detail: user.email || user.displayName || 'Usuario sin correo',
      id: `inactive-${user.uid || user.id}`,
      label: 'Usuario inactivo',
      severity: 'slate',
      value: user.role || 'sin rol',
    }))

  return [...highDifferences, ...incomplete, ...inactiveUsers]
}

export function buildProductInsights(inventories = []) {
  const rows = allProductRows(inventories)
  const byDifference = rows
    .filter((row) => Math.abs(Number(row.product.difference || 0)) > 0)
    .sort((a, b) => Math.abs(Number(b.product.difference || 0)) - Math.abs(Number(a.product.difference || 0)))
    .slice(0, 12)

  return {
    damaged: rows.filter((row) => hasObservation(row.product, 'Danado')).slice(0, 12),
    differences: byDifference,
    expired: rows.filter((row) => hasObservation(row.product, 'Caducado')).slice(0, 12),
    wet: rows.filter((row) => hasObservation(row.product, 'Mojado')).slice(0, 12),
  }
}

export function buildUserPerformance(inventories = [], logs = []) {
  const users = new Map()

  for (const inventory of inventories) {
    for (const count of inventory.userCounts || []) {
      const key = count.userId || count.userEmail || count.userName
      const current = users.get(key) || {
        countedProducts: 0,
        differences: 0,
        email: count.userEmail,
        errors: 0,
        key,
        name: count.userName,
        validations: 0,
      }
      current.countedProducts += Number(count.countedProducts || 0)
      current.differences += Math.abs(Number(count.difference || 0))
      current.errors += flattenProducts(count.categories || []).filter((row) => Number(row.product.difference || 0) !== 0).length
      users.set(key, current)
    }
  }

  for (const log of logs || []) {
    const key = log.userId || log.userEmail || log.userName
    if (!key) continue
    const current = users.get(key) || {
      countedProducts: 0,
      differences: 0,
      email: log.userEmail,
      errors: 0,
      key,
      name: log.userName || log.user?.name || 'Usuario',
      validations: 0,
    }
    if (String(log.action || '').includes('validar')) current.validations += 1
    users.set(key, current)
  }

  return Array.from(users.values())
    .map((user) => ({
      ...user,
      efficiency: user.countedProducts === 0 ? 0 : Math.max(0, Math.round(((user.countedProducts - user.errors) / user.countedProducts) * 100)),
    }))
    .sort((a, b) => b.countedProducts - a.countedProducts)
}

export function buildInventoryTimeline(inventories = []) {
  const byDate = new Map()
  for (const inventory of inventories || []) {
    const key = inventory.dateKey || 'sin-fecha'
    const current = byDate.get(key) || { date: key, inventories: 0, validated: 0, differences: 0 }
    current.inventories += 1
    if (['validado', 'cerrado'].includes(inventory.status)) current.validated += 1
    current.differences += Math.abs(Number(inventory.finalCount?.difference ?? inventory.difference ?? 0))
    byDate.set(key, current)
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date)).slice(-12)
}

export function buildSupervisorRows(inventories = []) {
  return inventories.flatMap((inventory) =>
    (inventory.userCounts || []).map((count) => ({
      activeProduct: count.activeProduct,
      cedis: inventory.cedis,
      completedAt: count.completedAt,
      countedProducts: count.countedProducts,
      dateKey: inventory.dateKey,
      difference: count.difference,
      inventoryId: inventory.id,
      inventoryStatus: inventory.status,
      lastActivityAt: count.lastActivityAt || count.updatedAt || count.createdAt,
      progress: count.progress || 0,
      status: count.status,
      totalProducts: count.totalProducts,
      userEmail: count.userEmail,
      userId: count.userId,
      userName: count.userName,
    })),
  )
}

export function actionLabel(action) {
  const labels = {
    actualizar_estado_conteo: 'Estado de conteo actualizado',
    actualizar_estado_inventario: 'Estado de inventario actualizado',
    agregar_conteo: 'Conteo agregado',
    crear_conteo_usuario: 'Conteo de usuario creado',
    crear_inventario: 'Inventario creado',
    editar_conteo: 'Conteo editado',
    editar_conteo_comparacion: 'Conteo corregido en comparacion',
    eliminar_conteo: 'Conteo eliminado',
    generar_conteo_final: 'Conteo final generado',
    restaurar_version: 'Version restaurada',
    retirar_validacion_producto: 'Validacion retirada',
    validar_producto: 'Producto validado',
  }
  return labels[action] || action || 'Actividad'
}
