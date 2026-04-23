import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { enableIndexedDbPersistence, getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyBKNi2wRe89QxR3KBXxxFce-Fnjrw2-PmU',
  authDomain: 'inventario-7aea1.firebaseapp.com',
  databaseURL: 'https://inventario-7aea1-default-rtdb.firebaseio.com',
  projectId: 'inventario-7aea1',
  storageBucket: 'inventario-7aea1.firebasestorage.app',
  messagingSenderId: '297617050305',
  appId: '1:297617050305:web:48b832568ef45efaf1a240',
  measurementId: 'G-W4PPZPNBSL',
}

export const app = initializeApp(firebaseConfig)
export const analytics = null
export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()

if (typeof window !== 'undefined' && 'indexedDB' in window) {
  enableIndexedDbPersistence(db).catch(() => undefined)
}
