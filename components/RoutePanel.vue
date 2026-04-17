<template>
  <aside
    class="side-panel"
    :class="{ dragging: isDragging }"
    :style="panelStyle"
  >
    <!-- Drag handle (mobile only) -->
    <div
      v-if="isMobile"
      class="drag-handle-area"
      @touchstart.passive="onTouchStart"
      @touchmove.prevent="onTouchMove"
      @touchend="onTouchEnd"
      @click="onHandleTap"
    >
      <div class="drag-handle" />
    </div>

    <!-- ═══════════════════════════════════════════
         SEZIONE SINISTRA: form pianificazione
    ═══════════════════════════════════════════ -->
    <div class="panel-section panel-left" :class="{ 'panel-collapsed': !isMobile && leftCollapsed }">

      <!-- Strip compressa (desktop only) -->
      <div v-if="!isMobile && leftCollapsed" class="collapsed-strip">
        <button class="expand-strip-btn" @click="leftCollapsed = false" title="Espandi">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="collapsed-label">PIANO ROUTE</span>
        </button>
      </div>

      <!-- Contenuto espanso -->
      <template v-else>
        <div class="flex items-center justify-between px-4 pt-3 pb-2 border-b"
          style="border-color: #1e321e; flex-shrink: 0;">
          <div>
            <h2 class="font-display text-2xl" style="color: #a3e635;">PIANO ROUTE</h2>
            <p class="font-mono text-xs" style="color: #404860;">GRAVEL AI PLANNER</p>
          </div>
          <div class="flex items-center gap-2">
            <button v-if="hasRoute && isMobile" class="btn-ghost text-xs py-1 px-2" @click="$emit('clear')">
              <svg width="14" height="14" viewBox="0 0 14 14" class="inline mr-1">
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              Reset
            </button>
            <!-- Collapse button desktop -->
            <button v-if="!isMobile" class="collapse-btn" @click="leftCollapsed = true" title="Comprimi">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 3l-4 4 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Scrollable content — pb-safe aggiunge spazio sotto su mobile -->
        <div class="flex-1 overflow-y-auto px-4 py-3 space-y-4 panel-scroll-content">

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

          <!-- Risultato percorso (solo mobile) -->
          <RouteResult
            v-if="currentRoute && isMobile"
            :route="currentRoute"
            :is-generating-ai="isGeneratingAI"
            :is-loading="isLoading"
            @save="$emit('save')"
            @reset="$emit('clear')"
            @recalculate="onRecalculate"
          />

        </div>
      </template>
    </div>

    <!-- ═══════════════════════════════════════════
         SEZIONE DESTRA: risultato percorso (desktop only)
    ═══════════════════════════════════════════ -->
    <div
      v-if="!isMobile && currentRoute"
      class="panel-section panel-right"
      :class="{ 'panel-collapsed': rightCollapsed }"
    >

      <!-- Strip compressa -->
      <div v-if="rightCollapsed" class="collapsed-strip">
        <button class="expand-strip-btn" @click="rightCollapsed = false" title="Espandi">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="collapsed-label">PERCORSO</span>
        </button>
      </div>

      <!-- Contenuto espanso -->
      <template v-else>
        <div class="flex items-center justify-end px-3 pt-3 pb-2 border-b"
          style="border-color: #1e321e; flex-shrink: 0; min-height: 48px;">
          <button class="collapse-btn" @click="rightCollapsed = true" title="Comprimi">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 3l-4 4 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        <div class="flex-1 overflow-y-auto">
          <RouteResult
            :route="currentRoute"
            :is-generating-ai="isGeneratingAI"
            :is-loading="isLoading"
            @save="$emit('save')"
            @reset="$emit('clear')"
            @recalculate="onRecalculate"
          />
        </div>
      </template>
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

watch(() => props.startPoint, (p) => {
  startLabel.value = p?.address ?? ''
}, { immediate: true })
watch(() => props.endPoint, (p) => {
  endLabel.value = p?.address ?? ''
}, { immediate: true })

// Ricalcola il percorso quando l'utente cambia difficoltà nel pannello risultato
const onRecalculate = (difficulty: 'easy' | 'moderate' | 'hard' | 'expert') => {
  localPreferences.difficulty = difficulty
  emit('calculate', { ...localPreferences })
}

