import { initializeApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'

// ============================================================
// 🔥 FIREBASE CONFIG — Isi dengan config project Anda
//    dari: https://console.firebase.google.com
//    → Project Settings → Your apps → SDK setup and configuration
// ============================================================
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)

// Auth Providers
const googleProvider = new GoogleAuthProvider()
googleProvider.addScope('email')
googleProvider.addScope('profile')

const githubProvider = new GithubAuthProvider()
githubProvider.addScope('read:user')
githubProvider.addScope('user:email')

// ─── Auth Functions ──────────────────────────────────────────

/** Login dengan Google (popup) */
export const signInWithGoogle = async (): Promise<User> => {
  const result = await signInWithPopup(auth, googleProvider)
  return result.user
}

/** Login dengan GitHub (popup) */
export const signInWithGitHub = async (): Promise<User> => {
  const result = await signInWithPopup(auth, githubProvider)
  return result.user
}

/** Logout dari Firebase */
export const signOutUser = async (): Promise<void> => {
  await signOut(auth)
}

/** Subscribe ke perubahan status auth (login/logout) */
export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback)
}

export type { User }
