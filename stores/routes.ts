import { defineStore } from 'pinia'
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import type { SavedRoute, RoutePoint, RoutePreferences } from '~/types'
import { useAuthStore } from './auth'

export const useRoutesStore = defineStore('routes', () => {
  const { $firebase } = useNuxtApp()
  const authStore = useAuthStore()

  const routes = ref<SavedRoute[]>([])
  const currentRoute = ref<Partial<SavedRoute> | null>(null)
  const loadingRoutes = ref(false)
  const savingRoute = ref(false)

  // Planning state
  const startPoint = ref<RoutePoint | null>(null)
  const endPoint = ref<RoutePoint | null>(null)
  const waypoints = ref<RoutePoint[]>([])

  const favoriteRoutes = computed(() =>
    routes.value.filter(r => r.isFavorite)
  )

  const recentRoutes = computed(() =>
    [...routes.value]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
  )

  const fetchRoutes = async () => {
    if (!authStore.user) return
    loadingRoutes.value = true

    try {
      const db = $firebase.db
      const q = query(
        collection(db, 'routes'),
        where('userId', '==', authStore.user.uid),
        orderBy('createdAt', 'desc')
      )
      const snap = await getDocs(q)
      routes.value = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: (d.data().createdAt as Timestamp)?.toDate?.() || new Date(),
        updatedAt: (d.data().updatedAt as Timestamp)?.toDate?.() || new Date(),
      })) as SavedRoute[]
    } finally {
      loadingRoutes.value = false
    }
  }

  const saveRoute = async (route: Omit<SavedRoute, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!authStore.user) throw new Error('Not authenticated')
    savingRoute.value = true

    try {
      const db = $firebase.db
      const docRef = await addDoc(collection(db, 'routes'), {
        ...route,
        userId: authStore.user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      const saved: SavedRoute = {
        id: docRef.id,
        userId: authStore.user.uid,
        ...route,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      routes.value.unshift(saved)
      return saved
    } finally {
      savingRoute.value = false
    }
  }

  const updateRoute = async (id: string, updates: Partial<SavedRoute>) => {
    if (!authStore.user) return
    const db = $firebase.db
    const ref = doc(db, 'routes', id)
    await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() })
    const idx = routes.value.findIndex(r => r.id === id)
    if (idx !== -1) {
      routes.value[idx] = { ...routes.value[idx], ...updates, updatedAt: new Date() }
    }
  }

  const deleteRoute = async (id: string) => {
    if (!authStore.user) return
    const db = $firebase.db
    await deleteDoc(doc(db, 'routes', id))
    routes.value = routes.value.filter(r => r.id !== id)
  }

  const toggleFavorite = async (id: string) => {
    const route = routes.value.find(r => r.id === id)
    if (!route) return
    await updateRoute(id, { isFavorite: !route.isFavorite })
  }

  const setStartPoint = (point: RoutePoint | null) => { startPoint.value = point }
  const setEndPoint = (point: RoutePoint | null) => { endPoint.value = point }
  const addWaypoint = (point: RoutePoint) => { waypoints.value.push(point) }
  const removeWaypoint = (index: number) => { waypoints.value.splice(index, 1) }
  const clearPlanning = () => {
    startPoint.value = null
    endPoint.value = null
    waypoints.value = []
    currentRoute.value = null
  }
  const setCurrentRoute = (route: Partial<SavedRoute> | null) => { currentRoute.value = route }

  return {
    routes,
    currentRoute,
    loadingRoutes,
    savingRoute,
    startPoint,
    endPoint,
    waypoints,
    favoriteRoutes,
    recentRoutes,
    fetchRoutes,
    saveRoute,
    updateRoute,
    deleteRoute,
    toggleFavorite,
    setStartPoint,
    setEndPoint,
    addWaypoint,
    removeWaypoint,
    clearPlanning,
    setCurrentRoute,
  }
})
