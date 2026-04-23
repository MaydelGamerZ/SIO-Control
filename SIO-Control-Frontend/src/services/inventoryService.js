import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../firebase'
import { safeCreateAuditLog } from './auditLogService'
import { canAuditUser, getUserProfile, updateUserPresence } from './userService'
import {
  createId,
  formatDateKey,
  getUserName,
  inventoryStatuses,
  normalizeInventory,
  normalizeUserCount,
} from '../utils/inventory'

const inventoryCollection = collection(db, 'inventory')

async function getActorProfile(user) {
  if (!user?.uid) return null
  return getUserProfile(user.uid).catch(() => null)
}

async function assertAuditAccess(user, message = 'Solo un auditor autorizado puede realizar esta accion.') {
  const profile = await getActorProfile(user)
  if (!canAuditUser(user, profile)) throw new Error(message)
  return profile
}

function trackInventoryPresence(user, view, inventory = null, category = null) {
  if (!user?.uid) return
  updateUserPresence(user, {
    currentCategoryId: category?.id || '',
    currentCategoryName: category?.name || '',
    currentInventoryId: inventory?.id || '',
    currentView: view,
    lastInventoryActivityAt: serverTimestamp(),
  }).catch(() => {})
}

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

function normalizeInventorySnapshot(snapshot) {
  if (!snapshot.exists()) return null
  return normalizeInventory({ id: snapshot.id, ...snapshot.data() })
}

