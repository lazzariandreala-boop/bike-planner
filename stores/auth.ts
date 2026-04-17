import { defineStore } from 'pinia'
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import type { User } from 'firebase/auth'
import type { UserProfile } from '~/types'

export const useAuthStore = defineStore('auth', () => {
  const { $firebase, $auth } = useNuxtApp()

  const user = ref<User | null>(null)
  const profile = ref<UserProfile | null>(null)
  const loading = ref(true)
  const initialized = ref(false)

  const isLoggedIn = computed(() => !!user.value)
  const displayName = computed(() => user.value?.displayName || 'Rider')
  const photoURL = computed(() => user.value?.photoURL || null)

  /**
   * Inizializza Firebase Auth e restituisce una Promise che si risolve
   * non appena Firebase ha determinato lo stato di login (logged in o out).
   * Chiamato dal plugin auth.client.ts prima che il middleware giri.
   */
  const init = (): Promise<void> => {
    // Se già inizializzato (es. HMR in dev), risolvi subito
    if (initialized.value) return Promise.resolve()

    return new Promise<void>(resolve => {
      let resolved = false

      $auth.onAuthStateChanged($firebase.auth, async (firebaseUser: User | null) => {
        user.value = firebaseUser
        loading.value = false
        initialized.value = true

        if (firebaseUser) {
          await loadOrCreateProfile(firebaseUser)
        } else {
          profile.value = null
        }

        // Risolvi la promise solo al primo callback (non ai successivi cambi di stato)
        if (!resolved) {
          resolved = true
          resolve()
        }
      })

      // Gestisci il redirect result (Capacitor native OAuth)
      $auth.handleRedirectResult().then(async (result: any) => {
        if (result?.user) {
          user.value = result.user
          await loadOrCreateProfile(result.user)
        }
      }).catch(console.error)
    })
  }

  const loadOrCreateProfile = async (firebaseUser: User) => {
    const db = $firebase.db
    const userRef = doc(db, 'users', firebaseUser.uid)
    const snap = await getDoc(userRef)

    if (snap.exists()) {
      profile.value = snap.data() as UserProfile
    } else {
      // Prima volta: crea profilo
      const newProfile: UserProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || 'Rider',
        photoURL: firebaseUser.photoURL || '',
        preferences: {
          defaultSurfaces: ['cycleway', 'gravel', 'unpaved', 'asphalt'],
          defaultDifficulty: 'moderate',
          units: 'km',
          theme: 'dark',
        },
      }
      await setDoc(userRef, {
        ...newProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      profile.value = newProfile
    }
  }

  const signIn = async () => {
    await $auth.signInWithGoogle()
  }

  const signOut = async () => {
    await $auth.logout()
    user.value = null
    profile.value = null
    navigateTo('/')
  }

  const updatePreferences = async (prefs: Partial<UserProfile['preferences']>) => {
    if (!user.value || !profile.value) return
    const db = $firebase.db
    const userRef = doc(db, 'users', user.value.uid)
    profile.value.preferences = { ...profile.value.preferences, ...prefs }
    await updateDoc(userRef, {
      preferences: profile.value.preferences,
      updatedAt: serverTimestamp(),
    })
  }

  return {
    user,
    profile,
    loading,
    initialized,
    isLoggedIn,
    displayName,
    photoURL,
    init,
    signIn,
    signOut,
    updatePreferences,
  }
})
