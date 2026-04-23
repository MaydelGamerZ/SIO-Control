// @ts-nocheck
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
import { db } from './firebase'
import {
  createId,
  formatDateKey,
  getUserName,
  inventoryStatuses,
  isInventoryReadOnly,
  normalizeInventory,
  normalizeUserCount,
} from '../domain/inventory-core'
import { assertCanAudit, assertCanCount } from './user.repository'

const inventoryCollection = collection(db, 'inventory')
const auditCollection = collection(db, 'auditLogs')

function makeUserSnapshot(user) {
  return {
    uid: user?.uid || '',
    name: getUserName(user),
    email: user?.email || '',
  }
}

function getLocalTimestamp() {
  return new Date().toISOString()
}

function assertInventoryEditable(inventory, action = 'modificar') {
  if (isInventoryReadOnly(inventory?.status)) {
    throw new Error(`El inventario esta ${inventory.status}; no se puede ${action}.`)
  }
}

function appendVersion(versions = [], version) {
  return [...(versions || []).slice(-14), version]
}

function createInventoryVersion(inventory, label, user, type = 'cambio') {
  const normalized = normalizeInventory(inventory)
  return {
    id: createId('ver'),
    createdAt: getLocalTimestamp(),
    createdBy: makeUserSnapshot(user),
    difference: normalized.finalCount?.difference ?? normalized.difference ?? 0,
    label,
    progress: normalized.progress || 0,
    status: normalized.status || inventoryStatuses.inProgress,
    totalCounted: normalized.finalCount?.totalCounted ?? normalized.totalCounted ?? 0,
    type,
    snapshot: {
      categories: normalized.categories || [],
      cedis: normalized.cedis || '',
      dateKey: normalized.dateKey || '',
      fecha: normalized.fecha || '',
      finalCount: normalized.finalCount || null,
      semana: normalized.semana || '',
      sourcePdfName: normalized.sourcePdfName || '',
      status: normalized.status || inventoryStatuses.inProgress,
      totalGeneralPdf: Number(normalized.totalGeneralPdf || 0),
      userCounts: normalized.userCounts || [],
      verifiedProducts: normalized.verifiedProducts || {},
    },
  }
}

function findProductMeta(categories, categoryId, productId) {
  const category = (categories || []).find((item) => item.id === categoryId)
  const product = category?.products?.find((item) => item.id === productId)
  return {
    categoryName: category?.name || 'Sin categoria',
    productName: product?.name || 'Producto',
  }
}

function createAuditDetails(details = {}) {
  return JSON.parse(JSON.stringify(details))
}

async function logAuditEvent(action, inventory, user, details = {}) {
  const userSnapshot = makeUserSnapshot(user)
  await addDoc(auditCollection, {
    action,
    cedis: inventory?.cedis || '',
    createdAt: serverTimestamp(),
    createdAtLocal: getLocalTimestamp(),
    dateKey: inventory?.dateKey || '',
    details: createAuditDetails(details),
    inventoryId: inventory?.id || '',
    inventoryStatus: inventory?.status || '',
    user: userSnapshot,
    userEmail: userSnapshot.email,
    userId: userSnapshot.uid,
    userName: userSnapshot.name,
  })
}