async function ensureUserCountForInventoryData(inventoryId, data, user) {
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

async function getInventoryDataWithUserCount(inventoryId, user) {
  const data = await getRawInventoryDocument(inventoryId)
  return ensureUserCountForInventoryData(inventoryId, data, user)
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
    exportCount: 0,
    lastExportAt: null,
    lastExportBy: null,
    userCounts: [],
    verifiedProducts: {},
  })

  trackInventoryPresence(user, 'inventario_carga')
  await safeCreateAuditLog({
    actionType: 'inventory_created',
    details: {
      categorias: preparedInventory.totalCategories,
      cedis: preparedInventory.cedis,
      fecha: preparedInventory.dateKey,
      pdf: parsedInventory.sourcePdfName || '',
      productos: preparedInventory.totalProducts,
      semana: preparedInventory.semana || '',
    },
    inventory: {
      ...preparedInventory,
      id: docRef.id,
    },
    summary: `${userSnapshot.name} creo el inventario ${preparedInventory.cedis} del ${preparedInventory.dateKey}.`,
    user,
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

export function subscribeInventory(inventoryId, onData, onError) {
  if (!inventoryId) {
    onData(null)
    return () => {}
  }

  return onSnapshot(
    doc(db, 'inventory', inventoryId),
    (snapshot) => onData(normalizeInventorySnapshot(snapshot)),
    (error) => onError?.(error),
  )
}

export function subscribeInventoryForUser(inventoryId, user, onData, onError) {
  if (!inventoryId || !user) {
    onData(null)
    return () => {}
  }

  let active = true
  const unsubscribe = onSnapshot(
    doc(db, 'inventory', inventoryId),
    async (snapshot) => {
      if (!snapshot.exists()) {
        onData(null)
        return
      }

      try {
        const rawInventory = { id: snapshot.id, ...snapshot.data() }
        const { data, userCount } = await ensureUserCountForInventoryData(snapshot.id, rawInventory, user)
        if (!active) return
        onData(normalizeInventory({
          ...data,
          activeUserCount: userCount,
          categories: userCount.categories,
          useUserCountSummary: true,
        }))
      } catch (error) {
        if (active) onError?.(error)
      }
    },
    (error) => onError?.(error),
  )

  return () => {
    active = false
    unsubscribe()
  }
}

function subscribeCurrentInventoryId(onId, onError) {
  let fallbackUnsubscribe = null
  let currentId = ''
  const emitId = (inventoryId) => {
    if (inventoryId === currentId) return
    currentId = inventoryId
    onId(inventoryId)
  }

  const todayUnsubscribe = onSnapshot(
    query(inventoryCollection, where('dateKey', '==', formatDateKey()), limit(1)),
    (snapshot) => {
      if (!snapshot.empty) {
        fallbackUnsubscribe?.()
        fallbackUnsubscribe = null
        emitId(snapshot.docs[0].id)
        return
      }

      if (fallbackUnsubscribe) return
      fallbackUnsubscribe = onSnapshot(
        query(inventoryCollection, orderBy('updatedAt', 'desc'), limit(1)),
        (latestSnapshot) => emitId(latestSnapshot.empty ? '' : latestSnapshot.docs[0].id),
        (error) => onError?.(error),
      )
    },
    (error) => onError?.(error),
  )

  return () => {
    todayUnsubscribe()
    fallbackUnsubscribe?.()
  }
}

export function subscribeCurrentInventory(inventoryId, onData, onError) {
  if (inventoryId) return subscribeInventory(inventoryId, onData, onError)

  let inventoryUnsubscribe = null
  const idUnsubscribe = subscribeCurrentInventoryId((nextInventoryId) => {
    inventoryUnsubscribe?.()
    if (!nextInventoryId) {
      inventoryUnsubscribe = null
      onData(null)
      return
    }
    inventoryUnsubscribe = subscribeInventory(nextInventoryId, onData, onError)
  }, onError)

  return () => {
    idUnsubscribe()
    inventoryUnsubscribe?.()
  }
}

export function subscribeCurrentInventoryForUser(inventoryId, user, onData, onError) {
  if (inventoryId) return subscribeInventoryForUser(inventoryId, user, onData, onError)

  let inventoryUnsubscribe = null
  const idUnsubscribe = subscribeCurrentInventoryId((nextInventoryId) => {
    inventoryUnsubscribe?.()
    if (!nextInventoryId) {
      inventoryUnsubscribe = null
      onData(null)
      return
    }
    inventoryUnsubscribe = subscribeInventoryForUser(nextInventoryId, user, onData, onError)
  }, onError)

  return () => {
    idUnsubscribe()
    inventoryUnsubscribe?.()
  }
}

export function subscribeTodayInventory(dateKey = formatDateKey(), onData, onError) {
  return onSnapshot(
    query(inventoryCollection, where('dateKey', '==', dateKey), limit(1)),
    (snapshot) => {
      if (snapshot.empty) {
        onData(null)
        return
      }
      const document = snapshot.docs[0]
      onData(normalizeInventory({ id: document.id, ...document.data() }))
    },
    (error) => onError?.(error),
  )
}

export function subscribeInventories(onData, onError) {
  return onSnapshot(
    query(inventoryCollection, orderBy('updatedAt', 'desc')),
    (snapshot) => onData(snapshot.docs.map((document) => normalizeInventory({ id: document.id, ...document.data() }))),
    (error) => onError?.(error),
  )
}

export async function addCountEntry(inventoryId, categoryId, productId, entry, user) {
  const { data, userCounts, userCount, userIndex } = await getInventoryDataWithUserCount(inventoryId, user)

  const now = new Date().toISOString()
  const userSnapshot = makeUserSnapshot(user)
  const countEntry = {
    id: createId('entry'),
    quantity: Number(entry.quantity || 0),
    condition: entry.condition || entry.observation || 'Buen estado',
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
  const category = categories.find((item) => item.id === categoryId)
  const product = category?.products.find((item) => item.id === productId)
  trackInventoryPresence(user, 'inventario_conteo', { ...data, id: inventoryId }, category)
  await safeCreateAuditLog({
    actionType: 'count_entry_added',
    category,
    details: {
      observacion: countEntry.observation,
      quantity: countEntry.quantity,
      totalProducto: product?.totalCounted || countEntry.quantity,
    },
    inventory: { ...data, id: inventoryId },
    product,
    summary: `${userSnapshot.name} agrego ${countEntry.quantity} a ${product?.name || 'producto'}.`,
    user,
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
            condition: entryPatch.condition || entryPatch.observation || entry.condition || entry.observation || 'Buen estado',
            quantity: Number(entryPatch.quantity ?? entry.quantity ?? 0),
            updatedBy: makeUserSnapshot(user),
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
  const category = categories.find((item) => item.id === categoryId)
  const product = category?.products.find((item) => item.id === productId)
  trackInventoryPresence(user, 'inventario_conteo', { ...data, id: inventoryId }, category)
  await safeCreateAuditLog({
    actionType: 'count_entry_updated',
    category,
    details: {
      entryId,
      observacion: entryPatch.observation || entryPatch.condition || '',
      quantity: Number(entryPatch.quantity ?? 0),
    },
    inventory: { ...data, id: inventoryId },
    product,
    summary: `${getUserName(user)} edito un movimiento en ${product?.name || 'producto'}.`,
    user,
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
  const category = categories.find((item) => item.id === categoryId)
  const product = category?.products.find((item) => item.id === productId)
  trackInventoryPresence(user, 'inventario_conteo', { ...data, id: inventoryId }, category)
  await safeCreateAuditLog({
    actionType: 'count_entry_deleted',
    category,
    details: {
      entryId,
    },
    inventory: { ...data, id: inventoryId },
    product,
    summary: `${getUserName(user)} elimino un movimiento en ${product?.name || 'producto'}.`,
    user,
  })
}

export async function updateInventoryStatus(inventoryId, status, user) {
  const currentData = await getRawInventoryDocument(inventoryId)
  let actorProfile = null
  if ([inventoryStatuses.reopened, inventoryStatuses.validated, inventoryStatuses.closed].includes(status)) {
    actorProfile = await assertAuditAccess(user)
  }

  if (status === inventoryStatuses.saved || status === inventoryStatuses.inProgress) {
    const { data, userCounts, userCount, userIndex } = await getInventoryDataWithUserCount(inventoryId, user)
    const now = new Date().toISOString()
    userCounts[userIndex] = summarizeUserCount({
      ...userCount,
      completedAt: status === inventoryStatuses.saved ? now : userCount.completedAt || '',
      status,
      updatedAt: now,
    })
    const nextStatus = getInventoryStatusFromCounts(userCounts, data.status)

    await updateDoc(doc(db, 'inventory', inventoryId), {
      status: nextStatus,
      updatedAt: serverTimestamp(),
      updatedBy: makeUserSnapshot(user),
      userCounts,
    })
    trackInventoryPresence(user, 'inventario_conteo', { ...data, id: inventoryId })
    await safeCreateAuditLog({
      actionType: 'inventory_status_changed',
      details: {
        estadoAnterior: currentData.status || '',
        estadoNuevo: nextStatus,
      },
      inventory: { ...data, id: inventoryId, status: nextStatus },
      profile: actorProfile,
      summary: `${getUserName(user)} cambio el estado del inventario a ${nextStatus}.`,
      user,
    })
    return
  }

  await updateDoc(doc(db, 'inventory', inventoryId), {
    status,
    updatedAt: serverTimestamp(),
    updatedBy: makeUserSnapshot(user),
  })
  trackInventoryPresence(user, 'inventario_gestion', { ...currentData, id: inventoryId })
  await safeCreateAuditLog({
    actionType: status === inventoryStatuses.reopened ? 'inventory_reopened' : 'inventory_status_changed',
    details: {
      estadoAnterior: currentData.status || '',
      estadoNuevo: status,
    },
    inventory: { ...currentData, id: inventoryId, status },
    profile: actorProfile,
    summary: `${getUserName(user)} actualizo el estado del inventario a ${status}.`,
    user,
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
          condition: observation,
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
  const category = categories.find((item) => item.id === categoryId)
  const product = category?.products.find((item) => item.id === productId)
  trackInventoryPresence(user, 'inventario_comparacion', { ...data, id: inventoryId }, category)
  await safeCreateAuditLog({
    actionType: 'count_entry_updated',
    category,
    details: {
      ajusteDirecto: true,
      observacion: observation,
      quantity: Number(quantity || 0),
      userCountId,
    },
    inventory: { ...data, id: inventoryId },
    product,
    summary: `${getUserName(user)} ajusto directamente ${product?.name || 'producto'} durante comparacion.`,
    user,
  })
}

async function updateUserCountProduct(inventoryId, userCountId, categoryId, productId, updater, user) {
  const data = await getRawInventoryDocument(inventoryId)
  const userCounts = (data.userCounts || []).map((count, index) => normalizeUserCount(count, data.categories || [], index))
  const userIndex = userCounts.findIndex((count) => count.id === userCountId || count.userId === userCountId)
  if (userIndex < 0) throw new Error('Conteo de usuario no encontrado')

  const now = new Date().toISOString()
  const categories = updateProductInCategories(userCounts[userIndex].categories, categoryId, productId, updater)
  userCounts[userIndex] = summarizeUserCount({
    ...userCounts[userIndex],
    categories,
    updatedAt: now,
  })

  await updateDoc(doc(db, 'inventory', inventoryId), {
    status: getInventoryStatusFromCounts(userCounts, data.status),
    updatedAt: serverTimestamp(),
    updatedBy: makeUserSnapshot(user),
    userCounts,
  })
  return {
    category: categories.find((item) => item.id === categoryId),
    data,
    userCount: userCounts[userIndex],
  }
}

export async function addUserCountEntry(inventoryId, userCountId, categoryId, productId, entry, user) {
  const now = new Date().toISOString()
  const userSnapshot = makeUserSnapshot(user)
  const countEntry = {
    id: createId('entry'),
    quantity: Number(entry.quantity || 0),
    condition: entry.condition || entry.observation || 'Buen estado',
    observation: entry.observation || entry.condition || 'Buen estado',
    comment: entry.comment || '',
    userId: userSnapshot.uid,
    userName: userSnapshot.name,
    createdAt: now,
    updatedAt: now,
    updatedBy: userSnapshot,
  }

  const context = await updateUserCountProduct(
    inventoryId,
    userCountId,
    categoryId,
    productId,
    (product) => ({
      ...product,
      countEntries: [...(product.countEntries || []), countEntry],
    }),
    user,
  )
  const product = context.category?.products.find((item) => item.id === productId)
  trackInventoryPresence(user, 'inventario_comparacion', { ...context.data, id: inventoryId }, context.category)
  await safeCreateAuditLog({
    actionType: 'count_entry_added',
    category: context.category,
    details: {
      comparacion: true,
      observacion: countEntry.observation,
      quantity: countEntry.quantity,
      userCountId,
    },
    inventory: { ...context.data, id: inventoryId },
    product,
    summary: `${getUserName(user)} agrego un movimiento en comparacion para ${product?.name || 'producto'}.`,
    user,
  })
  return countEntry.id
}

export async function updateUserCountEntry(inventoryId, userCountId, categoryId, productId, entryId, entryPatch, user) {
  const userSnapshot = makeUserSnapshot(user)
  const context = await updateUserCountProduct(
    inventoryId,
    userCountId,
    categoryId,
    productId,
    (product) => ({
      ...product,
      countEntries: (product.countEntries || []).map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              ...entryPatch,
              condition: entryPatch.condition || entryPatch.observation || entry.condition || entry.observation || 'Buen estado',
              observation: entryPatch.observation || entryPatch.condition || entry.observation || 'Buen estado',
              quantity: Number(entryPatch.quantity ?? entry.quantity ?? 0),
              updatedAt: new Date().toISOString(),
              updatedBy: userSnapshot,
            }
          : entry,
      ),
    }),
    user,
  )
  const product = context.category?.products.find((item) => item.id === productId)
  trackInventoryPresence(user, 'inventario_comparacion', { ...context.data, id: inventoryId }, context.category)
  await safeCreateAuditLog({
    actionType: 'count_entry_updated',
    category: context.category,
    details: {
      comparacion: true,
      entryId,
      observacion: entryPatch.observation || entryPatch.condition || '',
      quantity: Number(entryPatch.quantity ?? 0),
      userCountId,
    },
    inventory: { ...context.data, id: inventoryId },
    product,
    summary: `${getUserName(user)} edito un movimiento en comparacion para ${product?.name || 'producto'}.`,
    user,
  })
}

export async function deleteUserCountEntry(inventoryId, userCountId, categoryId, productId, entryId, user) {
  const context = await updateUserCountProduct(
    inventoryId,
    userCountId,
    categoryId,
    productId,
    (product) => ({
      ...product,
      countEntries: (product.countEntries || []).filter((entry) => entry.id !== entryId),
    }),
    user,
  )
  const product = context.category?.products.find((item) => item.id === productId)
  trackInventoryPresence(user, 'inventario_comparacion', { ...context.data, id: inventoryId }, context.category)
  await safeCreateAuditLog({
    actionType: 'count_entry_deleted',
    category: context.category,
    details: {
      comparacion: true,
      entryId,
      userCountId,
    },
    inventory: { ...context.data, id: inventoryId },
    product,
    summary: `${getUserName(user)} elimino un movimiento en comparacion para ${product?.name || 'producto'}.`,
    user,
  })
}

export async function verifyComparisonProduct(inventoryId, productKey, user) {
  return setComparisonProductVerification(inventoryId, productKey, true, user)
}

export async function setComparisonProductVerification(inventoryId, productKey, verified, user) {
  const actorProfile = await assertAuditAccess(user, 'Solo un auditor puede validar diferencias.')
  const data = await getRawInventoryDocument(inventoryId)
  const normalized = normalizeInventory(data)
  const [categoryId, productId] = String(productKey || '').split(':')
  const category = normalized.categories.find((item) => item.id === categoryId)
  const product = category?.products.find((item) => item.id === productId)
  await updateDoc(doc(db, 'inventory', inventoryId), {
    updatedAt: serverTimestamp(),
    updatedBy: makeUserSnapshot(user),
    verifiedProducts: {
      ...(data.verifiedProducts || {}),
      [productKey]: verified,
    },
  })
  trackInventoryPresence(user, 'inventario_comparacion', { ...data, id: inventoryId }, category)
  await safeCreateAuditLog({
    actionType: verified ? 'comparison_product_validated' : 'comparison_product_unvalidated',
    category,
    details: {
      validated: verified,
    },
    inventory: { ...data, id: inventoryId },
    product,
    profile: actorProfile,
    summary: `${getUserName(user)} ${verified ? 'valido' : 'marco pendiente'} ${product?.name || 'producto'} en comparacion.`,
    user,
  })
}

export async function generateFinalCount(inventoryId, user, countAId = '', countBId = '') {
  const actorProfile = await assertAuditAccess(user, 'Solo un auditor puede generar el conteo final.')
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
              condition: 'Conteo validado',
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
  trackInventoryPresence(user, 'inventario_comparacion', { ...data, id: inventoryId })
  await safeCreateAuditLog({
    actionType: 'final_count_generated',
    details: {
      countAId: firstCount.id,
      countBId: secondCount.id,
      totalCounted: finalCount.totalCounted,
      totalProducts: finalCount.totalProducts,
    },
    inventory: { ...data, id: inventoryId, status: inventoryStatuses.validated },
    profile: actorProfile,
    summary: `${getUserName(user)} genero el conteo final validado del inventario.`,
    user,
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