// Quando arriva un nuovo percorso, espandi automaticamente la sezione destra
watch(() => props.currentRoute, (newVal, oldVal) => {
  if (newVal && !oldVal) {
    rightCollapsed.value = false
  }
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

// ── Collapse state (desktop only) ─────────────────────────────
const leftCollapsed = ref(false)
const rightCollapsed = ref(false)

const SECTION_W = 360
const COLLAPSED_W = 40

const panelStyle = computed(() => {
  if (isMobile.value) return { height: sheetHeight.value + 'px' }

  const hasRight = !!props.currentRoute
  const leftW = leftCollapsed.value ? COLLAPSED_W : SECTION_W
  const rightW = hasRight ? (rightCollapsed.value ? COLLAPSED_W : SECTION_W) : 0

  return {
    flexDirection: 'row' as const,
    width: (leftW + rightW) + 'px',
  }
})

// ── Bottom sheet drag (mobile only) ──────────────────────────
const isMobile = ref(false)
const sheetHeight = ref(180)
const isDragging = ref(false)

const PEEK = 200
// Considera la safe area del dispositivo (notch, home indicator)
const safeAreaBottom = () => {
  if (typeof window === 'undefined') return 0
  const val = getComputedStyle(document.documentElement).getPropertyValue('--sab') || '0'
  return parseInt(val) || 0
}
const half = () => Math.round(window.innerHeight * 0.55) - 58 - safeAreaBottom()
const full = () => Math.round(window.innerHeight * 0.92) - 58 - safeAreaBottom()

// Quando si apre il geocode dropdown su mobile, espandi lo sheet per mostrare i risultati
watch([() => geocodeResults.start.length, () => geocodeResults.end.length], ([sl, el]) => {
  if (isMobile.value && (sl > 0 || el > 0) && sheetHeight.value < half()) {
    sheetHeight.value = half()
  }
})

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
/* ── Layout sezioni desktop ───────────────────────────────── */
.panel-section {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  transition: width 0.3s cubic-bezier(0.32, 0.72, 0, 1);
  flex-shrink: 0;
}

.panel-left {
  width: 360px;
  border-right: 1px solid #1e321e;
}
.panel-left.panel-collapsed {
  width: 40px;
  border-right: 1px solid #1e321e;
}

.panel-right {
  width: 360px;
}
.panel-right.panel-collapsed {
  width: 40px;
}

/* ── Strip compressa ──────────────────────────────────────── */
.collapsed-strip {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 100%;
}

.expand-strip-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 16px 4px;
  color: #8b95a8;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.15s;
  width: 100%;
  height: 100%;
  justify-content: center;
}
.expand-strip-btn:hover { color: #a3e635; }

.collapsed-label {
  font-size: 9px;
  font-family: 'IBM Plex Mono', monospace;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  letter-spacing: 0.12em;
  opacity: 0.5;
}

/* ── Bottone collapse nell'header ─────────────────────────── */
.collapse-btn {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  color: #5a6490;
  background: none;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}
.collapse-btn:hover {
  background: rgba(255,255,255,0.05);
  border-color: #232640;
  color: #a3e635;
}

/* ── Geocode dropdown ─────────────────────────────────────── */
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

/* ── Toggle switches ──────────────────────────────────────── */
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

/* ── Drag handle mobile ───────────────────────────────────── */
.drag-handle-area {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 0 6px;
  cursor: pointer;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
  /* Target minimo 44px per touch */
  min-height: 44px;
}

/* ── Mobile overrides ──────────────────────────────────────── */
@media (max-width: 768px) {
  /* Padding bottom per non finire sotto il bordo dello sheet */
  .panel-scroll-content {
    padding-bottom: 24px;
  }

  /* Pulsante Reset nel header mobile */
  .btn-ghost {
    font-size: 13px;
  }

  /* Geocode dropdown sempre sopra tutto */
  .geocode-dropdown {
    z-index: 10000;
  }

  /* Inputs più ariosi */
  .geocode-item {
    padding: 12px 14px;
    font-size: 14px;
  }
}
</style>
