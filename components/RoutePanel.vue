<template>
  <aside
    class="side-panel flex flex-col"
    :class="{ dragging: isDragging }"
    :style="isMobile ? { height: sheetHeight + 'px' } : {}"
  >
    <!-- Drag handle (mobile only) -->
    <div
      class="drag-handle-area md:hidden"
      @touchstart.passive="onTouchStart"
      @touchmove.prevent="onTouchMove"
      @touchend="onTouchEnd"
      @click="onHandleTap"
    >
      <div class="drag-handle" />
    </div>
    <div class="flex items-center justify-between px-4 pt-3 pb-2 border-b"
      style="border-color: #1e321e; flex-shrink: 0;">
      <div>
        <h2 class="font-display text-2xl" style="color: #a3e635;">PIANO ROUTE</h2>
        <p class="font-mono text-xs" style="color: #404860;">GRAVEL AI PLANNER</p>
      </div>
      <div class="flex items-center gap-2">
        <button v-if="hasRoute" class="btn-ghost text-xs py-1 px-2" @click="$emit('clear')">
          <svg width="14" height="14" viewBox="0 0 14 14" class="inline mr-1">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          Reset
        </button>
      </div>
    </div>

    <!-- Scrollable content -->
    <div class="flex-1 overflow-y-auto px-4 py-3 space-y-4">

      <!-- Partenza -->
      <div>
        <label class="text-xs font-mono block mb-1" style="color: #a3e635; letter-spacing: 0.08em;">
          PARTENZA
        </label>
        <div class="relative">
          <input
            class="input-terrain pr-8"
            :value="startLabel"
            placeholder="Indirizzo o clicca mappa…"
            @input="onSearchInput($event, 'start')"
            @blur="closeDropdown"
          />
          <button v-if="startPoint" class="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
            @click="$emit('clearStart')" style="color: #8bb940;">
            <svg width="14" height="14" viewBox="0 0 14 14">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div v-if="geocodeResults.start.length > 0" class="geocode-dropdown">
          <button v-for="r in geocodeResults.start" :key="r.label"
            class="geocode-item"
            @mousedown.prevent="selectGeocode('start', r)">
            <svg width="12" height="12" viewBox="0 0 12 12" class="flex-shrink-0 opacity-50">
              <circle cx="6" cy="5" r="3" stroke="currentColor" fill="none"/>
              <path d="M6 8v4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
            </svg>
            {{ r.label }}
          </button>
        </div>
      </div>

      <!-- Destinazione -->
      <div>
        <label class="text-xs font-mono block mb-1" style="color: #f59e0b; letter-spacing: 0.08em;">
          DESTINAZIONE
        </label>
        <div class="relative">
          <input
            class="input-terrain pr-8"
            :value="endLabel"
            placeholder="Indirizzo o clicca mappa…"
            @input="onSearchInput($event, 'end')"
            @blur="closeDropdown"
          />
          <button v-if="endPoint" class="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
            @click="$emit('clearEnd')" style="color: #e8aa3a;">
            <svg width="14" height="14" viewBox="0 0 14 14">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div v-if="geocodeResults.end.length > 0" class="geocode-dropdown">
          <button v-for="r in geocodeResults.end" :key="r.label"
            class="geocode-item"
            @mousedown.prevent="selectGeocode('end', r)">
            <svg width="12" height="12" viewBox="0 0 12 12" class="flex-shrink-0 opacity-50">
              <circle cx="6" cy="5" r="3" stroke="currentColor" fill="none"/>
              <path d="M6 8v4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
            </svg>
            {{ r.label }}
          </button>
        </div>
      </div>

      <!-- Superficie -->
      <div>
        <SurfaceSelector v-model="localPreferences.surfaces" />
      </div>

      <!-- Opzioni extra -->
      <div class="space-y-2">
        <p class="text-xs font-mono" style="color: #8b95a8; letter-spacing: 0.08em;">OPZIONI</p>

        <label class="flex items-center gap-2 cursor-pointer">
          <div class="toggle-switch" :class="{ 'on': localPreferences.avoidFerries }"
            @click="localPreferences.avoidFerries = !localPreferences.avoidFerries">
            <div class="toggle-thumb"/>
          </div>
          <span class="text-sm" style="color: #8b95a8;">Evita traghetti</span>
        </label>
      </div>


      <!-- CALCOLA -->
      <button
        class="btn-primary w-full py-3 text-base mt-2"
        :disabled="!canCalculate || isLoading"
        @click="$emit('calculate', localPreferences)"
      >
        <template v-if="isLoading">
          <div class="spinner !w-4 !h-4 inline-block mr-2 align-middle"/>
          Calcolo in corso…
        </template>
        <template v-else>
          <svg width="16" height="16" viewBox="0 0 16 16" class="inline mr-2 align-middle">
            <path d="M2 8c0-3.31 2.69-6 6-6s6 2.69 6 6-2.69 6-6 6-6-2.69-6-6z" stroke="currentColor" fill="none" stroke-width="1.5"/>
            <path d="M8 5v3l2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          Calcola Percorso
        </template>
      </button>

      <!-- Risultato percorso -->
      <RouteResult
        v-if="currentRoute"
        :route="currentRoute"
        :is-generating-ai="isGeneratingAI"
        @save="$emit('save')"
        @reset="$emit('clear')"
      />

    </div>
  </aside>
