// @ts-nocheck
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
import { db } from './firebase'

export const adminEmail = 'maydelgamerz90@gmail.com'
export const userRoles = {
  auditor: 'AUDITOR',
  counter: 'CONTADOR',
}
const usersCollection = collection(db, 'users')
const legacyAuditorRoles = new Set(['AUDITOR', 'auditor', 'admin_auditor', 'administrador', 'admin'])

function permissionError(message) {
  const error = new Error(message)
  error.code = 'permission-denied'
  return error
}

export function isAdminUser(user) {
  return user?.email?.toLowerCase() === adminEmail
}

export function normalizeRole(role) {
  if (legacyAuditorRoles.has(role)) return userRoles.auditor
  return userRoles.counter
}

export function normalizeUserProfile(profile, id = '') {
  if (!profile) return null
  return {
    ...profile,
    active: profile.active !== false,
    id: profile.id || id || profile.uid || '',
    role: normalizeRole(profile.role),
    uid: profile.uid || id || profile.id || '',
  }
}

export function getRoleLabel(roleOrProfile) {
  const role = typeof roleOrProfile === 'string' ? roleOrProfile : roleOrProfile?.role
  return normalizeRole(role) === userRoles.auditor ? 'Modo auditor' : 'Modo contador'
}

export function canCountUser(user, profile) {
  return Boolean(user?.uid && profile && profile.active !== false && [userRoles.auditor, userRoles.counter].includes(normalizeRole(profile.role)))
}

export function canAuditUser(user, profile) {
  return Boolean(user?.uid && profile?.active !== false && normalizeRole(profile?.role) === userRoles.auditor)
}

export async function upsertUserProfile(user) {
  if (!user?.uid) return

  const snapshot = await getDoc(doc(db, 'users', user.uid))
  const existing = snapshot.exists() ? snapshot.data() : {}
  const defaultRole = isAdminUser(user) && !existing.role ? userRoles.auditor : userRoles.counter
  const role = normalizeRole(existing.role || defaultRole)
  await setDoc(
    doc(db, 'users', user.uid),
    {
      active: existing.active ?? true,
      displayName: user.displayName || '',
      email: user.email || '',
      lastSeenAt: serverTimestamp(),
      role,
      uid: user.uid,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export async function listUsers(actor) {
  await assertCanManageUsers(actor)
  const snapshot = await getDocs(query(usersCollection, orderBy('email', 'asc')))
  return snapshot.docs.map((document) => normalizeUserProfile({ id: document.id, ...document.data() }, document.id))
}

export function subscribeUsers(actor, onData, onError) {
  let cancelled = false
  let unsubscribe = () => {}

  assertCanManageUsers(actor)
    .then(() => {
      if (cancelled) return
      unsubscribe = onSnapshot(
        query(usersCollection, orderBy('email', 'asc')),
        (snapshot) => onData(snapshot.docs.map((document) => normalizeUserProfile({ id: document.id, ...document.data() }, document.id))),
        (error) => onError?.(error),
      )
    })
    .catch((error) => onError?.(error))

  return () => {
    cancelled = true
    unsubscribe()
  }
}

export async function getUserProfile(uid) {
  if (!uid) return null
  const snapshot = await getDoc(doc(db, 'users', uid))
  return snapshot.exists() ? normalizeUserProfile({ id: snapshot.id, ...snapshot.data() }, snapshot.id) : null
}

export function subscribeUserProfile(uid, onData, onError) {
  if (!uid) {
    onData(null)
    return () => {}
  }

  return onSnapshot(
    doc(db, 'users', uid),
    (snapshot) => onData(snapshot.exists() ? normalizeUserProfile({ id: snapshot.id, ...snapshot.data() }, snapshot.id) : null),
    (error) => onError?.(error),
  )
}

export async function assertUserActive(user) {
  if (!user?.uid) throw permissionError('Debes iniciar sesion para continuar.')
  const profile = await getUserProfile(user.uid)
  if (!profile || profile.active === false) throw permissionError('Tu usuario esta desactivado o no tiene permisos activos.')
  return profile
}

export async function assertCanCount(user, action = 'realizar conteos') {
  const profile = await assertUserActive(user)
  if (!canCountUser(user, profile)) throw permissionError(`No tienes permiso para ${action}.`)
  return profile
}

export async function assertCanAudit(user, action = 'realizar esta accion') {
  const profile = await assertUserActive(user)
  if (!canAuditUser(user, profile)) throw permissionError(`Permiso de auditor requerido para ${action}.`)
  return profile
}

export async function assertCanManageUsers(user) {
  return assertCanAudit(user, 'administrar usuarios')
}

export async function updateUserRole(uid, role, actor) {
  await assertCanManageUsers(actor)
  await updateDoc(doc(db, 'users', uid), {
    role: normalizeRole(role),
    updatedAt: serverTimestamp(),
  })
}

export async function updateUserActive(uid, active, actor) {
  await assertCanManageUsers(actor)
  await updateDoc(doc(db, 'users', uid), {
    active,
    updatedAt: serverTimestamp(),
  })
}
