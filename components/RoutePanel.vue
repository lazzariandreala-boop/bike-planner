<template>
  <aside class="side-panel" :style="panelStyle">

    <!-- ═══════════════════════════════════════════
         MOBILE: top nav bar con tasto "torna alla mappa"
    ═══════════════════════════════════════════ -->
    <div v-if="isMobile" class="mobile-topbar">
      <div class="flex-1 min-w-0">
        <h2 class="font-display text-2xl leading-none" style="color: #a3e635;">PIANO ROUTE</h2>
        <p v-if="hasRoute" class="font-mono text-xs mt-0.5" style="color: #404860;">
          {{ currentRoute?.distance?.toFixed(1) }} km · {{ mobileDuration }} · +{{ currentRoute?.elevation?.gain || 0 }}m
        </p>
        <p v-else class="font-mono text-xs mt-0.5" style="color: #404860;">GRAVEL AI PLANNER</p>
      </div>
      <!-- Close FAB (same style as open FAB in mappa) -->
      <button class="mobile-close-btn" @click="$emit('closeMobile')" title="Torna alla mappa">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
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
        <!-- Header desktop only -->
        <div v-if="!isMobile" class="flex items-center justify-between px-4 pt-3 pb-2 border-b"
          style="border-color: #1e321e; flex-shrink: 0;">
          <div>
            <h2 class="font-display text-2xl" style="color: #a3e635;">PIANO ROUTE</h2>
            <p class="font-mono text-xs" style="color: #404860;">GRAVEL AI PLANNER</p>
          </div>
          <button class="collapse-btn" @click="leftCollapsed = true" title="Comprimi">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 3l-4 4 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>

        <!-- Scrollable content -->
        <div class="flex-1 overflow-y-auto panel-scroll-content" style="padding: 16px;">

          <!-- Partenza -->
          <div class="form-group">
            <label class="field-label" style="color: #a3e635;">PARTENZA</label>
            <div class="relative">
              <input
                class="input-terrain pr-10"
                :value="startLabel"
                placeholder="Indirizzo o clicca sulla mappa…"
                @input="onSearchInput($event, 'start')"
                @blur="closeDropdown"
              />
              <button v-if="startPoint" class="input-clear-btn" @click="$emit('clearStart')">
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
          <div class="form-group">
            <label class="field-label" style="color: #f59e0b;">DESTINAZIONE</label>
            <div class="relative">
              <input
                class="input-terrain pr-10"
                :value="endLabel"
                placeholder="Indirizzo o clicca sulla mappa…"
                @input="onSearchInput($event, 'end')"
                @blur="closeDropdown"
              />
              <button v-if="endPoint" class="input-clear-btn" @click="$emit('clearEnd')">
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
          <div class="form-group">
            <SurfaceSelector v-model="localPreferences.surfaces" />
          </div>

          <!-- Opzioni extra -->
          <div class="form-group">
            <p class="field-label" style="color: #8b95a8;">OPZIONI</p>
            <label class="option-row">
              <div class="toggle-switch" :class="{ 'on': localPreferences.avoidFerries }"
                @click="localPreferences.avoidFerries = !localPreferences.avoidFerries">
                <div class="toggle-thumb"/>
              </div>
              <span class="text-sm" style="color: #8b95a8;">Evita traghetti</span>
            </label>
          </div>

          <!-- CALCOLA -->
          <button
            class="btn-primary w-full calculate-btn"
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
          <div v-if="currentRoute && isMobile" class="mobile-result-section">
            <div class="mobile-result-divider">
              <span>PERCORSO CALCOLATO</span>
            </div>
            <RouteResult
              :route="currentRoute"
              :is-generating-ai="isGeneratingAI"
              :is-loading="isLoading"
              @save="$emit('save')"
              @reset="$emit('clear')"
              @recalculate="onRecalculate"
            />
          </div>

          <div style="height: 24px;"/>
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
  closeMobile: []
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

const mobileDuration = computed(() => {
  const m = props.currentRoute?.duration
  if (!m) return '—'
  const h = Math.floor(m / 60)
  const min = m % 60
  return h > 0 ? `${h}h${min > 0 ? min : ''}` : `${min}m`
})

