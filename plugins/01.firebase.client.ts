import { initializeApp, getApps } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  signOut,
  onAuthStateChanged,
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

  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
  const auth = getAuth(app)
  const db = getFirestore(app)
  const isNative = Capacitor.isNativePlatform()

  /**
   * Sign-in con Google.
   * - Web: signInWithPopup (Firebase JS SDK)
   * - Android/iOS: @codetrix-studio/capacitor-google-auth → nativo, nessun browser esterno
   */
  const signInWithGoogle = async () => {
    if (isNative) {
      const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth')
      const googleUser = await GoogleAuth.signIn()
      const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken)
      return signInWithCredential(auth, credential)
    } else {
      const provider = new GoogleAuthProvider()
      provider.addScope('profile')
      provider.addScope('email')
      return signInWithPopup(auth, provider)
    }
  }

  /** Non necessario con il native plugin — mantenuto per compatibilità con auth store */
  const handleRedirectResult = async () => null

  const logout = async () => {
    if (isNative) {
      const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth')
      await GoogleAuth.signOut()
    }
    return signOut(auth)
  }

  return {
    provide: {
      firebase: { app, auth, db },
      auth: { signInWithGoogle, handleRedirectResult, logout, onAuthStateChanged },
    },
  }
})
