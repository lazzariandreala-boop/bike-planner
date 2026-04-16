import type {
  SurfaceType,
  RoutePreferences,
  RoutePoint,
  ORSRouteRequest,
  ORSRouteResponse,
  SavedRoute,
} from '~/types'

// Mapping superficie → configurazione ORS
const SURFACE_ORS_CONFIG: Record<SurfaceType, {
  profile: 'cycling-mountain' | 'cycling-road' | 'cycling-regular'
  green: number
  quiet: number
}> = {
  cycleway:    { profile: 'cycling-road',     green: 0.3, quiet: 0.8 },
  gravel:      { profile: 'cycling-mountain', green: 0.9, quiet: 0.7 },
  unpaved:     { profile: 'cycling-mountain', green: 0.8, quiet: 0.6 },
  dirt:        { profile: 'cycling-mountain', green: 0.9, quiet: 0.5 },
  grass:       { profile: 'cycling-mountain', green: 1.0, quiet: 0.4 },
  asphalt:     { profile: 'cycling-road',     green: 0.0, quiet: 0.3 },
  concrete:    { profile: 'cycling-road',     green: 0.0, quiet: 0.3 },
  cobblestone: { profile: 'cycling-regular',  green: 0.2, quiet: 0.5 },
  sand:        { profile: 'cycling-mountain', green: 0.7, quiet: 0.3 },
}

const SURFACE_LABELS: Record<SurfaceType, { it: string; icon: string; color: string }> = {
  cycleway:    { it: 'Pista ciclabile', icon: '🚴', color: '#4ade80' },
  gravel:      { it: 'Ghiaia',         icon: '⚪', color: '#a8a29e' },
  unpaved:     { it: 'Sterrato',       icon: '🟤', color: '#92400e' },
  dirt:        { it: 'Terra battuta',  icon: '🪨', color: '#78350f' },
  grass:       { it: 'Erba / Campo',   icon: '🌿', color: '#22c55e' },
  asphalt:     { it: 'Asfalto',        icon: '⚫', color: '#374151' },
  concrete:    { it: 'Cemento',        icon: '🔲', color: '#6b7280' },
  cobblestone: { it: 'Pavé',           icon: '🪵', color: '#b45309' },
  sand:        { it: 'Sabbia',         icon: '🏜️', color: '#fbbf24' },
}

export const useSurfaceLabels = () => SURFACE_LABELS

