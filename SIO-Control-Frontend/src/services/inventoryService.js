import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../firebase'
import {
  createId,
  formatDateKey,
  getUserName,
  inventoryStatuses,
  normalizeInventory,
} from '../utils/inventory'

const inventoryCollection = collection(db, 'inventory')

function makeUserSnapshot(user) {
  return {
    uid: user?.uid || '',
    name: getUserName(user),
    email: user?.email || '',
  }
}

function prepareCategories(categories) {
  return (categories || []).map((category, categoryIndex) => ({
    ...category,
    id: category.id || createId('cat'),
    name: category.name || `Categoria ${categoryIndex + 1}`,
    order: Number.isFinite(category.order) ? category.order : categoryIndex,
    products: (category.products || []).map((product, productIndex) => ({
      ...product,
      id: product.id || createId('prod'),
      name: product.name || `Producto ${productIndex + 1}`,
      order: Number.isFinite(product.order) ? product.order : productIndex,
      stock: Number(product.stock || 0),
      noDisponible: Number(product.noDisponible || 0),
      totalCounted: 0,
      difference: -Number(product.stock || 0),
      countEntries: [],
    })),
  }))
}

function recalcInventory(inventory) {
  return normalizeInventory(inventory)
}

function updateProductInInventory(inventory, categoryId, productId, updater) {
  const categories = (inventory.categories || []).map((category) => {
    if (category.id !== categoryId) return category

    return {
      ...category,
      products: (category.products || []).map((product) => {
        if (product.id !== productId) return product
        const updatedProduct = updater(product)
        const totalCounted = (updatedProduct.countEntries || []).reduce(
          (total, entry) => total + Number(entry.quantity || 0),
          0,
        )
        return {
          ...updatedProduct,
          totalCounted,
          difference: totalCounted - Number(updatedProduct.stock || 0),
        }
      }),
    }
  })

  return recalcInventory({ ...inventory, categories })
}

export async function createInventoryFromParsed(parsedInventory, user) {
  const now = new Date()
  const dateKey = parsedInventory.dateKey || formatDateKey(now)
  const preparedInventory = normalizeInventory({
    cedis: parsedInventory.cedis || 'CEDIS sin definir',
    categories: prepareCategories(parsedInventory.categories),
    dateKey,
    fecha: parsedInventory.fecha || dateKey,
    semana: parsedInventory.semana || '',
    sourcePdfName: parsedInventory.sourcePdfName || '',
    status: inventoryStatuses.inProgress,
    totalGeneralPdf: Number(parsedInventory.totalGeneralPdf || 0),
  })

  const userSnapshot = makeUserSnapshot(user)
  const docRef = await addDoc(inventoryCollection, {
    ...preparedInventory,
    createdAt: serverTimestamp(),
    createdBy: userSnapshot,
    updatedAt: serverTimestamp(),
    updatedBy: userSnapshot,
  })

  return docRef.id
}

export async function getInventory(id) {
  const snapshot = await getDoc(doc(db, 'inventory', id))
  if (!snapshot.exists()) return null
  return normalizeInventory({ id: snapshot.id, ...snapshot.data() })
}

export async function getTodayInventory(dateKey = formatDateKey()) {
  const snapshot = await getDocs(query(inventoryCollection, where('dateKey', '==', dateKey), limit(1)))
  if (snapshot.empty) return null
  const document = snapshot.docs[0]
  return normalizeInventory({ id: document.id, ...document.data() })
}

export async function getLatestInventory() {
  const snapshot = await getDocs(query(inventoryCollection, orderBy('updatedAt', 'desc'), limit(1)))
  if (snapshot.empty) return null
  const document = snapshot.docs[0]
  return normalizeInventory({ id: document.id, ...document.data() })
}

export async function listInventories() {
  const snapshot = await getDocs(query(inventoryCollection, orderBy('updatedAt', 'desc')))
  return snapshot.docs.map((document) => normalizeInventory({ id: document.id, ...document.data() }))
}

export async function addCountEntry(inventoryId, categoryId, productId, entry, user) {
  const inventory = await getInventory(inventoryId)
  if (!inventory) throw new Error('Inventario no encontrado')

  const now = new Date().toISOString()
  const userSnapshot = makeUserSnapshot(user)
  const countEntry = {
    id: createId('entry'),
    quantity: Number(entry.quantity || 0),
    observation: entry.observation || 'Buen estado',
    comment: entry.comment || '',
    userId: userSnapshot.uid,
    userName: userSnapshot.name,
    createdAt: now,
    updatedAt: now,
  }

  const updatedInventory = updateProductInInventory(inventory, categoryId, productId, (product) => ({
    ...product,
    countEntries: [...(product.countEntries || []), countEntry],
  }))

  await updateInventoryDocument(inventoryId, updatedInventory, user)
  return countEntry.id
}

export async function updateCountEntry(inventoryId, categoryId, productId, entryId, entryPatch, user) {
  const inventory = await getInventory(inventoryId)
  if (!inventory) throw new Error('Inventario no encontrado')

  const updatedInventory = updateProductInInventory(inventory, categoryId, productId, (product) => ({
    ...product,
    countEntries: (product.countEntries || []).map((entry) =>
      entry.id === entryId
        ? {
            ...entry,
            ...entryPatch,
            quantity: Number(entryPatch.quantity ?? entry.quantity ?? 0),
            updatedAt: new Date().toISOString(),
          }
        : entry,
    ),
  }))

  await updateInventoryDocument(inventoryId, updatedInventory, user)
}

export async function deleteCountEntry(inventoryId, categoryId, productId, entryId, user) {
  const inventory = await getInventory(inventoryId)
  if (!inventory) throw new Error('Inventario no encontrado')

  const updatedInventory = updateProductInInventory(inventory, categoryId, productId, (product) => ({
    ...product,
    countEntries: (product.countEntries || []).filter((entry) => entry.id !== entryId),
  }))

  await updateInventoryDocument(inventoryId, updatedInventory, user)
}

export async function updateInventoryStatus(inventoryId, status, user) {
  await updateDoc(doc(db, 'inventory', inventoryId), {
    status,
    updatedAt: serverTimestamp(),
    updatedBy: makeUserSnapshot(user),
  })
}

export async function updateInventoryDocument(inventoryId, inventory, user) {
  const normalized = normalizeInventory(inventory)
  await updateDoc(doc(db, 'inventory', inventoryId), {
    categories: normalized.categories,
    countedProducts: normalized.countedProducts,
    difference: normalized.difference,
    progress: normalized.progress,
    reviewedCategories: normalized.reviewedCategories,
    status: normalized.status || inventoryStatuses.inProgress,
    totalCategories: normalized.totalCategories,
    totalCounted: normalized.totalCounted,
    totalProducts: normalized.totalProducts,
    totalStock: normalized.totalStock,
    updatedAt: serverTimestamp(),
    updatedBy: makeUserSnapshot(user),
  })
}
