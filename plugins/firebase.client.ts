import { initializeApp, getApps } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { Capacitor } from '@capacitor/core'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  const firebaseConfig = {
    apiKey: config.public.firebaseApiKey,
    authDomain: config.public.firebaseAuthDomain,
    projectId: config.public.firebaseProjectId,
    storageBucket: config.public.firebaseStorageBucket,
    messagingSenderId: config.public.firebaseMessagingSenderId,
    appId: config.public.firebaseAppId,
  }

  // Evita re-inizializzazioni in HMR
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

  const auth = getAuth(app)
  const db = getFirestore(app)
  const googleProvider = new GoogleAuthProvider()

  googleProvider.addScope('profile')
  googleProvider.addScope('email')

  // Su mobile Capacitor usa redirect, su web usa popup
  const isNative = Capacitor.isNativePlatform()

  const signInWithGoogle = async () => {
    if (isNative) {
      await signInWithRedirect(auth, googleProvider)
    } else {
      return signInWithPopup(auth, googleProvider)
    }
  }

  const handleRedirectResult = async () => {
    if (isNative) {
      return getRedirectResult(auth)
    }
    return null
  }

  const logout = () => signOut(auth)

  return {
    provide: {
      firebase: { app, auth, db },
      auth: { signInWithGoogle, handleRedirectResult, logout, onAuthStateChanged, googleProvider },
    },
  }
})
