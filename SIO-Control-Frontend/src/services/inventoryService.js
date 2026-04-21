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
  normalizeUserCount,
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

function cloneCategoriesForUserCount(categories) {
  return prepareCategories(categories).map((category) => ({
    ...category,
    products: category.products.map((product) => ({
      ...product,
      countEntries: [],
      difference: -Number(product.stock || 0),
      totalCounted: 0,
    })),
  }))
}

function getUserKey(user) {
  return user?.uid || user?.email || 'anonymous'
}

function createUserCount(user, categories, order = 0) {
  const now = new Date().toISOString()
  const userSnapshot = makeUserSnapshot(user)
  return normalizeUserCount({
    id: createId('uc'),
    userEmail: userSnapshot.email,
    userId: userSnapshot.uid,
    userName: userSnapshot.name,
    order,
    status: inventoryStatuses.inProgress,
    createdAt: now,
    updatedAt: now,
    categories: cloneCategoriesForUserCount(categories),
  })
}

function getCountUserKey(count) {
  return count.userId || count.userEmail || count.id
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

function updateProductInCategories(categories, categoryId, productId, updater) {
  return updateProductInInventory({ categories }, categoryId, productId, updater).categories
}

function summarizeUserCount(count) {
  return normalizeUserCount(count)
}

function getInventoryStatusFromCounts(userCounts, fallbackStatus = inventoryStatuses.inProgress) {
  const completedCounts = (userCounts || []).filter((count) =>
    [inventoryStatuses.saved, 'completo', inventoryStatuses.count1Complete, inventoryStatuses.count2Complete].includes(count.status),
  ).length

  if (fallbackStatus === inventoryStatuses.validated || fallbackStatus === inventoryStatuses.closed) return fallbackStatus
  if (completedCounts >= 2) return inventoryStatuses.pendingComparison
  if (completedCounts === 1) return inventoryStatuses.count1Complete
  return inventoryStatuses.inProgress
}

async function getRawInventoryDocument(inventoryId) {
  const snapshot = await getDoc(doc(db, 'inventory', inventoryId))
  if (!snapshot.exists()) throw new Error('Inventario no encontrado')
  return { id: snapshot.id, ...snapshot.data() }
}

async function getInventoryDataWithUserCount(inventoryId, user) {
  const data = await getRawInventoryDocument(inventoryId)
  const userCounts = Array.isArray(data.userCounts) ? data.userCounts.map((count, index) => normalizeUserCount(count, data.categories || [], index)) : []
  const userKey = getUserKey(user)
  let userIndex = userCounts.findIndex((count) => getCountUserKey(count) === userKey)

  if (userIndex < 0) {
    userCounts.push(createUserCount(user, data.categories || [], userCounts.length))
    userIndex = userCounts.length - 1
    await updateDoc(doc(db, 'inventory', inventoryId), {
      status: getInventoryStatusFromCounts(userCounts, data.status),
      updatedAt: serverTimestamp(),
      updatedBy: makeUserSnapshot(user),
      userCounts,
    })
  }

  return {
    data: {
      ...data,
      userCounts,
    },
    userCount: userCounts[userIndex],
    userCounts,
    userIndex,
  }
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
    userCounts: [],
    verifiedProducts: {},
  })

  return docRef.id
}

export async function getInventory(id) {
  const snapshot = await getDoc(doc(db, 'inventory', id))
  if (!snapshot.exists()) return null
  return normalizeInventory({ id: snapshot.id, ...snapshot.data() })
}

