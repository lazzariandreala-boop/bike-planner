import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'

export const useGeolocation = () => {
  const position = ref<{ lat: number; lng: number } | null>(null)
  const error = ref<string | null>(null)
  const loading = ref(false)

  const getCurrentPosition = async (): Promise<{ lat: number; lng: number } | null> => {
    loading.value = true
    error.value = null

    try {
      if (Capacitor.isNativePlatform()) {
        // Capacitor Geolocation (Android/iOS)
        const perm = await Geolocation.requestPermissions()
        if (perm.location !== 'granted') {
          throw new Error('Permesso GPS negato')
        }
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true })
        position.value = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      } else {
        // Web Geolocation API
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
          })
        )
        position.value = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      }
      return position.value
    } catch (e: any) {
      error.value = e.message || 'Impossibile ottenere la posizione'
      return null
    } finally {
      loading.value = false
    }
  }

  return { position, error, loading, getCurrentPosition }
}
