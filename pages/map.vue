<template>
  <div class="relative w-full h-full flex flex-col">
    <AppHeader />

    <!-- Layout principale -->
    <div class="relative flex-1 overflow-hidden">

      <!-- Mappa -->
      <div id="map" class="absolute inset-0" ref="mapContainer" />

      <!-- Pannello laterale (desktop) / overlay (mobile) -->
      <RoutePanel
        v-show="!isMobileView || showMobilePanel"
        :start-point="routesStore.startPoint"
        :end-point="routesStore.endPoint"
        :current-route="routesStore.currentRoute"
        :is-loading="orsLoading"
        :is-generating-ai="aiGenerating"
        @calculate="onCalculate"
        @save="onSave"
        @clear="onClear"
        @clear-start="onClearStart"
        @clear-end="onClearEnd"
        @select-start="onSelectStart"
        @select-end="onSelectEnd"
        @close-mobile="showMobilePanel = false"
        @export-gpx="onExportGpx"
        @navigate="onStartNavigation"
        @use-location-start="onUseLocationStart"
        @use-location-end="onUseLocationEnd"
      />

      <!-- Navigazione in-app -->
      <NavigationOverlay
        v-if="isNavigating && routesStore.currentRoute"
        :route="routesStore.currentRoute"
        @stop="onStopNavigation"
        @position-update="onNavPosition"
      />

      <!-- Toolbar mappa (destra) -->
      <div class="map-toolbar" @click.stop>
        <button class="map-btn" @click.stop="() => goToMyLocation()">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.5"/>
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span>Posizione</span>
        </button>
        <button class="map-btn" :class="{ active: isDarkMap }" @click.stop="toggleMapTheme">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.3"/>
            <path d="M8 1v14M1 8h14" stroke="currentColor" stroke-width="1" stroke-opacity="0.4"/>
            <path v-if="isDarkMap" d="M8 1a7 7 0 0 0 0 14V1z" fill="currentColor" fill-opacity="0.5"/>
            <path v-else d="M8 2a6 6 0 1 1-4.2 10.2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
          <span>{{ isDarkMap ? 'Light Mode' : 'Dark Mode' }}</span>
        </button>
        <button class="map-btn" :class="{ active: showCycleMap }" @click.stop="toggleCycleMap">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="4" cy="11" r="2.5" stroke="currentColor" stroke-width="1.3"/>
            <circle cx="12" cy="11" r="2.5" stroke="currentColor" stroke-width="1.3"/>
            <path d="M4 11L8 4l4 7" stroke="currentColor" stroke-width="1.3"/>
            <path d="M6 7h4" stroke="currentColor" stroke-width="1.3"/>
          </svg>
          <span>{{ showCycleMap ? 'Ciclabili ✔' : 'Ciclabili ✘' }}</span>
        </button>
      </div>

      <!-- Toast notifiche -->
      <Transition name="fade">
        <div v-if="toast" class="toast" :class="`toast-${toast.type}`">
          {{ toast.message }}
        </div>
      </Transition>

      <!-- FAB mobile: apre il pannello pianificazione -->
      <button
        v-if="isMobileView && !showMobilePanel"
        class="mobile-fab"
        @click="showMobilePanel = true"
      >
        <template v-if="routesStore.currentRoute">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        </template>
        <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 12h18M3 6h18M3 18h18"/>
        </svg>
      </button>

    </div>

    <!-- Save dialog -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showSaveDialog" class="modal-overlay" @click.self="showSaveDialog = false">
          <div class="modal-card">
            <h3 class="font-display text-2xl mb-4" style="color: #8bb940;">SALVA PERCORSO</h3>
            <div class="space-y-3">
              <div>
                <label class="text-xs font-mono mb-1 block" style="color: #5a9b5a;">NOME</label>
                <input v-model="saveForm.name" class="input-terrain" placeholder="Es. Anello del Brenta…" />
                <button class="text-xs mt-1 opacity-60 hover:opacity-100" style="color: #8bb940;"
                  @click="generateNameAI" :disabled="aiGenerating">
                  <div v-if="aiGenerating" class="spinner !w-3 !h-3 inline-block"/> AI suggerisce un nome
                </button>
              </div>
              <div>
                <label class="text-xs font-mono mb-1 block" style="color: #5a9b5a;">NOTE (opzionale)</label>
                <textarea v-model="saveForm.notes" class="input-terrain" rows="2"
                  placeholder="Condizioni, consigli, stagione migliore…"/>
              </div>
              <div>
                <label class="text-xs font-mono mb-1 block" style="color: #5a9b5a;">TAG</label>
                <input v-model="saveForm.tagsInput" class="input-terrain"
                  placeholder="avventura, montagna, andata-ritorno…" />
              </div>
            </div>
            <div class="flex gap-2 mt-4">
              <button class="btn-primary flex-1" :disabled="!saveForm.name || routesStore.savingRoute"
                @click="confirmSave">
                <div v-if="routesStore.savingRoute" class="spinner !w-4 !h-4 inline-block mr-1"/> Salva
              </button>
              <button class="btn-ghost flex-1" @click="showSaveDialog = false">Annulla</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { RoutePreferences, RoutePoint, SavedRoute } from '~/types'
