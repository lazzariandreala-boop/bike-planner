<template>
  <div class="relative w-full h-full flex flex-col">
    <AppHeader />

    <!-- Layout principale -->
    <div class="relative flex-1 overflow-hidden">

      <!-- Mappa (occupa tutto) -->
      <div id="map" class="absolute inset-0" ref="mapContainer" />

      <!-- Pannello laterale / bottom sheet -->
      <RoutePanel
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
      />

      <!-- Toolbar mappa (destra) -->
      <div class="map-toolbar">
        <button class="map-btn" @click="goToMyLocation">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.5"/>
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span>Posizione</span>
        </button>
        <button class="map-btn" :class="{ 'active': showCycleMap }" @click="toggleCycleMap">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="4" cy="11" r="2.5" stroke="currentColor" stroke-width="1.3"/>
            <circle cx="12" cy="11" r="2.5" stroke="currentColor" stroke-width="1.3"/>
            <path d="M4 11L8 4l4 7" stroke="currentColor" stroke-width="1.3"/>
            <path d="M6 7h4" stroke="currentColor" stroke-width="1.3"/>
          </svg>
          <span>Ciclabili</span>
        </button>
      </div>

      <!-- Toast notifiche -->
      <Transition name="fade">
        <div v-if="toast" class="toast" :class="`toast-${toast.type}`">
          {{ toast.message }}
        </div>
      </Transition>

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
                <input v-model="saveForm.name" class="input-terrain" placeholder="Es. Anello del Brenta..." />
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
import type { Map as LeafletMap, Marker, Polyline, LatLngBounds } from 'leaflet'
import type { RoutePreferences, RoutePoint, SavedRoute } from '~/types'
import { useORS } from '~/composables/useORS'
import { useAI } from '~/composables/useAI'
import { useGeolocation } from '~/composables/useGeolocation'
import { useAuthStore } from '~/stores/auth'
import { useRoutesStore } from '~/stores/routes'

definePageMeta({ middleware: 'auth' })

const authStore = useAuthStore()
const routesStore = useRoutesStore()
const { calculateRoute, reverseGeocode, parseSurfaceBreakdown, parseElevationProfile, isLoading: orsLoading, error: orsError } = useORS()
const { generateRouteDescription, suggestRouteName, isGenerating: aiGenerating } = useAI()
const { getCurrentPosition } = useGeolocation()

// Refs
const mapContainer = ref<HTMLElement | null>(null)
let leafletMap: LeafletMap | null = null
let startMarker: Marker | null = null
let endMarker: Marker | null = null
let routeLayer: Polyline | null = null
let L: any = null

const showCycleMap = ref(false)
let osmLayer: any = null
let cycleLayer: any = null

const showSaveDialog = ref(false)
const saveForm = reactive({ name: '', notes: '', tagsInput: '' })

const toast = ref<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
let toastTimer: any = null

// =============================================
// INIT MAPPA
// =============================================
onMounted(async () => {
  // Import Leaflet solo client-side
  L = (await import('leaflet')).default

  await nextTick()
  if (!mapContainer.value) return

  leafletMap = L.map(mapContainer.value, {
    center: [45.8, 11.5], // Veneto default (casa tua!)
    zoom: 11,
    zoomControl: false,
  })

  // Layer OSM standard
  osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 19,
  }).addTo(leafletMap)

  // Layer ciclabile (OpenCycleMap) — opzionale
  cycleLayer = L.tileLayer('https://tile.waymarkedtrails.org/cycling/{z}/{x}/{y}.png', {
    attribution: '© Waymarked Trails',
    maxZoom: 19,
    opacity: 0.6,
  })

  // Zoom controls personalizzati
  L.control.zoom({ position: 'bottomright' }).addTo(leafletMap)

  // Click handler per impostare punti
  leafletMap.on('click', onMapClick)

  // Vai alla posizione utente all'avvio
  await goToMyLocation(true)
})

onUnmounted(() => {
  if (leafletMap) { leafletMap.remove(); leafletMap = null }
})

