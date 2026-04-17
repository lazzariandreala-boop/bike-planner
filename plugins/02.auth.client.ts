import { useAuthStore } from '~/stores/auth'

/**
 * Plugin client-side che inizializza Firebase Auth PRIMA che il middleware giri.
 * L'`await` garantisce che lo stato di login sia noto prima di qualsiasi navigazione.
 */
export default defineNuxtPlugin(async () => {
  const authStore = useAuthStore()
  await authStore.init()
})