</template>

<script setup lang="ts">
import type { RoutePoint, RoutePreferences, SavedRoute, SurfaceType } from '~/types'
import { useORS } from '~/composables/useORS'

const props = defineProps<{
  startPoint: RoutePoint | null
  endPoint: RoutePoint | null
  currentRoute: Partial<SavedRoute> | null
  isLoading: boolean
  isGeneratingAI: boolean
}>()

const emit = defineEmits<{
  calculate: [RoutePreferences]
  save: []
  clear: []
  clearStart: []
  clearEnd: []
  selectStart: [RoutePoint]
  selectEnd: [RoutePoint]
}>()

const { geocode } = useORS()

const localPreferences = reactive<RoutePreferences>({
  surfaces: ['cycleway', 'gravel', 'unpaved', 'asphalt'],
  avoidHighways: true,
  avoidFerries: false,
  difficulty: 'moderate',
})

const difficulties = [
  { value: 'easy' as const, label: 'Easy' },
  { value: 'moderate' as const, label: 'Med' },
  { value: 'hard' as const, label: 'Hard' },
  { value: 'expert' as const, label: 'Pro' },
]

const geocodeResults = reactive<{
  start: { lat: number; lng: number; label: string }[]
  end: { lat: number; lng: number; label: string }[]
}>({ start: [], end: [] })

const searchTimers = { start: null as any, end: null as any }

const startLabel = ref('')
const endLabel = ref('')

const hasRoute = computed(() => !!props.currentRoute)
const canCalculate = computed(() =>
  !!props.startPoint && !!props.endPoint && localPreferences.surfaces.length > 0
)

// Sync etichette quando i punti cambiano esternamente (click mappa)
watch(() => props.startPoint, (p) => {
  if (p?.address) startLabel.value = p.address
})
watch(() => props.endPoint, (p) => {
  if (p?.address) endLabel.value = p.address
})

const onSearchInput = (e: Event, type: 'start' | 'end') => {
  const val = (e.target as HTMLInputElement).value
  if (type === 'start') startLabel.value = val
  else endLabel.value = val

  clearTimeout(searchTimers[type])
  if (val.length < 3) { geocodeResults[type] = []; return }

  searchTimers[type] = setTimeout(async () => {
    geocodeResults[type] = await geocode(val)
  }, 400)
}