// =============================================
// MAP INTERACTIONS
// =============================================
const onMapClick = (e: any) => {
  const { lat, lng } = e.latlng

  // Regola semplice: primo slot vuoto. Se entrambi pieni, ignora.
  let target: 'start' | 'end'
  if (!routesStore.startPoint) {
    target = 'start'
  } else if (!routesStore.endPoint) {
    target = 'end'
  } else {
    return
  }

  // Imposta subito con coordinate grezze (no await → no race condition)
  const coordLabel = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  const point: RoutePoint = { lat, lng, address: coordLabel }

  if (target === 'start') {
    routesStore.setStartPoint(point)
    placeMarker('start', lat, lng, coordLabel)
    showToast('Partenza impostata', 'info')
  } else {
    routesStore.setEndPoint(point)
    placeMarker('end', lat, lng, coordLabel)
    showToast('Destinazione impostata', 'info')
  }

  // Aggiorna l'indirizzo leggibile in background
  reverseGeocode(lat, lng).then(address => {
    const resolved: RoutePoint = { lat, lng, address }
    if (target === 'start') {
      routesStore.setStartPoint(resolved)
      startMarker?.setPopupContent(`<strong style="color:#a3e635;">Partenza</strong><br><small>${address}</small>`)
    } else {
      routesStore.setEndPoint(resolved)
      endMarker?.setPopupContent(`<strong style="color:#f59e0b;">Destinazione</strong><br><small>${address}</small>`)
    }
  })
}

const placeMarker = (type: 'start' | 'end', lat: number, lng: number, label: string) => {
  if (!L || !leafletMap) return

  const color = type === 'start' ? '#8bb940' : '#e8aa3a'
  const icon = L.divIcon({
    html: `<div style="
      width: 14px; height: 14px;
      border-radius: 50%;
      background: ${color};
      border: 2px solid #e8f0d0;
      box-shadow: 0 0 10px ${color}88;
    "></div>`,
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })

  if (type === 'start') {
    startMarker?.remove()
    startMarker = L.marker([lat, lng], { icon })
      .addTo(leafletMap!)
      .bindPopup(`<strong style="color:#8bb940;">Partenza</strong><br><small>${label}</small>`)
  } else {
    endMarker?.remove()
    endMarker = L.marker([lat, lng], { icon })
      .addTo(leafletMap!)
      .bindPopup(`<strong style="color:#e8aa3a;">Destinazione</strong><br><small>${label}</small>`)
  }
}

const goToMyLocation = async (silent = false) => {
  const pos = await getCurrentPosition()
  if (pos && leafletMap) {
    leafletMap.setView([pos.lat, pos.lng], 13, { animate: true })
    if (!silent) showToast('Posizione rilevata', 'success')
  } else if (!silent) {
    showToast('Impossibile rilevare la posizione', 'error')
  }
}

const toggleCycleMap = () => {
  if (!leafletMap) return
  showCycleMap.value = !showCycleMap.value
  if (showCycleMap.value) {
    cycleLayer.addTo(leafletMap)
  } else {
    cycleLayer.remove()
  }
}


// =============================================
// ROUTING
// =============================================
const onCalculate = async (prefs: RoutePreferences) => {
  const start = routesStore.startPoint
  const end = routesStore.endPoint
  if (!start || !end) return

  const result = await calculateRoute(start, end, prefs, routesStore.waypoints)
  if (!result || !result.features?.[0]) {
    showToast(orsError.value || 'Nessun percorso trovato', 'error')
    return
  }

  const feature = result.features[0]
  const summary = feature.properties.summary
  const elevation = parseElevationProfile(feature)
  const surfaceBreakdown = parseSurfaceBreakdown(feature)

  // Disegna la polyline sulla mappa
  drawRoute(feature.geometry.coordinates)

  // Aggiorna store con il percorso calcolato
  const route: Partial<SavedRoute> = {
    start,
    end,
    preferences: prefs,
    geometry: feature.geometry,
    distance: Math.round(summary.distance * 10) / 10, // già in km (units: 'km')
    duration: Math.round(summary.duration / 60),       // durata sempre in secondi
    elevation,
    surfaceBreakdown: surfaceBreakdown as any,
  }
  routesStore.setCurrentRoute(route)

  // Genera descrizione AI in background
  generateRouteDescription(route).then(desc => {
    routesStore.setCurrentRoute({ ...route, aiDescription: desc })
  })

  showToast(`Percorso ${summary.distance.toFixed(1)} km trovato`, 'success')
}

