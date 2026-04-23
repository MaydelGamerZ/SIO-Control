import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import { safeCreateAuditLog } from './auditLogService'

export const adminEmail = 'maydelgamerz90@gmail.com'
export const userRoles = {
  adminAuditor: 'admin_auditor',
  auditor: 'auditor',
  counter: 'contador',
}
const usersCollection = collection(db, 'users')

function cleanPayload(payload) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined))
}

export function isAdminUser(user) {
  return user?.email?.toLowerCase() === adminEmail
}

export function canAuditUser(user, profile) {
  if (isAdminUser(user)) return true
  return [userRoles.adminAuditor, userRoles.auditor, 'administrador'].includes(profile?.role)
}

export async function upsertUserProfile(user, extraFields = {}) {
  if (!user?.uid) return

  const snapshot = await getDoc(doc(db, 'users', user.uid))
  const existing = snapshot.exists() ? snapshot.data() : {}
  const role = isAdminUser(user) ? userRoles.adminAuditor : existing.role || userRoles.counter
  await setDoc(
    doc(db, 'users', user.uid),
    cleanPayload({
      active: existing.active ?? true,
      currentCategoryId: existing.currentCategoryId || '',
      currentCategoryName: existing.currentCategoryName || '',
      currentInventoryId: existing.currentInventoryId || '',
      currentView: existing.currentView || '',
      displayName: user.displayName || '',
      email: user.email || '',
      lastSeenAt: serverTimestamp(),
      lastInventoryActivityAt: existing.lastInventoryActivityAt || null,
      role,
      uid: user.uid,
      updatedAt: serverTimestamp(),
      ...extraFields,
    }),
    { merge: true },
  )
}

export async function listUsers() {
  const snapshot = await getDocs(query(usersCollection, orderBy('email', 'asc')))
  return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }))
}

export function subscribeUsers(onData, onError) {
  return onSnapshot(
    query(usersCollection, orderBy('email', 'asc')),
    (snapshot) => onData(snapshot.docs.map((document) => ({ id: document.id, ...document.data() }))),
    (error) => onError?.(error),
  )
}

export async function getUserProfile(uid) {
  if (!uid) return null
  const snapshot = await getDoc(doc(db, 'users', uid))
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
}

export async function updateUserPresence(user, patch = {}) {
  if (!user?.uid) return

  await setDoc(
    doc(db, 'users', user.uid),
    cleanPayload({
      displayName: user.displayName || '',
      email: user.email || '',
      lastSeenAt: serverTimestamp(),
      uid: user.uid,
      updatedAt: serverTimestamp(),
      ...patch,
    }),
    { merge: true },
  )
}

async function assertAuditPermissions(actor, actorProfile) {
  if (!actor?.uid || !canAuditUser(actor, actorProfile)) {
    throw new Error('Solo un auditor autorizado puede realizar esta accion.')
  }
}

export async function updateUserRole(uid, role, actor = null, actorProfile = null) {
  if (actor) await assertAuditPermissions(actor, actorProfile)
  const currentProfile = await getUserProfile(uid)
  await updateDoc(doc(db, 'users', uid), {
    role,
    updatedAt: serverTimestamp(),
  })
  if (actor) {
    await safeCreateAuditLog({
      actionType: 'user_role_changed',
      details: {
        roleAnterior: currentProfile?.role || '',
        roleNuevo: role,
      },
      profile: actorProfile,
      summary: `${actor.displayName || actor.email} cambio el rol de ${currentProfile?.displayName || currentProfile?.email || 'usuario'} a ${role}.`,
      targetUser: currentProfile,
      user: actor,
    })
  }
}

export async function updateUserActive(uid, active, actor = null, actorProfile = null) {
  if (actor) await assertAuditPermissions(actor, actorProfile)
  const currentProfile = await getUserProfile(uid)
  await updateDoc(doc(db, 'users', uid), {
    active,
    updatedAt: serverTimestamp(),
  })
  if (actor) {
    await safeCreateAuditLog({
      actionType: 'user_active_changed',
      details: {
        activoAnterior: currentProfile?.active !== false ? 'activo' : 'inactivo',
        activoNuevo: active ? 'activo' : 'inactivo',
      },
      profile: actorProfile,
      summary: `${actor.displayName || actor.email} ${active ? 'activo' : 'desactivo'} a ${currentProfile?.displayName || currentProfile?.email || 'usuario'}.`,
      targetUser: currentProfile,
      user: actor,
    })
  }
}