const selectGeocode = (type: 'start' | 'end', result: { lat: number; lng: number; label: string }) => {
  if (type === 'start') {
    startLabel.value = result.label
    emit('selectStart', { lat: result.lat, lng: result.lng, address: result.label })
  } else {
    endLabel.value = result.label
    emit('selectEnd', { lat: result.lat, lng: result.lng, address: result.label })
  }
  geocodeResults[type] = []
}

const closeDropdown = () => {
  setTimeout(() => {
    geocodeResults.start = []
    geocodeResults.end = []
  }, 200)
}

// ── Bottom sheet drag (mobile only) ──────────────────────────
const isMobile = ref(false)
const sheetHeight = ref(180)
const isDragging = ref(false)

const PEEK = 180
const half = () => Math.round(window.innerHeight * 0.52) - 58
const full = () => Math.round(window.innerHeight * 0.88) - 58

let touchStartY = 0
let touchStartH = 0
let didDrag = false

const onTouchStart = (e: TouchEvent) => {
  touchStartY = e.touches[0].clientY
  touchStartH = sheetHeight.value
  isDragging.value = true
  didDrag = false
}

const onTouchMove = (e: TouchEvent) => {
  const delta = touchStartY - e.touches[0].clientY
  if (Math.abs(delta) > 6) didDrag = true
  sheetHeight.value = Math.max(PEEK - 40, Math.min(full(), touchStartH + delta))
}

const onTouchEnd = () => {
  isDragging.value = false
  const snaps = [PEEK, half(), full()]
  sheetHeight.value = snaps.reduce((a, b) =>
    Math.abs(a - sheetHeight.value) <= Math.abs(b - sheetHeight.value) ? a : b
  )
}

// Tap sul handle: cicla tra peek → half → full → peek
const onHandleTap = () => {
  if (didDrag) return
  const snaps = [PEEK, half(), full()]
  const currentIdx = snaps.findIndex(s => Math.abs(s - sheetHeight.value) < 20)
  const nextIdx = currentIdx === -1 ? 1 : (currentIdx + 1) % snaps.length
  sheetHeight.value = snaps[nextIdx]
}

onMounted(() => {
  isMobile.value = window.innerWidth < 768
  if (isMobile.value) sheetHeight.value = PEEK
})
</script>

<style scoped>
.geocode-dropdown {
  position: absolute;
  left: 0; right: 0;
  background: #181b2a;
  border: 1px solid #232640;
  border-top: none;
  border-radius: 0 0 8px 8px;
  z-index: 9999;
  max-height: 200px;
  overflow-y: auto;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}
.geocode-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 9px 12px;
  text-align: left;
  font-size: 13px;
  color: #8b95a8;
  border: none;
  background: none;
  cursor: pointer;
  border-bottom: 1px solid #1e2130;
  transition: background 0.1s;
}
.geocode-item:hover { background: #1e2130; color: #e2eaf5; }
.geocode-item:last-child { border-bottom: none; }

.toggle-switch {
  width: 34px; height: 20px;
  border-radius: 10px;
  background: #181b2a;
  border: 1px solid #232640;
  position: relative;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
  flex-shrink: 0;
}
.toggle-switch.on { background: rgba(163,230,53,0.2); border-color: #a3e635; }
.toggle-thumb {
  position: absolute;
  top: 3px; left: 3px;
  width: 12px; height: 12px;
  border-radius: 50%;
  background: #3d4470;
  transition: transform 0.2s, background 0.2s;
}
.toggle-switch.on .toggle-thumb {
  transform: translateX(14px);
  background: #a3e635;
}

.difficulty-btn {
  padding: 6px 4px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  background: #181b2a;
  border: 1px solid #232640;
  color: #404860;
  cursor: pointer;
  transition: all 0.15s;
  font-family: 'IBM Plex Mono', monospace;
}
.difficulty-btn:hover { border-color: #5a6490; color: #8b95a8; }
.difficulty-btn.active {
  background: rgba(163,230,53,0.12);
  border-color: #a3e635;
  color: #a3e635;
}

.drag-handle-area {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 0 6px;
  cursor: pointer;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
}
</style>
