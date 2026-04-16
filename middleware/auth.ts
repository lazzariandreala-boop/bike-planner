import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore()

  // Attendi che Firebase sia inizializzato prima di verificare
  if (!authStore.initialized) {
    // Auth non ancora pronto: lascia passare, il watcher in app.vue gestirà
    return
  }

  if (!authStore.isLoggedIn && to.path !== '/') {
    return navigateTo('/')
  }

  if (authStore.isLoggedIn && to.path === '/') {
    return navigateTo('/map')
  }
})
