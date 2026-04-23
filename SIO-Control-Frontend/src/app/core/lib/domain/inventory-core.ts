// @ts-nocheck
export const inventoryStatuses = {
  draft: 'borrador',
  inProgress: 'en_proceso',
  inReview: 'en_revision',
  count1Complete: 'conteo_1_completo',
  count2Complete: 'conteo_2_completo',
  pendingComparison: 'pendiente_comparacion',
  locked: 'bloqueado',
  validated: 'validado',
  saved: 'guardado',
  closed: 'cerrado',
  reopened: 'reabierto',
}

export const readOnlyInventoryStatuses = [
  inventoryStatuses.locked,
  inventoryStatuses.closed,
]

export function isInventoryReadOnly(status) {
  return readOnlyInventoryStatuses.includes(status)
}

export function canEditInventory(status) {
  return !isInventoryReadOnly(status)
}

export const observationOptions = ['Buen estado', 'Danado', 'Mojado', 'Caducado', 'Otro']

export const productFilters = [
  { id: 'global', label: 'Ver todo' },
  { id: 'all', label: 'Todos' },
  { id: 'pending', label: 'Pendientes' },
  { id: 'counted', label: 'Con conteo' },
  { id: 'missing', label: 'Con faltante' },
  { id: 'surplus', label: 'Con sobrante' },
  { id: 'observations', label: 'Observaciones' },
  { id: 'damaged', label: 'Danados' },
  { id: 'wet', label: 'Mojados' },
  { id: 'expired', label: 'Caducados' },
]

