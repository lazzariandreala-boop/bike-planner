import type {
  SurfaceType,
  RoutePreferences,
  RoutePoint,
  ORSRouteRequest,
  ORSRouteResponse,
  SavedRoute,
} from '~/types'

// Mapping superficie → configurazione ORS
// cycling-regular: segue infrastruttura ciclistica dedicata (piste ciclabili, percorsi protetti)
// cycling-mountain: ottimizzato per fondi non asfaltati, sterrato, ghiaia
// cycling-road: ciclismo sportivo su strada, preferisce asfalto e velocità — NON usare per ciclabili
//
// green (0-1): preferisce percorsi naturali/parchi
// quiet (0-1): evita strade trafficate — con cycling-regular forza piste ciclabili
const SURFACE_ORS_CONFIG: Record<SurfaceType, {
  profile: 'cycling-mountain' | 'cycling-road' | 'cycling-regular'
  green: number
  quiet: number
}> = {
  cycleway:    { profile: 'cycling-regular', green: 0.2, quiet: 1.0 },  // cycling-regular + max quiet = piste ciclabili dedicate
  gravel:      { profile: 'cycling-mountain', green: 0.9, quiet: 0.5 },
  unpaved:     { profile: 'cycling-mountain', green: 0.8, quiet: 0.4 },
  dirt:        { profile: 'cycling-mountain', green: 0.9, quiet: 0.3 },
  grass:       { profile: 'cycling-mountain', green: 1.0, quiet: 0.2 },
  asphalt:     { profile: 'cycling-road',     green: 0.0, quiet: 0.0 },
  concrete:    { profile: 'cycling-road',     green: 0.0, quiet: 0.0 },
  cobblestone: { profile: 'cycling-regular',  green: 0.1, quiet: 0.3 },
  sand:        { profile: 'cycling-mountain', green: 0.7, quiet: 0.2 },
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
   * Calcola il profilo e i pesi ORS in base alla superficie con priorità più alta.
   *
   * Usiamo solo surfaces[0] per profile/green/quiet: l'obiettivo è spingere ORS
   * al MASSIMO verso la preferenza primaria dell'utente. Le superfici successive
   * sono fallback naturali — se la superficie primaria non è disponibile nel tratto,
   * ORS trova comunque un percorso senza che noi diluiamo il segnale primario.
   *
   * Mediare i valori delle altre superfici riduce l'efficacia: es. cycleway (quiet=1.0)
   * + asphalt (quiet=0.0) → quiet=0.67, meno pressione sulle ciclabili del necessario.
   */
  const buildORSConfig = (surfaces: SurfaceType[]) => {
    const primary = SURFACE_ORS_CONFIG[surfaces[0]]
    return {
      profile: primary.profile,
      green: primary.green,
      quiet: primary.quiet,
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

      const wantsFlat      = preferences.difficulty === 'easy' || preferences.difficulty === 'moderate'
      const wantsCycleway  = preferences.surfaces[0] === 'cycleway'
      // Richiediamo alternative se vogliamo piatto o ciclabili — poi scegliamo la migliore
      const needsAlternatives = wantsFlat || wantsCycleway

      const body: any = {
        coordinates,
        options: {
          ...(avoidFeatures.length ? { avoid_features: avoidFeatures } : {}),
          profile_params: {
            weightings: {
              green: orsConfig.green,
              quiet: orsConfig.quiet,
            },
          },
        },
        ...(needsAlternatives ? {
          alternative_routes: {
            target_count: 3,
            weight_factor: 5.0,  // considera percorsi fino a 5x più lunghi — necessario per trovare le ciclabili
            share_factor: 0.2,   // le alternative devono essere molto diverse tra loro
          },
        } : {}),
        elevation: true,
        instructions: false,
        units: 'km',
        extra_info: ['surface', 'waytype', 'waycategory'],
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

      const data = await response.json() as ORSRouteResponse

      if (needsAlternatives && data.features && data.features.length > 1) {
        if (wantsCycleway) {
          // Scoring: massimizza km su infrastruttura ciclistica
          // waytype 6=cycleway (designata), 5=track, 4=path — tutti migliori delle strade
          // waycategory 64=tracks, 128=paths — ulteriore conferma
          // Le strade segnalate da ORS (waytype 1-3) ottengono punteggio 0
          const ranked = data.features.map(f => {
            const extras = (f.properties as any).extras
            const totalDist = f.properties.summary.distance || 1
            let cyclingDist = 0

            // Waytype: 4=path, 5=track, 6=cycleway — pesiamo di più le ciclabili dedicate
            const waytypeExtra = extras?.waytype
            if (waytypeExtra?.summary) {
              for (const item of waytypeExtra.summary) {
                if (item.value === 6) cyclingDist += item.distance * 3      // ciclabile designata — peso massimo
                else if (item.value === 5) cyclingDist += item.distance * 2 // track
                else if (item.value === 4) cyclingDist += item.distance * 2 // path
              }
            }

            const score = Math.round((cyclingDist / totalDist) * 100)
            return { feature: f, score }
          })
          ranked.sort((a, b) => b.score - a.score)
          data.features = ranked.map(r => r.feature)
          console.debug(`[ORS cycleway] scelta con score ${ranked[0].score} (alternative: ${ranked.map(r => r.score).join(', ')})`)
        } else if (wantsFlat) {
          // Scegli l'alternativa con meno dislivello positivo
          const ranked = data.features.map(f => {
            const coords = f.geometry.coordinates
            let gain = 0
            for (let i = 1; i < coords.length; i++) {
              const diff = (coords[i][2] ?? 0) - (coords[i - 1][2] ?? 0)
              if (diff > 0) gain += diff
            }
            return { feature: f, gain }
          })
          ranked.sort((a, b) => a.gain - b.gain)
          data.features = ranked.map(r => r.feature)
          console.debug(`[ORS flat] scelta con gain ${Math.round(ranked[0].gain)}m (alternative: ${ranked.map(r => Math.round(r.gain) + 'm').join(', ')})`)
        }
      }

      return data
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
