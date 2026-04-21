export const inventoryStatuses = {
  draft: 'borrador',
  inProgress: 'en_proceso',
  saved: 'guardado',
  closed: 'cerrado',
  reopened: 'reabierto',
}

export const observationOptions = ['Buen estado', 'Danado', 'Mojado', 'Caducado', 'Otro']

export const productFilters = [
  { id: 'all', label: 'Todos' },
  { id: 'pending', label: 'Pendientes' },
  { id: 'counted', label: 'Con conteo' },
  { id: 'missing', label: 'Faltantes' },
  { id: 'surplus', label: 'Sobrantes' },
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

export function normalizeInventory(rawInventory = {}) {
  const categories = (rawInventory.categories || []).map((category, categoryIndex) => {
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
    ...rawInventory,
    categories,
    totalCategories: categories.length,
    totalProducts,
    totalStock,
    totalCounted,
    difference: totalCounted - totalStock,
    countedProducts,
    totalMovements,
    reviewedCategories,
    progress: totalProducts === 0 ? 0 : Math.round((countedProducts / totalProducts) * 100),
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

export function productMatchesFilter(product, filterId) {
  const entries = product.countEntries || []
  const hasObservation = entries.some((entry) => entry.observation && entry.observation !== 'Buen estado')
  const hasObservationNamed = (name) => entries.some((entry) => entry.observation === name)

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
  const sourceRows = categoryId && !text
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