export function formatDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatDisplayDate(value) {
  if (!value) return 'Sin fecha'
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00`) : value
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatTime(value) {
  if (!value) return '--:--'
  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatNumber(value) {
  return new Intl.NumberFormat('es-MX').format(Number(value) || 0)
}

export function createId(prefix = 'id') {
  const cryptoApi = globalThis.crypto
  if (cryptoApi?.randomUUID) return `${prefix}-${cryptoApi.randomUUID()}`
  const randomValue = cryptoApi?.getRandomValues ? cryptoApi.getRandomValues(new Uint32Array(1))[0].toString(16) : Math.random().toString(16).slice(2)
  return `${prefix}-${Date.now()}-${randomValue}`
}

export function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function flattenProducts(categories = []) {
  const rows = []
  for (const category of categories || []) {
    for (const product of category.products || []) {
      rows.push({
        category,
        categoryId: category.id,
        categoryName: category.name,
        product,
      })
    }
  }
  return rows
}

export function normalizeCategories(rawCategories = []) {
  return (rawCategories || []).map((category, categoryIndex) => {
    const products = (category.products || []).map((product, productIndex) => {
      const countEntries = product.countEntries || []
      const totalCounted = countEntries.reduce((total, entry) => total + Number(entry.quantity || 0), 0)
      const stock = Number(product.stock || 0)
      return {
        ...product,
        id: product.id || createId('prod'),
        name: product.name || `Producto ${productIndex + 1}`,
        order: Number.isFinite(product.order) ? product.order : productIndex,
        stock,
        noDisponible: Number(product.noDisponible || 0),
        totalCounted,
        difference: totalCounted - stock,
        countEntries,
      }
    })

    return {
      ...category,
      id: category.id || createId('cat'),
      name: category.name || `Categoria ${categoryIndex + 1}`,
      order: Number.isFinite(category.order) ? category.order : categoryIndex,
      products,
    }
  })
}

export function summarizeCategories(categories = []) {
  const products = flattenProducts(categories).map((row) => row.product)
  const totalStock = products.reduce((total, product) => total + Number(product.stock || 0), 0)
  const totalCounted = products.reduce((total, product) => total + Number(product.totalCounted || 0), 0)
  const totalProducts = products.length
  const countedProducts = products.filter((product) => product.countEntries.length > 0).length
  const totalMovements = products.reduce((total, product) => total + Number(product.countEntries?.length || 0), 0)
  const reviewedCategories = categories.filter((category) =>
    category.products.length > 0 && category.products.every((product) => product.countEntries.length > 0),
  ).length

  return {
    countedProducts,
    difference: totalCounted - totalStock,
    progress: totalProducts === 0 ? 0 : Math.round((countedProducts / totalProducts) * 100),
    reviewedCategories,
    totalCategories: categories.length,
    totalCounted,
    totalMovements,
    totalProducts,
    totalStock,
  }
}

export function normalizeUserCount(rawCount = {}, fallbackCategories = [], index = 0) {
  const categories = normalizeCategories(rawCount.categories?.length ? rawCount.categories : fallbackCategories)
  return {
    ...rawCount,
    id: rawCount.id || rawCount.userId || createId('uc'),
    order: Number.isFinite(rawCount.order) ? rawCount.order : index,
    status: rawCount.status || inventoryStatuses.inProgress,
    userEmail: rawCount.userEmail || '',
    userId: rawCount.userId || '',
    userName: rawCount.userName || `Usuario ${index + 1}`,
    categories,
    ...summarizeCategories(categories),
  }
}

export function normalizeInventory(rawInventory = {}) {
  const categories = normalizeCategories(rawInventory.categories || [])
  const userCounts = (rawInventory.userCounts || []).map((count, countIndex) => normalizeUserCount(count, categories, countIndex))
  const finalCount = rawInventory.finalCount
    ? {
        ...rawInventory.finalCount,
        categories: normalizeCategories(rawInventory.finalCount.categories || []),
        ...summarizeCategories(normalizeCategories(rawInventory.finalCount.categories || [])),
      }
    : null
  const summaryCategories = rawInventory.useUserCountSummary || rawInventory.activeUserCount
    ? categories
    : finalCount?.categories || userCounts[0]?.categories || categories
  const summary = summarizeCategories(summaryCategories)

  return {
    ...rawInventory,
    categories,
    finalCount,
    participants: userCounts.map((count) => ({
      completedAt: count.completedAt || '',
      status: count.status,
      userEmail: count.userEmail,
      userId: count.userId,
      userName: count.userName,
    })),
    userCountCount: userCounts.length,
    userCounts,
    ...summary,
  }
}

export function getCategoryProgress(category) {
  const products = category?.products || []
  if (products.length === 0) return 0
  const counted = products.filter((product) => (product.countEntries || []).length > 0).length
  return Math.round((counted / products.length) * 100)
}

export function getProductStatus(product) {
  if (!product.countEntries?.length) return { label: 'Pendiente', tone: 'slate' }
  if (product.difference === 0) return { label: 'Coincide', tone: 'green' }
  if (product.difference > 0) return { label: 'Sobrante', tone: 'amber' }
  return { label: 'Faltante', tone: 'red' }
}

export function getProductRisk(product) {
  const stock = Math.abs(Number(product?.stock || 0))
  const difference = Math.abs(Number(product?.difference || 0))
  const entries = product?.countEntries || []
  const hasCriticalObservation = entries.some((entry) =>
    ['Danado', 'Mojado', 'Caducado'].includes(entry.observation || entry.condition),
  )
  const differenceRatio = stock === 0 ? (difference > 0 ? 1 : 0) : difference / stock
  const critical = difference >= 10 || differenceRatio >= 0.2 || hasCriticalObservation

  if (critical) return { critical: true, label: 'Critico', score: Math.max(differenceRatio, hasCriticalObservation ? 0.5 : 0), tone: 'red' }
  if (difference > 0) return { critical: false, label: 'Revisar', score: differenceRatio, tone: 'amber' }
  return { critical: false, label: 'Normal', score: 0, tone: 'green' }
}

export function productMatchesFilter(product, filterId) {
  const entries = product.countEntries || []
  const hasObservation = entries.some((entry) => entry.observation && entry.observation !== 'Buen estado')
  const hasObservationNamed = (name) => entries.some((entry) => entry.observation === name)

  if (filterId === 'global') return true
  if (filterId === 'pending') return entries.length === 0
  if (filterId === 'counted') return entries.length > 0
  if (filterId === 'missing') return entries.length > 0 && Number(product.difference || 0) < 0
  if (filterId === 'surplus') return entries.length > 0 && Number(product.difference || 0) > 0
  if (filterId === 'observations') return hasObservation
  if (filterId === 'damaged') return hasObservationNamed('Danado')
  if (filterId === 'wet') return hasObservationNamed('Mojado')
  if (filterId === 'expired') return hasObservationNamed('Caducado')
  return true
}

export function filterProductRows({ categories = [], categoryId = '', filterId = 'all', search = '' }) {
  const text = search.trim().toLowerCase()
  const shouldShowEveryCategory = Boolean(text) || filterId === 'global'
  const sourceRows = categoryId && !shouldShowEveryCategory
    ? flattenProducts(categories.filter((category) => category.id === categoryId))
    : flattenProducts(categories)

  return sourceRows.filter((row) => {
    const matchesText = !text || `${row.product.name} ${row.categoryName}`.toLowerCase().includes(text)
    return matchesText && productMatchesFilter(row.product, filterId)
  })
}

export function getUserName(user) {
  return user?.displayName || user?.email || 'Usuario'
}