import { useORS } from '~/composables/useORS'
import { useAI } from '~/composables/useAI'
import { useGeolocation } from '~/composables/useGeolocation'
import { useAuthStore } from '~/stores/auth'
import { useRoutesStore } from '~/stores/routes'
import { exportGPX } from '~/composables/useGPX'

definePageMeta({ middleware: 'auth' })

const authStore = useAuthStore()
const routesStore = useRoutesStore()
const { calculateRoute, reverseGeocode, parseSurfaceBreakdown, parseElevationProfile, isLoading: orsLoading, error: orsError } = useORS()
const { generateRouteDescription, suggestRouteName, isGenerating: aiGenerating } = useAI()
const { getCurrentPosition } = useGeolocation()

// ── Map refs ──────────────────────────────────────────────────
const mapContainer = ref<HTMLElement | null>(null)
let map: any = null          // maplibregl.Map
let startMarker: any = null  // maplibregl.Marker
let endMarker: any = null
let navMarker: any = null

// Route source/layer IDs
const SRC  = 'route'
const MAIN = 'route-main'
const SHAD = 'route-shadow'

// Cycling overlay toggle
const showCycleMap = ref(false)

// Map theme toggle
const isDarkMap = ref(false)
const STYLE_LIGHT = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'
const STYLE_DARK  = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

// Mobile panel toggle
const isMobileView = ref(false)
const showMobilePanel = ref(false)

// Navigazione
const isNavigating = ref(false)

const showSaveDialog = ref(false)
const saveForm = reactive({ name: '', notes: '', tagsInput: '' })
const toast = ref<{ message: string; type: 'success' | 'error' | 'info' | 'start' | 'end' } | null>(null)
let toastTimer: any = null

