import { useAuthStore } from '~/stores/auth'

/**
 * Protegge tutte le route che non sono "/".
 * Firebase Auth è già inizializzato dal plugin auth.client.ts,
 * quindi `isLoggedIn` è affidabile al momento dell'esecuzione.
 */
export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore()

  // Utente non loggato che tenta di accedere a pagine protette → login
  if (!authStore.isLoggedIn && to.path !== '/') {
    return navigateTo('/')
  }

  // Utente già loggato che va alla login page → mappa
  if (authStore.isLoggedIn && to.path === '/') {
    return navigateTo('/map')
  }
})
