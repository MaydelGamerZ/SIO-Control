import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { formatDateKey, formatDisplayDate, formatTime } from '../utils/inventory'

const auditLogCollection = collection(db, 'auditLogs')

export const auditActionCatalog = {
  auth_login_email: { color: 'blue', group: 'auth', icon: 'login', label: 'Inicio de sesion por correo' },
  auth_login_google: { color: 'blue', group: 'auth', icon: 'login', label: 'Inicio de sesion con Google' },
  auth_register: { color: 'blue', group: 'auth', icon: 'user-plus', label: 'Registro de usuario' },
  inventory_pdf_uploaded: { color: 'blue', group: 'inventory', icon: 'upload', label: 'PDF cargado' },
  inventory_created: { color: 'green', group: 'inventory', icon: 'package-plus', label: 'Inventario creado' },
  count_entry_added: { color: 'green', group: 'count', icon: 'plus', label: 'Conteo agregado' },
  count_entry_updated: { color: 'amber', group: 'count', icon: 'edit', label: 'Conteo editado' },
  count_entry_deleted: { color: 'red', group: 'count', icon: 'trash', label: 'Conteo eliminado' },
  inventory_status_changed: { color: 'amber', group: 'inventory', icon: 'refresh', label: 'Estado de inventario actualizado' },
  inventory_reopened: { color: 'amber', group: 'inventory', icon: 'refresh', label: 'Inventario reabierto' },
  comparison_product_validated: { color: 'green', group: 'audit', icon: 'shield-check', label: 'Producto validado' },
  comparison_product_unvalidated: { color: 'amber', group: 'audit', icon: 'shield-alert', label: 'Producto marcado pendiente' },
  final_count_generated: { color: 'green', group: 'audit', icon: 'badge-check', label: 'Conteo final generado' },
  user_role_changed: { color: 'amber', group: 'admin', icon: 'users', label: 'Rol de usuario actualizado' },
  user_active_changed: { color: 'amber', group: 'admin', icon: 'users', label: 'Estado de usuario actualizado' },
  inventory_pdf_exported: { color: 'blue', group: 'export', icon: 'download', label: 'PDF exportado' },
}

export const auditActionOptions = Object.entries(auditActionCatalog).map(([value, meta]) => ({
  label: meta.label,
  value,
}))

function textValue(value) {
  return String(value || '').trim()
}

function buildActorSnapshot(user, profile = null) {
  return {
    email: textValue(user?.email),
    name: textValue(user?.displayName) || textValue(profile?.displayName) || textValue(user?.email) || 'Usuario',
    role: textValue(profile?.role || user?.role),
    uid: textValue(user?.uid),
  }
}

function buildInventorySnapshot(inventory = null, inventoryId = '') {
  if (!inventory && !inventoryId) return {}
  return {
    inventoryCedis: textValue(inventory?.cedis),
    inventoryDateKey: textValue(inventory?.dateKey || inventory?.fecha),
    inventoryId: textValue(inventory?.id || inventoryId),
    inventoryLabel: [textValue(inventory?.cedis), textValue(inventory?.dateKey || inventory?.fecha)]
      .filter(Boolean)
      .join(' - '),
    inventoryStatus: textValue(inventory?.status),
  }
}

function buildTargetUserSnapshot(targetUser = null) {
  if (!targetUser) return {}
  return {
    targetUserEmail: textValue(targetUser.email),
    targetUserId: textValue(targetUser.uid || targetUser.id),
    targetUserName: textValue(targetUser.displayName || targetUser.name || targetUser.email),
    targetUserRole: textValue(targetUser.role),
  }
}

function buildProductSnapshot(product = null, category = null) {
  if (!product && !category) return {}
  return {
    categoryId: textValue(category?.id),
    categoryName: textValue(category?.name),
    productId: textValue(product?.id),
    productKey: product && category ? `${category.id}:${product.id}` : '',
    productName: textValue(product?.name),
  }
}

function buildSearchText(parts) {
  return parts
    .flat()
    .map((value) => textValue(value).toLowerCase())
    .filter(Boolean)
    .join(' ')
}

function normalizeAuditLogDocument(document) {
  const data = document.data()
  return {
    id: document.id,
    ...data,
    happenedAtDate: data.happenedAt?.toDate ? data.happenedAt.toDate() : data.happenedAt ? new Date(data.happenedAt) : null,
  }
}

export function getAuditActionMeta(actionType) {
  return auditActionCatalog[actionType] || {
    color: 'slate',
    group: 'system',
    icon: 'file-text',
    label: actionType || 'Accion',
  }
}

export function formatAuditLogTime(log) {
  const date = log?.happenedAtDate
  if (!date) return 'Sin fecha'
  return `${formatDisplayDate(log.dateKey || formatDateKey(date))} · ${formatTime(date)}`
}

export async function createAuditLog({
  actionType,
  details = {},
  inventory = null,
  inventoryId = '',
  product = null,
  category = null,
  profile = null,
  summary = '',
  targetUser = null,
  user,
}) {
  if (!actionType || !user?.uid) return null

  const actor = buildActorSnapshot(user, profile)
  const inventorySnapshot = buildInventorySnapshot(inventory, inventoryId)
  const targetSnapshot = buildTargetUserSnapshot(targetUser)
  const productSnapshot = buildProductSnapshot(product, category)
  const meta = getAuditActionMeta(actionType)

  return addDoc(auditLogCollection, {
    actionGroup: meta.group,
    actionLabel: meta.label,
    actionType,
    actor,
    color: meta.color,
    dateKey: formatDateKey(),
    details,
    happenedAt: serverTimestamp(),
    searchText: buildSearchText([
      actionType,
      meta.group,
      meta.label,
      summary,
      actor.name,
      actor.email,
      actor.role,
      inventorySnapshot.inventoryLabel,
      inventorySnapshot.inventoryDateKey,
      inventorySnapshot.inventoryCedis,
      productSnapshot.categoryName,
      productSnapshot.productName,
      targetSnapshot.targetUserName,
      targetSnapshot.targetUserEmail,
      Object.values(details),
    ]),
    summary: textValue(summary),
    ...inventorySnapshot,
    ...productSnapshot,
    ...targetSnapshot,
  })
}

export function safeCreateAuditLog(payload) {
  return createAuditLog(payload).catch((error) => {
    console.error('No se pudo registrar la bitacora.', error)
    return null
  })
}

export function subscribeAuditLogs(onData, onError, maxItems = 500) {
  return onSnapshot(
    query(auditLogCollection, orderBy('happenedAt', 'desc'), limit(maxItems)),
    (snapshot) => onData(snapshot.docs.map(normalizeAuditLogDocument)),
    (error) => onError?.(error),
  )
}
