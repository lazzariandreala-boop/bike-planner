// =============================================
// Surface Types
// =============================================

export type SurfaceType =
  | 'cycleway'    // Pista ciclabile dedicata
  | 'gravel'      // Ghiaia
  | 'unpaved'     // Sterrato generico
  | 'asphalt'     // Asfalto
  | 'concrete'    // Cemento
  | 'grass'       // Erba/campo
  | 'dirt'        // Terra battuta
  | 'cobblestone' // Pavé/sampietrini
  | 'sand'        // Sabbia

export interface SurfacePreference {
  type: SurfaceType
  label: string
  labelIt: string
  icon: string
  color: string
  orsProfile?: string // ORS cycling profile mapping
  weight: number // 1-5, 5 = massima preferenza
}

// =============================================
// Route Types
// =============================================

export interface RoutePoint {
  lat: number
  lng: number
  label?: string
  address?: string
}

export interface RoutePreferences {
  surfaces: SurfaceType[]      // Ordine di preferenza (index 0 = più preferita)
  avoidHighways: boolean
  avoidFerries: boolean
  maxDistance?: number          // km
  maxElevation?: number         // m dislivello
  difficulty?: 'easy' | 'moderate' | 'hard' | 'expert'
}

export interface RouteElevationPoint {
  distance: number  // km
  elevation: number // m
}

export interface SavedRoute {
  id: string
  userId: string
  name: string
  description?: string
  aiDescription?: string
  start: RoutePoint
  end: RoutePoint
  waypoints?: RoutePoint[]
  preferences: RoutePreferences
  geometry: GeoJSON.LineString
  distance: number        // km
  duration: number        // minuti
  elevation: {
    gain: number
    loss: number
    max: number
    min: number
    profile: RouteElevationPoint[]
  }
  surfaceBreakdown: Record<SurfaceType, number> // percentuale per tipo
  createdAt: Date
  updatedAt: Date
  isFavorite: boolean
  tags: string[]
}

// =============================================
// ORS API Types
// =============================================

export interface ORSRouteRequest {
  coordinates: [number, number][] // [lng, lat] - ORS usa lon/lat!
  profile: 'cycling-mountain' | 'cycling-road' | 'cycling-regular' | 'cycling-electric'
  profile_params?: {
    weightings?: {
      green?: number     // 0-1: preferisce verde/natura
      quiet?: number     // 0-1: evita traffico
      steepness_difficulty?: number // 0-3: evita salite
    }
    restrictions?: {
      gradient?: number  // max gradient %
    }
  }
  options?: {
    avoid_features?: Array<'highways' | 'tollways' | 'ferries' | 'fords' | 'steps'>
    avoid_borders?: 'all' | 'controlled'
    vehicle_type?: string
  }
  format?: 'geojson'
  elevation?: boolean
  instructions?: boolean
  instructions_format?: 'text' | 'html'
  language?: string
  units?: 'km' | 'm' | 'mi'
  geometry_simplify?: boolean
  extra_info?: Array<'surface' | 'waycategory' | 'waytype' | 'steepness' | 'traildifficulty'>
}

export interface ORSRouteResponse {
  type: 'FeatureCollection'
  features: ORSFeature[]
  bbox: number[]
  metadata: {
    attribution: string
    service: string
    timestamp: number
    query: ORSRouteRequest
  }
}

export interface ORSFeature {
  type: 'Feature'
  properties: {
    segments: ORSSegment[]
    summary: {
      distance: number   // m
      duration: number   // s
      ascent: number     // m
      descent: number    // m
    }
    extras?: {
      surface?: { values: Array<[number, number, number]>; summary: Array<{ value: number; distance: number; amount: number }> }
      waycategory?: { values: Array<[number, number, number]>; summary: Array<{ value: number; distance: number; amount: number }> }
      steepness?: { values: Array<[number, number, number]> }
    }
    way_points: number[]
  }
  geometry: GeoJSON.LineString
  bbox: number[]
}

export interface ORSSegment {
  distance: number
  duration: number
  steps: ORSStep[]
}

export interface ORSStep {
  distance: number
  duration: number
  type: number
  instruction: string
  name: string
  way_points: number[]
}

// =============================================
// App State
// =============================================

export type AppView = 'map' | 'routes' | 'profile'
export type MapMode = 'view' | 'planning' | 'navigating'

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  photoURL: string
  preferences: {
    defaultSurfaces: SurfaceType[]
    defaultDifficulty: 'easy' | 'moderate' | 'hard' | 'expert'
    units: 'km' | 'mi'
    theme: 'dark' | 'light'
  }
}
