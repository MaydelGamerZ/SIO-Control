import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase'

export const adminEmail = 'maydelgamerz90@gmail.com'
const usersCollection = collection(db, 'users')

export function isAdminUser(user) {
  return user?.email?.toLowerCase() === adminEmail
}

export async function upsertUserProfile(user) {
  if (!user?.uid) return

  const snapshot = await getDoc(doc(db, 'users', user.uid))
  const existing = snapshot.exists() ? snapshot.data() : {}
  const role = isAdminUser(user) ? 'administrador' : existing.role || 'auditor'
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

export async function listUsers() {
  const snapshot = await getDocs(query(usersCollection, orderBy('email', 'asc')))
  return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }))
}

export async function getUserProfile(uid) {
  if (!uid) return null
  const snapshot = await getDoc(doc(db, 'users', uid))
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
}

export async function updateUserRole(uid, role) {
  await updateDoc(doc(db, 'users', uid), {
    role,
    updatedAt: serverTimestamp(),
  })
}

export async function updateUserActive(uid, active) {
  await updateDoc(doc(db, 'users', uid), {
    active,
    updatedAt: serverTimestamp(),
  })
}