export async function getInventoryForUser(id, user) {
  const { data, userCount } = await getInventoryDataWithUserCount(id, user)
  return normalizeInventory({
    ...data,
    activeUserCount: userCount,
    categories: userCount.categories,
    useUserCountSummary: true,
  })
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
  const { data, userCounts, userCount, userIndex } = await getInventoryDataWithUserCount(inventoryId, user)

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

  const categories = updateProductInCategories(userCount.categories, categoryId, productId, (product) => ({
    ...product,
    countEntries: [...(product.countEntries || []), countEntry],
  }))
  userCounts[userIndex] = summarizeUserCount({
    ...userCount,
    categories,
    status: inventoryStatuses.inProgress,
    updatedAt: now,
  })

  await updateDoc(doc(db, 'inventory', inventoryId), {
    status: getInventoryStatusFromCounts(userCounts, data.status),
    updatedAt: serverTimestamp(),
    updatedBy: userSnapshot,
    userCounts,
  })
  return countEntry.id
}

export async function updateCountEntry(inventoryId, categoryId, productId, entryId, entryPatch, user) {
  const { data, userCounts, userCount, userIndex } = await getInventoryDataWithUserCount(inventoryId, user)

  const categories = updateProductInCategories(userCount.categories, categoryId, productId, (product) => ({
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
  userCounts[userIndex] = summarizeUserCount({
    ...userCount,
    categories,
    updatedAt: new Date().toISOString(),
  })

  await updateDoc(doc(db, 'inventory', inventoryId), {
    status: getInventoryStatusFromCounts(userCounts, data.status),
    updatedAt: serverTimestamp(),
    updatedBy: makeUserSnapshot(user),
    userCounts,
  })
}

export async function deleteCountEntry(inventoryId, categoryId, productId, entryId, user) {
  const { data, userCounts, userCount, userIndex } = await getInventoryDataWithUserCount(inventoryId, user)

  const categories = updateProductInCategories(userCount.categories, categoryId, productId, (product) => ({
    ...product,
    countEntries: (product.countEntries || []).filter((entry) => entry.id !== entryId),
  }))
  userCounts[userIndex] = summarizeUserCount({
    ...userCount,
    categories,
    updatedAt: new Date().toISOString(),
  })

  await updateDoc(doc(db, 'inventory', inventoryId), {
    status: getInventoryStatusFromCounts(userCounts, data.status),
    updatedAt: serverTimestamp(),
    updatedBy: makeUserSnapshot(user),
    userCounts,
  })
}

export async function updateInventoryStatus(inventoryId, status, user) {
  if (status === inventoryStatuses.saved || status === inventoryStatuses.inProgress) {
    const { data, userCounts, userCount, userIndex } = await getInventoryDataWithUserCount(inventoryId, user)
    const now = new Date().toISOString()
    userCounts[userIndex] = summarizeUserCount({
      ...userCount,
      completedAt: status === inventoryStatuses.saved ? now : userCount.completedAt || '',
      status,
      updatedAt: now,
    })

    await updateDoc(doc(db, 'inventory', inventoryId), {
      status: getInventoryStatusFromCounts(userCounts, data.status),
      updatedAt: serverTimestamp(),
      updatedBy: makeUserSnapshot(user),
      userCounts,
    })
    return
  }

  await updateDoc(doc(db, 'inventory', inventoryId), {
    status,
    updatedAt: serverTimestamp(),
    updatedBy: makeUserSnapshot(user),
  })
}

export async function setUserProductTotal(inventoryId, userCountId, categoryId, productId, quantity, user, observation = 'Ajuste comparacion', comment = 'Correccion directa en comparacion') {
  const data = await getRawInventoryDocument(inventoryId)
  const userCounts = (data.userCounts || []).map((count, index) => normalizeUserCount(count, data.categories || [], index))
  const userIndex = userCounts.findIndex((count) => count.id === userCountId || count.userId === userCountId)
  if (userIndex < 0) throw new Error('Conteo de usuario no encontrado')

  const now = new Date().toISOString()
  const userSnapshot = makeUserSnapshot(user)
  const categories = updateProductInCategories(userCounts[userIndex].categories, categoryId, productId, (product) => ({
    ...product,
    countEntries: Number(quantity || 0) > 0
      ? [{
          id: createId('entry'),
          quantity: Number(quantity || 0),
          observation,
          comment,
          userId: userSnapshot.uid,
          userName: userSnapshot.name,
          createdAt: now,
          updatedAt: now,
        }]
      : [],
  }))

  userCounts[userIndex] = summarizeUserCount({
    ...userCounts[userIndex],
    categories,
    updatedAt: now,
  })

  await updateDoc(doc(db, 'inventory', inventoryId), {
    status: getInventoryStatusFromCounts(userCounts, data.status),
    updatedAt: serverTimestamp(),
    updatedBy: userSnapshot,
    userCounts,
  })
}

export async function verifyComparisonProduct(inventoryId, productKey, user) {
  const data = await getRawInventoryDocument(inventoryId)
  await updateDoc(doc(db, 'inventory', inventoryId), {
    updatedAt: serverTimestamp(),
    updatedBy: makeUserSnapshot(user),
    verifiedProducts: {
      ...(data.verifiedProducts || {}),
      [productKey]: true,
    },
  })
}

export async function generateFinalCount(inventoryId, user, countAId = '', countBId = '') {
  const data = await getRawInventoryDocument(inventoryId)
  const normalized = normalizeInventory(data)
  const firstCount = normalized.userCounts.find((count) => count.id === countAId) || normalized.userCounts[0]
  const secondCount = normalized.userCounts.find((count) => count.id === countBId) || normalized.userCounts[1]
  if (!firstCount || !secondCount) throw new Error('Se necesitan al menos dos conteos para generar el conteo final.')
  if (firstCount.id === secondCount.id) throw new Error('Selecciona dos conteos de usuarios diferentes.')

  const now = new Date().toISOString()
  const userSnapshot = makeUserSnapshot(user)
  const secondRows = new Map()
  for (const category of secondCount.categories) {
    for (const product of category.products || []) {
      secondRows.set(`${category.id}:${product.id}`, product)
    }
  }

  const unresolvedRows = []
  for (const category of firstCount.categories) {
    for (const product of category.products || []) {
      const productKey = `${category.id}:${product.id}`
      const pair = secondRows.get(productKey)
      if (Number(product.totalCounted || 0) !== Number(pair?.totalCounted || 0) && !data.verifiedProducts?.[productKey]) {
        unresolvedRows.push(product.name)
      }
    }
  }
  if (unresolvedRows.length > 0) {
    throw new Error(`Hay ${unresolvedRows.length} producto(s) con diferencias sin verificar antes de generar el conteo final.`)
  }

  const finalCategories = firstCount.categories.map((category) => ({
    ...category,
    products: (category.products || []).map((product) => {
      const pair = secondRows.get(`${category.id}:${product.id}`)
      const finalQuantity = product.totalCounted === pair?.totalCounted ? product.totalCounted : product.totalCounted
      return {
        ...product,
        countEntries: Number(finalQuantity || 0) > 0
          ? [{
              id: createId('entry'),
              quantity: Number(finalQuantity || 0),
              observation: 'Conteo validado',
              comment: 'Resultado final de comparacion multiusuario',
              userId: userSnapshot.uid,
              userName: userSnapshot.name,
              createdAt: now,
              updatedAt: now,
            }]
          : [],
      }
    }),
  }))
  const finalCount = summarizeUserCount({
    id: createId('final'),
    userId: 'final',
    userName: 'Conteo final validado',
    status: inventoryStatuses.validated,
    createdAt: now,
    updatedAt: now,
    categories: finalCategories,
  })

  await updateDoc(doc(db, 'inventory', inventoryId), {
    finalCount,
    status: inventoryStatuses.validated,
    updatedAt: serverTimestamp(),
    updatedBy: userSnapshot,
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
    totalMovements: normalized.totalMovements,
    totalProducts: normalized.totalProducts,
    totalStock: normalized.totalStock,
    updatedAt: serverTimestamp(),
    updatedBy: makeUserSnapshot(user),
  })
}