const drawRoute = (coordinates: number[][]) => {
  if (!L || !leafletMap) return
  routeLayer?.remove()

  // ORS torna [lng, lat] → invertiamo per Leaflet
  const latLngs = coordinates.map(([lng, lat]) => [lat, lng] as [number, number])

  routeLayer = L.polyline(latLngs, {
    color: '#8bb940',
    weight: 4,
    opacity: 0.9,
    lineCap: 'round',
    lineJoin: 'round',
  }).addTo(leafletMap)

  // Shadow sotto la polyline (effetto profondità)
  L.polyline(latLngs, {
    color: '#000',
    weight: 8,
    opacity: 0.2,
  }).addTo(leafletMap).bringToBack()

  leafletMap.fitBounds(routeLayer.getBounds(), { padding: [60, 400] })
}

// =============================================
// SAVE
// =============================================
const onSave = async () => {
  if (!routesStore.currentRoute) return
  // Pre-popola il nome con AI se disponibile
  saveForm.name = routesStore.currentRoute.name || ''
  saveForm.notes = ''
  saveForm.tagsInput = ''
  showSaveDialog.value = true

  if (!saveForm.name) {
    generateNameAI()
  }
}

const generateNameAI = async () => {
  if (!routesStore.currentRoute) return
  saveForm.name = await suggestRouteName(routesStore.currentRoute)
}

const confirmSave = async () => {
  if (!routesStore.currentRoute || !saveForm.name) return
  const route = routesStore.currentRoute

  await routesStore.saveRoute({
    ...route,
    name: saveForm.name,
    description: saveForm.notes,
    aiDescription: route.aiDescription,
    isFavorite: false,
    tags: saveForm.tagsInput.split(',').map(t => t.trim()).filter(Boolean),
    waypoints: routesStore.waypoints,
  } as any)

  showSaveDialog.value = false
  showToast('Percorso salvato!', 'success')
}

// =============================================
// CLEAR / HANDLERS
// =============================================
const onClear = () => {
  routesStore.clearPlanning()
  startMarker?.remove(); startMarker = null
  endMarker?.remove(); endMarker = null
  routeLayer?.remove(); routeLayer = null
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
  placeMarker('start', point.lat, point.lng, point.address || '')
  if (leafletMap) leafletMap.panTo([point.lat, point.lng])
}

const onSelectEnd = (point: RoutePoint) => {
  routesStore.setEndPoint(point)
  placeMarker('end', point.lat, point.lng, point.address || '')
  if (leafletMap) leafletMap.panTo([point.lat, point.lng])
}

// =============================================
// TOAST
// =============================================
const showToast = (message: string, type: 'success' | 'error' | 'info') => {
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
  z-index: 500;
}

@media (max-width: 768px) {
  .map-toolbar { right: 10px; top: 10px; }
}

.map-btn {
  height: 36px;
  padding: 0 12px;
  border-radius: 8px;
  background: rgba(13, 15, 24, 0.92);
  border: 1px solid #232640;
  color: #8b95a8;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  cursor: pointer;
  backdrop-filter: blur(12px);
  transition: all 0.15s;
  font-size: 12px;
  font-weight: 600;
  font-family: 'DM Sans', sans-serif;
  white-space: nowrap;
}
.map-btn:hover { border-color: #a3e635; color: #a3e635; }
.map-btn.active { border-color: #a3e635; color: #a3e635; background: rgba(163,230,53,0.12); }

.click-mode-badge {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15, 26, 15, 0.92);
  border: 1px solid #2a4a2a;
  border-radius: 20px;
  padding: 6px 14px;
  font-size: 13px;
  z-index: 600;
  backdrop-filter: blur(8px);
  white-space: nowrap;
}

@media (max-width: 768px) {
  .click-mode-badge { top: auto; bottom: 70px; }
}

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
}
.toast-success { background: rgba(139,185,64,0.2); border: 1px solid #8bb940; color: #8bb940; }
.toast-error   { background: rgba(239,68,68,0.2);  border: 1px solid #ef4444; color: #fca5a5; }
.toast-info    { background: rgba(59,130,246,0.2);  border: 1px solid #3b82f6; color: #93c5fd; }

@media (max-width: 768px) {
  .toast { bottom: 70px; }
}

.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  z-index: 9000;
  padding: 16px;
}
.modal-card {
  background: #152415;
  border: 1px solid #2a4a2a;
  border-radius: 16px;
  padding: 24px;
  width: 100%;
  max-width: 380px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.5);
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.modal-enter-active, .modal-leave-active { transition: all 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.95); }
</style>