function logAuditEventSafe(action, inventory, user, details = {}) {
  logAuditEvent(action, inventory, user, details).catch(() => {})
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

  if ([inventoryStatuses.inReview, inventoryStatuses.locked, inventoryStatuses.validated, inventoryStatuses.closed].includes(fallbackStatus)) return fallbackStatus
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
    if (isInventoryReadOnly(data.status)) {
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
    await updateDoc(doc(db, 'inventory', inventoryId), {
      status: getInventoryStatusFromCounts(userCounts, data.status),
      updatedAt: serverTimestamp(),
      updatedBy: makeUserSnapshot(user),
      userCounts,
    })
    logAuditEventSafe('crear_conteo_usuario', { ...data, id: inventoryId }, user, {
      userCountId: userCounts[userIndex].id,
      userCountName: userCounts[userIndex].userName,
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
  await assertCanCount(user, 'realizar conteos')
  const data = await getRawInventoryDocument(inventoryId)
  return ensureUserCountForInventoryData(inventoryId, data, user)
}

export async function createInventoryFromParsed(parsedInventory, user) {
  await assertCanAudit(user, 'crear inventarios')
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
  const initialVersion = createInventoryVersion(preparedInventory, 'Version 1 - inventario inicial', user, 'inicial')
  const docRef = await addDoc(inventoryCollection, {
    ...preparedInventory,
    createdAt: serverTimestamp(),
    createdBy: userSnapshot,
    updatedAt: serverTimestamp(),
    updatedBy: userSnapshot,
    userCounts: [],
    versions: [initialVersion],
    verifiedProducts: {},
  })

  logAuditEventSafe('crear_inventario', { ...preparedInventory, id: docRef.id }, user, {
    categories: preparedInventory.totalCategories,
    products: preparedInventory.totalProducts,
    sourcePdfName: preparedInventory.sourcePdfName,
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
        await assertCanCount(user, 'ver y capturar este inventario')
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

export function subscribeAuditLogs(user, onData, onError) {
  let cancelled = false
  let unsubscribe = () => {}

  assertCanAudit(user, 'ver la bitacora')
    .then(() => {
      if (cancelled) return
      unsubscribe = onSnapshot(
        query(auditCollection, orderBy('createdAt', 'desc'), limit(250)),
        (snapshot) => onData(snapshot.docs.map((document) => ({ id: document.id, ...document.data() }))),
        (error) => onError?.(error),
      )
    })
    .catch((error) => onError?.(error))

  return () => {
    cancelled = true
    unsubscribe()
  }
}

export async function addCountEntry(inventoryId, categoryId, productId, entry, user) {
  const { data, userCounts, userCount, userIndex } = await getInventoryDataWithUserCount(inventoryId, user)
  assertInventoryEditable(data, 'agregar conteos')

  const now = getLocalTimestamp()
  const userSnapshot = makeUserSnapshot(user)
  const productMeta = findProductMeta(userCount.categories, categoryId, productId)
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
    activeProduct: {
      categoryId,
      categoryName: productMeta.categoryName,
      productId,
      productName: productMeta.productName,
      updatedAt: now,
    },
    categories,
    lastActivityAt: now,
    status: inventoryStatuses.inProgress,
    updatedAt: now,
  })

  const nextData = {
    ...data,
    status: getInventoryStatusFromCounts(userCounts, data.status),
    updatedBy: userSnapshot,
    userCounts,
  }

  await updateDoc(doc(db, 'inventory', inventoryId), {
    status: nextData.status,
    updatedAt: serverTimestamp(),
    updatedBy: userSnapshot,
    versions: appendVersion(data.versions, createInventoryVersion(nextData, `Conteo agregado - ${productMeta.productName}`, user, 'conteo')),
    userCounts,
  })
  logAuditEventSafe('agregar_conteo', { ...nextData, id: inventoryId }, user, {
    categoryId,
    categoryName: productMeta.categoryName,
    productId,
    productName: productMeta.productName,
    quantity: countEntry.quantity,
  })
  return countEntry.id
}

export async function updateCountEntry(inventoryId, categoryId, productId, entryId, entryPatch, user) {
  const { data, userCounts, userCount, userIndex } = await getInventoryDataWithUserCount(inventoryId, user)
  assertInventoryEditable(data, 'editar conteos')
  const now = getLocalTimestamp()
  const userSnapshot = makeUserSnapshot(user)
  const productMeta = findProductMeta(userCount.categories, categoryId, productId)

  const categories = updateProductInCategories(userCount.categories, categoryId, productId, (product) => ({
    ...product,
    countEntries: (product.countEntries || []).map((entry) =>
      entry.id === entryId
        ? {
            ...entry,
            ...entryPatch,
            condition: entryPatch.condition || entryPatch.observation || entry.condition || entry.observation || 'Buen estado',
            quantity: Number(entryPatch.quantity ?? entry.quantity ?? 0),
            updatedBy: userSnapshot,
            updatedAt: now,
          }
        : entry,
    ),
  }))
  userCounts[userIndex] = summarizeUserCount({
    ...userCount,
    activeProduct: {
      categoryId,
      categoryName: productMeta.categoryName,
      productId,
      productName: productMeta.productName,
      updatedAt: now,
    },
    categories,
    lastActivityAt: now,
    updatedAt: now,
  })

  const nextData = {
    ...data,
    status: getInventoryStatusFromCounts(userCounts, data.status),
    updatedBy: userSnapshot,
    userCounts,
  }

  await updateDoc(doc(db, 'inventory', inventoryId), {
    status: nextData.status,
    updatedAt: serverTimestamp(),
    updatedBy: userSnapshot,
    versions: appendVersion(data.versions, createInventoryVersion(nextData, `Conteo editado - ${productMeta.productName}`, user, 'correccion')),
    userCounts,
  })
  logAuditEventSafe('editar_conteo', { ...nextData, id: inventoryId }, user, {
    categoryId,
    categoryName: productMeta.categoryName,
    entryId,
    productId,
    productName: productMeta.productName,
  })
}

export async function deleteCountEntry(inventoryId, categoryId, productId, entryId, user) {
  const { data, userCounts, userCount, userIndex } = await getInventoryDataWithUserCount(inventoryId, user)
  assertInventoryEditable(data, 'eliminar conteos')
  const now = getLocalTimestamp()
  const userSnapshot = makeUserSnapshot(user)
  const productMeta = findProductMeta(userCount.categories, categoryId, productId)

  const categories = updateProductInCategories(userCount.categories, categoryId, productId, (product) => ({
    ...product,
    countEntries: (product.countEntries || []).filter((entry) => entry.id !== entryId),
  }))
  userCounts[userIndex] = summarizeUserCount({
    ...userCount,
    activeProduct: {
      categoryId,
      categoryName: productMeta.categoryName,
      productId,
      productName: productMeta.productName,
      updatedAt: now,
    },
    categories,
    lastActivityAt: now,
    updatedAt: now,
  })

  const nextData = {
    ...data,
    status: getInventoryStatusFromCounts(userCounts, data.status),
    updatedBy: userSnapshot,
    userCounts,
  }

  await updateDoc(doc(db, 'inventory', inventoryId), {
    status: nextData.status,
    updatedAt: serverTimestamp(),
    updatedBy: userSnapshot,
    versions: appendVersion(data.versions, createInventoryVersion(nextData, `Conteo eliminado - ${productMeta.productName}`, user, 'correccion')),
    userCounts,
  })
  logAuditEventSafe('eliminar_conteo', { ...nextData, id: inventoryId }, user, {
    categoryId,
    categoryName: productMeta.categoryName,
    entryId,
    productId,
    productName: productMeta.productName,
  })
}

export async function updateInventoryStatus(inventoryId, status, user) {
  const rawData = await getRawInventoryDocument(inventoryId)
  const userSnapshot = makeUserSnapshot(user)

  if (status === inventoryStatuses.saved || status === inventoryStatuses.inProgress) {
    await assertCanCount(user, 'actualizar tu conteo')
    assertInventoryEditable(rawData, 'actualizar el estado operativo')
    const { data, userCounts, userCount, userIndex } = await ensureUserCountForInventoryData(inventoryId, rawData, user)
    const now = getLocalTimestamp()
    userCounts[userIndex] = summarizeUserCount({
      ...userCount,
      completedAt: status === inventoryStatuses.saved ? now : userCount.completedAt || '',
      status,
      updatedAt: now,
    })

    const nextData = {
      ...data,
      status: getInventoryStatusFromCounts(userCounts, data.status),
      updatedBy: userSnapshot,
      userCounts,
    }

    await updateDoc(doc(db, 'inventory', inventoryId), {
      status: nextData.status,
      updatedAt: serverTimestamp(),
      updatedBy: userSnapshot,
      versions: appendVersion(data.versions, createInventoryVersion(nextData, `Estado actualizado - ${nextData.status}`, user, 'estado')),
      userCounts,
    })
    logAuditEventSafe('actualizar_estado_conteo', { ...nextData, id: inventoryId }, user, {
      status: nextData.status,
      userCountId: userCount.id,
    })
    return
  }

  await assertCanAudit(user, 'cambiar el estado del inventario')
  const nextData = {
    ...rawData,
    status,
    updatedBy: userSnapshot,
  }
  await updateDoc(doc(db, 'inventory', inventoryId), {
    status,
    updatedAt: serverTimestamp(),
    updatedBy: userSnapshot,
    versions: appendVersion(rawData.versions, createInventoryVersion(nextData, `Estado actualizado - ${status}`, user, 'estado')),
  })
  logAuditEventSafe('actualizar_estado_inventario', { ...nextData, id: inventoryId }, user, { status })
}

export async function setUserProductTotal(inventoryId, userCountId, categoryId, productId, quantity, user, observation = 'Ajuste comparacion', comment = 'Correccion directa en comparacion') {
  await assertCanAudit(user, 'corregir conteos de otros usuarios')
  const data = await getRawInventoryDocument(inventoryId)
  assertInventoryEditable(data, 'corregir conteos')
  const userCounts = (data.userCounts || []).map((count, index) => normalizeUserCount(count, data.categories || [], index))
  const userIndex = userCounts.findIndex((count) => count.id === userCountId || count.userId === userCountId)
  if (userIndex < 0) throw new Error('Conteo de usuario no encontrado')

  const now = getLocalTimestamp()
  const userSnapshot = makeUserSnapshot(user)
  const productMeta = findProductMeta(userCounts[userIndex].categories, categoryId, productId)
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
    activeProduct: {
      categoryId,
      categoryName: productMeta.categoryName,
      productId,
      productName: productMeta.productName,
      updatedAt: now,
    },
    categories,
    lastActivityAt: now,
    updatedAt: now,
  })

  const nextData = {
    ...data,
    status: getInventoryStatusFromCounts(userCounts, data.status),
    updatedBy: userSnapshot,
    userCounts,
  }

  await updateDoc(doc(db, 'inventory', inventoryId), {
    status: nextData.status,
    updatedAt: serverTimestamp(),
    updatedBy: userSnapshot,
    versions: appendVersion(data.versions, createInventoryVersion(nextData, `Correccion directa - ${productMeta.productName}`, user, 'correccion')),
    userCounts,
  })
  logAuditEventSafe('corregir_total_producto', { ...nextData, id: inventoryId }, user, {
    categoryId,
    categoryName: productMeta.categoryName,
    productId,
    productName: productMeta.productName,
    quantity: Number(quantity || 0),
  })
}

async function updateUserCountProduct(inventoryId, userCountId, categoryId, productId, updater, user) {
  await assertCanAudit(user, 'editar conteos comparados')
  const data = await getRawInventoryDocument(inventoryId)
  assertInventoryEditable(data, 'editar conteos comparados')
  const userCounts = (data.userCounts || []).map((count, index) => normalizeUserCount(count, data.categories || [], index))
  const userIndex = userCounts.findIndex((count) => count.id === userCountId || count.userId === userCountId)
  if (userIndex < 0) throw new Error('Conteo de usuario no encontrado')

  const now = getLocalTimestamp()
  const userSnapshot = makeUserSnapshot(user)
  const productMeta = findProductMeta(userCounts[userIndex].categories, categoryId, productId)
  const categories = updateProductInCategories(userCounts[userIndex].categories, categoryId, productId, updater)
  userCounts[userIndex] = summarizeUserCount({
    ...userCounts[userIndex],
    activeProduct: {
      categoryId,
      categoryName: productMeta.categoryName,
      productId,
      productName: productMeta.productName,
      updatedAt: now,
    },
    categories,
    lastActivityAt: now,
    updatedAt: now,
  })

  const nextData = {
    ...data,
    status: getInventoryStatusFromCounts(userCounts, data.status),
    updatedBy: userSnapshot,
    userCounts,
  }

  await updateDoc(doc(db, 'inventory', inventoryId), {
    status: nextData.status,
    updatedAt: serverTimestamp(),
    updatedBy: userSnapshot,
    versions: appendVersion(data.versions, createInventoryVersion(nextData, `Correccion en comparacion - ${productMeta.productName}`, user, 'correccion')),
    userCounts,
  })
  logAuditEventSafe('editar_conteo_comparacion', { ...nextData, id: inventoryId }, user, {
    categoryId,
    categoryName: productMeta.categoryName,
    productId,
    productName: productMeta.productName,
    userCountId,
  })
}

export async function addUserCountEntry(inventoryId, userCountId, categoryId, productId, entry, user) {
  const now = getLocalTimestamp()
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

  await updateUserCountProduct(
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
  return countEntry.id
}

export async function updateUserCountEntry(inventoryId, userCountId, categoryId, productId, entryId, entryPatch, user) {
  const userSnapshot = makeUserSnapshot(user)
  await updateUserCountProduct(
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
              updatedAt: getLocalTimestamp(),
              updatedBy: userSnapshot,
            }
          : entry,
      ),
    }),
    user,
  )
}