// =============================================
// INIT MAPPA
// =============================================
onMounted(async () => {
  isMobileView.value = window.innerWidth < 768

  // Usa il globale window.maplibregl caricato via CDN (evita problemi di bundling)
  const ml = (window as any).maplibregl
  if (!ml) { console.error('maplibregl non trovato su window'); return }

  await nextTick()
  if (!mapContainer.value) return

  map = new ml.Map({
    container: mapContainer.value,
    style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
    center: [11.5, 45.8],
    zoom: 5,
    attributionControl: false,
    pitchWithRotate: false,
  })

  map.on('error', (e: any) => {
    console.error('[MapLibre]', e.error)
  })

  // Attribution compatta
  map.addControl(new ml.AttributionControl({ compact: true }), 'bottom-right')

  // Zoom controls solo desktop
  if (!isMobileView.value) {
    map.addControl(new ml.NavigationControl({ showCompass: true, visualizePitch: false }), 'bottom-right')
  }

  // Click sulla mappa per impostare punti
  map.on('click', onMapClick)

  // Aspetta che lo stile sia caricato prima di aggiungere sorgenti/layer
  map.on('load', async () => {
    // Overlay ciclabile Waymarked Trails
    map.addSource('cycling-src', {
      type: 'raster',
      tiles: ['https://tile.waymarkedtrails.org/cycling/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© Waymarked Trails',
    })
    map.addLayer({
      id: 'cycling-layer',
      type: 'raster',
      source: 'cycling-src',
      layout: { visibility: 'none' },
      paint: { 'raster-opacity': 0.65 },
    })

    // Se c'è già un percorso (es. aperto dalla lista salvati), disegnalo
    if (routesStore.currentRoute?.geometry?.coordinates) {
      drawRoute(routesStore.currentRoute.geometry.coordinates)
      if (routesStore.currentRoute.start) placeMarker('start', routesStore.currentRoute.start)
      if (routesStore.currentRoute.end)   placeMarker('end',   routesStore.currentRoute.end)
    } else {
      await goToMyLocation(true)
    }
  })
})

onUnmounted(() => {
  map?.remove()
  map = null
})

// =============================================
// MAP INTERACTIONS
// =============================================
const onMapClick = (e: any) => {
  const { lng, lat } = e.lngLat

  let target: 'start' | 'end'
  if (!routesStore.startPoint)      target = 'start'
  else if (!routesStore.endPoint)   target = 'end'
  else return

  const coordLabel = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  const point: RoutePoint = { lat, lng, address: coordLabel }

  if (target === 'start') {
    routesStore.setStartPoint(point)
    placeMarker('start', point)
    showToast('Partenza impostata', 'start')
  } else {
    routesStore.setEndPoint(point)
    placeMarker('end', point)
    showToast('Destinazione impostata', 'end')
    if (isMobileView.value) showMobilePanel.value = true
  }

  // Aggiorna indirizzo in background
  reverseGeocode(lat, lng).then(address => {
    const resolved: RoutePoint = { lat, lng, address }
    if (target === 'start') routesStore.setStartPoint(resolved)
    else                    routesStore.setEndPoint(resolved)
  })
}

const placeMarker = (type: 'start' | 'end', point: RoutePoint) => {
  if (!map) return
  const { lat, lng, address } = point
  const color   = type === 'start' ? '#8bb940' : '#e8aa3a'
  const label   = type === 'start' ? 'Partenza'    : 'Destinazione'

  const el = document.createElement('div')
  el.style.cssText = `
    width: 14px; height: 14px;
    border-radius: 50%;
    background: ${color};
    border: 2px solid #fff;
    box-shadow: 0 0 0 3px ${color}55, 0 2px 8px rgba(0,0,0,0.4);
    cursor: pointer;
  `

  _createMarker(el, lng, lat, `<strong style="color:${color}">${label}</strong><br><small>${address || ''}</small>`, type)
}

// Factory per creare marker MapLibre (usa il globale CDN)
const _getML = () => (window as any).maplibregl
const _createMarker = async (el: HTMLElement, lng: number, lat: number, html: string, type: 'start' | 'end') => {
  const _ML = _getML()
  if (!_ML || !map) return

  const popup = new _ML.Popup({ offset: 12, closeButton: false })
    .setHTML(html)

  const marker = new _ML.Marker({ element: el, anchor: 'center' })
    .setLngLat([lng, lat])
    .setPopup(popup)
    .addTo(map)

  if (type === 'start') { startMarker?.remove(); startMarker = marker }
  else                  { endMarker?.remove();   endMarker   = marker }
}

const goToMyLocation = async (silent = false) => {
  const pos = await getCurrentPosition()
  if (pos && map) {
    map.flyTo({ center: [pos.lng, pos.lat], zoom: 17, duration: 1000 })
    if (!silent) showToast('Posizione rilevata', 'success')
  } else if (!silent) {
    showToast('Impossibile rilevare la posizione', 'error')
  }
}

const toggleCycleMap = () => {
  if (!map || !map.getLayer('cycling-layer')) return
  showCycleMap.value = !showCycleMap.value
  map.setLayoutProperty('cycling-layer', 'visibility', showCycleMap.value ? 'visible' : 'none')
}

const toggleMapTheme = () => {
  if (!map) return
  isDarkMap.value = !isDarkMap.value
  map.setStyle(isDarkMap.value ? STYLE_DARK : STYLE_LIGHT)
  // Lo stile viene ricaricato: ri-aggiungi sorgenti/layer su styledata
  map.once('styledata', () => {
    // Overlay ciclabile
    if (!map.getSource('cycling-src')) {
      map.addSource('cycling-src', {
        type: 'raster',
        tiles: ['https://tile.waymarkedtrails.org/cycling/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© Waymarked Trails',
      })
      map.addLayer({
        id: 'cycling-layer',
        type: 'raster',
        source: 'cycling-src',
        layout: { visibility: showCycleMap.value ? 'visible' : 'none' },
        paint: { 'raster-opacity': 0.65 },
      })
    }
    // Ridisegna percorso se presente
    const coords = routesStore.currentRoute?.geometry?.coordinates
    if (coords) drawRoute(coords)
  })
}

// =============================================
// ROUTING
// =============================================
const onCalculate = async (prefs: RoutePreferences) => {
  const start = routesStore.startPoint
  const end   = routesStore.endPoint
  if (!start || !end) return

  const result = await calculateRoute(start, end, prefs, routesStore.waypoints)
  if (!result || !result.features?.[0]) {
    showToast(orsError.value || 'Nessun percorso trovato', 'error')
    return
  }

  const feature      = result.features[0]
  const summary      = feature.properties.summary
  const elevation    = parseElevationProfile(feature)
  const surfaceBreakdown = parseSurfaceBreakdown(feature)

  drawRoute(feature.geometry.coordinates)

  const route: Partial<SavedRoute> = {
    start,
    end,
    preferences: prefs,
    geometry: feature.geometry,
    distance: Math.round(summary.distance * 10) / 10,
    duration: Math.round(summary.duration / 60),
    elevation,
    surfaceBreakdown: surfaceBreakdown as any,
    segments: feature.properties.segments,
  }
  routesStore.setCurrentRoute(route)

  generateRouteDescription(route).then(desc => {
    routesStore.setCurrentRoute({ ...route, aiDescription: desc })
  })

  if (isMobileView.value) showMobilePanel.value = true

  showToast(`Percorso ${summary.distance.toFixed(1)} km trovato`, 'success')
}

const drawRoute = (coordinates: number[][]) => {
  if (!map) return

  // Rimuovi layer/sorgenti precedenti
  if (map.getLayer(SHAD)) map.removeLayer(SHAD)
  if (map.getLayer(MAIN)) map.removeLayer(MAIN)
  if (map.getSource(SRC))  map.removeSource(SRC)

  // ORS già torna [lng, lat, ele] — MapLibre accetta [lng, lat]
  map.addSource(SRC, {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates },
      properties: {},
    },
  })

  // Shadow
  map.addLayer({
    id: SHAD,
    type: 'line',
    source: SRC,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#000', 'line-width': 8, 'line-opacity': 0.18, 'line-blur': 3 },
  })

  // Linea principale
  map.addLayer({
    id: MAIN,
    type: 'line',
    source: SRC,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#8bb940', 'line-width': 4, 'line-opacity': 0.95 },
  })

  // FitBounds — padding diverso per mobile (bottom sheet / FAB) e desktop (sidebar)
  const lngs = coordinates.map(c => c[0])
  const lats  = coordinates.map(c => c[1])
  const mobile = isMobileView.value
  map.fitBounds(
    [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
    {
      padding: mobile
        ? { top: 70, bottom: 300, left: 16, right: 16 }
        : { top: 60, bottom: 60, left: 740, right: 60 },
      duration: 600,
    }
  )
}

// =============================================
// SAVE
// =============================================
const onSave = async () => {
  if (!routesStore.currentRoute) return
  saveForm.name     = routesStore.currentRoute.name || ''
  saveForm.notes    = ''
  saveForm.tagsInput = ''
  showSaveDialog.value = true
  if (!saveForm.name) generateNameAI()
}

const generateNameAI = async () => {
  if (!routesStore.currentRoute) return
  saveForm.name = await suggestRouteName(routesStore.currentRoute)
}

const confirmSave = async () => {
  if (!routesStore.currentRoute || !saveForm.name) return
  try {
    await routesStore.saveRoute({
      ...routesStore.currentRoute,
      name: saveForm.name,
      description: saveForm.notes,
      isFavorite: false,
      tags: saveForm.tagsInput.split(',').map(t => t.trim()).filter(Boolean),
      waypoints: routesStore.waypoints,
    } as any)
    showSaveDialog.value = false
    showToast('Percorso salvato!', 'success')
  } catch (e: any) {
    showToast(e?.message || 'Errore nel salvataggio', 'error')
  }
}

// =============================================
// CLEAR / HANDLERS
// =============================================
const onClear = () => {
  routesStore.clearPlanning()
  startMarker?.remove(); startMarker = null
  endMarker?.remove();   endMarker   = null
  if (map?.getLayer(SHAD)) map.removeLayer(SHAD)
  if (map?.getLayer(MAIN)) map.removeLayer(MAIN)
  if (map?.getSource(SRC)) map.removeSource(SRC)
}

const onClearStart = () => {
  routesStore.setStartPoint(null)
  startMarker?.remove(); startMarker = null
}

const onClearEnd = () => {
  routesStore.setEndPoint(null)
  endMarker?.remove(); endMarker = null
}

const onSelectStart = (point: RoutePoint) => {
  routesStore.setStartPoint(point)
  placeMarker('start', point)
  map?.easeTo({ center: [point.lng, point.lat], duration: 400 })
}

const onSelectEnd = (point: RoutePoint) => {
  routesStore.setEndPoint(point)
  placeMarker('end', point)
  map?.easeTo({ center: [point.lng, point.lat], duration: 400 })
}

const onUseLocationStart = async () => {
  showToast('Rilevamento posizione…', 'info')
  const pos = await getCurrentPosition()
  if (!pos) { showToast('Posizione non disponibile', 'error'); return }
  const point: RoutePoint = { lat: pos.lat, lng: pos.lng, address: 'Posizione attuale' }
  routesStore.setStartPoint(point)
  placeMarker('start', point)
  map?.easeTo({ center: [pos.lng, pos.lat], duration: 600 })
  showToast('Partenza: posizione attuale', 'start')
  reverseGeocode(pos.lat, pos.lng).then(address => {
    routesStore.setStartPoint({ ...point, address })
  })
}

const onUseLocationEnd = async () => {
  showToast('Rilevamento posizione…', 'info')
  const pos = await getCurrentPosition()
  if (!pos) { showToast('Posizione non disponibile', 'error'); return }
  const point: RoutePoint = { lat: pos.lat, lng: pos.lng, address: 'Posizione attuale' }
  routesStore.setEndPoint(point)
  placeMarker('end', point)
  map?.easeTo({ center: [pos.lng, pos.lat], duration: 600 })
  showToast('Destinazione: posizione attuale', 'end')
  if (isMobileView.value) showMobilePanel.value = true
  reverseGeocode(pos.lat, pos.lng).then(address => {
    routesStore.setEndPoint({ ...point, address })
  })
}

// =============================================
// GPX EXPORT + NAVIGATION
// =============================================
const onExportGpx = () => {
  if (!routesStore.currentRoute) return
  exportGPX(routesStore.currentRoute)
  showToast('GPX scaricato', 'success')
}

const onStartNavigation = () => {
  if (!routesStore.currentRoute) return
  isNavigating.value = true
  if (isMobileView.value) showMobilePanel.value = false
  map?.easeTo({ zoom: 17, duration: 500 })
  showToast('Navigazione avviata', 'info')
}

const onStopNavigation = () => {
  isNavigating.value = false
  navMarker?.remove(); navMarker = null
  // Torna nord-up e zoom overview
  map?.easeTo({ bearing: 0, zoom: 13, duration: 600 })
}

const onNavPosition = async (pos: { lat: number; lng: number; accuracy: number; bearing: number | null }) => {
  if (!map) return
  const _ML = _getML()
  if (!_ML) return

  // Crea/aggiorna marker freccia direzionale
  if (!navMarker) {
    const el = document.createElement('div')
    el.innerHTML = `
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="14" cy="14" r="13" fill="#0a0c14" stroke="#3b82f6" stroke-width="2"/>
        <path d="M14 6L20 22L14 18L8 22L14 6Z" fill="#3b82f6" stroke="white" stroke-width="1"/>
      </svg>`
    navMarker = new _ML.Marker({ element: el, anchor: 'center', rotationAlignment: 'map' })
      .setLngLat([pos.lng, pos.lat])
      .addTo(map)
  } else {
    navMarker.setLngLat([pos.lng, pos.lat])
  }

  // Heading-up: MapLibre ruota la mappa nativamente, le etichette restano dritte
  map.easeTo({
    center: [pos.lng, pos.lat],
    bearing: pos.bearing ?? map.getBearing(),
    duration: 400,
    easing: (t: number) => t,
  })
}

// =============================================
// TOAST
// =============================================
const showToast = (message: string, type: 'success' | 'error' | 'info' | 'start' | 'end') => {
  toast.value = { message, type }
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = null }, 3000)
}
</script>

