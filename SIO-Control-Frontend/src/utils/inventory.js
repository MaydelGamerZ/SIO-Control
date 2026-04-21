export const inventoryStatuses = {
  draft: 'borrador',
  inProgress: 'en_proceso',
  saved: 'guardado',
  closed: 'cerrado',
  reopened: 'reabierto',
}

export const observationOptions = ['Buen estado', 'Danado', 'Mojado', 'Caducado', 'Otro']

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
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function normalizeInventory(rawInventory) {
  const categories = (rawInventory.categories || []).map((category, categoryIndex) => ({
    id: category.id || createId('cat'),
    name: category.name || `Categoria ${categoryIndex + 1}`,
    order: Number.isFinite(category.order) ? category.order : categoryIndex,
    products: (category.products || []).map((product, productIndex) => {
      const countEntries = product.countEntries || []
      const totalCounted = countEntries.reduce((total, entry) => total + Number(entry.quantity || 0), 0)
      const stock = Number(product.stock || 0)
      return {
        id: product.id || createId('prod'),
        name: product.name || `Producto ${productIndex + 1}`,
        order: Number.isFinite(product.order) ? product.order : productIndex,
        stock,
        noDisponible: Number(product.noDisponible || 0),
        totalCounted,
        difference: totalCounted - stock,
        countEntries,
      }
    }),
  }))

  const products = categories.flatMap((category) => category.products)
  const totalStock = products.reduce((total, product) => total + Number(product.stock || 0), 0)
  const totalCounted = products.reduce((total, product) => total + Number(product.totalCounted || 0), 0)
  const totalProducts = products.length
  const countedProducts = products.filter((product) => product.countEntries.length > 0).length
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

export function getUserName(user) {
  return user?.displayName || user?.email || 'Usuario'
}
