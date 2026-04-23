import { useEffect, useMemo, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { auth, googleProvider } from '../firebase'
import { safeCreateAuditLog } from '../services/auditLogService'
import { updateUserPresence, upsertUserProfile } from '../services/userService'
import { AuthContext } from './AuthContextCore'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
      if (currentUser) {
        upsertUserProfile(currentUser).catch(() => {})
        updateUserPresence(currentUser, { currentView: 'inicio' }).catch(() => {})
      }
    })

    return unsubscribe
  }, [])

  async function loginWithEmail(email, password) {
    const credentials = await signInWithEmailAndPassword(auth, email, password)
    await upsertUserProfile(credentials.user).catch(() => {})
    await safeCreateAuditLog({
      actionType: 'auth_login_email',
      summary: `${credentials.user.displayName || credentials.user.email} inicio sesion con correo.`,
      user: credentials.user,
    })
    return credentials
  }

  async function registerWithEmail(email, password) {
    const credentials = await createUserWithEmailAndPassword(auth, email, password)
    await upsertUserProfile(credentials.user).catch(() => {})
    await safeCreateAuditLog({
      actionType: 'auth_register',
      summary: `${credentials.user.displayName || credentials.user.email} creo una cuenta nueva.`,
      user: credentials.user,
    })
    return credentials
  }

  async function loginWithGoogle() {
    const credentials = await signInWithPopup(auth, googleProvider)
    await upsertUserProfile(credentials.user).catch(() => {})
    await safeCreateAuditLog({
      actionType: 'auth_login_google',
      summary: `${credentials.user.displayName || credentials.user.email} inicio sesion con Google.`,
      user: credentials.user,
    })
    return credentials
  }

  async function logout() {
    return signOut(auth)
  }

  const value = useMemo(
    () => ({
      loading,
      loginWithEmail,
      loginWithGoogle,
      logout,
      registerWithEmail,
      user,
    }),
    [loading, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