watch(() => props.startPoint, (p) => { startLabel.value = p?.address ?? '' }, { immediate: true })
watch(() => props.endPoint,   (p) => { endLabel.value   = p?.address ?? '' }, { immediate: true })

// Ricalcola il percorso quando l'utente cambia difficoltà nel pannello risultato
const onRecalculate = (difficulty: 'easy' | 'moderate' | 'hard' | 'expert') => {
  localPreferences.difficulty = difficulty
  emit('calculate', { ...localPreferences })
}

// Desktop: espandi la sezione destra quando arriva un percorso
watch(() => props.currentRoute, (newVal, oldVal) => {
  if (newVal && !oldVal && !isMobile.value) {
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
const leftCollapsed  = ref(false)
const rightCollapsed = ref(false)

const SECTION_W  = 360
const COLLAPSED_W = 40

const isMobile = ref(false)

const panelStyle = computed(() => {
  if (isMobile.value) {
    // Full-screen overlay above bottom navbar
    return {
      position: 'fixed' as const,
      top: '0',
      left: '0',
      right: '0',
      bottom: 'calc(58px + env(safe-area-inset-bottom))',
      width: '100%',
      height: 'auto',
      zIndex: '2000',
      flexDirection: 'column' as const,
    }
  }

  const hasRight = !!props.currentRoute
  const leftW  = leftCollapsed.value ? COLLAPSED_W : SECTION_W
  const rightW = hasRight ? (rightCollapsed.value ? COLLAPSED_W : SECTION_W) : 0

  return {
    flexDirection: 'row' as const,
    width: (leftW + rightW) + 'px',
  }
})

onMounted(() => {
  isMobile.value = window.innerWidth < 768
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

.panel-right { width: 360px; }
.panel-right.panel-collapsed { width: 40px; }

/* ── Mobile overrides ──────────────────────────────────────── */
@media (max-width: 768px) {
  .panel-section.panel-left {
    width: 100%;
    flex: 1;
    min-height: 0;
    border-right: none;
  }
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

/* ── Bottone collapse desktop ─────────────────────────────── */
.collapse-btn {
  width: 26px; height: 26px;
  display: flex; align-items: center; justify-content: center;
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

/* ── Mobile top bar ───────────────────────────────────────── */
.mobile-topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 16px 12px;
  border-bottom: 1px solid #1a2a1a;
  flex-shrink: 0;
  background: #0f1119;
}
.mobile-close-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.1);
  color: #8b95a8;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.mobile-close-btn:active {
  background: rgba(255,255,255,0.12);
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
  max-height: 220px;
  overflow-y: auto;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}
.geocode-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
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

@media (max-width: 768px) {
  .geocode-dropdown { z-index: 10000; }
  .geocode-item { padding: 14px 14px; font-size: 15px; }
}

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

/* ── Form ─────────────────────────────────────────────────── */
.form-group { margin-bottom: 18px; }
.field-label {
  display: block;
  font-size: 11px;
  font-family: 'IBM Plex Mono', monospace;
  letter-spacing: 0.08em;
  margin-bottom: 7px;
}
.option-row {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 6px 0;
  min-height: 44px;
}
.calculate-btn {
  width: 100%;
  padding: 14px 20px;
  font-size: 15px;
  font-weight: 700;
  margin-top: 4px;
  min-height: 52px;
}
.input-clear-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  opacity: 0.5;
  color: #8bb940;
  background: none; border: none;
  cursor: pointer; border-radius: 4px;
  transition: opacity 0.15s;
}
.input-clear-btn:hover { opacity: 1; }

/* ── Mobile result section ────────────────────────────────── */
.mobile-result-section { margin-top: 8px; }
.mobile-result-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.mobile-result-divider::before,
.mobile-result-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #1e321e;
}
.mobile-result-divider span {
  font-size: 10px;
  font-family: 'IBM Plex Mono', monospace;
  color: #2a4a2a;
  letter-spacing: 0.1em;
  white-space: nowrap;
}
</style>