export async function deleteUserCountEntry(inventoryId, userCountId, categoryId, productId, entryId, user) {
  await updateUserCountProduct(
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
}

export async function verifyComparisonProduct(inventoryId, productKey, user) {
  return setComparisonProductVerification(inventoryId, productKey, true, user)
}

export async function setComparisonProductVerification(inventoryId, productKey, verified, user) {
  await assertCanAudit(user, 'validar productos')
  const data = await getRawInventoryDocument(inventoryId)
  assertInventoryEditable(data, 'validar productos')
  const nextData = {
    ...data,
    verifiedProducts: {
      ...(data.verifiedProducts || {}),
      [productKey]: verified,
    },
  }
  await updateDoc(doc(db, 'inventory', inventoryId), {
    updatedAt: serverTimestamp(),
    updatedBy: makeUserSnapshot(user),
    versions: appendVersion(data.versions, createInventoryVersion(nextData, `${verified ? 'Validacion' : 'Validacion retirada'} - ${productKey}`, user, 'validacion')),
    verifiedProducts: nextData.verifiedProducts,
  })
  logAuditEventSafe(verified ? 'validar_producto' : 'retirar_validacion_producto', { ...nextData, id: inventoryId }, user, { productKey })
}

export async function generateFinalCount(inventoryId, user, countAId = '', countBId = '') {
  await assertCanAudit(user, 'generar el conteo final')
  const data = await getRawInventoryDocument(inventoryId)
  assertInventoryEditable(data, 'generar conteo final')
  const normalized = normalizeInventory(data)
  const firstCount = normalized.userCounts.find((count) => count.id === countAId) || normalized.userCounts[0]
  const secondCount = normalized.userCounts.find((count) => count.id === countBId) || normalized.userCounts[1]
  if (!firstCount || !secondCount) throw new Error('Se necesitan al menos dos conteos para generar el conteo final.')
  if (firstCount.id === secondCount.id) throw new Error('Selecciona dos conteos de usuarios diferentes.')

  const now = getLocalTimestamp()
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

  const nextData = {
    ...data,
    finalCount,
    status: inventoryStatuses.validated,
    updatedBy: userSnapshot,
  }

  await updateDoc(doc(db, 'inventory', inventoryId), {
    finalCount,
    status: inventoryStatuses.validated,
    updatedAt: serverTimestamp(),
    updatedBy: userSnapshot,
    versions: appendVersion(data.versions, createInventoryVersion(nextData, 'Version final - conteo validado', user, 'final')),
  })
  logAuditEventSafe('generar_conteo_final', { ...nextData, id: inventoryId }, user, {
    countAId: firstCount.id,
    countBId: secondCount.id,
    totalCounted: finalCount.totalCounted,
  })
}

export async function updateInventoryDocument(inventoryId, inventory, user) {
  await assertCanAudit(user, 'actualizar inventarios')
  const data = await getRawInventoryDocument(inventoryId)
  assertInventoryEditable(data, 'actualizar inventario')
  const normalized = normalizeInventory(inventory)
  const nextData = {
    ...data,
    ...normalized,
    updatedBy: makeUserSnapshot(user),
  }
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
    versions: appendVersion(data.versions, createInventoryVersion(nextData, 'Actualizacion manual de inventario', user, 'actualizacion')),
  })
  logAuditEventSafe('actualizar_inventario', { ...nextData, id: inventoryId }, user, {
    totalProducts: normalized.totalProducts,
    totalCounted: normalized.totalCounted,
  })
}

export async function restoreInventoryVersion(inventoryId, versionId, user) {
  await assertCanAudit(user, 'restaurar versiones')
  const data = await getRawInventoryDocument(inventoryId)
  assertInventoryEditable(data, 'restaurar versiones')
  const version = (data.versions || []).find((item) => item.id === versionId)
  if (!version?.snapshot) throw new Error('Version no encontrada')

  const restoredData = normalizeInventory({
    ...data,
    ...version.snapshot,
    status: inventoryStatuses.inReview,
  })
  const nextVersion = createInventoryVersion(restoredData, `Restauracion desde ${version.label}`, user, 'restauracion')

  await updateDoc(doc(db, 'inventory', inventoryId), {
    categories: restoredData.categories,
    finalCount: restoredData.finalCount || null,
    status: inventoryStatuses.inReview,
    updatedAt: serverTimestamp(),
    updatedBy: makeUserSnapshot(user),
    userCounts: restoredData.userCounts,
    verifiedProducts: restoredData.verifiedProducts || {},
    versions: appendVersion(data.versions, nextVersion),
  })
  logAuditEventSafe('restaurar_version', { ...restoredData, id: inventoryId }, user, {
    restoredVersionId: versionId,
    restoredVersionLabel: version.label,
  })
}