<style scoped>
.map-toolbar {
  position: absolute;
  right: 12px;
  top: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 900;
}

.map-btn {
  height: 36px;
  padding: 0 12px;
  border-radius: 8px;
  background: rgba(13, 15, 24, 0.92);
  border: 1px solid #232640;
  color: #8b95a8;
  display: flex; align-items: center; gap: 6px;
  cursor: pointer;
  backdrop-filter: blur(12px);
  transition: all 0.15s;
  font-size: 12px; font-weight: 600;
  font-family: 'DM Sans', sans-serif;
  white-space: nowrap;
}
.map-btn:hover { border-color: #a3e635; color: #a3e635; }
.map-btn.active { border-color: #5a9b5a; color: #8bb940; background: rgba(139,185,64,0.1); }

@media (max-width: 768px) {
  .map-btn { height: 44px; padding: 0 14px; font-size: 13px; border-radius: 10px; }
}

/* ── Mobile FAB ──────────────────────────────────────────── */
.mobile-fab { display: none; }
@media (max-width: 768px) {
  .mobile-fab {
    display: flex;
    align-items: center; justify-content: center;
    position: absolute;
    bottom: calc(58px + env(safe-area-inset-bottom) + 16px);
    right: 16px;
    width: 56px; height: 56px;
    border-radius: 50%;
    background: #a3e635;
    color: #060810;
    border: none;
    box-shadow: 0 4px 20px rgba(163,230,53,0.45), 0 2px 8px rgba(0,0,0,0.4);
    cursor: pointer;
    z-index: 950;
    transition: transform 0.15s, box-shadow 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .mobile-fab:active { transform: scale(0.93); }
}

/* ── Toast ───────────────────────────────────────────────── */
.toast {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 18px;
  border-radius: 20px;
  font-size: 13px;
  z-index: 700;
  white-space: nowrap;
  pointer-events: none;
  backdrop-filter: blur(8px);
}
.toast-success { background: rgba(139,185,64,0.2);  border: 1px solid #8bb940; color: #8bb940; }
.toast-error   { background: rgba(239,68,68,0.2);   border: 1px solid #ef4444; color: #fca5a5; }
.toast-info    { background: rgba(59,130,246,0.2);   border: 1px solid #3b82f6; color: #93c5fd; }
.toast-start   { background: rgba(139,185,64,0.92);  border: 1px solid #2a4010; color: #1a2a08; font-weight: 600; }
.toast-end     { background: rgba(232,170,58,0.92);  border: 1px solid #5a3a08; color: #2a1800; font-weight: 600; }

@media (max-width: 768px) {
  .toast {
    bottom: calc(58px + env(safe-area-inset-bottom) + 80px);
    max-width: calc(100vw - 32px);
    text-align: center; white-space: normal;
  }
}

/* ── Modal ───────────────────────────────────────────────── */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  z-index: 9000; padding: 16px;
}
.modal-card {
  background: #152415;
  border: 1px solid #2a4a2a;
  border-radius: 16px;
  padding: 24px;
  width: 100%; max-width: 380px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.5);
  max-height: calc(100dvh - 80px);
  overflow-y: auto;
}
@media (max-width: 768px) {
  .modal-card { padding: 20px 16px; border-radius: 20px; max-height: calc(100dvh - 40px); }
  .modal-overlay { padding: 12px; align-items: flex-end; padding-bottom: calc(env(safe-area-inset-bottom) + 12px); }
}

/* ── Transitions ─────────────────────────────────────────── */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.modal-enter-active, .modal-leave-active { transition: all 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.95); }
</style>