export const useORS = () => {
  const config = useRuntimeConfig()
  const ORS_BASE = 'https://api.openrouteservice.org/v2'

  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Calcola il profilo e i pesi ORS in base all'ordine di preferenza superfici
   */
  const buildORSConfig = (surfaces: SurfaceType[]) => {
    // La superficie più preferita (index 0) determina il profilo principale
    const primary = surfaces[0]
    const primaryConfig = SURFACE_ORS_CONFIG[primary]

    // Fai una media pesata dei primi 3 per i weightings
    const topSurfaces = surfaces.slice(0, 3)
    const weights = topSurfaces.map((s, i) => ({ ...SURFACE_ORS_CONFIG[s], weight: 1 / (i + 1) }))
    const totalWeight = weights.reduce((a, b) => a + b.weight, 0)

    const green = weights.reduce((a, b) => a + b.green * b.weight, 0) / totalWeight
    const quiet = weights.reduce((a, b) => a + b.quiet * b.weight, 0) / totalWeight

    return {
      profile: primaryConfig.profile,
      green: Math.round(green * 10) / 10,
      quiet: Math.round(quiet * 10) / 10,
    }
  }

  /**
   * Calcola un percorso via ORS
   */
  const calculateRoute = async (
    start: RoutePoint,
    end: RoutePoint,
    preferences: RoutePreferences,
    waypointsList: RoutePoint[] = []
  ): Promise<ORSRouteResponse | null> => {
    if (!config.public.orsApiKey) {
      error.value = 'ORS API key mancante. Configurala in .env'
      return null
    }

    isLoading.value = true
    error.value = null

    try {
      const orsConfig = buildORSConfig(preferences.surfaces)

      // ORS vuole [lng, lat]
      const coordinates: [number, number][] = [
        [start.lng, start.lat],
        ...waypointsList.map(w => [w.lng, w.lat] as [number, number]),
        [end.lng, end.lat],
      ]

      // Per profili cycling, ORS accetta solo: ferries, steps, fords (non highways)
      const avoidFeatures: ORSRouteRequest['options']['avoid_features'] = []
      if (preferences.avoidFerries) avoidFeatures.push('ferries')

      const body = {
        coordinates,
        options: avoidFeatures.length ? { avoid_features: avoidFeatures } : undefined,
        elevation: true,
        instructions: false,
        units: 'km',
        extra_info: ['surface'],
      }

      const response = await fetch(
        `${ORS_BASE}/directions/${orsConfig.profile}/geojson`,
        {
          method: 'POST',
          headers: {
            'Authorization': config.public.orsApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      )

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error?.message || `ORS error ${response.status}`)
      }

      return await response.json() as ORSRouteResponse
    } catch (e: any) {
      error.value = e.message || 'Errore nel calcolo del percorso'
      console.error('[ORS]', e)
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Geocoding: indirizzo → coordinate (via ORS Geocoding)
   */
  const geocode = async (text: string): Promise<{ lat: number; lng: number; label: string }[]> => {
    if (!config.public.orsApiKey) return []

    const resp = await fetch(
      `https://api.openrouteservice.org/geocode/search?api_key=${config.public.orsApiKey}&text=${encodeURIComponent(text)}&size=5&lang=it`,
    )
    if (!resp.ok) return []
    const data = await resp.json()
    return (data.features || []).map((f: any) => ({
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      label: f.properties.label,
    }))
  }

  /**
   * Reverse geocoding: coordinate → indirizzo
   */
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    if (!config.public.orsApiKey) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`

    const resp = await fetch(
      `https://api.openrouteservice.org/geocode/reverse?api_key=${config.public.orsApiKey}&point.lon=${lng}&point.lat=${lat}&size=1`,
    )
    if (!resp.ok) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    const data = await resp.json()
    return data.features?.[0]?.properties?.label || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  }

  /**
   * Estrai il breakdown delle superfici dalla risposta ORS
   */
  const parseSurfaceBreakdown = (feature: ORSRouteResponse['features'][0]): Record<string, number> => {
    const surfaceExtra = feature.properties.extras?.surface
    if (!surfaceExtra?.summary) return {}

    // ORS surface values: https://giscience.github.io/openrouteservice/documentation/extra-info/Surface.html
    const ORS_SURFACE_MAP: Record<number, SurfaceType> = {
      0: 'asphalt',    // Unknown → fallback asfalto
      1: 'asphalt',    // Paved
      2: 'asphalt',    // Asphalt
      3: 'concrete',   // Concrete
      4: 'cobblestone',// Cobblestone
      5: 'cobblestone',// Sett (basalt)
      6: 'asphalt',    // Paving stones
      7: 'sand',       // Sand
      8: 'unpaved',    // Unpaved
      9: 'gravel',     // Gravel
      10: 'dirt',      // Dirt
      11: 'grass',     // Grass
      12: 'unpaved',   // Ground
      13: 'unpaved',   // Ice
      14: 'sand',      // Salt
      15: 'unpaved',   // Snow
      16: 'dirt',      // Woodchips
    }

    const totalDist = feature.properties.summary.distance
    const result: Record<string, number> = {}

    for (const item of surfaceExtra.summary) {
      const type = ORS_SURFACE_MAP[item.value] || 'asphalt'
      result[type] = ((result[type] || 0) + (item.distance / totalDist) * 100)
    }

    // Arrotonda
    Object.keys(result).forEach(k => { result[k] = Math.round(result[k]) })
    return result
  }

  /**
   * Estrai il profilo altimetrico
   */
  const parseElevationProfile = (feature: ORSRouteResponse['features'][0]) => {
    const coords = feature.geometry.coordinates
    if (!coords || coords.length < 2 || coords[0].length < 3) {
      return { gain: 0, loss: 0, max: 0, min: 0, profile: [] }
    }

    let gain = 0
    let loss = 0
    let cumDist = 0
    const elevations = coords.map(c => c[2] || 0)
    const profile = []

    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1]
      const curr = coords[i]
      const diff = (curr[2] || 0) - (prev[2] || 0)
      const segDist = Math.sqrt(
        Math.pow((curr[0] - prev[0]) * 111320 * Math.cos(prev[1] * Math.PI / 180), 2) +
        Math.pow((curr[1] - prev[1]) * 110540, 2)
      ) / 1000

      cumDist += segDist
      if (diff > 0) gain += diff
      else loss += Math.abs(diff)

      if (i % 5 === 0) { // campiona ogni 5 punti
        profile.push({ distance: Math.round(cumDist * 10) / 10, elevation: Math.round(curr[2] || 0) })
      }
    }

    return {
      gain: Math.round(gain),
      loss: Math.round(loss),
      max: Math.round(Math.max(...elevations)),
      min: Math.round(Math.min(...elevations)),
      profile,
    }
  }

  return {
    isLoading,
    error,
    calculateRoute,
    geocode,
    reverseGeocode,
    buildORSConfig,
    parseSurfaceBreakdown,
    parseElevationProfile,
  }
}
